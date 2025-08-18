// src/routes/adminRoutes.js
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { parse as parseCSV } from 'csv-parse/sync';
import { fileTypeFromBuffer } from 'file-type';
import { Submission } from '../models/index.js'; // <-- your Sequelize model export

const router = express.Router();
const upload = multer();

const { JWT_SECRET, ADMIN_PASS_HASH: ADMIN_HASH, ADMIN_USER } = process.env;

/* ------------------------- Auth (unchanged behavior) ------------------------ */

router.post('/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (username !== ADMIN_USER) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password || '', ADMIN_HASH || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
});

router.use((req, res, next) => {
    const auth = req.headers.authorization?.split(' ')[1];
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const payload = jwt.verify(auth, JWT_SECRET);
        if (payload.role !== 'admin') throw new Error('not admin');
        next();
    } catch {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

/* ---------------------------- Helpers for import ---------------------------- */

function parseDdMmYyyyToYmd(s) {
    if (!s) return null;
    const [dd, mm, yyyy] = s.split('.');
    if (!dd || !mm || !yyyy) return null;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function hhmmToSeconds(s) {
    if (!s) return null;
    const [h, m] = s.split(':').map(n => parseInt(n, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 3600 + m * 60;
}

function inferFrikadelleEatenFromMedalAndTime(medalHtml = '', movingSeconds) {
    // Your earlier rule:
    // Gold (Gouden) => eaten = true
    // Silver (Zilveren) => if time >= 11:30 then eaten = true (else could be from time)
    // Bronze => not enough info → false
    const isGold = /Gouden/i.test(medalHtml);
    const isSilver = /Zilveren/i.test(medalHtml);

    if (isGold) return true;
    if (isSilver) {
        const elevenThirty = 11 * 3600 + 30 * 60;
        if ((movingSeconds ?? 0) >= elevenThirty) return true;
    }
    return false;
}

/* --------------------------------- Routes ---------------------------------- */

// GET all submissions (Sequelize)
router.get('/submissions', async (_req, res) => {
    const rows = await Submission.findAll({
        order: [
            ['activity_date', 'DESC'],
            ['created_at', 'DESC'],
        ],
        attributes: {
            include: [
                // will be 1 or 0 (MariaDB)
                [Submission.sequelize.literal('gpx_xml IS NOT NULL'), 'has_gpx']
            ]
        }
    });

    // Normalize a few types for the frontend
    const data = rows.map(r => {
        const o = r.toJSON();
        // DECIMAL comes back as string unless you added a getter in the model
        if (o.match_percentage != null) o.match_percentage = Number(o.match_percentage);
        o.frikadelle_eaten = !!o.frikadelle_eaten;
        o.accepted = !!o.accepted;
        return o;
    });

    res.json(data);
});

// Approve one (Sequelize)
router.put('/submissions/:id/approve', async (req, res) => {
    const { id } = req.params;
    const { frikadelle_eaten, external_comment, medal_override } = req.body || {};

    const [count] = await Submission.update(
        {
            accepted: true,
            frikadelle_eaten: !!frikadelle_eaten,
            external_comment: external_comment ?? null,
            ...(medal_override ? { medal_override } : {}),
        },
        { where: { id } }
    );

    if (!count) return res.status(404).json({ error: 'not_found' });

    const updated = await Submission.findByPk(id);
    // Normalize DECIMAL → number
    const out = updated.toJSON();
    if (out.match_percentage != null) out.match_percentage = Number(out.match_percentage);
    out.frikadelle_eaten = !!out.frikadelle_eaten;
    out.accepted = !!out.accepted;

    res.json(out);
});

// CSV import (upload file or paste text)
// Accepts either multipart file field "csv" or body.text
router.post('/submissions/import', upload.single('csv'), async (req, res) => {
    try {
        const text = req.file ? req.file.buffer.toString('utf8') : (req.body?.text || '');
        if (!text.trim()) return res.status(400).json({ error: 'empty_csv' });

        const records = parseCSV(text, {
            delimiter: ';',
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        let created = 0;
        let updated = 0;

        // NOTE: relies on a UNIQUE index on (name, activity_date) in the DB/model
        for (const row of records) {
            const last = row['Name'] || '';
            const first = row['Vorname'] || '';
            const name = `${first} ${last}`.trim();

            const activity_date = parseDdMmYyyyToYmd(row['Datum']);
            const moving_time_seconds = hhmmToSeconds(row['Zeit']);
            const external_comment = row['Anmerkungen'] || null;
            const medalHtml = row['Medaille'] || '';

            const frikadelle_eaten = inferFrikadelleEatenFromMedalAndTime(
                medalHtml,
                moving_time_seconds ?? undefined
            );

            const [model, wasCreated] = await Submission.findOrCreate({
                where: { name, activity_date }, // requires unique composite index
                defaults: {
                    name,
                    activity_date,
                    moving_time_seconds: moving_time_seconds ?? 0,
                    match_percentage: null,
                    frikadelle_image: null,
                    frikadelle_eaten,
                    internal_comment: null,
                    external_comment,
                    accepted: true,
                },
            });

            if (wasCreated) {
                created += 1;
            } else {
                const changes = {
                    // keep existing if null-ish incoming
                    ...(moving_time_seconds != null ? { moving_time_seconds } : {}),
                    frikadelle_eaten,
                    external_comment,
                    accepted: true,
                };
                await model.update(changes);
                updated += 1;
            }
        }

        res.json({ success: true, imported: records.length, created, updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'import_failed', detail: err.message });
    }
});

// tiny mime sniffer
function sniffImageMime(buf) {
    if (!buf || buf.length < 12) return 'application/octet-stream';
    const b = (i) => buf[i];
    // PNG
    if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4E && b(3) === 0x47 && b(4) === 0x0D && b(5) === 0x0A && b(6) === 0x1A && b(7) === 0x0A) {
        return 'image/png';
    }
    // JPG
    if (b(0) === 0xFF && b(1) === 0xD8 && b(2) === 0xFF) return 'image/jpeg';
    // GIF
    if (
        (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x38 && b(4) === 0x39 && b(5) === 0x61) ||
        (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x38 && b(4) === 0x37 && b(5) === 0x61)
    ) return 'image/gif';
    // WebP: "RIFF....WEBP"
    if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) {
        return 'image/webp';
    }
    return 'application/octet-stream';
}

// GET /api/admin/submissions/:id/proof  (admin JWT required)
router.get('/submissions/:id/proof', async (req, res) => {
    const { id } = req.params;
    const sub = await Submission.findByPk(id, {
        attributes: ['frikadelle_image']
    });
    if (!sub || !sub.frikadelle_image) {
        return res.status(404).json({ error: 'not_found' });
    }
    const buf = sub.frikadelle_image; // BLOB
    const mime = sniffImageMime(buf);
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.end(buf);
});

router.get('/reference-track', async (req, res) => {
    const refPoints = req.app.locals?.refPoints || [];
    res.json(refPoints); // [{lat, lon}, …]
});

router.get('/submissions/:id/gpx', async (req, res) => {
    const sub = await Submission.findByPk(req.params.id, {
        attributes: ['gpx_xml']
    });
    if (!sub) return res.status(404).json({ error: 'not_found' });
    if (!sub.gpx_xml) return res.status(404).json({ error: 'no_gpx' });

    res.type('application/gpx+xml; charset=utf-8').send(sub.gpx_xml);
});

// CREATE
router.post(
    '/submissions',
    upload.fields([{ name: 'frikadelleImage' }, { name: 'gpx' }]),
    async (req, res) => {
        const b = req.body;
        const img = req.files?.frikadelleImage?.[0]?.buffer ?? null;
        const gpx = req.files?.gpx?.[0]?.buffer ?? null;

        // if strava URL present, try to extract id
        let strava_activity_id = b.strava_activity_id ? Number(b.strava_activity_id) : null;
        if (!strava_activity_id && b.strava_activity_url) {
            const m = String(b.strava_activity_url).match(/activities\/(\d+)/);
            if (m) strava_activity_id = Number(m[1]);
        }

        const row = await Submission.create({
            name: b.name,
            activity_date: b.activity_date, // YYYY-MM-DD
            moving_time_seconds: Number(b.moving_time_seconds),
            match_percentage: b.match_percentage === '' || b.match_percentage == null ? null : Number(b.match_percentage),
            frikadelle_image: img,
            frikadelle_eaten: b.frikadelle_eaten === '1',
            internal_comment: null,
            external_comment: b.external_comment || null,
            accepted: false,
            strava_activity_id,
            strava_activity_url: b.strava_activity_url || null,
            gpx_xml: gpx || null,
            medal_override: b.medal_override === '' ? null : b.medal_override
        });

        res.status(201).json(row);
    }
);

// UPDATE
router.put(
    '/submissions/:id',
    upload.fields([{ name: 'frikadelleImage' }, { name: 'gpx' }]),
    async (req, res) => {
        const { id } = req.params;
        const b = req.body;
        const img = req.files?.frikadelleImage?.[0]?.buffer;
        const gpx = req.files?.gpx?.[0]?.buffer;

        const row = await Submission.findByPk(id);
        if (!row) return res.status(404).json({ error: 'not_found' });

        // optional strava id from URL
        let strava_activity_id = b.strava_activity_id ? Number(b.strava_activity_id) : row.strava_activity_id;
        if (!strava_activity_id && b.strava_activity_url) {
            const m = String(b.strava_activity_url).match(/activities\/(\d+)/);
            if (m) strava_activity_id = Number(m[1]);
        }

        const patch = {};
        if (b.name != null) patch.name = b.name;
        if (b.activity_date) patch.activity_date = b.activity_date;
        if (b.moving_time_seconds != null) patch.moving_time_seconds = Number(b.moving_time_seconds);
        if (b.match_percentage !== undefined)
            patch.match_percentage = b.match_percentage === '' ? null : Number(b.match_percentage);
        if (b.external_comment !== undefined) patch.external_comment = b.external_comment || null;
        if (b.frikadelle_eaten !== undefined) patch.frikadelle_eaten = b.frikadelle_eaten === '1' || b.frikadelle_eaten === true;
        if (b.medal_override !== undefined) patch.medal_override = b.medal_override === '' ? null : b.medal_override;
        if (b.strava_activity_url !== undefined) patch.strava_activity_url = b.strava_activity_url || null;
        if (strava_activity_id !== undefined) patch.strava_activity_id = strava_activity_id;

        if (img) patch.frikadelle_image = img;
        if (gpx) patch.gpx_xml = gpx;

        await row.update(patch);
        res.json(row);
    }
);

export default router;