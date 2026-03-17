# ExamGuardrail — Vercel Deployment Guide

Deploy the complete ExamGuardrail system (Frontend + Backend + Native Agent) to Vercel in minutes.

## Architecture

- **Frontend**: React + Vite (deployed to Vercel Edge)
- **Backend**: FastAPI via Python serverless functions (deployed to Vercel Functions)
- **API Routes**: `/api/*` → Python serverless handler
- **Native Agent**: Runs on detection client (browser extension or native SDK)

## Prerequisites

1. **Vercel Account** — Sign up at https://vercel.com (free tier works fine)
2. **GitHub Account** — Repository should be on GitHub for CI/CD
3. **Environment Variables**:
   - `SUPABASE_URL` — Your Supabase project URL
   - `SUPABASE_KEY` — Supabase anon key
   - `ADMIN_USERNAME` — Admin dashboard username
   - `ADMIN_PASSWORD` — Admin dashboard password
   - (Optional) `ANTHROPIC_API_KEY` — For Claude AI integration

## Step 1: Push to GitHub

```bash
git add .
git commit -m "chore: prepare for Vercel deployment"
git push origin aimodels   # or your branch
```

## Step 2: Deploy to Vercel

### Option A: Via Vercel CLI (Fastest)

```bash
npm install -g vercel
vercel --prod
```

When prompted:
- **Project name**: `exam-guardrail` (or your preference)
- **Root directory**: `.` (current)
- **Build command**: `npm run build --prefix dashboard`
- **Output directory**: `dashboard/dist`

### Option B: Via Vercel Dashboard (Web)

1. Go to https://vercel.com/new
2. **Import Git repository** → Select your GitHub repo
3. **Framework preset**: Vite
4. **Root directory**: `.`
5. **Build command**: `npm run build --prefix dashboard`
6. **Output directory**: `dashboard/dist`
7. Click **Deploy**

## Step 3: Set Environment Variables

After deployment, go to **Settings → Environment Variables** and add:

```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_KEY = your-anon-key-here
ADMIN_USERNAME = admin
ADMIN_PASSWORD = your-secret-password
ANTHROPIC_API_KEY = (optional)
```

Then **Redeploy** from **Deployments → Redeploy**

## Step 4: Verify Deployment

After deployment completes:

1. **Visit your site**: `https://your-project.vercel.app`
2. **Check health**: `https://your-project.vercel.app/api/health`
   - Should return: `{"status": "ok", "middleware": "exam_guardrail", "version": "1.0.0"}`

## Step 5: Configure Frontend API

The frontend automatically points to `/api` (same domain). No additional config needed.

For debugging, check `dashboard/src/` to see how API calls are made.

## File Structure for Vercel

```
project-root/
├── api/
│   └── index.py              ← Serverless handler
├── dashboard/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── dist/                 ← Generated on build
├── exam_guardrail/           ← Python package
├── vercel.json               ← Configuration
├── .vercelignore             ← Ignore rules
└── README.md
```

## API Endpoints Available

Once deployed, all these routes are live:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/sessions` | POST | Create exam session |
| `/api/events` | POST | Log violation event |
| `/api/native-agent/status/{session_id}` | GET | Agent status |
| `/api/native-agent/scan` | POST | On-demand scan |
| `/api/native-agent/blocked-list` | GET | List blocked processes |

## Native Agent on Vercel

> **Note**: Native AI agent detection runs on the **client/student machine**, not on Vercel.

Vercel serverless functions only provide the backend API. The native agent (process blocking, screen detection) is triggered by:

1. **Browser Extension** — Installed on student's browser
2. **Native SDK** — Embedded in your exam platform
3. **Client-side JavaScript** — Runs `exam-guardrail` npm package

The backend routes just **log and report** detected violations.

## Environment-Specific API

For local development, the Vite proxy in `vite.config.js` will still point to `http://127.0.0.1:8000`.

For production (Vercel), it automatically uses `/api` (same domain).

## Troubleshooting

### Build Fails with "exam_guardrail not found"

**Solution**: Vercel needs `exam_guardrail` installed.Add to `api/index.py` imports or ensure `pip install exam-guardrail` is in your build.

Check `vercel.json` — the `buildCommand` should handle this automatically.

### API Returns 500 Error

1. Check **Vercel Logs**: Dashboard → **Deployments → Function Logs**
2. Verify environment variables are set in **Settings → Environment Variables**
3. Test locally: `python -m uvicorn backend.app.main:app --reload`

### Frontend Can't Reach Backend

1. Verify `/api/health` returns `{"status": "ok"}`
2. In browser DevTools, check **Network** tab for `/api/*` requests
3. Check if requests are being blocked by CORS

## Redeploying After Changes

```bash
git add .
git commit -m "fix: update feature"
git push origin aimodels

# Vercel auto-deploys on push
# Or manually: vercel --prod
```

## Custom Domain

In Vercel dashboard:
1. **Settings → Domains**
2. Add your domain (e.g., `exams.yourcompany.com`)
3. Add DNS records as instructed

## Scaling & Performance

Vercel automatically scales serverless functions. The free tier includes:
- Up to 100,000 function invocations/month
- Up to 1GB function memory (AWS Lambda)
- No cold start penalties

For production workloads, consider upgrading to **Pro** ($20/month) or higher.

## Monitoring & Logs

Access real-time logs:
```bash
vercel logs --tail
```

Or via dashboard:
- **Deployments** → Select deployment
- **Functions** → View logs

## Next Steps

1. **Browser Extension** — Deploy from `browser-extension/` (separate)
2. **Dashboard Improvements** — Push updates to `main` branch to auto-deploy
3. **Custom Analytics** — Integrate with your analytics platform via event logging

---

**Questions?** Check the main [README.md](README.md) or project docs.
