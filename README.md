# Calorie Canvas

A dependency-free calorie tracker with account login, personalized onboarding, meal tracking, water tracking, reactive macro insights, and recipe recommendations.

## Run locally

```bash
npm start
```

Open `http://127.0.0.1:4173`.

The server creates `data/meals.json` automatically. This local database is ignored by Git because it contains account and session data.

## Online sync

Accounts sync between devices when this Node server and its data directory are deployed to a persistent host. The included JSON datastore is suitable for local development and small demos. For a public production deployment, replace it with a managed database and configure HTTPS, secure cookies or expiring tokens, rate limiting, email verification, password reset, and backups.
