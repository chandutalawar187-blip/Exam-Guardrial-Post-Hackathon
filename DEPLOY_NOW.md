# ExamGuardrail — 30-Second Vercel Deployment

Hosted exam proctoring in 3 commands.

## Before You Start

1. Have a **Vercel account** (free at vercel.com)
2. Have **GitHub repo** with your code pushed
3. Have your **environment variables** ready:
   ```
   SUPABASE_URL
   SUPABASE_KEY
   ADMIN_USERNAME
   ADMIN_PASSWORD
   ```

## Deploy

### Option 1: CLI (5 minutes)

```bash
npm install -g vercel
cd /path/to/Exam-guardrial-middleware
vercel --prod
```

When prompted:
- Project name: `exam-guardrail`
- Build: `npm run build --prefix dashboard`
- Output: `dashboard/dist`

### Option 2: Web Dashboard (5 clicks)

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Framework preset: **Vite**
4. Build command: `npm run build --prefix dashboard`
5. Output directory: `dashboard/dist`
6. Click **Deploy**

## Post-Deployment Setup

After deployment (URL shown):

1. Go to **Settings → Environment Variables**
2. Add:
   - `SUPABASE_URL = https://your-project.supabase.co`
   - `SUPABASE_KEY = your-key`
   - `ADMIN_USERNAME = admin`
   - `ADMIN_PASSWORD = your-password`
3. Click **Redeploy** to activate changes

## Verify

```bash
# Health check
curl https://your-project.vercel.app/api/health

# Should return:
# {"status": "ok", "middleware": "exam_guardrail", "version": "1.0.0"}
```

Visit: `https://your-project.vercel.app`

---

## What's Deployed

| Component | Where |
|-----------|-------|
| **Frontend** (React/Vite) | Vercel Edge (auto-cached globally) |
| **Backend** (FastAPI) | Vercel Functions (Python serverless) |
| **Database** | Your Supabase (separate) |
| **API** | `/api/*` routes → Python functions |

## Automatic Updates

After this setup, every `git push` auto-deploys:

```bash
git add .
git commit -m "Update exam questions"
git push origin main

# Vercel auto-deploys in 1-2 minutes
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Check `npm run build --prefix dashboard` succeeds locally |
| API returns 500 | Check env vars are set in Vercel dashboard |
| Frontend can't reach API | Verify `/api/health` returns 200 OK |
| Static files not loading | Clear browser cache, verify `dashboard/dist` exists |

For detailed logs:
```bash
vercel logs --tail
```

---

## Next Steps

1. **Customize domain**: Settings → Domains
2. **Add analytics**: Integrate with your platform
3. **Enable monitoring**: Set up error tracking
4. **Backup database**: Regular Supabase snapshots

---

**Already deployed?** Check [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for advanced configuration.
