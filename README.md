# Backend boutique en ligne

API REST en **Node.js + TypeScript + Express**, avec **PostgreSQL/Prisma** et **Stripe Checkout**.

## Structure

```text
prisma/                  Schéma PostgreSQL
src/
  config/                Configuration, base de données, Stripe
  middleware/            Authentification et gestion des erreurs
  modules/
    auth/                Inscription et connexion client
    products/            Catalogue public
    orders/               Création et consultation des commandes
    payments/             Création du paiement et webhook Stripe
    invoices/             Consultation des factures
  app.ts                 Assemblage Express et routes
  server.ts              Démarrage et arrêt propre
```

## Démarrage

1. Installer Node.js et PostgreSQL.
2. Copier `.env.example` vers `.env`, puis renseigner les secrets et l’URL de la base.
3. Installer les dépendances avec `npm install`.
4. Générer le client et créer les tables avec `npm run db:generate`, puis `npm run db:migrate`.
5. Lancer en développement avec `npm run dev`.

Pour le webhook Stripe en local, utiliser Stripe CLI et transférer les événements vers `http://localhost:3000/api/payments/webhook`. Renseigner le secret `whsec_...` fourni par la CLI dans `.env`.

## Routes principales

| Méthode | Route | Accès | Fonction |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Inscrire un client |
| POST | `/api/auth/login` | Public | Connecter un client, retourne un JWT |
| GET | `/api/products` | Public | Lister le catalogue actif |
| POST | `/api/orders` | JWT | Créer une commande à partir des prix en base |
| GET | `/api/orders` | JWT | Lister les commandes du client connecté |
| POST | `/api/payments/checkout/:orderId` | JWT | Obtenir une URL de paiement Stripe |
| POST | `/api/payments/webhook` | Stripe | Confirmer le paiement et créer la facture |
| GET | `/api/invoices` | JWT | Lister les factures du client |

Les montants sont stockés en unités mineures (centimes). Le serveur calcule les prix depuis la base, réserve le stock à la création de commande et ne marque une commande comme payée qu’après confirmation Stripe. Les clés Stripe secrètes restent côté serveur.

## À compléter avant la mise en production

- Ajouter des routes d’administration protégées pour créer et gérer les produits.
- Définir les règles de taxes, livraison, remboursements et conservation des factures selon le pays d’activité.
- Ajouter limitation de débit, journalisation et procédures de sauvegarde de la base.
