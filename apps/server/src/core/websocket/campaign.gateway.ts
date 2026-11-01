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
import { z, type ZodType } from "zod";
import {
  ambianceStateSchema,
  campaignJoinSchema,
  chatMessageSchema,
  chatSendSchema,
  choicesUpdateSchema,
  diceRollRequestSchema,
  entityTokenPatch,
  ficheSyncRequestSchema,
  isTokenVisible,
  parseRollExpression,
  resolveCombatKeys,
  sceneStateForViewer,
  wallSegs,
  templateSchemaSchema,
  executeRoll,
  randomSeed,
  substituteMacros,
  DiceError,
  sceneCommitSchema,
  sceneStateSchema,
  sceneActivateRequestSchema,
  pluginEventRequestSchema,
  tokenMoveRequestSchema,
  type ChatMessage,
  type DiceRoll,
  type SceneState,
  type TokenMoved,
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

/** Rooms : campagne (tous) et MJ (seule room qui reçoit l'état complet). */
const campaignRoom = (campaignId: string) => `campaign:${campaignId}`;
const gmRoom = (campaignId: string) => `${campaignRoom(campaignId)}:gm`;

function parseWs<T>(schema: ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new WsException(result.error.issues[0]?.message ?? "Payload invalide");
  }
  return result.data;
}

/** C→S : relais d'état d'ambiance (persisté côté Next par server action). */
const ambianceStateRelaySchema = z.object({
  campaignId: z.uuid(),
  state: ambianceStateSchema,
});

/** C→S : invalidation « liste des playlists modifiée » (refresh des vues). */
const ambiancePlaylistsChangedSchema = z.object({
  campaignId: z.uuid(),
});

/**
 * Gateway Socket.io — rooms par campagne (`campaign:${id}`).
 * La session Better Auth est validée à la connexion (cookie ou Bearer),
 * l'adhésion à la room est vérifiée contre CampaignMember.
 */
