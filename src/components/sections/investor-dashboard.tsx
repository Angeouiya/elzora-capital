"use client";
import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from "recharts";
import { fmtFCFA, fmtCompact } from "@/lib/finance";
import { toast } from "@/hooks/use-toast";
import {
  Wallet,
  Coins,
  ArrowDownToLine,
  Bell,
  ArrowRight,
  ShieldCheck,
  PieChart as PieIcon,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Landmark,
  Clock,
} from "lucide-react";

const CHART_COLORS = ["#B6FF00", "#166534", "#101010", "#6b6b6b", "#C62828"];

interface DashboardUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  language: string;
  kycStatus: string;
}

interface DashboardInvestment {
  id: string;
  offerId: string;
  investorType: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  amount: number;
  sharePct: number;
  status: string;
  signedAt: string | null;
  paymentConfirmedAt: string | null;
  createdAt: string;
  expectedRepayment: number | null;
  receivedToDate: number;
  remainingDue: number | null;
  availableBalance: number;
  projectionLabel: string | null;
  project?: {
    id: string;
    title: string;
    sector: string;
    country: string;
    city: string;
    instrumentType: string;
    company?: {
      legalName: string;
      tradeName?: string | null;
      legalForm: string;
    };
  };
}

interface DashboardNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string | null;
}

interface InvestorDashboardData {
  user: DashboardUser | null;
  investments: DashboardInvestment[];
  notifications: DashboardNotification[];
  portfolio: {
    totalInvested: number;
    availableBalance: number;
    receivedTotal: number;
    pendingPayments: number;
    activeDeals: number;
    bySector: { name: string; value: number }[];
  } | null;
}

