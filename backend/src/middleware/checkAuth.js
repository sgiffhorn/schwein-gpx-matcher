// src/middleware/checkAuth.js
import axios from 'axios';
import { userTokens } from '../auth.js';

export default async function checkAuth(req, res, next) {
  // 1) Pull athleteId out of the cookie
  const athleteId = req.cookies?.athleteId;
  if (!athleteId || !userTokens[athleteId]) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  let tokens = userTokens[athleteId];
  const now = Math.floor(Date.now() / 1000);

  // 2) If expired → try to refresh
  if (tokens.expires_at <= now) {
    try {
      const { data } = await axios.post('https://www.strava.com/oauth/token', {
        client_id:     process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type:    'refresh_token',
        refresh_token: tokens.refresh_token
      });
      // overwrite with fresh tokens
      tokens = {
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        expires_at:    data.expires_at
      };
      userTokens[athleteId] = tokens;
    } catch (err) {
      // couldn’t refresh → force a re-login
      delete userTokens[athleteId];
      res.clearCookie('athleteId');
      return res.status(401).json({ error: 'token_expired' });
    }
  }

  // 3) Extend cookie lifetime to match new expiry
  const expiresInMs = (tokens.expires_at - now) * 1000;
  res.cookie('athleteId', athleteId, {
    httpOnly: true,
    maxAge:   expiresInMs,
    sameSite: 'lax'
  });

  // 4) make the athleteId & access_token available downstream
  req.athleteId   = athleteId;
  req.accessToken = tokens.access_token;

  next();
}