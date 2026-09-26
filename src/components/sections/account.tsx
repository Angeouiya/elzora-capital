"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ContactRound,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAppStore, type Locale } from "@/lib/store";

interface AccountPayload {
  account: {
    id: string;
    email: string;
    phone: string | null;
    firstName: string;
    lastName: string;
    country: string;
    language: string;
    kycStatus: string;
    createdAt: string;
    lastLoginAt: string | null;
    passwordEnabled: boolean;
    loginMethods: string[];
  };
  sessions: Array<{
    id: string;
    deviceInfo: string;
    createdAt: string;
    lastActiveAt: string;
    current: boolean;
  }>;
}

const COPY = {
  fr: {
    kicker: "Mon compte",
    title: "Vos informations, simplement.",
    intro: "Mettez à jour vos coordonnées et gardez la maîtrise des appareils connectés à votre espace.",
    profile: "Informations personnelles",
    profileHelp: "Ces informations sont utilisées pour vos documents et le suivi de votre compte.",
    firstName: "Prénom",
    lastName: "Nom",
    email: "Adresse e-mail",
    phone: "Téléphone",
    country: "Pays de résidence",
    language: "Langue de communication",
    immutable: "Cette information est vérifiée avec votre identité.",
    save: "Enregistrer les modifications",
    saving: "Enregistrement…",
    saved: "Informations enregistrées",
    savedText: "Votre profil a été mis à jour.",
    security: "Mot de passe",
    securityHelp: "Après la modification, les autres appareils seront automatiquement déconnectés.",
    currentPassword: "Mot de passe actuel",
    nextPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le nouveau mot de passe",
    passwordHint: "Au moins 10 caractères.",
    changePassword: "Modifier mon mot de passe",
    changing: "Modification…",
    passwordChanged: "Mot de passe modifié",
    googleConnected: "Compte Google connecté",
    googleOnlyHelp: "Vous vous connectez avec Google. Aucun mot de passe NEXORA n’est enregistré pour ce compte.",
    devices: "Appareils connectés",
    devicesHelp: "Fermez toute connexion que vous ne reconnaissez pas.",
    thisDevice: "Cet appareil",
    connected: "Dernière activité",
    disconnect: "Déconnecter",
    disconnecting: "Fermeture…",
    disconnected: "Connexion fermée",
    noOtherDevice: "Aucun autre appareil connecté.",
    verified: "Identité vérifiée",
    verificationPending: "Vérification en cours",
    verificationIncomplete: "Identité à compléter",
    memberSince: "Membre depuis",
    loadError: "Impossible de charger votre compte.",
    retry: "Réessayer",
    signIn: "Se connecter",
    unavailable: "Action momentanément indisponible",
    mismatch: "Les nouveaux mots de passe ne correspondent pas.",
  },
  en: {
    kicker: "My account",
    title: "Your information, kept simple.",
    intro: "Update your contact details and stay in control of the devices connected to your space.",
    profile: "Personal information",
    profileHelp: "This information is used for your documents and account follow-up.",
    firstName: "First name",
    lastName: "Last name",
    email: "Email address",
    phone: "Phone",
    country: "Country of residence",
    language: "Communication language",
    immutable: "This information is verified with your identity.",
    save: "Save changes",
    saving: "Saving…",
    saved: "Information saved",
    savedText: "Your profile has been updated.",
    security: "Password",
    securityHelp: "After the change, other devices will be signed out automatically.",
    currentPassword: "Current password",
    nextPassword: "New password",
    confirmPassword: "Confirm new password",
    passwordHint: "At least 10 characters.",
    changePassword: "Change my password",
    changing: "Changing…",
    passwordChanged: "Password changed",
    googleConnected: "Google account connected",
    googleOnlyHelp: "You sign in with Google. No NEXORA password is stored for this account.",
    devices: "Connected devices",
    devicesHelp: "Close any connection you do not recognize.",
    thisDevice: "This device",
    connected: "Last activity",
    disconnect: "Sign out",
    disconnecting: "Closing…",
    disconnected: "Connection closed",
    noOtherDevice: "No other device is connected.",
    verified: "Identity verified",
    verificationPending: "Verification in progress",
    verificationIncomplete: "Identity to complete",
    memberSince: "Member since",
    loadError: "Unable to load your account.",
    retry: "Try again",
    signIn: "Sign in",
    unavailable: "Action temporarily unavailable",
    mismatch: "The new passwords do not match.",
  },
} as const;

