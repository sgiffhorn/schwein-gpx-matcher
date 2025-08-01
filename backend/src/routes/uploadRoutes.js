// src/routes/uploadRoutes.js
import express from 'express';
import multer from 'multer';
import gpxParse from 'gpx-parse';
import { getDistance } from 'geolib';
import { around } from 'geokdbush';
import KDBush from 'kdbush';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('gpx'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No GPX file uploaded' });
    }

    // 1) Read the XML
    const xml = req.file.buffer.toString('utf8');

    // 2) Try the structured parser
    let parsed;
    try {
      parsed = await new Promise((resolve, reject) =>
        gpxParse.parseGpx(xml, (err, data) => (err ? reject(err) : resolve(data)))
      );
    } catch (_err) {
      parsed = null;
    }

    // 3) Build uploadedPoints, either from parsed.tracks or via regex fallback
    let uploadedPoints = [];
    if (parsed && Array.isArray(parsed.tracks) && parsed.tracks.length > 0) {
      // flatten all track segments
      uploadedPoints = parsed.tracks
        .flatMap(trk => trk.segments)
        .flat()
        .map(p => ({
          lat: p.lat,
          lon: p.lon,
          time: p.time ? new Date(p.time) : null
        }));
    } else {
      // fallback: extract every <trkpt ...><time>...</time></trkpt>
      const pointRe = /<trkpt\b[^>]*lat="([\d\.\-]+)"[^>]*lon="([\d\.\-]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
      let m;
      while ((m = pointRe.exec(xml))) {
        const lat = parseFloat(m[1]);
        const lon = parseFloat(m[2]);
        const inner = m[3];
        const tMatch = /<time>([^<]+)<\/time>/.exec(inner);
        uploadedPoints.push({
          lat,
          lon,
          time: tMatch ? new Date(tMatch[1]) : null
        });
      }
    }

    if (uploadedPoints.length === 0) {
      return res.status(400).json({ error: 'No track found in GPX' });
    }

    // 4) Compute moving vs elapsed time
    const speedThreshold = parseFloat(process.env.MOVING_SPEED_THRESHOLD_MPS) || 1;
    let movingTime = 0, elapsedTime = 0;
    for (let i = 1; i < uploadedPoints.length; i++) {
      const prev = uploadedPoints[i - 1];
      const curr = uploadedPoints[i];
      if (!prev.time || !curr.time) continue;
      const dt = (curr.time - prev.time) / 1000;
      if (dt <= 0) continue;
      const dist = getDistance(
        { latitude: prev.lat, longitude: prev.lon },
        { latitude: curr.lat, longitude: curr.lon }
      );
      elapsedTime += dt;
      if (dist / dt >= speedThreshold) movingTime += dt;
    }

    // 5) Build spatial index of uploaded points (v4 or fallback to v3)
    let actIndex;
    try {
      // kdbush v4+
      actIndex = new KDBush(
        uploadedPoints,
        p => p.lon,
        p => p.lat
      );
    } catch {
      // kdbush v3 fallback
      actIndex = new KDBush(uploadedPoints.length);
      uploadedPoints.forEach((p, i) => actIndex.add(p.lon, p.lat, i));
      actIndex.finish();
    }

    // 6) Match against your reference GPX
    const { refPoints } = req.app.locals;
    const thresholdMeters = parseFloat(process.env.MATCH_THRESHOLD_M) || 50;
    let hits = 0;
    for (const rp of refPoints) {
      if (around(actIndex, rp.lon, rp.lat, 1, thresholdMeters/1000).length) hits++;
    }
    const matchPercentage = (hits / refPoints.length) * 100;

    // 7) Respond
    res.json({
      matchPercentage: +matchPercentage.toFixed(1),
      movingTimeSeconds: Math.round(movingTime),
      elapsedTimeSeconds: Math.round(elapsedTime),
      referenceTrack: refPoints,
      activityTrack: uploadedPoints.map(p => ({ lat: p.lat, lon: p.lon }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing GPX upload');
  }
});

export default router;