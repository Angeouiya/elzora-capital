import Link from "next/link";
import { NexoraLogo } from "@/components/NexoraLogo";

const screens = [
  { title: "Accueil Opportunités", description: "Liste des offres d'investissement disponibles", path: "/offres", icon: "grid_view" },
  { title: "Fiche Projet Analyse", description: "Détail d'une offre d'investissement", path: "/projet", icon: "description" },
  { title: "Souscription & Signature", description: "Étape de contrat et validation", path: "/souscription", icon: "edit_document" },
  { title: "Mon Portefeuille", description: "Vue des investissements actifs", path: "/portefeuille", icon: "account_balance_wallet" },
  { title: "Retrait de fonds", description: "Versement vers compte bancaire", path: "/retrait", icon: "payments" },
  { title: "Espace Entreprise", description: "Dashboard entreprise et financements", path: "/entreprise", icon: "apartment" },
  { title: "Dépôt de projet - Conditions", description: "Formulaire de financement (étape 3)", path: "/entreprise/conditions", icon: "fact_check" },
  { title: "Portail Admin Décaissements", description: "Console audit & risques", path: "/admin", icon: "shield_person" },
  { title: "Mon Profil", description: "Profil investisseur et activité", path: "/profil", icon: "person" },
  { title: "Paramètres", description: "Notifications, sécurité, préférences", path: "/parametres", icon: "settings" },
  { title: "Connexion", description: "Page de connexion au compte", path: "/connexion", icon: "login" },
  { title: "Inscription", description: "Création de compte investisseur", path: "/inscription", icon: "person_add" },
  { title: "Vérification KYC", description: "Documents et conformité identité", path: "/verification", icon: "verified_user" },
  { title: "Notifications", description: "Alertes et activités récentes", path: "/notifications", icon: "notifications" },
  { title: "Historique", description: "Transactions et mouvements", path: "/historique", icon: "history" },
];

export default function Home() {
  return (
    <main className="flex-1 w-full bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2 animate-fade-in-up">
          <NexoraLogo size={44} />
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface font-semibold">Nexora Capital</h1>
            <p className="text-body-sm text-secondary">Plateforme d&apos;investissement</p>
          </div>
        </div>
        <p className="text-body-md text-secondary mb-8 mt-4 animate-fade-in-up animate-fade-in-up-delay-1">
          Sélectionnez un écran pour le visualiser.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {screens.map((screen, i) => (
            <Link
              key={screen.path}
              href={screen.path}
              className="group bg-surface-container-lowest p-4 rounded-xl shadow-sm flex items-start gap-3 hover:bg-surface-container-low transition-all duration-200 hover:shadow-md hover-lift animate-fade-in-up"
              style={{ animationDelay: `${0.05 * i}s` }}
            >
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0 group-hover:bg-primary-container transition-colors duration-200">
                <span className="material-symbols-outlined text-[20px]">{screen.icon}</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">{screen.title}</h3>
                <p className="text-body-sm text-secondary mt-0.5">{screen.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
