# Dashboard

Application web permettant à chaque utilisateur de construire son propre tableau de bord :
s'abonner à des services (météo, crypto, GitHub, RSS...) et ajouter des widgets configurables
qui se rafraîchissent automatiquement.

> Ce README est un squelette. Il sera complété au jour 12 avec : liste des
> features/services/widgets, instructions d'installation, vue d'ensemble,
> guide d'utilisation, choix techniques et architecture (voir sujet, section
> "Documentation expectations").

## Démarrage rapide

```bash
cp server/.env.example server/.env
docker-compose build
docker-compose up
```

- Serveur : http://localhost:8080 (endpoint requis : http://localhost:8080/about.json)
- Client : http://localhost:8081

## Stack technique

- **Backend** : Node.js + Express, Prisma ORM, PostgreSQL
- **Frontend** : React + Vite, Tailwind CSS, react-grid-layout
- **Auth** : JWT (credentials) + OAuth 2.0 (GitHub) via Passport
- **Infra** : Docker / docker-compose

## Structure

```
server/    API Express (routes, middleware, config des services/widgets)
client/    Application React
docs/      Contrats d'API, schémas
```

## Équipe

Voir `docs/api-contracts.md` pour les contrats d'API partagés entre backend et frontend.
