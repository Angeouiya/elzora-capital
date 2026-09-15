import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;
  const userRole = (req.auth?.user as unknown as Record<string, unknown>)?.role as
    | string
    | undefined;

  // Routes admin protégées
  if (pathname.startsWith("/admin") && pathname !== "/admin/connexion") {
    if (!isAuthenticated || userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/connexion", req.url));
    }
  }

  // Routes dashboard investisseur
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/connexion", req.url));
    }
  }

  // Routes entreprise protégées
  if (
    pathname.startsWith("/entreprise/dashboard") ||
    pathname.startsWith("/entreprise/projet/") ||
    pathname.startsWith("/entreprise/financements")
  ) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/connexion", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/entreprise/dashboard/:path*",
    "/entreprise/projet/:path*",
    "/entreprise/financements/:path*",
  ],
};
