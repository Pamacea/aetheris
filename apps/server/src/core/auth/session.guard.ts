import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { User } from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import { parseSessionToken } from "./session.js";

export type AuthenticatedUser = Pick<User, "id" | "name" | "email">;

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Guard HTTP : valide la session Better Auth (cookie ou Bearer) contre la
 * base et attache `req.user`.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = parseSessionToken(req.headers);
    if (!token) throw new UnauthorizedException("Session manquante");

    const session = await this.prisma.session.findUnique({
      where: { token },
      select: { expiresAt: true, user: { select: { id: true, name: true, email: true } } },
    });
    if (!session) throw new UnauthorizedException("Session introuvable");
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException("Session expirée");
    }

    req.user = session.user;
    return true;
  }
}
