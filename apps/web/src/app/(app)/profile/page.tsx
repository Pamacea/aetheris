import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileTabs, type ApiKeyItem } from "./profile-tabs";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = session.user.id;
  const [accounts, apiKeys] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      select: { providerId: true, accountId: true },
    }),
    prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const authAccounts = accounts.map(({ providerId, accountId }) => ({ providerId, accountId }));
  const keys: ApiKeyItem[] = apiKeys.map((key) => ({
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    createdAt: key.createdAt.toISOString(),
    expiresAt: key.expiresAt?.toISOString() ?? null,
    revokedAt: key.revokedAt?.toISOString() ?? null,
  }));

  return (
    <div className="mx-auto w-full lg:w-3/4 px-6 flex flex-1 flex-col gap-8 py-12">
      <header>
        <h1 className="text-3xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Profil
        </h1>
        <p className="text-sm text-muted">Votre compte Aetheris.</p>
      </header>

      <ProfileTabs
        name={session.user.name}
        email={session.user.email}
        authAccounts={authAccounts}
        apiKeys={keys}
      />
    </div>
  );
}
