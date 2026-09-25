"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "nexora-private-invitation";

export function InvitationGate({ sessionPending }: { sessionPending: boolean }) {
  const userEmail = useAppStore((state) => state.userEmail);
  const setView = useAppStore((state) => state.setView);
  const openOffer = useAppStore((state) => state.openOffer);
  const prompted = useRef(false);
  const processing = useRef(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const incomingToken = url.searchParams.get("invitation")?.trim();
    if (incomingToken) {
      window.sessionStorage.setItem(STORAGE_KEY, incomingToken);
      url.searchParams.delete("invitation");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    if (sessionPending || processing.current) return;
    const token = window.sessionStorage.getItem(STORAGE_KEY);
    if (!token) return;
    if (!userEmail) {
      setView("login");
      if (!prompted.current) {
        prompted.current = true;
        toast({
          title: "Invitation privée",
          description: "Connectez-vous avec l’adresse qui a reçu l’invitation.",
        });
      }
      return;
    }

    processing.current = true;
    fetch("/api/offers/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; message?: string; offer?: { id: string; title: string } }
          | null;
        if (!response.ok || !payload?.offer) {
          throw new Error(payload?.error || "Cette invitation ne peut pas être ouverte.");
        }
        window.sessionStorage.removeItem(STORAGE_KEY);
        toast({
          title: "Accès confirmé",
          description: payload.message || `Vous pouvez consulter « ${payload.offer.title} ».`,
        });
        openOffer(payload.offer.id);
      })
      .catch((error: unknown) => {
        window.sessionStorage.removeItem(STORAGE_KEY);
        toast({
          title: "Invitation indisponible",
          description: error instanceof Error ? error.message : "Réessayez dans quelques instants.",
          variant: "destructive",
        });
      })
      .finally(() => { processing.current = false; });
  }, [openOffer, sessionPending, setView, userEmail]);

  return null;
}
