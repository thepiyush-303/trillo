# Deployment

This repo is split into a Vite React client and an Express/PostgreSQL API.

## Render API

1. Create a Render PostgreSQL database.
2. Create a Render Web Service from the repo root.
3. Use these commands:
   - Build command: `npm install`
   - Start command: `npm start`
4. Add environment variables:
   - `NODE_ENV=production`
   - `DATABASE_URL=<Render internal PostgreSQL URL>`
   - `CLIENT_URLS=http://localhost:5173,https://your-vercel-app.vercel.app`
   - `DATABASE_SSL=false`
5. Run migrations once after the database exists:
   - Paid Render service: set pre-deploy command to `npm run db:init`
   - Free Render service: open Render Shell and run `npm run db:init`
6. Optional for demo data: run `npm run db:seed` one time. This truncates existing app data.
7. Free Render Postgres is useful for testing, but it expires after 30 days. Use a paid database for production data.

The included `render.yaml` can be used as a Render Blueprint. When using the Blueprint, Render wires `DATABASE_URL` from the database and prompts for `CLIENT_URLS`.

## Vercel Client

1. Import the repo into Vercel.
2. Set Root Directory to `client`.
3. Use the Vite defaults:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
4. Update `client/vercel.json` so `/api/:path*` points to your Render API:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-render-service.onrender.com/api/:path*"
    }
  ]
}
```

5. Deploy. After Vercel gives you the production URL, add that URL to `CLIENT_URLS` on Render and redeploy/restart the API.

## Local Verification

Run these before deploying:

```sh
npm run build
npm run db:init
npm run dev:server
npm run dev:client
```

Check the API at `http://localhost:4000/api/health`.
<!--
File summary:
- Deployment documentation.
- Explains production hosting configuration and environment requirements.
- Use this when deploying or troubleshooting hosted environments.
-->
