import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { pageMeta } from "@/lib/meta";
import { PageHeader } from "@/components/common";

export const Route = createFileRoute("/confidentialite")({
  head: () => pageMeta("Politique de confidentialité", "Comment vos données sont utilisées dans l'application des occupants."),
  component: Privacy,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Privacy() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 text-muted-foreground">
      <PageHeader title="Politique de confidentialité" subtitle="Ce que nous collectons, pourquoi, et comment exercer vos droits." />

      <Section title="Responsable du traitement">
        <p>NOVA Serenity Group, gestionnaire de l'immeuble, édite cette application pour ses occupants.</p>
      </Section>

      <Section title="Données collectées et finalités">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-foreground">Compte</strong> : adresse e-mail, et si vous les renseignez prénom, nom, entreprise et étage. Pour vous connecter et personnaliser l'application.</li>
          <li><strong className="text-foreground">Inscriptions aux événements</strong> : pour gérer les places ; l'équipe de l'immeuble voit la liste des inscrits de ses événements.</li>
          <li><strong className="text-foreground">Préférences</strong> : newsletter et notifications, enregistrées uniquement avec votre accord.</li>
          <li><strong className="text-foreground">Messages envoyés à l'accueil</strong> : nom, e-mail, objet et message, pour vous répondre.</li>
          <li><strong className="text-foreground">Sécurité</strong> : si vous activez un mot de passe ou la double authentification, ces éléments sont conservés sous forme protégée ; personne, y compris NOVA Serenity, ne peut les lire.</li>
        </ul>
        <p>La consultation des contenus publics (événements, actualités, informations pratiques) ne nécessite aucun compte.</p>
      </Section>

      <Section title="Bases légales">
        <p>L'exécution du service que vous utilisez (compte, inscriptions, messages) et votre consentement pour la newsletter, que vous pouvez retirer à tout moment depuis « Mon compte ».</p>
      </Section>

      <Section title="Destinataires">
        <p>Les seules personnes habilitées de NOVA Serenity Group et de l'équipe de votre immeuble. Les données sont hébergées par nos prestataires techniques (hébergement de l'application et base de données), qui agissent pour notre compte. Elles ne sont ni vendues ni utilisées à des fins publicitaires.</p>
      </Section>

      <Section title="Durées de conservation">
        <ul className="list-disc space-y-1 pl-5">
          <li>Compte, préférences et inscriptions : tant que votre compte existe ; tout est effacé quand vous le supprimez.</li>
          <li>Messages envoyés à l'accueil : jusqu'à leur suppression par l'équipe de l'immeuble.</li>
          <li>Historique des modifications de contenus (réservé aux gestionnaires) : 30 jours.</li>
        </ul>
      </Section>

      <Section title="Vos droits">
        <p>
          Vous pouvez accéder à vos données, les corriger et supprimer votre compte à tout moment depuis{" "}
          <Link to="/compte" className="text-brand-light underline">Mon compte</Link>. Pour toute autre demande (copie de vos données,
          opposition, limitation), écrivez-nous via le formulaire{" "}
          <Link to="/contact" className="text-brand-light underline">Nous contacter</Link>.
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-brand-light underline">cnil.fr</a>).
        </p>
      </Section>

      <Section title="Cookies">
        <p>L'application n'utilise aucun cookie publicitaire. Les éléments stockés dans votre navigateur sont techniques : garder votre session ouverte et conserver vos brouillons de saisie. Notre hébergeur peut enregistrer des statistiques de fréquentation globales et les erreurs techniques, pour assurer le bon fonctionnement du service.</p>
      </Section>
    </div>
  );
}
