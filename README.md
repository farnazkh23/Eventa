# eventa.

Mobile-first AI-assisted event and catering planning prototype for Transgourmet.

## Local development

The API reads `GEMINI_API_KEY` and `GEMINI_MODEL` from `.env.local`. The Gemini key is server-only and must never use a `VITE_` prefix.

Install dependencies and start the frontend and API together:

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`. Vite proxies `/api` requests to the local Eventa API on port `8787`.

## Verification

Run all automated checks:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Run the three approved live Gemini extraction cases:

```powershell
npm run verify:ai
```

This command prints only the descriptions and validated extraction results. It never prints the API key.
