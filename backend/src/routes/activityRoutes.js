// src/routes/activityRoutes.js
import express from 'express';
import { userTokens } from '../auth.js';
import { getActivities, getActivityStreams, getActivity } from '../stravaService.js';
import { getCache, setCache } from '../cacheService.js';
import { around } from 'geokdbush';
import KDBush from 'kdbush';

const router = express.Router();
function makeMonthKey(athleteId, year, month) {
    // zero-pad month so “2025_07” rather than “2025_7”
    return `activities_${athleteId}_${year}_${String(month).padStart(2, '0')}`;
}

// Helper: fetch & cache activities by month
async function fetchActivitiesForMonth(athleteId, year, month) {
    // use athleteId, year and month in your cache key
    const cacheKey = makeMonthKey(athleteId, year, month);
    const cached = getCache(cacheKey);
    if (cached) return cached;

    // compute UNIX timestamps for start of this month and start of next
    const after = Math.floor(Date.UTC(year, month - 1, 1, 0, 0, 0) / 1000);
    const before = Math.floor(Date.UTC(year, month, 1, 0, 0, 0) / 1000);

    let page = 1, all = [];
    const perPage = 200; // max allowed by Strava

    while (true) {
        const batch = await getActivities(
            userTokens[athleteId].access_token,
            after,
            before,
            page,
            perPage
        );
        if (batch.length === 0) break;

        all.push(...batch);
        // if fewer than perPage, we're done
        if (batch.length < perPage) break;

        page++;
    }

    setCache(cacheKey, all);
    return all;
}
// GET /api/activities?athleteId=&year=&minDistance=
router.get('/activities', async (req, res) => {
    const { athleteId, year, month } = req.query;
    const token = userTokens[athleteId]?.access_token;
    if (!token) return res.status(401).send('Not authenticated');

    const thresholdMeters = (parseFloat(process.env.MIN_DISTANCE_KM) || 0) * 1000;

    try {
        // load (and cache) *all* rides for that month
        const rides = await fetchActivitiesForMonth(athleteId, +year, +month);
        // now apply your distance filter
        const longRides = rides.filter(a => a.distance >= thresholdMeters);
        res.json(longRides);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error fetching rides');
    }
});

router.delete('/activities/cache', (req, res) => {
    const { athleteId, year, month } = req.query;
    if (!userTokens[athleteId]) return res.status(401).send('Not authenticated');
    if (!year || !month) return res.status(400).send('year and month required');

    const key = makeMonthKey(athleteId, +year, +month);
    deleteCache(key);
    res.status(204).end();
});

// GET /api/activities/:id/match?athleteId=
router.get('/activities/:id/match', async (req, res) => {
    let actIndex;
    const { athleteId } = req.query;
    const activityId = req.params.id;
    if (!userTokens[athleteId]) return res.status(401).send('Not authenticated');

    // 1) Fetch the activity summary for moving_time
    const summary = await getActivity(userTokens[athleteId].access_token, activityId);

    // 2) Fetch the detailed streams (latlng) for the track points
    const streams = await getActivityStreams(
        userTokens[athleteId].access_token,
        activityId
    );
    const coords = streams.latlng.data;    // [[lat,lon], …]

    // 2) Pull in your preloaded reference track
    const { refPoints } = req.app.locals;  // array of {lat,lon}

    // 3) Build a spatial index for your *activity* points
    //    Strava latlng comes in as [[lat,lon],…]
    const activityCoords = streams.latlng.data.map(([lat, lon]) => ({ lat, lon }));
    // Build spatial index (supports KDBush v4 API or falls back to v3)
    try {
        // v4: accept an array of points directly
        actIndex = new KDBush(
            activityCoords,
            p => p.lon,
            p => p.lat,
            64,
            Float64Array
        );
    } catch {
        // v3 fallback: must pass capacity first, then add points
        actIndex = new KDBush(activityCoords.length, 64, Float64Array);
        activityCoords.forEach((p, i) => {
            actIndex.add(p.lon, p.lat, i);
        });
        actIndex.finish();
    }

    // 4) For each reference point, see if ANY activity point falls within MATCH_THRESHOLD_M
    const thresholdMeters = parseFloat(process.env.MATCH_THRESHOLD_M) || 50;
    let hits = 0;
    for (const rp of refPoints) {
        // around(index, lon, lat, maxResults, maxDist)
        if (around(actIndex, rp.lon, rp.lat, 1, thresholdMeters / 1000).length > 0) {
            hits++;
        }
    }

    // 5) % of *reference* covered
    const matchPercentage = (hits / refPoints.length) * 100;
    const name = userTokens[athleteId]?.name || null;

    // 8) Return match %, Strava moving_time, plus both tracks for your map
    res.json({
        matchPercentage: +matchPercentage.toFixed(1),
        movingTimeSeconds: summary.moving_time,
        referenceTrack: refPoints,    // [{lon, lat},…]
        activityTrack: streams.latlng.data, // [{lon, lat},…]
        name,
        activityDate: summary.start_date,
    });
});

export default router;