import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

/** Providers sociaux activés seulement si les credentials sont dans le .env racine. */
const socialProviders = {
  ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
    ? {
        discord: {
          clientId: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      }
    : {}),
};

export const enabledSocialProviders = Object.keys(socialProviders) as Array<"discord" | "github">;

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
  user: {
    additionalFields: {},
  },
});

export type Session = typeof auth.$Infer.Session;