function NotLoggedIn() {
  const setView = useAppStore((s) => s.setView);
  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-nexora-pale">
          <Wallet className="h-7 w-7 text-positive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Mon portefeuille</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour accéder à votre portefeuille d&apos;investissements,
          vos notifications et vos prochains remboursements.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => setView("login")} className="btn-nexora w-full">
            Se connecter
          </Button>
          <Button
            variant="ghost"
            onClick={() => setView("register")}
            className="w-full"
          >
            Créer un compte
          </Button>
        </div>
      </div>
    </section>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="mx-auto max-w-md px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="rounded-xl border border-nexora-danger/30 bg-[#FFF5F5] p-6">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-nexora-danger" />
        <p className="text-sm font-semibold text-nexora-danger">
          Impossible de charger votre portefeuille
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Vérifiez votre connexion et réessayez.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={onRetry}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      </div>
    </section>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return (
        <Badge className="bg-nexora-pale text-positive">Confirmé</Badge>
      );
    case "pending_payment":
      return (
        <Badge className="bg-[#FFF8E1] text-[#8a6d00]">
          En attente de confirmation
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-[#FFF5F5] text-nexora-danger">Rejeté</Badge>
      );
    case "refunded":
      return <Badge variant="secondary">Remboursé</Badge>;
    case "cancelled":
      return <Badge variant="outline">Annulé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function instrumentBadge(type?: string) {
  if (type === "equity") {
    return <Badge className="bg-nexora-lime text-nexora-black">Action</Badge>;
  }
  return <Badge variant="outline">Dette</Badge>;
}

export function InvestorDashboard() {
  const userEmail = useAppStore((s) => s.userEmail);
  const setView = useAppStore((s) => s.setView);
  const openOffer = useAppStore((s) => s.openOffer);

  const [data, setData] = useState<InvestorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/investor/dashboard")
      .then(async (r) => {
        if (r.status === 401) {
          // Pas connecté — laisser vide
          setData(null);
          setLoading(false);
          return;
        }
        if (!r.ok) throw new Error("Erreur " + r.status);
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Erreur réseau");
        setLoading(false);
      });
  }, [reloadKey]);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }
    void reload();
  }, [userEmail, reloadKey, reload]);

  if (!userEmail) return <NotLoggedIn />;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-10 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        onRetry={() => {
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  if (!data?.user) {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Aucun compte investisseur trouvé pour{" "}
          <strong className="text-foreground">{userEmail}</strong>.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Astuce : utilisez{" "}
          <code className="rounded bg-secondary px-1 py-0.5 font-mono">
            investisseur@demo.nexora
          </code>{" "}
          pour la démonstration.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setView("explore")}
        >
          Explorer les offres
        </Button>
      </section>
    );
  }

  const { user, investments, notifications, portfolio } = data;
  const fullName = `${user.firstName} ${user.lastName}`.trim() || user.email;
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  const totalInvested = portfolio?.totalInvested ?? 0;
  const receivedTotal = portfolio?.receivedTotal ?? 0;
  const availableBalance = portfolio?.availableBalance ?? 0;

  const pendingCount = investments.filter(
    (i) => i.status === "pending_payment"
  ).length;

  const handleConfirmPayment = async (investmentId: string) => {
    setConfirmingId(investmentId);
    try {
      const res = await fetch(
        `/api/investments/${investmentId}/confirm`,
        { method: "POST" }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Confirmation échouée",
          description: body?.error || "Réessayez ultérieurement.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Paiement confirmé",
        description:
          "Votre investissement est désormais confirmé et apparaît dans votre portefeuille.",
      });
      setReloadKey((k) => k + 1);
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Réessayez ultérieurement.",
        variant: "destructive",
      });
    } finally {
      setConfirmingId(null);
    }
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payoutAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "Montant invalide",
        description: "Saisissez un montant entier supérieur à 0.",
        variant: "destructive",
      });
      return;
    }
    if (!payoutAccount.trim()) {
      toast({
        title: "Compte bénéficiaire requis",
        description: "Indiquez votre IBAN ou numéro de compte Mobile Money.",
        variant: "destructive",
      });
      return;
    }
    if (amount > availableBalance) {
      toast({
        title: "Solde insuffisant",
        description: `Disponible : ${fmtFCFA(availableBalance)}.`,
        variant: "destructive",
      });
      return;
    }
    setPayoutSubmitting(true);
    try {
      const res = await fetch("/api/investor/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          beneficiaryAccount: payoutAccount.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Demande refusée",
          description: body?.error || "Réessayez ultérieurement.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Demande enregistrée",
        description:
          body?.notice ||
          "Votre demande de versement est en cours de traitement.",
      });
      setPayoutOpen(false);
      setPayoutAmount("");
      setPayoutAccount("");
      setReloadKey((k) => k + 1);
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Réessayez ultérieurement.",
        variant: "destructive",
      });
    } finally {
      setPayoutSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top bar — identity */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nexora-black text-sm font-bold text-nexora-lime">
            {initials || "??"}
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {fullName}
            </h1>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        {user.kycStatus === "verified" && (
          <div className="flex items-center gap-2 rounded-full bg-nexora-pale px-3 py-1.5 text-xs font-medium text-positive">
            <ShieldCheck className="h-3.5 w-3.5" />
            Identité vérifiée
          </div>
        )}
      </div>

      {/* 3 metrics max */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 1. Capital engagé */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Capital engagé
            </span>
            <Wallet className="h-4 w-4 text-foreground" />
          </div>
          <p className="tnum mt-2 text-2xl font-bold text-foreground">
            {fmtFCFA(totalInvested)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Réparti sur {portfolio?.activeDeals ?? 0}{" "}
            {investments.length > 1 ? "dossiers actifs" : "dossier actif"}
          </p>
        </Card>

        {/* 2. Revenus reçus */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Revenus reçus
            </span>
            <Coins className="h-4 w-4 text-positive" />
          </div>
          <p className="tnum mt-2 text-2xl font-bold text-positive">
            {fmtFCFA(receivedTotal)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {receivedTotal > 0
              ? "Capital et intérêts distribués"
              : "Aucun remboursement reçu pour l'instant"}
          </p>
        </Card>

        {/* 3. Disponible */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Disponible
            </span>
            <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="tnum mt-2 text-2xl font-bold text-foreground">
            {fmtFCFA(availableBalance)}
          </p>
          {availableBalance > 0 ? (
            <Button
              size="sm"
              className="btn-nexora mt-2 h-7 px-3 text-xs"
              onClick={() => setPayoutOpen(true)}
            >
              <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
              Demander un versement
            </Button>
          ) : (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Vos revenus apparaîtront ici après distribution
            </p>
          )}
        </Card>
      </div>

      {/* Prochaine étape banner — pending investments */}
      {pendingCount > 0 && (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-lg border border-[#B6FF00]/40 bg-nexora-pale p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-positive" />
            <div>
              <p className="text-sm font-bold text-positive">
                Vous avez {pendingCount}{" "}
                {pendingCount > 1
                  ? "investissements en attente"
                  : "investissement en attente"}{" "}
                de confirmation de paiement.
              </p>
              <p className="mt-0.5 text-xs text-positive/90">
                Confirmez le paiement pour finaliser votre souscription.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Investments list */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <Wallet className="h-4 w-4" />
            Mes investissements
            <span className="tnum text-xs font-normal text-muted-foreground">
              ({investments.length})
            </span>
          </h2>

          {investments.length === 0 ? (
            <Card className="p-8 text-center">
              <Wallet className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Vous n&apos;avez encore aucun investissement
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Explorez les offres disponibles et souscrivez à partir de
                10 000 FCFA.
              </p>
              <Button
                onClick={() => setView("explore")}
                className="btn-nexora mt-4"
                size="sm"
              >
                Explorer les offres
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {investments.map((inv) => {
                const p = inv.project;
                const isEquity = p?.instrumentType === "equity";
                const isDebt = p?.instrumentType === "debt";
                const company = p?.company;
                const companyLabel =
                  company?.tradeName || company?.legalName || "—";
                const isPending = inv.status === "pending_payment";
                const received = inv.receivedToDate ?? 0;
                return (
                  <Card
                    key={inv.id}
                    className="cursor-pointer p-4 transition-shadow hover:shadow-md"
                    onClick={() => inv.offerId && openOffer(inv.offerId)}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                          {p?.title || "Projet"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {companyLabel}
                          {p?.city && (
                            <>
                              <span className="mx-1">·</span>
                              {p.city}, {p.country}
                            </>
                          )}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          {p?.sector && (
                            <Badge variant="outline">{p.sector}</Badge>
                          )}
                          {instrumentBadge(p?.instrumentType)}
                          {statusBadge(inv.status)}
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span className="tnum">
                              {new Date(inv.createdAt).toLocaleDateString(
                                "fr-FR"
                              )}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tnum text-base font-bold text-foreground">
                          {fmtCompact(inv.amount)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Soit{" "}
                          <span className="tnum font-medium text-foreground">
                            {fmtFCFA(inv.amount)}
                          </span>
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          <span className="tnum font-semibold text-foreground">
                            {inv.sharePct.toFixed(3).replace(".", ",")} %
                          </span>{" "}
                          {isEquity ? "du capital" : "de l'offre"}
                        </p>
                      </div>
                    </div>

                    {/* Financial details — clearly labeled */}
                    {isDebt && (
                      <div className="mt-3 grid grid-cols-1 gap-2 rounded-md border border-border/60 bg-secondary/40 p-3 sm:grid-cols-3">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Remboursement attendu
                          </p>
                          <p className="tnum mt-0.5 text-sm font-semibold text-muted-foreground">
                            {inv.expectedRepayment !== null
                              ? fmtFCFA(inv.expectedRepayment)
                              : "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            projeté, non garanti
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Reçu à ce jour
                          </p>
                          <p
                            className={`tnum mt-0.5 text-sm font-semibold ${
                              received > 0 ? "text-positive" : "text-muted-foreground"
                            }`}
                          >
                            {fmtFCFA(received)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Restant dû
                          </p>
                          <p className="tnum mt-0.5 text-sm font-semibold text-muted-foreground">
                            {inv.remainingDue !== null
                              ? fmtFCFA(inv.remainingDue)
                              : "—"}
                          </p>
                        </div>
                      </div>
                    )}
                    {isEquity && (
                      <div className="mt-3 rounded-md border border-border/60 bg-secondary/40 p-3">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            Sortie à terme, non garantie.
                          </span>{" "}
                          Aucun échéancier de remboursement pour cette prise de
                          participation.
                        </p>
                      </div>
                    )}

                    {/* Pending payment → confirm CTA */}
                    {isPending && (
                      <div
                        className="mt-3 flex flex-col items-start gap-2 rounded-md border border-[#FFF0B3] bg-[#FFF8E1] p-3 sm:flex-row sm:items-center sm:justify-between"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6d00]" />
                          <p className="text-xs text-[#8a6d00]">
                            Paiement en attente de confirmation. En mode
                            démonstration, vous pouvez simuler la réception du
                            paiement par le prestataire.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="btn-nexora shrink-0"
                          disabled={confirmingId === inv.id}
                          onClick={() => handleConfirmPayment(inv.id)}
                        >
                          {confirmingId === inv.id ? (
                            <>
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Confirmation…
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              Confirmer le paiement
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column — allocation + notifications */}
        <div className="flex flex-col gap-6">
          {/* Allocation par secteur */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <PieIcon className="h-4 w-4" />
              Répartition par secteur
            </h2>
            {portfolio && portfolio.bySector.length > 0 ? (
              <Card className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={portfolio.bySector}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {portfolio.bySector.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RTooltip
                      formatter={(v: number) => fmtCompact(v)}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {portfolio.bySector.map((s, i) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            background: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                        {s.name}
                      </span>
                      <span className="tnum font-medium text-foreground">
                        {fmtCompact(s.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Pas encore de répartition
              </Card>
            )}
          </div>

          {/* Notifications */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <Bell className="h-4 w-4" />
              Notifications
            </h2>
            {notifications.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Aucune notification
              </Card>
            ) : (
              <Card className="max-h-96 overflow-y-auto p-0">
                <ul className="divide-y divide-border">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`flex items-start gap-3 p-4 ${
                        !n.read ? "bg-nexora-pale/60" : ""
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          !n.read
                            ? "bg-nexora-lime text-nexora-black"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <Bell className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="shrink-0 text-[10px] font-bold uppercase text-positive">
                              Nouveau
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(n.createdAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Payout dialog */}
      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Demander un versement
            </DialogTitle>
            <DialogDescription>
              Indiquez le montant à retirer et le compte bénéficiaire vérifié.
              Le versement est traité par notre partenaire habilité. Délai 2-3
              jours ouvrés.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePayoutSubmit} className="space-y-4">
            <div>
              <Label htmlFor="payout-amount" className="text-xs">
                Montant (FCFA)
              </Label>
              <Input
                id="payout-amount"
                type="number"
                inputMode="numeric"
                min={1}
                max={availableBalance}
                step={1}
                required
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="50000"
                disabled={payoutSubmitting}
                className="tnum"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Disponible :{" "}
                <span className="tnum font-medium text-foreground">
                  {fmtFCFA(availableBalance)}
                </span>
              </p>
            </div>
            <div>
              <Label htmlFor="payout-account" className="text-xs">
                Compte bénéficiaire (IBAN ou Mobile Money)
              </Label>
              <Input
                id="payout-account"
                type="text"
                required
                value={payoutAccount}
                onChange={(e) => setPayoutAccount(e.target.value)}
                placeholder="SN12 0060 0000 1234 5678 9012"
                disabled={payoutSubmitting}
              />
            </div>
            <div className="flex items-start gap-2 rounded-md bg-secondary/60 p-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Aucune commission investisseur. Le versement est effectué vers
                un compte à votre nom préalablement vérifié.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPayoutOpen(false)}
                disabled={payoutSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="btn-nexora"
                disabled={payoutSubmitting}
              >
                {payoutSubmitting ? "Envoi…" : "Confirmer la demande"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Demo notice */}
      <p className="mt-8 text-center text-[11px] text-muted-foreground">
        Mode démonstration — données fictives. Les confirmations et versements
        sont simulés.
      </p>
    </section>
  );
}
