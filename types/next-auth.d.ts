import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      accountType: string;
      kycStatus: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    accountType: string;
    kycStatus: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    accountType: string;
    kycStatus: string;
  }
}
