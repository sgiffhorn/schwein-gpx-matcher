// src/auth.js
import express from 'express';
import axios from 'axios';

const router = express.Router();
// In-memory token store: { [athleteId]: { access_token, refresh_token } }
export const userTokens = {};

// 1) Redirect to Strava for OAuth
router.get('/login', (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.STRAVA_CLIENT_ID,
        response_type: 'code',
        redirect_uri: process.env.STRAVA_CALLBACK_URL,
        approval_prompt: 'auto',
        scope: 'activity:read_all'
    });
    res.redirect(`https://www.strava.com/oauth/authorize?${params}`);
});

router.get('/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { data } = await axios.post('https://www.strava.com/oauth/token', {
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code'
        });
        const { athlete, access_token, refresh_token, expires_at } = data;
        const fullName = `${athlete.firstname} ${athlete.lastname}`;
        // store tokens in memory
        userTokens[athlete.id] = { access_token, refresh_token, expires_at, name: fullName };

        const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
        // set athleteId in a secure, HTTP-only cookie
        res
            .cookie('athleteId', athlete.id, {
                httpOnly: true,
                // secure: true,       // ← on prod with HTTPS
                maxAge: (expires_at - Math.floor(Date.now() / 1000)) * 1000
            })
            .redirect(FE+"/match");         // no more `?athleteId=…`
    } catch (e) {
        console.error(e.response?.data || e.message);
        res.status(500).send('Auth failed');
    }
});

// 3) session check endpoint
router.get('/me', (req, res) => {
    const id = req.cookies.athleteId;
    const tokens = userTokens[id];
    if (id && userTokens[id]) {
        return res.json({ athleteId: id, name: tokens.name});
    }
    res.status(401).json({ error: 'not_authenticated' });
});

// POST /auth/logout
// Deletes the in‐memory token for this athleteId
router.post('/logout', (req, res) => {
  const { athleteId } = req.body;
  if (athleteId && userTokens[athleteId]) {
    delete userTokens[athleteId];
  }
  res.json({ success: true });
});

export default router;
