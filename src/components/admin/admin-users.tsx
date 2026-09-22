"use client";
import { useMemo, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KycReviewDialog } from "@/components/admin/kyc-review-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Building2,
  Search,
  ShieldCheck,
  ShieldAlert,
  Inbox,
  Eye,
} from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  kycStatus: string;
  createdAt: string;
}

interface CompanyRow {
  id: string;
  legalName: string;
  tradeName?: string | null;
  legalForm: string;
  country: string;
  activity: string;
  verificationStatus: string;
}

interface AdminStatsResponse {
  stats: Record<string, number>;
  offers: unknown[];
  projects: unknown[];
  users: UserRow[];
  companies: CompanyRow[];
}

const KYC_LABEL: Record<string, { label: string; cls: string }> = {
  incomplete: { label: "Incomplet", cls: "bg-secondary text-muted-foreground" },
  pending: { label: "En attente", cls: "bg-amber-100 text-amber-900" },
  review: { label: "En revue", cls: "bg-amber-100 text-amber-900" },
  verified: { label: "Vérifié", cls: "bg-nexora-pale text-positive" },
  rejected: { label: "Rejeté", cls: "bg-[#FFF5F5] text-nexora-danger" },
  refresh: { label: "À rafraîchir", cls: "bg-amber-100 text-amber-900" },
};

const COMPANY_VERIF: Record<string, { label: string; cls: string }> = {
  incomplete: { label: "Incomplet", cls: "bg-secondary text-muted-foreground" },
  pending: { label: "En attente", cls: "bg-amber-100 text-amber-900" },
  verified: { label: "Vérifiée", cls: "bg-nexora-pale text-positive" },
  rejected: { label: "Rejetée", cls: "bg-[#FFF5F5] text-nexora-danger" },
};

function EmptyState({ label }: { label: string }) {
  return (
    <div className="p-10 text-center">
      <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Aucune donnée inventée. Les résultats sont filtrés en temps réel.
      </p>
    </div>
  );
}

export function AdminUsers() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading } = useFetch<AdminStatsResponse>(`/api/admin/stats?refresh=${refreshKey}`);
  const [tab, setTab] = useState<"users" | "companies">("users");
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState<string>("all");
  const [verifFilter, setVerifFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    return data.users.filter((u) => {
      const matchSearch =
        !search ||
        `${u.firstName} ${u.lastName} ${u.email}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchKyc = kycFilter === "all" || u.kycStatus === kycFilter;
      return matchSearch && matchKyc;
    });
  }, [data, search, kycFilter]);

  const filteredCompanies = useMemo(() => {
    if (!data?.companies) return [];
    return data.companies.filter((c) => {
      const matchSearch =
        !search ||
        `${c.legalName} ${c.tradeName || ""} ${c.activity || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchVerif =
        verifFilter === "all" || c.verificationStatus === verifFilter;
      return matchSearch && matchVerif;
    });
  }, [data, search, verifFilter]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="mb-6 h-9 w-72" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="mt-4 h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Utilisateurs & Entreprises
        </h1>
        <p className="text-sm text-muted-foreground">
          Comptes particuliers et entreprises inscrits sur le portail — données live.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-md bg-secondary/60 p-1">
        <button
          data-control="tab"
          onClick={() => {
            setTab("users");
            setSearch("");
            setKycFilter("all");
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "users"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Particuliers
          <span className="tnum text-xs text-muted-foreground">
            ({data?.users.length || 0})
          </span>
        </button>
        <button
          data-control="tab"
          onClick={() => {
            setTab("companies");
            setSearch("");
            setVerifFilter("all");
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "companies"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Entreprises
          <span className="tnum text-xs text-muted-foreground">
            ({data?.companies.length || 0})
          </span>
        </button>
      </div>

      {/* Search + filter */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={
              tab === "users"
                ? "Rechercher un investisseur…"
                : "Rechercher une entreprise…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {tab === "users" ? (
          <Select value={kycFilter} onValueChange={setKycFilter}>
            <SelectTrigger size="sm" className="w-full sm:w-44">
              <SelectValue placeholder="KYC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les KYC</SelectItem>
              <SelectItem value="incomplete">Incomplet</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="review">En revue</SelectItem>
              <SelectItem value="verified">Vérifié</SelectItem>
              <SelectItem value="rejected">Rejeté</SelectItem>
              <SelectItem value="refresh">À rafraîchir</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Select value={verifFilter} onValueChange={setVerifFilter}>
            <SelectTrigger size="sm" className="w-full sm:w-44">
              <SelectValue placeholder="Vérification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="incomplete">Incomplet</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="verified">Vérifiée</SelectItem>
              <SelectItem value="rejected">Rejetée</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tables */}
      {tab === "users" ? (
        <Card className="overflow-hidden p-0">
          {filteredUsers.length === 0 ? (
            <EmptyState label="Aucun utilisateur ne correspond" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Pays</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead className="text-right">Dossier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => {
                  const kyc =
                    KYC_LABEL[u.kycStatus] ||
                    { label: u.kycStatus, cls: "bg-secondary" };
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="text-sm font-medium text-foreground">
                        {u.firstName} {u.lastName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell className="text-xs">{u.country}</TableCell>
                      <TableCell>
                        <Badge className={`border-0 text-xs ${kyc.cls}`}>
                          {kyc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="tnum text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {u.kycStatus !== "incomplete" ? (
                          <Button variant="outline" size="sm" onClick={() => setSelectedUser(u.id)}>
                            <Eye className="h-3.5 w-3.5" />
                            Examiner
                          </Button>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {filteredCompanies.length === 0 ? (
            <EmptyState label="Aucune entreprise ne correspond" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead>Raison sociale</TableHead>
                  <TableHead>Forme</TableHead>
                  <TableHead>Pays</TableHead>
                  <TableHead>Activité</TableHead>
                  <TableHead>Vérification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((c) => {
                  const verif =
                    COMPANY_VERIF[c.verificationStatus] ||
                    { label: c.verificationStatus, cls: "bg-secondary" };
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="text-sm font-semibold text-foreground">
                          {c.tradeName || c.legalName}
                        </p>
                        {c.tradeName && (
                          <p className="text-[11px] text-muted-foreground">
                            {c.legalName}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.legalForm}
                      </TableCell>
                      <TableCell className="text-xs">{c.country}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.activity || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`border-0 text-xs ${verif.cls}`}>
                          {verif.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* KYC notice */}
      <div className="mt-4 flex items-start gap-2 rounded-md bg-nexora-pale p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
        <p className="text-[11px] leading-relaxed text-positive">
          Les documents d&rsquo;identité et les coordonnées bancaires ne sont
          accessibles qu&rsquo;au personnel habilité (rôles{" "}
          <strong>compliance</strong> et <strong>finance</strong>). Les accès
          sont tracés dans le journal d&rsquo;audit.
        </p>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-md border-l-4 border-nexora bg-[#FFF5F5] p-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-nexora-danger" />
        <p className="text-[11px] leading-relaxed text-foreground">
          La modification manuelle du statut KYC d&rsquo;un utilisateur doit
          être motivée et contre-signée par le responsable conformité.
        </p>
      </div>

      <KycReviewDialog
        userId={selectedUser}
        open={Boolean(selectedUser)}
        onOpenChange={(next) => { if (!next) setSelectedUser(null); }}
        onChanged={() => setRefreshKey((key) => key + 1)}
      />
    </div>
  );
}
