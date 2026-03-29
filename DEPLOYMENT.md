# POCKET TERMINAL - DEPLOYMENT GUIDE

## Architecture
- **Frontend**: Hosted on Netlify (https://pocketterminal.netlify.app) - Static files
- **Backend**: Hosted on Render - Flask-SocketIO WebSocket server
- **Connection**: Direct HTTPS WebSocket from Netlify → Render (zero fallbacks in production)

## Quick Start (Production Deployment)

### Step 1: Deploy Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository (PocketTerminal)
4. Configure:
   - **Name**: `pocketterminal-api`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --worker-class eventlet -w 1 -b 0.0.0.0:$PORT --timeout 120 app:app`
   - **Plan**: Free tier is okay for initial testing
5. Set **Environment Variables**:
   ```
   POCKET_ENV = production
   POCKET_ENABLE_ML = 0
   POCKET_SSL = 0
   TF_ENABLE_ONEDNN_OPTS = 0
   ```
6. Click "Create Web Service"
7. Wait for deployment (5-10 minutes)
8. Copy the service URL: `https://pocketterminal-api.onrender.com`

### Step 2: Configure Frontend for Hosted Backend

1. Edit `static/js/config.js` - Update the Render backend URL:
   ```javascript
   if (isNetlify) {
     backendUrl = "https://YOUR_BACKEND_URL.onrender.com";  // ← Replace with actual Render URL
   }
   ```

2. Commit and push to GitHub:
   ```bash
   git add static/js/config.js
   git commit -m "Update backend URL to hosted Render instance"
   git push origin main
   ```

3. Netlify will auto-deploy frontend changes

### Step 3: Verify Connection

1. Open https://pocketterminal.netlify.app/desktop
2. Check browser console for any errors
3. Pair code should generate within 3-5 seconds (if backend is connected)
4. Copy auto-pair link and open on mobile
5. 6-digit code should auto-fill and pair should happen automatically

## Troubleshooting

### Backend Connect Failed on Netlify

**Symptom**: "Backend connect failed" error message

**Causes & Fixes**:
1. **Backend not running on Render**
   - Check Render dashboard → Logs
   - Restart service if needed

2. **Wrong backend URL in config.js**
   - Must match exact Render service URL
   - URLs must start with `https://`
   - No trailing slashes

3. **CORS not allowing Netlify**
   - Already configured in `app.py` for production
   - If custom domain, update CORS list in `app.py`

4. **Render backend on free tier + inactive**
   - Free tier spins down after 15 minutes inactivity
   - First request may take 30+ seconds
   - Upgrade to paid tier for always-on

### Certificate Issues

- Render provides free SSL automatically
- No action needed
- Self-signed concerns are eliminated

### Performance Issues

- Free tier Render instances: slower cold starts (~30s first request)
- For production use, upgrade Render plan
- Use Render + Netlify combo for zero-downtime updates

## Local Development

When developing locally (localhost), the app works in "development mode":
- `web://localhost/desktop` automatically tries local backend
- Localhost fallbacks are enabled
- ML module can be enabled with `POCKET_ENABLE_ML=1`

```bash
# Local development with ML (optional)
pip install -r requirements.txt
pip install -r requirements-ml.txt  # Optional ML stack
export POCKET_ENV=development
python app.py
```

## Advanced Customization

### Change Hosted Backend Platform

Instead of Render, you can use:
- **Railway.app**: Same setup, different service name
- **Heroku** (with Procfile): No changes needed
- **Fly.io**: Use `fly.toml` instead of `render.yaml`
- **AWS App Runner**: Use Procfile + AWS settings

Update `config.js` with your chosen platform's backend URL.

### Enable ML Module on Hosted Backend

Edit `render.yaml`:
```yaml
POCKET_ENABLE_ML: "1"
```

Then in root directory:
```bash
# Add ML dependencies to requirements.txt or requirements-ml.txt
```

**Warning**: May cause slower startup times on free tier.

### Custom Domain

If using custom domain instead of netlify.app:
1. Update `app.py` CORS list:
   ```python
   allowed_origins = [
       "https://yourdomain.com",
       ...
   ]
   ```
2. Redeploy backend

## Monitoring & Debugging

### Backend Health Check
```bash
curl https://YOUR_BACKEND_URL.onrender.com/health
```

Expected response:
```json
{
  "ok": true,
  "service": "pocket-terminal",
  "scheme": "https",
  "sessions_active": 0,
  "environment": "production"
}
```

### Check Sessions
```bash
curl https://YOUR_BACKEND_URL.onrender.com/version
```

### Enable Verbose Logging

Set environment variable on Render:
```
POCKET_DEBUG = 1
```

Then check Render logs for detailed connection traces.

## FAQ

**Q: Can I keep using localhost?**
A: Yes. Local development mode has fallbacks built in. Just don't push localhost URLs to production.

**Q: Does free tier work fine?**
A: Yes for testing/demo. For production, upgrade to ~$7/month paid tier for consistent performance.

**Q: What if I want both mobile AND desktop on same Netlify domain?**
A: Already configured! Both `/desktop` and `/mobile` routes work on Netlify, all calling same Render backend.

**Q: Can I host everything on Netlify only?**
A: Not directly - Netlify doesn't support persistent WebSocket servers. Must use separate backend (Render, Railway, Heroku, etc.).

## Success Indicators

When properly deployed:
1. ✅ Netlify frontend loads HTTPS without errors
2. ✅ Backend URL shown in browser console (no "localhost")
3. ✅ 6-digit pair code generates within 5 seconds
4. ✅ Mobile page auto-fills code from shared link
5. ✅ Voice commands execute on desktop after pairing
6. ✅ No "Backend connect failed" errors
7. ✅ Works from any phone on any network (so long as Render backend is reachable)

---

**Latest Update**: March 21, 2026
**Architecture**: Zero-localhost production mode ready
