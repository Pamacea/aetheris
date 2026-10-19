import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Server, Socket } from "socket.io";
import type { ZodType } from "zod";
import {
  campaignJoinSchema,
  chatMessageSchema,
  chatSendSchema,
  diceRollRequestSchema,
  parseRollExpression,
  executeRoll,
  randomSeed,
  substituteMacros,
  DiceError,
  sceneCommitSchema,
  sceneActivateRequestSchema,
  pluginEventRequestSchema,
  tokenMoveRequestSchema,
  type ChatMessage,
  type DiceRoll,
  type SceneState,
} from "@aetheris/shared";
import { PrismaService } from "../database/prisma.service.js";
import { parseSessionToken } from "../auth/session.js";
import { PluginRegistryService } from "../plugins/plugin-registry.service.js";

interface SocketData {
  /** Auth initiale : les handlers attendent cette promesse (race vs Prisma). */
  ready?: Promise<{ userId: string; userName: string } | null>;
  userId?: string;
  userName?: string;
  campaigns?: string[];
  /** Cache d'adhésion DB par campagne (un lookup par campagne, pas par drag). */
  memberships?: Map<string, { role: string; at: number }>;
  /** Fenêtres glissantes de rate-limit par événement. */
  buckets?: Map<string, number[]>;
}

/** shortcut: cache d'adhésion 30 s en mémoire → révocation effective sous 30 s. */
const MEMBER_TTL_MS = 30_000;
/** Fenêtre glissante du rate-limit par socket. */
const RATE_WINDOW_MS = 1_000;

function parseWs<T>(schema: ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new WsException(result.error.issues[0]?.message ?? "Payload invalide");
  }
  return result.data;
}

/**
 * Gateway Socket.io — rooms par campagne (`campaign:${id}`).
 * La session Better Auth est validée à la connexion (cookie ou Bearer),
 * l'adhésion à la room est vérifiée contre CampaignMember.
 */
