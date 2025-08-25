// src/components/SubmissionForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function LegendControl() {
  const map = useMap();
  useEffect(() => {
    const legend = L.control({ position: 'bottomleft' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.background = 'rgba(255,255,255,0.7)';
      div.style.padding = '6px';
      div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
      div.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:4px;">
          <span style="background:blue; width:16px; height:16px; display:inline-block; margin-right:6px;"></span>
          Reference Track
        </div>
        <div style="display:flex; align-items:center;">
          <span style="background:red; width:16px; height:16px; display:inline-block; margin-right:6px;"></span>
          Your Ride
        </div>`;
      return div;
    };
    legend.addTo(map);
    return () => map.removeControl(legend);
  }, [map]);
  return null;
}

export default function SubmissionForm({
  initial,
  referenceTrack,
  activityTrack,
  onCancel
}) {
  // -------- helpers
  const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());
  const toIsoDate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  const formatDate = (d) => {
    if (!isValidDate(d)) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}.${mm}.${yy}`;
  };

  // -------- incoming values
  const initialName = initial?.name || '';
  const parsedInitialDate = initial?.activityDate ? new Date(initial.activityDate) : null;
  const hasInitialDate = isValidDate(parsedInitialDate);

  const initialSecs = Number(initial?.movingTimeSeconds) || 0;
  const hasInitialTime = initialSecs > 0;

  const matchPct = typeof initial?.matchPercentage === 'number' ? initial.matchPercentage : null;

  // -------- form state
  const [name, setName] = useState(initialName);
  const [comment, setComment] = useState('');
  const [proofFile, setProofFile] = useState(null);

  // date state: if missing, user must pick it
  const [dateObj, setDateObj] = useState(hasInitialDate ? parsedInitialDate : null);

  // moving time state: if missing (or 0), user must pick it
  // choose fairly generous hours upper bound for ultra rides
  const HOURS_MAX = 48;
  const initH = Math.floor(initialSecs / 3600);
  const initM = Math.floor((initialSecs % 3600) / 60);
  const initS = initialSecs % 60;
  const [hh, setHh] = useState(hasInitialTime ? initH : 0);
  const [mm, setMm] = useState(hasInitialTime ? initM : 0);
  const [ss, setSs] = useState(hasInitialTime ? initS : 0);

  const effectiveSecs = hasInitialTime ? initialSecs : (hh * 3600 + mm * 60 + ss);
  const effectiveDate = hasInitialDate ? parsedInitialDate : dateObj;

  // -------- map prep
  const refCoords = Array.isArray(referenceTrack) ? referenceTrack.map(p => [p.lat, p.lon]) : [];
  const actCoords = Array.isArray(activityTrack)
    ? activityTrack.map(p => (Array.isArray(p) ? p : [p.lat, p.lon]))
    : [];
  const canShowMap = refCoords.length && actCoords.length;
  const bounds = useMemo(() => {
    if (!canShowMap) return null;
    const lats = [...refCoords, ...actCoords].map(c => c[0]);
    const lons = [...refCoords, ...actCoords].map(c => c[1]);
    return [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
  }, [canShowMap, refCoords, actCoords]);

  // -------- validation
  const minPct = 85; // keep existing behavior
  const nameOk = name.trim().length > 0;
  const dateOk = isValidDate(effectiveDate);
  const timeOk = effectiveSecs > 0; // 00:00:00 counts as "not set"
  const matchOk = matchPct == null || matchPct >= minPct;

  const canSubmit = nameOk && dateOk && timeOk && matchOk;

  // -------- submit
  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    if (proofFile && proofFile.size > 5 * 1024 * 1024) {
      alert('Image must be ≤ 5MB');
      return;
    }

    const fd = new FormData();
    fd.append('name', name);
    fd.append('comment', comment);
    fd.append('activityDate', toIsoDate(effectiveDate)); // YYYY-MM-DD for DB DATE column
    fd.append('movingTimeSeconds', String(effectiveSecs));
    if (typeof matchPct === 'number') fd.append('matchPercentage', String(matchPct));
    if (proofFile) fd.append('frikadelleImage', proofFile);
    if (initial?.gpxFile) fd.append('gpx', initial.gpxFile); // store GPX XML server-side
    if (initial?.stravaActivityId) fd.append('stravaActivityId', initial.stravaActivityId);

    await axios.post('/api/submission', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    alert('Submitted! Pending approval.');
    setComment('');
    setProofFile(null);
  }

  // -------- options for time selects
  const hourOptions = Array.from({ length: HOURS_MAX + 1 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);
  const secondOptions = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div>
    {canShowMap && bounds && (
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
        <MapContainer bounds={bounds} scrollWheelZoom={false} style={{ height: 300, marginBottom: '1rem', position: 'relative' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          <Polyline positions={refCoords} color="blue" />
          <Polyline positions={actCoords} color="red" />
          <LegendControl />
        </MapContainer>
        </div>
      </div>
      )}

      {/* summary line */}
      <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-body" style={{ textAlign: 'center', fontWeight: 600 }}>
        <strong>Date:</strong> {formatDate(effectiveDate)} &nbsp;|&nbsp;
        <strong>Time:</strong> {timeOk ? formatTime(effectiveSecs) : '—'} &nbsp;|&nbsp;
        <strong>Match:</strong> {matchPct != null ? `${matchPct.toFixed(1)}%` : '—'}
      </div>
    </div>


      {/* if date or time is missing, show inputs to capture them */}
      {(!hasInitialDate || !hasInitialTime) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr',
            gap: '0.75rem 1rem',
            alignItems: 'center',
            marginBottom: '1rem',
            background: '#fafafa',
            padding: '0.75rem',
            borderRadius: 6,
            border: '1px solid #eee'
          }}
        >
          {!hasInitialDate && (
            <>
              <label style={{ justifySelf: 'end' }}>Set Date</label>
              <input
                type="date"
                value={isValidDate(dateObj) ? toIsoDate(dateObj) : ''}
                onChange={(e) => setDateObj(e.target.value ? new Date(`${e.target.value}T00:00:00`) : null)}
                required
                style={{ padding: '0.5rem', width: '100%' }}
              />
            </>
          )}

          {!hasInitialTime && (
            <>
              <label style={{ justifySelf: 'end' }}>Set Moving Time</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select value={hh} onChange={(e) => setHh(+e.target.value)}>
                  {hourOptions.map(h => <option key={h} value={h}>{h} h</option>)}
                </select>
                <select value={mm} onChange={(e) => setMm(+e.target.value)}>
                  {minuteOptions.map(m => <option key={m} value={m}>{String(m).padStart(2, '0')} m</option>)}
                </select>
                <select value={ss} onChange={(e) => setSs(+e.target.value)}>
                  {secondOptions.map(s => <option key={s} value={s}>{String(s).padStart(2, '0')} s</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        <label style={{ justifySelf: 'end' }}>Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="First Last"
          style={{ padding: '0.5rem', width: '100%' }}
        />

        <label style={{ justifySelf: 'end', alignSelf: 'start', marginTop: '0.25rem' }}>
          Comment
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          style={{ padding: '0.5rem', width: '100%' }}
          placeholder="Optional message for the admin"
        />

        <label style={{ justifySelf: 'end' }}>Proof image</label>
        <input
          type="file"
          accept="image/*"
          onChange={e => setProofFile(e.target.files?.[0] || null)}
        />

        {/* Validation hints */}
        <div></div>
        <div style={{ color: '#c00', fontSize: '0.9rem', lineHeight: 1.4 }}>
          {!nameOk && <div>• Name is required.</div>}
          {!dateOk && <div>• Date is required.</div>}
          {!timeOk && <div>• Moving time is required.</div>}
          {matchPct != null && matchPct < minPct && (
            <div>• Your match percentage is below {minPct}%, so you cannot submit.</div>
          )}
        </div>

        <div></div>
      <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'space-between', marginTop: '.5rem' }}>
        <button type="button" className="btn" onClick={onCancel}>Abbrechen</button>
        <button type="submit" className="btn btn-primary" disabled={typeof matchPct === 'number' && matchPct < minPct}>
          Einreichen
        </button>
      </div>
      </form>
    </div>
  );
}