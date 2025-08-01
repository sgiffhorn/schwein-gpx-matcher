// src/gpxService.js
import fs from 'fs';
import path from 'path';

let cachedRefPoints = null;

export async function loadReferencePoints() {
  if (cachedRefPoints) return cachedRefPoints;

  const xml = fs.readFileSync(path.resolve(process.env.REFERENCE_GPX_PATH), 'utf8')
    .replace(/^\uFEFF/, '')                  // strip BOM
    .replace(/^[^<]*/, '');                  // drop anything before first '<'

  // pull out every <trkpt lat="x" lon="y">
  const pts = [];
  xml.replace(
    /<trkpt\s+lat="([\d\.\-]+)"\s+lon="([\d\.\-]+)"/g,
    (_, lat, lon) => { pts.push({ lat:+lat, lon:+lon }); }
  );

  if (!pts.length) {
    throw new Error('No GPX track points found; is your file the correct format?');
  }

  cachedRefPoints = pts;
  return pts;
}