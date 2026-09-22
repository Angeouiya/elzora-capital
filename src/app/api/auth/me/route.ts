import { NextResponse } from "next/server";
import { getD1 } from "@/lib/d1";
import { getUserSession } from "@/lib/auth";

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  language: string;
  kycStatus: string;
}

interface MembershipRow {
  id: string;
  role: string;
  mandate: string;
  companyId: string;
  legalName: string;
  tradeName: string | null;
  legalForm: string;
  country: string;
  activity: string;
  verificationStatus: string;
}

export async function GET(req: Request) {
  try {
    const session = await getUserSession(req);
    if (!session) return NextResponse.json({ user: null, memberships: [] });
    const database = getD1();
    const user = await database
      .prepare(
        `SELECT id, email, firstName, lastName, country, language, kycStatus
         FROM User WHERE id = ? LIMIT 1`
      )
      .bind(session.userId)
      .first<UserRow>();
    if (!user) return NextResponse.json({ user: null, memberships: [] });

    const memberships = await database
      .prepare(
        `SELECT m.id, m.role, m.mandate, c.id AS companyId, c.legalName, c.tradeName,
                c.legalForm, c.country, c.activity, c.verificationStatus
         FROM CompanyMember m JOIN Company c ON c.id = m.companyId
         WHERE m.userId = ? ORDER BY c.legalName ASC`
      )
      .bind(user.id)
      .all<MembershipRow>();

    return NextResponse.json({
      user,
      memberships: memberships.results.map((entry) => ({
        id: entry.id,
        role: entry.role,
        mandate: entry.mandate,
        companyId: entry.companyId,
        company: {
          id: entry.companyId,
          legalName: entry.legalName,
          tradeName: entry.tradeName,
          legalForm: entry.legalForm,
          country: entry.country,
          activity: entry.activity,
          verificationStatus: entry.verificationStatus,
        },
      })),
    });
  } catch (error) {
    console.error("auth_me_failed", error);
    return NextResponse.json({ user: null, memberships: [] }, { status: 503 });
  }
}
