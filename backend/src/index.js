// src/index.js
import express from 'express';
import path from 'path';
import KDBush from 'kdbush';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRouter from './auth.js';
import activityRouter from './routes/activityRoutes.js';
import uploadRouter from './routes/uploadRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import { loadReferencePoints } from './gpxService.js';
import checkAuth from './middleware/checkAuth.js';
import { around } from 'geokdbush';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
console.log(await bcrypt.hash('asdlkj23schwein', 10));
dotenv.config();
let refPoints, refIndex;
async function start() {

    // Load & cache the GPX array
    const refPoints = await loadReferencePoints();
    console.log(`✅ Loaded ${refPoints.length} reference points.`);

    // Sanity check
    if (!Array.isArray(refPoints)) {
        console.error('❌ loadReferencePoints did NOT return an array!', refPoints);
        process.exit(1);
    }

    // Build spatial index (supports KDBush v4 API or falls back to v3)
    try {
        // v4: accept an array of points directly
        refIndex = new KDBush(
            refPoints,
            p => p.lon,
            p => p.lat,
            64,
            Float64Array
        );
    } catch {
        // v3 fallback: must pass capacity first, then add points
        refIndex = new KDBush(refPoints.length, 64, Float64Array);
        refPoints.forEach((p, i) => {
            refIndex.add(p.lon, p.lat, i);
        });
        refIndex.finish();
    }

    const app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Make both available to your routes
    app.locals.refPoints = refPoints;
    app.locals.refIndex = refIndex;

    // 4) Mount routers
    app.use('/auth', authRouter);
    app.use('/api/upload-match', uploadRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api', checkAuth, activityRouter);
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}

start();
export { around };