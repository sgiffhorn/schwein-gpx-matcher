// src/middleware/checkAuth.js
import axios from 'axios';
import { userTokens } from '../auth.js';

export default async function checkAuth(req, res, next) {
  const athleteId = req.query.athleteId;
  if (!athleteId || !userTokens[athleteId]) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  const tokens = userTokens[athleteId];
  const now = Math.floor(Date.now() / 1000);

  // If still valid, go on.
  if (tokens.expires_at > now) {
    return next();
  }

  // Otherwise try to refresh once
  try {
    const refreshRes = await axios.post('https://www.strava.com/oauth/token', {
      client_id:   process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token
    });

    const { access_token, refresh_token, expires_at } = refreshRes.data;
    // Overwrite with the new tokens & expiry
    userTokens[athleteId] = { access_token, refresh_token, expires_at };
    return next();

  } catch (err) {
    // Refresh failed → clear and force re-auth
    delete userTokens[athleteId];
    return res.status(401).json({ error: 'token_expired' });
  }
}