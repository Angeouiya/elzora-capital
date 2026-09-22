import type { Metadata } from "next";
import { AdminPortal } from "@/components/admin/admin-portal";

export const metadata: Metadata = {
  title: "Espace opérations | NEXORA Capital",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function OperationsPage() {
  return <AdminPortal />;
}