@WebSocketGateway({
  cors: { origin: "http://localhost:3001", credentials: true },
})
export class CampaignGateway implements OnGatewayConnection, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(CampaignGateway.name);

  /** Persistance scènes debouncée (les drags émettent souvent). */
  private readonly sceneTimers = new Map<string, NodeJS.Timeout>();

  /** Purge périodique des rooms après révocation de membre. */
  private sweepTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly plugins?: PluginRegistryService,
  ) {}

  onModuleInit(): void {
    this.sweepTimer = setInterval(() => {
      void this.sweepRevokedMembers().catch((e: unknown) =>
        this.logger.error(`échec sweep révocations: ${e instanceof Error ? e.message : String(e)}`),
      );
    }, MEMBER_TTL_MS);
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    for (const timer of this.sceneTimers.values()) clearTimeout(timer);
  }

  /**
   * Quitte les rooms des membres révoqués : `requireMember` bloque déjà
   * leurs émissions (cache 30 s), mais sans sweep ils resteraient dans la
   * room et RECEVRAIENT les broadcasts jusqu'à leur déconnexion.
   */
  private async sweepRevokedMembers(): Promise<void> {
    for (const socket of this.server.sockets.sockets.values()) {
      const data = socket.data as SocketData;
      if (!data.userId || !data.campaigns?.length) continue;
      try {
        const rows = await this.prisma.campaignMember.findMany({
          where: { userId: data.userId, campaignId: { in: data.campaigns } },
          select: { campaignId: true, role: true },
        });
        const valid = new Map(rows.map((r) => [r.campaignId, r.role]));
        const at = Date.now();
        for (const id of [...data.campaigns]) {
          const role = valid.get(id);
          if (role === undefined) {
            await socket.leave(`campaign:${id}`);
            data.memberships?.delete(id);
            this.logger.log(`room ${id} quittée (membre révoqué ${data.userId})`);
          } else {
            // Le sweep sert aussi de re-lookup : TTL d'adhésion rafraîchi.
            data.memberships?.set(id, { role, at });
          }
        }
        data.campaigns = data.campaigns.filter((id) => valid.has(id));
      } catch (e) {
        // Erreur DB ponctuelle : on garde les rooms, prochaine passe (30 s).
        this.logger.error(
          `sweep socket user=${data.userId}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  async handleConnection(socket: Socket): Promise<void> {
    const data = socket.data as SocketData;
    // La promesse est exposée AVANT le await : les handlers qui arrivent
    // pendant l'aller-retour Prisma peuvent attendre au lieu d'échouer.
    data.ready = this.authenticate(socket.handshake.headers);
    const session = await data.ready;
    if (!session) {
      socket.disconnect(true);
      return;
    }
    data.userId = session.userId;
    data.userName = session.userName;
    this.logger.log(`Connexion : ${session.userName}`);
  }

  private async authenticate(
    headers: Parameters<typeof parseSessionToken>[0],
  ): Promise<{ userId: string; userName: string } | null> {
    const token = parseSessionToken(headers);
    if (!token) return null;
    const session = await this.prisma.session.findUnique({
      where: { token },
      select: {
        expiresAt: true,
        user: { select: { id: true, name: true } },
      },
    });
    if (!session || session.expiresAt < new Date()) return null;
    return { userId: session.user.id, userName: session.user.name };
  }

  /** Attend l'auth initiale avant de lire userId (anti-course). */
  private async requireAuth(socket: Socket): Promise<SocketData> {
    const data = socket.data as SocketData;
    if (!data.userId) await data.ready?.catch(() => null);
    return data;
  }

  /**
   * Adhésion VÉRIFIÉE EN DB à chaque handler (et non plus au seul
   * `campaign:join`) : une révocation de membre s'applique sans attendre
   * la reconnexion. `gmOnly` exige le rôle MJ.
   */
  private async requireMember(
    socket: Socket,
    campaignId: string,
    opts: { gmOnly?: boolean } = {},
  ): Promise<{ role: string }> {
    const data = await this.requireAuth(socket);
    if (!data.userId) throw new WsException("Non authentifié");

    data.memberships ??= new Map<string, { role: string; at: number }>();
    const cache = data.memberships;
    const now = Date.now();
    let entry = cache.get(campaignId);
    if (!entry || now - entry.at >= MEMBER_TTL_MS) {
      const member = await this.prisma.campaignMember.findUnique({
        where: { userId_campaignId: { userId: data.userId, campaignId } },
        select: { role: true },
      });
      if (!member) {
        cache.delete(campaignId);
        throw new WsException("Accès à la campagne refusé");
      }
      entry = { role: member.role, at: now };
      cache.set(campaignId, entry);
    }
    if (opts.gmOnly && entry.role !== "GM") {
      throw new WsException("Réservé aux MJ");
    }
    return entry;
  }

  /**
   * Quota `max` événements/s par socket : au-delà l'événement est ignoré
   * (warn serveur, pas d'exception — un client qui spamme ne doit pas
   * déclencher de montée d'exception à chaque frame).
   */
  private allowEvent(socket: Socket, key: string, max: number): boolean {
    const data = socket.data as SocketData;
    const now = Date.now();
    const buckets = (data.buckets ??= new Map<string, number[]>());
    const hits = (buckets.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    if (hits.length >= max) {
      buckets.set(key, hits);
      this.logger.warn(`rate-limit ${key} ignoré (user=${data.userId ?? "?"})`);
      return false;
    }
    hits.push(now);
    buckets.set(key, hits);
    return true;
  }

  @SubscribeMessage("campaign:join")
  async join(
    @MessageBody() raw: unknown,
    @ConnectedSocket() socket: Socket,
  ): Promise<{ ok: true; campaignId: string } | undefined> {
    const { campaignId } = parseWs(campaignJoinSchema, raw);
    const data = await this.requireAuth(socket);
    if (!data.userId) throw new WsException("Non authentifié");
    // Pas d'ack si ignoré : le client ne doit pas croire la room rejointe.
    if (!this.allowEvent(socket, "campaign:join", 3)) return undefined;

    // Adhésion DB (et non simple uuid fourni par le client).
    await this.requireMember(socket, campaignId);

    const room = `campaign:${campaignId}`;
    await socket.join(room);
    data.campaigns = [...new Set([...(data.campaigns ?? []), campaignId])];

    this.events.emit("campaign.joined", { campaignId, userId: data.userId });
    void this.plugins?.dispatchHook("campaign:joined", campaignId, { userId: data.userId });
    socket.to(room).emit("presence:joined", {
      userId: data.userId,
      name: data.userName ?? "Anonyme",
    });

    return { ok: true, campaignId };
  }

  @SubscribeMessage("chat:send")
  async chatSend(
    @MessageBody() raw: unknown,
    @ConnectedSocket() socket: Socket,
  ): Promise<{ ok: true } | undefined> {
    const { campaignId, content } = parseWs(chatSendSchema, raw);
    const data = await this.requireAuth(socket);
    if (!data.userId) throw new WsException("Non authentifié");
    if (!data.campaigns?.includes(campaignId)) {
      throw new WsException("Room non rejointe");
    }
    if (!this.allowEvent(socket, "chat:send", 5)) return undefined;
    await this.requireMember(socket, campaignId);

    const parsed = chatMessageSchema.safeParse({
      id: crypto.randomUUID(),
      authorName: data.userName ?? "Anonyme",
      content,
      sentAt: new Date().toISOString(),
    });
    if (!parsed.success) throw new WsException("Message invalide");

    const message: ChatMessage = parsed.data;
    await this.prisma.chatMessage.create({
      data: {
        campaignId,
        authorId: data.userId,
        authorName: message.authorName,
        content: message.content,
      },
    });
    this.server.to(`campaign:${campaignId}`).emit("chat:message", message);
    this.events.emit("chat.message", { campaignId, message });
    void this.plugins?.dispatchHook("chat:message", campaignId, { message });
    return { ok: true };
  }

  /** Déplacement de token (drag) : broadcast aux AUTRES clients de la room. */
  @SubscribeMessage("token:move")
  async tokenMove(@MessageBody() raw: unknown, @ConnectedSocket() socket: Socket): Promise<void> {
    const { campaignId, tokenId, x, y, rot } = parseWs(tokenMoveRequestSchema, raw);
    const data = await this.requireAuth(socket);
    if (!data.userId) throw new WsException("Non authentifié");
    if (!data.campaigns?.includes(campaignId)) {
      throw new WsException("Room non rejointe");
    }
    // Drag : quota élevé (frames de souris), puis ignoré sans exception.
    if (!this.allowEvent(socket, "token:move", 30)) return;
    // Adhésion revérifiée en DB (cache 30 s) : le drag reste léger.
    await this.requireMember(socket, campaignId);
    socket.to(`campaign:${campaignId}`).emit("token:moved", { tokenId, x, y, rot });
  }

  /**
   * Relais générique des plugins (Phase 8) : broadcast dans la room si le
   * plugin est activé pour la campagne. Aucun handler dédié par plugin —
   * ajouter un module ne touche pas au core du gateway.
   */
  @SubscribeMessage("plugin:event")
  async pluginEvent(@MessageBody() raw: unknown, @ConnectedSocket() socket: Socket): Promise<void> {
    const { campaignId, pluginId, type, payload } = parseWs(pluginEventRequestSchema, raw);
    const data = await this.requireAuth(socket);
    if (!data.userId) throw new WsException("Non authentifié");
    if (!data.campaigns?.includes(campaignId)) {
      throw new WsException("Room non rejointe");
    }
    if (!this.allowEvent(socket, "plugin:event", 10)) return;
    await this.requireMember(socket, campaignId);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { enabledPlugins: true },
    });
    if (!campaign?.enabledPlugins.includes(pluginId)) {
      throw new WsException(`Plugin désactivé : ${pluginId}`);
    }

    socket.to(`campaign:${campaignId}`).emit("plugin:event", {
      pluginId,
      type,
      payload,
      fromName: data.userName ?? "Anonyme",
    });
  }

  /** Commit d'état complet (fin de geste) : persiste + broadcast. */
  @SubscribeMessage("scene:commit")
  async sceneCommit(
    @MessageBody() raw: unknown,
    @ConnectedSocket() socket: Socket,
  ): Promise<{ ok: true } | undefined> {
    const { campaignId, state } = parseWs(sceneCommitSchema, raw);
    const data = await this.requireAuth(socket);
    if (!data.userId) throw new WsException("Non authentifié");
    if (!data.campaigns?.includes(campaignId)) {
      throw new WsException("Room non rejointe");
    }
    if (!this.allowEvent(socket, "scene:commit", 10)) return undefined;
    await this.requireMember(socket, campaignId);

    this.scheduleScenePersist(campaignId, state);
    socket.to(`campaign:${campaignId}`).emit("scene:state", state);
    return { ok: true };
  }

  /**
   * Activation de la scène de la campagne (MJ) : `sceneId` et `activatedBy`
   * viennent du serveur (VttScene + session), puis `scene:change` part dans
   * la room — un module comme l'ambiance peut réagir côté client.
   */
  @SubscribeMessage("scene:activate")
  async sceneActivate(
    @MessageBody() raw: unknown,
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const { campaignId } = parseWs(sceneActivateRequestSchema, raw);
    const data = await this.requireAuth(socket);
    if (!data.userId) throw new WsException("Non authentifié");
    if (!this.allowEvent(socket, "scene:activate", 3)) return;

    // Vérifié en DB (pas la room) : le handler peut précéder `campaign:join`.
    await this.requireMember(socket, campaignId, { gmOnly: true });

    const scene = await this.prisma.vttScene.findUnique({
      where: { campaignId },
      select: { id: true },
    });
    if (!scene) return; // campagne sans scène persistée : rien à activer

    this.server.to(`campaign:${campaignId}`).emit("scene:change", {
      sceneId: scene.id,
      activatedBy: data.userId,
    });
  }

  /** Jet de dés : le serveur tire (seed crypto) puis broadcast le résultat. */
  @SubscribeMessage("dice:roll")
  async diceRoll(@MessageBody() raw: unknown, @ConnectedSocket() socket: Socket): Promise<void> {
    const { campaignId, expression } = parseWs(diceRollRequestSchema, raw);
    const data = await this.requireAuth(socket);
    if (!data.userId) throw new WsException("Non authentifié");
    if (!data.campaigns?.includes(campaignId)) {
      throw new WsException("Room non rejointe");
    }
    // Jet coûteux (crypto seed + macros) : 5/s par socket, puis ignoré.
    if (!this.allowEvent(socket, "dice:roll", 5)) return;
    await this.requireMember(socket, campaignId);

    let payload: DiceRoll;
    try {
      const resolved = await this.resolveMacros(campaignId, expression);
      const parsed = parseRollExpression(resolved);
      const seed = randomSeed();
      const outcome = executeRoll(parsed, seed);
      payload = {
        expression,
        results: outcome.results,
        total: outcome.total,
        rollerName: data.userName ?? "Anonyme",
        seed,
      };
    } catch (e) {
      throw new WsException(e instanceof DiceError ? e.message : "Jet invalide");
    }

    this.server.to(`campaign:${campaignId}`).emit("dice:rolled", payload);
    this.events.emit("dice.rolled", { campaignId, payload });
    void this.plugins?.dispatchHook("dice:rolled", campaignId, payload);
  }

  /** Résout `@macro` depuis les Entity (data numérique) de la campagne. */
  private async resolveMacros(campaignId: string, expression: string): Promise<string> {
    if (!expression.includes("@")) return expression;
    const entities = await this.prisma.entity.findMany({
      where: { campaignId },
      select: { data: true },
    });
    const stats: Record<string, number> = {};
    for (const entity of entities) {
      const data = entity.data as Record<string, unknown> | null;
      if (!data || typeof data !== "object") continue;
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === "number") stats[key.toLowerCase()] = value;
      }
    }
    return substituteMacros(expression, stats);
  }

  /** Debounce 500 ms : une seule écriture par rafale de drag. */
  private scheduleScenePersist(campaignId: string, state: SceneState): void {
    const timer = this.sceneTimers.get(campaignId);
    if (timer) clearTimeout(timer);
    this.sceneTimers.set(
      campaignId,
      setTimeout(() => {
        this.sceneTimers.delete(campaignId);
        this.logger.log(`persistance scène ${campaignId} (débounce écoulé)`);
        this.prisma.vttScene
          .upsert({
            where: { campaignId },
            create: { campaignId, state: state as object },
            update: { state: state as object },
          })
          .then((row) => this.logger.log(`scène persistée id=${row.id}`))
          .catch((e: unknown) =>
            this.logger.error(
              `échec persistance scène: ${e instanceof Error ? e.message : String(e)}`,
            ),
          );
      }, 500),
    );
  }
}
