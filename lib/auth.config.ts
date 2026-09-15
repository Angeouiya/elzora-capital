import type { NextAuthConfig } from "next-auth";

/**
 * Configuration NextAuth partagée, compatible Edge Runtime (middleware) :
 * aucun import de Prisma ni de bcrypt ici — uniquement la vérification JWT
 * et l'enrichissement session/token.
 */
export const authConfig = {
  // Obligatoire derrière Cloudflare Workers / workers.dev : NextAuth
  // doit faire confiance à l'hôte transmis par la requête.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/connexion",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as Record<string, unknown>).role;
        token.accountType = (user as unknown as Record<string, unknown>).accountType;
        token.kycStatus = (user as unknown as Record<string, unknown>).kycStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // NextAuth v5 (JWT) ne copie pas automatiquement l'identifiant :
        // token.sub contient l'id utilisateur défini à la connexion.
        (session.user as unknown as Record<string, unknown>).id = token.sub;
        (session.user as unknown as Record<string, unknown>).role = token.role;
        (session.user as unknown as Record<string, unknown>).accountType = token.accountType;
        (session.user as unknown as Record<string, unknown>).kycStatus = token.kycStatus;
      }
      return session;
    },
  },
  providers: [], // ajoutés dans lib/auth.ts (Node uniquement — non-Edge)
} satisfies NextAuthConfig;