export function Account() {
  const { locale, setLocale, setView } = useAppStore();
  const copy = COPY[locale];
  const [data, setData] = useState<AccountPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [closingSession, setClosingSession] = useState<string | null>(null);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", phone: "", language: locale });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/account", { cache: "no-store" });
      if (response.status === 401) {
        setData(null);
        setError("AUTH");
        return;
      }
      const payload = (await response.json()) as AccountPayload & { error?: string };
      if (!response.ok || !payload.account) throw new Error(payload.error || copy.loadError);
      setData(payload);
      setProfile({
        firstName: payload.account.firstName,
        lastName: payload.account.lastName,
        phone: payload.account.phone || "",
        language: payload.account.language === "en" ? "en" : "fr",
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const identityLabel = useMemo(() => {
    if (!data) return "";
    if (data.account.kycStatus === "verified") return copy.verified;
    if (["pending", "under_review"].includes(data.account.kycStatus)) return copy.verificationPending;
    return copy.verificationIncomplete;
  }, [copy, data]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const response = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "profile", ...profile }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || copy.unavailable);
      setLocale(profile.language as Locale);
      toast({ title: copy.saved, description: copy.savedText });
      await loadAccount();
    } catch (reason) {
      toast({
        title: copy.unavailable,
        description: reason instanceof Error ? reason.message : copy.unavailable,
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (passwords.next !== passwords.confirm) {
      toast({ title: copy.unavailable, description: copy.mismatch, variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const response = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "password",
          currentPassword: passwords.current,
          nextPassword: passwords.next,
        }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || copy.unavailable);
      setPasswords({ current: "", next: "", confirm: "" });
      toast({ title: copy.passwordChanged, description: payload.message });
      await loadAccount();
    } catch (reason) {
      toast({
        title: copy.unavailable,
        description: reason instanceof Error ? reason.message : copy.unavailable,
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const disconnect = async (sessionId: string) => {
    setClosingSession(sessionId);
    try {
      const response = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || copy.unavailable);
      setData((current) => current ? { ...current, sessions: current.sessions.filter((item) => item.id !== sessionId) } : current);
      toast({ title: copy.disconnected });
    } catch (reason) {
      toast({
        title: copy.unavailable,
        description: reason instanceof Error ? reason.message : copy.unavailable,
        variant: "destructive",
      });
    } finally {
      setClosingSession(null);
    }
  };

  if (loading) return <AccountSkeleton />;
  if (error || !data) {
    return (
      <section className="page-shell py-8 sm:py-12">
        <div className="mx-auto max-w-xl rounded-[1.75rem] border border-[#541249]/12 bg-white p-6 text-center shadow-[0_20px_60px_rgba(56,12,49,.08)] sm:p-8">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#541249]" />
          <h1 className="mt-4 text-2xl font-bold tracking-[-.03em]">{copy.loadError}</h1>
          <Button className="btn-nexora mt-6" onClick={() => error === "AUTH" ? setView("login") : void loadAccount()}>
            {error === "AUTH" ? copy.signIn : copy.retry}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell space-y-5 py-5 sm:space-y-6 sm:py-8">
      <header className="overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#541249_0%,#2f0a2a_60%,#160412_100%)] px-5 py-7 text-white shadow-[0_24px_60px_rgba(56,12,49,.2)] sm:px-8 sm:py-9">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#e8bedf]">{copy.kicker}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-.045em] sm:text-4xl">{copy.title}</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-white/72">{copy.intro}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[.08] p-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#541249]">
              <UserRound className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{data.account.firstName} {data.account.lastName}</span>
              <span className="mt-0.5 block text-xs text-white/58">{identityLabel}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.12fr_.88fr]">
        <article className="rounded-[1.5rem] border border-[#541249]/10 bg-white p-5 shadow-[0_16px_42px_rgba(56,12,49,.055)] sm:p-7">
          <SectionHeading icon={ContactRound} title={copy.profile} text={copy.profileHelp} />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label={copy.firstName} value={profile.firstName} onChange={(value) => setProfile((current) => ({ ...current, firstName: value }))} autoComplete="given-name" />
            <Field label={copy.lastName} value={profile.lastName} onChange={(value) => setProfile((current) => ({ ...current, lastName: value }))} autoComplete="family-name" />
            <Field label={copy.email} value={data.account.email} disabled />
            <Field label={copy.phone} value={profile.phone} onChange={(value) => setProfile((current) => ({ ...current, phone: value }))} autoComplete="tel" inputMode="tel" />
            <div>
              <Label className="text-sm font-semibold">{copy.country}</Label>
              <Input className="mt-2 h-11 rounded-xl bg-[#faf7f9]" value={data.account.country} disabled />
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{copy.immutable}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold">{copy.language}</Label>
              <SegmentedControl
                className="mt-2"
                value={profile.language}
                onValueChange={(value) => setProfile((current) => ({ ...current, language: value }))}
                ariaLabel={copy.language}
                options={[
                  { value: "fr", label: "Français" },
                  { value: "en", label: "English" },
                ]}
              />
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-[#541249]/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{copy.memberSince} {formatDate(data.account.createdAt, locale)}</p>
            <Button className="btn-nexora w-full sm:w-auto" onClick={() => void saveProfile()} disabled={savingProfile}>
              {savingProfile ? copy.saving : copy.save}
            </Button>
          </div>
        </article>

        <div className="space-y-5">
          <article className="rounded-[1.5rem] border border-[#541249]/10 bg-white p-5 shadow-[0_16px_42px_rgba(56,12,49,.055)] sm:p-7">
            <SectionHeading icon={LockKeyhole} title={copy.security} text={copy.securityHelp} />
            {data.account.loginMethods.includes("google") ? (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#541249]/10 bg-[#faf6f9] p-3.5">
                <ShieldCheck className="h-5 w-5 shrink-0 text-[#541249]" />
                <div><p className="text-sm font-bold">{copy.googleConnected}</p>{!data.account.passwordEnabled ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.googleOnlyHelp}</p> : null}</div>
              </div>
            ) : null}
            {data.account.passwordEnabled ? <div className="mt-5 space-y-4">
              <PasswordField label={copy.currentPassword} value={passwords.current} onChange={(value) => setPasswords((current) => ({ ...current, current: value }))} autoComplete="current-password" />
              <PasswordField label={copy.nextPassword} value={passwords.next} onChange={(value) => setPasswords((current) => ({ ...current, next: value }))} autoComplete="new-password" />
              <PasswordField label={copy.confirmPassword} value={passwords.confirm} onChange={(value) => setPasswords((current) => ({ ...current, confirm: value }))} autoComplete="new-password" />
              <p className="text-xs text-muted-foreground">{copy.passwordHint}</p>
              <Button
                variant="outline"
                className="h-11 w-full rounded-xl border-[#541249]/20 text-[#541249] hover:bg-[#f8eef6]"
                onClick={() => void changePassword()}
                disabled={savingPassword || !passwords.current || passwords.next.length < 10 || !passwords.confirm}
              >
                <KeyRound className="h-4 w-4" />
                {savingPassword ? copy.changing : copy.changePassword}
              </Button>
            </div> : null}
          </article>
        </div>
      </div>

      <article className="rounded-[1.5rem] border border-[#541249]/10 bg-white p-5 shadow-[0_16px_42px_rgba(56,12,49,.055)] sm:p-7">
        <SectionHeading icon={Smartphone} title={copy.devices} text={copy.devicesHelp} />
        <div className="mt-5 divide-y divide-[#541249]/8 rounded-2xl border border-[#541249]/10">
          {data.sessions.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{friendlyDevice(item.deviceInfo, locale)}</p>
                  {item.current ? <span className="rounded-full bg-[#efe2ed] px-2.5 py-1 text-xs font-semibold text-[#541249]">{copy.thisDevice}</span> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{copy.connected} · {formatDateTime(item.lastActiveAt, locale)}</p>
              </div>
              {!item.current ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full rounded-xl sm:w-auto"
                  onClick={() => void disconnect(item.id)}
                  disabled={closingSession === item.id}
                >
                  {closingSession === item.id ? copy.disconnecting : copy.disconnect}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        {data.sessions.every((item) => item.current) ? <p className="mt-4 text-sm text-muted-foreground">{copy.noOtherDevice}</p> : null}
      </article>
    </section>
  );
}

function SectionHeading({ icon: Icon, title, text }: { icon: typeof ContactRound; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4e7f1] text-[#541249]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-bold tracking-[-.02em]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: "tel";
}) {
  const id = `account-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-semibold">{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange?.(event.target.value)} disabled={disabled} autoComplete={autoComplete} inputMode={inputMode} className="mt-2 h-11 rounded-xl bg-white disabled:bg-[#faf7f9]" />
    </div>
  );
}

function PasswordField({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  const id = `account-${autoComplete}-${label.length}`;
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-semibold">{label}</Label>
      <Input id={id} type="password" value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="mt-2 h-11 rounded-xl" />
    </div>
  );
}

function friendlyDevice(userAgent: string, locale: Locale) {
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Firefox\//.test(userAgent)
      ? "Firefox"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : locale === "fr" ? "Navigateur" : "Browser";
  const device = /iPhone|iPad/.test(userAgent)
    ? "iPhone / iPad"
    : /Android/.test(userAgent)
      ? "Android"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Macintosh/.test(userAgent)
          ? "Mac"
          : locale === "fr" ? "Appareil" : "Device";
  return `${browser} · ${device}`;
}

function formatDate(value: string, locale: Locale) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { dateStyle: "long" }).format(date);
}

function formatDateTime(value: string, locale: Locale) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function AccountSkeleton() {
  return (
    <section className="page-shell space-y-5 py-5 sm:py-8" aria-label="Chargement" role="status">
      <Skeleton className="h-48 rounded-[1.75rem]" />
      <div className="grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-[30rem] rounded-[1.5rem]" />
        <Skeleton className="h-[30rem] rounded-[1.5rem]" />
      </div>
      <span className="sr-only">Chargement…</span>
    </section>
  );
}
