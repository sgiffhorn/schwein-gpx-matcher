// src/routes/fameRoutes.js
import express from 'express';
import { query } from '../db.js';
const router = express.Router();

router.get('/', async (req, res) => {
  // only show accepted submissions
  const rows = await query(`
    SELECT name,
           activity_date,
           moving_time_seconds,
           match_percentage,
           frikadelle_eaten,
           external_comment
      FROM submissions
     WHERE accepted = 1
     ORDER BY activity_date ASC
  `);

  const SILVER_SEC = 11 * 3600 + 30 * 60;  // 11:30 in seconds

  const data = rows.map(r => {
    // medal logic
    let medal = 'Bronze';
    if (r.moving_time_seconds < SILVER_SEC || r.frikadelle_eaten) medal = 'Silver';
    if (r.moving_time_seconds < SILVER_SEC && r.frikadelle_eaten) medal = 'Gold';

    // format date DD.MM.YYYY
    const d = new Date(r.activity_date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth()+1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const date = `${dd}.${mm}.${yyyy}`;

    // format moving time HH:MM:SS
    let secs = r.moving_time_seconds;
    const h = Math.floor(secs/3600); secs %= 3600;
    const m = Math.floor(secs/60);    secs %= 60;
    const s = secs;
    const movingTime = `${h>0?h+':':''}${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    return {
      name:            r.name,
      date,
      dateRaw: d.toISOString(),
      movingTime,
      matchPercentage: r.match_percentage != null
                       ? parseFloat(r.match_percentage)
                       : null,
      medal,
      externalComment: r.external_comment || ''
    };
  });

  res.json(data);
});

export default router;