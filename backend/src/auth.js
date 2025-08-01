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
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
    approval_prompt: 'auto',
    scope: 'activity:read_all'
  });
  res.redirect(`https://www.strava.com/oauth/authorize?${params}`);
});

// 2) OAuth callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const tokenRes = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    });
    const { access_token, refresh_token, expires_at, athlete } = tokenRes.data;
    userTokens[athlete.id] = { access_token, refresh_token, expires_at };
    // Redirect or respond with athlete ID for frontend
    res.redirect(`/?athleteId=${athlete.id}`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('Authentication failed');
  }
});

export default router;
