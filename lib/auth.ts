import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          accountType: user.accountType,
          kycStatus: user.kycStatus,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
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
  pages: {
    signIn: "/connexion",
  },
});