@WebSocketGateway({
  cors: {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3001",
    credentials: true,
  },
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
        for (const id of data.campaigns) {
          const role = valid.get(id);
          if (role === undefined) {
            await socket.leave(campaignRoom(id));
            await socket.leave(gmRoom(id));
            data.memberships?.delete(id);
            this.logger.log(`room ${id} quittée (membre révoqué ${data.userId})`);
          } else {
            // Le sweep sert aussi de re-lookup : TTL d'adhésion rafraîchi.
            data.memberships?.set(id, { role, at });
            // Promotion/rétrogradation : la room MJ suit le rôle réel.
            if (role === "GM") await socket.join(gmRoom(id));
            else await socket.leave(gmRoom(id));
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
   * Rejoint la room à la demande : un client peut émettre juste après un
   * reconnect, avant que `campaign:join` ne soit traité (course). L'adhésion
   * DB de `requireMember` reste la seule autorité.
   */
  private async ensureJoined(socket: Socket, campaignId: string): Promise<void> {
    const data = socket.data as SocketData;
    if (data.campaigns?.includes(campaignId)) return;
    const member = await this.requireMember(socket, campaignId);
    await socket.join(campaignRoom(campaignId));
    if (member.role === "GM") await socket.join(gmRoom(campaignId));
    data.campaigns = [...new Set([...(data.campaigns ?? []), campaignId])];
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
    const member = await this.requireMember(socket, campaignId);

    const room = campaignRoom(campaignId);
    await socket.join(room);
    if (member.role === "GM") await socket.join(gmRoom(campaignId));
    data.campaigns = [...new Set([...(data.campaigns ?? []), campaignId])];

    this.events.emit("campaign.joined", { campaignId, userId: data.userId });
    void this.plugins?.dispatchHook("campaign:joined", campaignId, {
      userId: data.userId,
    });
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
    await this.ensureJoined(socket, campaignId);
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

  /**
   * Suivi des choix joueurs : le client Next a déjà persisté (server
   * action) puis notifie — le gateway re-vérifie l'adhésion et relaie
   * l'invalidation dans la room, sans touching à la donnée.
   */
  @SubscribeMessage("choices:update")
  async choicesUpdate(
    @MessageBody() raw: unknown,
    @ConnectedSocket() socket: Socket,
  ): Promise<{ ok: true } | undefined> {
    const { campaignId } = parseWs(choicesUpdateSchema, raw);
    const data = await this.requireAuth(socket);
    if (!data.userId) throw new WsException("Non authentifié");
    await this.ensureJoined(socket, campaignId);
    if (!this.allowEvent(socket, "choices:update", 5)) return undefined;
    await this.requireMember(socket, campaignId);

    socket.to(`campaign:${campaignId}`).emit("choices:update", { campaignId });
    return { ok: true };
  }

  /**
   * Relais de l'état d'ambiance (lecture synchronisée) : le MJ a déjà
   * persisté (server action) puis notifie — le gateway re-vérifie
   * l'adhésion (MJ exigé, la lecture est pilotée par le MJ) et rejoue
   * l'état dans la room, sans toucher à la donnée.
   */
  @SubscribeMessage("ambiance:state")
  async ambianceState(
    @MessageBody() raw: unknown,
    @ConnectedSocket() socket: Socket,
  ): Promise<{ ok: true } | undefined> {
    const { campaignId, state } = parseWs(ambianceStateRelaySchema, raw);
    const data = await this.requireAuth(socket);
    if (!data.userId) throw new WsException("Non authentifié");
    await this.ensureJoined(socket, campaignId);
    if (!this.allowEvent(socket, "ambiance:state", 5)) return undefined;
    await this.requireMember(socket, campaignId, { gmOnly: true });

    socket.to(`campaign:${campaignId}`).emit("ambiance:state", { campaignId, state });
    return { ok: true };
  }

  /** Liste des playlists d'ambiance modifiée : invalidation dans la room
   *  (les vues server fraîches sont relues par chaque client). */
  @SubscribeMessage("ambiance:playlists-changed")
  async ambiancePlaylistsChanged(
    @MessageBody() raw: unknown,
    @ConnectedSocket() socket: Socket,
  ): Promise<{ ok: true } | undefined> {
    const { campaignId } = parseWs(ambiancePlaylistsChangedSchema, raw);
    const data = await this.requireAuth(socket);
    if (!data.userId) throw new WsException("Non authentifié");
    await this.ensureJoined(socket, campaignId);
    if (!this.allowEvent(socket, "ambiance:playlists-changed", 5)) return undefined;
    await this.requireMember(socket, campaignId);

    socket.to(`campaign:${campaignId}`).emit("ambiance:playlists-changed", { campaignId });
    return { ok: true };
  }

  /** Déplacement de token (drag) : broadcast aux AUTRES clients de la room. */
  @SubscribeMessage("token:move")
  async tokenMove(@MessageBody() raw: unknown, @ConnectedSocket() socket: Socket): Promise<void> {
    const { campaignId, tokenId, x, y, rot } = parseWs(tokenMoveRequestSchema, raw);
    const data = await this.requireAuth(socket);
    if (!data.userId) throw new WsException("Non authentifié");
    await this.ensureJoined(socket, campaignId);
    // Drag : quota élevé (frames de souris), puis ignoré sans exception.
    if (!this.allowEvent(socket, "token:move", 30)) return;
    // Adhésion revérifiée en DB (cache 30 s) : le drag reste léger.
    const member = await this.requireMember(socket, campaignId);

    const prev = await this.prisma.vttScene.findUnique({
      where: { campaignId },
      select: { state: true },
    });
    const parsed = prev ? sceneStateSchema.safeParse(prev.state) : null;
    const scene = parsed?.success ? parsed.data : null;

    // Un joueur ne déplace que SES jetons ; le MJ déplace tout.
    if (member.role !== "GM") {
      const token = scene?.tokens.find((t) => t.id === tokenId);
      if (!token || token.ownerId !== data.userId) {
        throw new WsException("Jeton non déplaçable");
      }
    }

    await this.broadcastTokenMoved(campaignId, socket.id, scene, {
      tokenId,
      x,
      y,
      ...(rot === undefined ? {} : { rot }),
    });
  }

  /**
   * `token:moved` ne part plus à toute la room : le MJ reçoit tout, un joueur
   * uniquement les jetons que sa vision couvre (même règle que son client).
   * shortcut: visibilité calculée sur la scène persistée (débounce 500 ms) →
   * un drag suivant une création de jeton attend le commit pour les joueurs.
   */
  private async broadcastTokenMoved(
    campaignId: string,
    senderId: string,
    scene: SceneState | null,
    payload: TokenMoved,
  ): Promise<void> {
    this.server.to(gmRoom(campaignId)).emit("token:moved", payload);
    if (!scene) return;
    const segs = wallSegs(scene.walls);
    const moved = scene.tokens.find((t) => t.id === payload.tokenId);
    if (!moved) return;
    const target = {
      ...moved,
      x: payload.x,
      y: payload.y,
      rot: payload.rot ?? moved.rot,
    };
    const sockets = await this.server.in(campaignRoom(campaignId)).fetchSockets();
    for (const client of sockets) {
      if (client.id === senderId || client.rooms.has(gmRoom(campaignId))) continue;
      const userId = (client.data as SocketData).userId;
      if (!userId) continue;
      const viewers = scene.tokens.filter((t) => t.ownerId === userId);
      if (
        !scene.fog.on ||
        isTokenVisible(target, viewers, segs, scene.grid.size, scene.fog.sightCells)
      ) {
        client.emit("token:moved", payload);
      }
    }
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
    await this.ensureJoined(socket, campaignId);
    if (!this.allowEvent(socket, "plugin:event", 10)) return;
    const member = await this.requireMember(socket, campaignId);
    // Relais MJ-only : les plugins actuels (combat) sont pilotés par le MJ.
    // Ouvrir un type au joueur = valider explicitement ce type ici.
    if (member.role !== "GM") throw new WsException("Réservé aux MJ");

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { enabledPlugins: true },
    });
    if (!campaign?.enabledPlugins.includes(pluginId)) {
      throw new WsException(`Plugin désactivé : ${pluginId}`);
    }

    const fromName = data.userName ?? "Anonyme";
    socket.to(`campaign:${campaignId}`).emit("plugin:event", {
      pluginId,
      type,
      payload,
      fromName,
    });
    this.events.emit("plugin.event", { campaignId, pluginId, type, fromName });
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
    await this.ensureJoined(socket, campaignId);
    if (!this.allowEvent(socket, "scene:commit", 10)) return undefined;
    const member = await this.requireMember(socket, campaignId);

    // Commit = state complet : on relit l'état persisté (normalisé par le
    // schéma, donc compatible avec les anciens murs en tableau de points).
    const prev = await this.prisma.vttScene.findUnique({
      where: { campaignId },
      select: { state: true },
    });
    const parsedPrev = prev ? sceneStateSchema.safeParse(prev.state) : null;
    const before = parsedPrev?.success ? parsedPrev.data : null;

    if (member.role !== "GM") {
      if (!before) throw new WsException("Scène non modifiable");
      // Le client joueur ne reçoit que l'état filtré (murs secrets retirés,
      // jetons hors vision absents) : on restitue l'état persisté avant la
      // comparaison, sinon tout commit joueur serait refusé.
      const prior = new Map(before.tokens.map((t) => [t.id, t]));
      if (state.tokens.some((t) => !prior.has(t.id))) {
        throw new WsException("Création de jeton réservée au MJ");
      }
      const submitted = new Map(state.tokens.map((t) => [t.id, t]));
      // Un jeton visible pour le joueur ne peut pas disparaître de son commit ;
      // les jetons invisibles (filtrés) sont restitués depuis l'état persisté.
      const beforeView = sceneStateForViewer(before, {
        isGM: false,
        userId: data.userId,
        tokenOwners: new Map(before.tokens.map((t) => [t.id, t.ownerId] as const)),
      });
      if (beforeView.tokens.some((t) => !submitted.has(t.id))) {
        throw new WsException("Suppression de jeton réservée au MJ");
      }
      state.tokens = before.tokens.map((t) => submitted.get(t.id) ?? t);
      // Murs : le joueur ne peut pas les modifier. On compare sa vue filtrée
      // (sans secrets) puis on restaure les murs persistés, secrets compris.
      if (
        JSON.stringify(state.walls.filter((w) => w.type !== "secret")) !==
        JSON.stringify(beforeView.walls)
      ) {
        throw new WsException("Scène non modifiable");
      }
      state.walls = before.walls;
      this.assertPlayerCommit(before, state, data.userId);
      // Les notes de théâtre ne sont pas exposées au client joueur : on
      // conserve celles du MJ au lieu de les écraser avec son tableau vide.
      state.theatreNotes = before.theatreNotes;
    }
    await this.assertNoteIds(campaignId, before, state);

    this.scheduleScenePersist(campaignId, state);
    await this.broadcastSceneState(campaignId, socket.id, state);
    return { ok: true };
  }

  /**
   * `scene:state` : complet pour la room MJ, filtré par socket pour les
   * joueurs (murs secrets, notes de théâtre, jetons hors vision).
   */
  private async broadcastSceneState(
    campaignId: string,
    senderId: string,
    state: SceneState,
  ): Promise<void> {
    this.server.to(gmRoom(campaignId)).emit("scene:state", state);
    const tokenOwners = new Map(state.tokens.map((t) => [t.id, t.ownerId] as const));
    const sockets = await this.server.in(campaignRoom(campaignId)).fetchSockets();
    for (const client of sockets) {
      if (client.id === senderId || client.rooms.has(gmRoom(campaignId))) continue;
      const userId = (client.data as SocketData).userId;
      if (!userId) continue;
      client.emit("scene:state", sceneStateForViewer(state, { isGM: false, userId, tokenOwners }));
    }
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
    this.events.emit("scene.activated", {
      campaignId,
      userId: data.userId,
      userName: data.userName ?? "Anonyme",
    });
  }

  /**
   * Fiche enregistrée (autosave wiki ou PV/CA du jeton) : le serveur relit la
   * fiche et diffuse un patch minimal (nom/PV/PV max/CA) aux AUTRES clients de
   * la room — l'émetteur est exclu, sa frappe en cours pouvant être plus
   * récente que la sauvegarde. Aucune écriture de scène ici : les clients VTT
   * appliquent le patch et leur commit d'état habituel persiste — pas de course
   * avec `scene:commit`.
   */
  @SubscribeMessage("fiche:sync")
  async ficheSync(@MessageBody() raw: unknown, @ConnectedSocket() socket: Socket): Promise<void> {
    const { campaignId, entityId } = parseWs(ficheSyncRequestSchema, raw);
    const data = await this.requireAuth(socket);
    if (!data.userId) throw new WsException("Non authentifié");
    await this.ensureJoined(socket, campaignId);
    if (!this.allowEvent(socket, "fiche:sync", 10)) return;
    const member = await this.requireMember(socket, campaignId);

    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId, campaignId },
      select: {
        id: true,
        title: true,
        type: true,
        data: true,
        gmOnly: true,
        assignees: { select: { userId: true } },
      },
    });
    if (!entity) return; // supprimée entre-temps : rien à diffuser
    if (member.role !== "GM") {
      // Fiche secrète : seule la session MJ peut déclencher sa diffusion.
      if (entity.gmOnly) throw new WsException("Réservé aux MJ");
      // Joueur : assigné à la fiche, ou propriétaire d'un jeton lié.
      const assigned = entity.assignees.some((a) => a.userId === data.userId);
      if (!assigned) {
        const scene = await this.prisma.vttScene.findUnique({
          where: { campaignId },
          select: { state: true },
        });
        const parsed = scene ? sceneStateSchema.safeParse(scene.state) : null;
        const ownsToken =
          parsed?.success &&
          parsed.data.tokens.some((t) => t.noteId === entityId && t.ownerId === data.userId);
        if (!ownsToken) throw new WsException("Fiche non accessible");
      }
    }

    const template = await this.prisma.jsonTemplate.findFirst({
      where: { id: entity.type, campaignId },
      select: { schema: true },
    });
    const parsedTemplate = template ? templateSchemaSchema.safeParse(template.schema) : null;
    const schema = parsedTemplate?.success ? parsedTemplate.data : null;

    const rawData = entity.data;
    const entityLike = {
      title: entity.title,
      data:
        rawData && typeof rawData === "object" && !Array.isArray(rawData)
          ? (rawData as Record<string, unknown>)
          : {},
    };

    const payload = {
      entityId,
      keys: resolveCombatKeys(entityLike, schema),
      patch: entityTokenPatch(entityLike, schema),
    };
    // Fiche secrète : room MJ uniquement.
    if (entity.gmOnly) {
      socket.to(gmRoom(campaignId)).emit("fiche:combat", payload);
      return;
    }
    // Sans assigné : visible par tous les joueurs (règle visibleEntityWhere).
    if (entity.assignees.length === 0) {
      socket.to(campaignRoom(campaignId)).emit("fiche:combat", payload);
      return;
    }
    // Assignée : MJ + assignés + propriétaires d'un jeton lié.
    socket.to(gmRoom(campaignId)).emit("fiche:combat", payload);
    const recipients = new Set(entity.assignees.map((a) => a.userId));
    // shortcut: scène persistée (débounce 500 ms) → un lien jeton tout juste
    // créé n'est ciblé qu'après le prochain commit.
    const scene = await this.prisma.vttScene.findUnique({
      where: { campaignId },
      select: { state: true },
    });
    const parsedScene = scene ? sceneStateSchema.safeParse(scene.state) : null;
    if (parsedScene?.success) {
      for (const token of parsedScene.data.tokens) {
        if (token.noteId === entityId && token.ownerId) {
          recipients.add(token.ownerId);
        }
      }
    }
    const sockets = await this.server.in(campaignRoom(campaignId)).fetchSockets();
    for (const client of sockets) {
      if (client.id === socket.id || client.rooms.has(gmRoom(campaignId))) continue;
      const userId = (client.data as SocketData).userId;
      if (userId && recipients.has(userId)) {
        client.emit("fiche:combat", payload);
      }
    }
  }

  /** Jet de dés : le serveur tire (seed crypto) puis broadcast le résultat. */
  @SubscribeMessage("dice:roll")
  async diceRoll(@MessageBody() raw: unknown, @ConnectedSocket() socket: Socket): Promise<void> {
    const { campaignId, expression } = parseWs(diceRollRequestSchema, raw);
    const data = await this.requireAuth(socket);
    if (!data.userId) throw new WsException("Non authentifié");
    await this.ensureJoined(socket, campaignId);
    // Jet coûteux (crypto seed + macros) : 5/s par socket, puis ignoré.
    if (!this.allowEvent(socket, "dice:roll", 5)) return;
    const member = await this.requireMember(socket, campaignId);

    let payload: DiceRoll;
    try {
      const resolved = await this.resolveMacros(campaignId, expression, member.role === "GM");
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
  private async resolveMacros(
    campaignId: string,
    expression: string,
    isGM: boolean,
  ): Promise<string> {
    if (!expression.includes("@")) return expression;
    const entities = await this.prisma.entity.findMany({
      // Une note MJ ne doit pas fuiter ses valeurs dans le total d'un joueur.
      where: { campaignId, ...(isGM ? {} : { gmOnly: false }) },
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

  /**
   * Commit complet d'un joueur : la scène (murs/grille/carte/brouillard) est
   * intouchable, et seuls PV/CA + vision de SES jetons peuvent changer.
   * Un jeton absent de l'état persisté = tentative de création.
   */
  private assertPlayerCommit(before: SceneState, next: SceneState, userId: string): void {
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    if (
      !same(before.walls, next.walls) ||
      !same(before.grid, next.grid) ||
      before.mapUrl !== next.mapUrl ||
      !same(before.fog, next.fog)
    ) {
      throw new WsException("Scène non modifiable");
    }
    if (next.tokens.length !== before.tokens.length) {
      throw new WsException("Ajout ou suppression de jeton réservé au MJ");
    }
    const prior = new Map(before.tokens.map((t) => [t.id, t]));
    for (const token of next.tokens) {
      const old = prior.get(token.id);
      if (!old) throw new WsException("Création de jeton réservée au MJ");
      if (same(token, old)) continue; // commit complet : jeton inchangé
      if (old.ownerId !== userId) throw new WsException("Jeton non modifiable");
      const ownFieldsOnly =
        token.x === old.x &&
        token.y === old.y &&
        token.rot === old.rot &&
        token.name === old.name &&
        token.color === old.color &&
        token.size === old.size &&
        token.noteId === old.noteId &&
        token.ownerId === old.ownerId &&
        token.imageUrl === old.imageUrl &&
        same(token.light, old.light);
      if (!ownFieldsOnly) throw new WsException("Champs du jeton non modifiables");
    }
  }

  /** `noteId` doit référencer une Entity de la campagne (vérifié en DB pour
   *  le MJ et les joueurs, uniquement quand la valeur change). */
  private async assertNoteIds(
    campaignId: string,
    before: SceneState | null,
    next: SceneState,
  ): Promise<void> {
    const prior = new Map((before?.tokens ?? []).map((t) => [t.id, t.noteId]));
    const ids = [
      ...new Set(
        next.tokens
          .filter((t) => t.noteId !== null && prior.get(t.id) !== t.noteId)
          .map((t) => t.noteId as string),
      ),
    ];
    if (ids.length === 0) return;
    const found = await this.prisma.entity.findMany({
      where: { campaignId, id: { in: ids } },
      select: { id: true },
    });
    if (found.length !== ids.length) throw new WsException("Fiche liée introuvable");
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
