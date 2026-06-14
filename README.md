# Calorie Canvas

A dependency-free calorie tracker with account login, personalized onboarding, meal tracking, water tracking, reactive macro insights, and recipe recommendations.

## Run locally

```bash
npm start
```

Open `http://127.0.0.1:4173`.

The server creates `data/meals.json` automatically. This local database is ignored by Git because it contains account and session data.

## Put it online

A GitHub repository URL shares the source code but does not run the server. To give people a working app URL, deploy the repository as a web service.

This repository includes a `render.yaml` Blueprint for Render:

1. Sign in to [Render](https://dashboard.render.com/).
2. Choose **New > Blueprint** and connect `Melall462/calorie-tracker`.
3. Review the service and persistent-disk cost, then click **Apply**.
4. Share the generated `https://...onrender.com` URL, not the GitHub URL.

Render automatically redeploys the app when changes are pushed to `main`. The attached disk stores accounts, sessions, meals, water, and onboarding data across deploys.

The included JSON datastore is suitable for a small personal deployment. Before opening the app to a larger public audience, move account data to a managed database and add expiring sessions, rate limiting, email verification, password reset, and backups.
