import type { PortalView } from "@/lib/store";

const NOTIFICATION_VIEW_ALIASES: Record<string, PortalView> = {
  portfolio: "investor_dashboard",
  investor_dashboard: "investor_dashboard",
  company_dashboard: "company_dashboard",
  explore: "explore",
  account: "account",
};

export function notificationActionView(action: string | null | undefined): PortalView | null {
  if (!action) return null;
  return NOTIFICATION_VIEW_ALIASES[action.trim()] || null;
}
