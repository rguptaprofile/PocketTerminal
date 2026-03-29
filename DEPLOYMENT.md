# POCKET TERMINAL - DEPLOYMENT GUIDE

## Architecture
- **Frontend**: Vercel/Netlify static site
- **Backend**: Render Python web service running Flask-SocketIO
- **Why this split**: static hosts do not run persistent Python WebSocket workers

## One-Time Stable Setup (No Pair-Code Failure)

### Step 1: Deploy Backend from `render.yaml`

1. Open Render dashboard.
2. Click `New +` -> `Blueprint`.
3. Select this repository.
4. Render will detect `render.yaml` and create service:
   - name: `pocketterminal-backend`
   - health check: `/health`
   - start command: gunicorn + eventlet (already configured)
5. Deploy and wait for `Live` status.

Expected backend URL:
`https://pocketterminal-backend.onrender.com`

### Step 2: Validate Backend Endpoints (must pass)

Run these checks:

```bash
curl https://pocketterminal-backend.onrender.com/health
curl "https://pocketterminal-backend.onrender.com/socket.io/?EIO=4&transport=polling"
```

Success criteria:
- `/health` returns JSON with `ok: true`
- `/socket.io` returns `200` and body starting with `0{` (session handshake)

If `/socket.io` is 404, pair code will never generate.

### Step 3: Deploy Frontend

1. Push latest repo changes.
2. Redeploy Vercel project.
3. Hard refresh browser (`Ctrl+Shift+R`).
4. Clear stale backend cache in browser console:

```javascript
localStorage.removeItem("pocket_backend_url");
```

5. Open:
`https://pocket-terminal.vercel.app/desktop`

## Fast Troubleshooting

### Symptom: "Backend connect failed"

Check in this order:

1. Backend live check:
   - `https://pocketterminal-backend.onrender.com/health`
2. Socket check:
   - `https://pocketterminal-backend.onrender.com/socket.io/?EIO=4&transport=polling`
3. If step 2 fails, backend service is not running Flask-SocketIO worker.
4. Redeploy backend service from this repo and verify Render logs show app boot.

### Common causes

1. Wrong Render service URL used in frontend.
2. Old browser localStorage cached invalid backend.
3. Render service deployed from a different codebase (returns health but no `/socket.io`).
4. Service sleeping on free plan (first hit can take 20-60 sec).

## Local Development

```bash
pip install -r requirements.txt
python app.py
```

Open:
- `http://127.0.0.1:5000/desktop`
- `http://127.0.0.1:5000/mobile`

## Success Indicators

1. Desktop page shows pair code within a few seconds.
2. Desktop log shows successful backend connect and registration.
3. Mobile link auto-fills `backend` and `code` query params.
4. Pairing works without manual backend typing.
