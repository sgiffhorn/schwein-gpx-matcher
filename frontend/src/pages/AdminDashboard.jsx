import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProofThumb from '../components/ProofThumb.jsx';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const token = localStorage.getItem('adminToken');

    const [subs, setSubs] = useState([]);
    const [csvText, setCsvText] = useState('');
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);

    // reference track for GPX previews
    const [refTrack, setRefTrack] = useState([]);
    const refCoords = useMemo(
        () => (Array.isArray(refTrack) ? refTrack.map(p => [p.lat, p.lon]) : []),
        [refTrack]
    );

    // expanded GPX map row
    const [openMapRow, setOpenMapRow] = useState(null);
    const [gpxCoords, setGpxCoords] = useState({}); // { [id]: [[lat,lon], ...] }

    // edit state per row
    const [editingId, setEditingId] = useState(null);
    const [edit, setEdit] = useState({}); // fields for the row being edited

    const [adding, setAdding] = useState({
        name: '',
        date: '',           // YYYY-MM-DD from <input type="date">
        timeHms: '',        // H:MM:SS
        external_comment: '',
        frikadelle_eaten: false,
        medal_override: '', // '', 'gold', 'silver', 'bronze', 'none'
    });

    const authHeader = useMemo(
        () => ({ Authorization: `Bearer ${token}` }),
        [token]
    );

    // Helpers
    const formatDate = iso => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '—';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}.${mm}.${yyyy}`;
    };
    const toDateInput = iso => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    const parseDateInput = val => (val ? val : null); // YYYY-MM-DD for DATEONLY

    const secsToHMS = secs => {
        if (!Number.isFinite(secs)) return '';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    const hmsToSecs = hms => {
        if (!hms) return null;
        const parts = hms.split(':').map(x => parseInt(x, 10));
        if (parts.some(n => Number.isNaN(n))) return null;
        const [h, m = 0, s = 0] = parts;
        return h * 3600 + m * 60 + s;
    };

    const numOrNull = v => {
        if (v === '' || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isNaN(n) ? null : n;
    };

    const strToNull = v => (v === '' ? null : v);

    // Load submissions
    const loadSubs = async () => {
        const res = await axios.get('/api/admin/submissions', { headers: authHeader });
        setSubs(res.data || []);
    };

    // Initial auth + data
    useEffect(() => {
        if (!token) return navigate('/admin/login');
        loadSubs().catch(() => navigate('/admin/login'));
    }, [token, navigate]);

    // Reference track (for GPX previews)
    useEffect(() => {
        axios
            .get('/api/admin/reference-track', { headers: authHeader })
            .then(res => setRefTrack(res.data || []))
            .catch(() => setRefTrack([]));
    }, [authHeader]);

    // CSV import
    const handleImport = async e => {
        e.preventDefault();
        if (!file && !csvText) return alert('Please choose a file or paste CSV');
        setImporting(true);
        try {
            const form = new FormData();
            if (file) form.append('csv', file);
            else form.append('text', csvText);
            await axios.post('/api/admin/submissions/import', form, {
                headers: { ...authHeader, 'Content-Type': 'multipart/form-data' }
            });
            setFile(null);
            setCsvText('');
            await loadSubs();
            alert('Import successful');
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    // Approve (unchanged behavior, but includes frikadelle_eaten/external_comment/medal_override)
    const approve = async id => {
        const row = subs.find(r => r.id === id);
        await axios.put(
            `/api/admin/submissions/${id}/approve`,
            {
                frikadelle_eaten: !!row.frikadelle_eaten,
                external_comment: row.external_comment ?? null,
                medal_override: row.medal_override ?? null
            },
            { headers: authHeader }
        );
        setSubs(s => s.map(r => (r.id === id ? { ...r, accepted: true } : r)));
    };

    // Open/close GPX map
    const parseGpxToLatLng = (xmlText) => {
        try {
            const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
            const pts = [...doc.querySelectorAll('trkpt')].map(el => [
                parseFloat(el.getAttribute('lat')),
                parseFloat(el.getAttribute('lon')),
            ]);
            return pts.filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
        } catch {
            return [];
        }
    };
    const openMap = async (row) => {
        setOpenMapRow(prev => (prev === row.id ? null : row.id));
        if (!gpxCoords[row.id]) {
            try {
                const res = await axios.get(`/api/admin/submissions/${row.id}/gpx`, {
                    headers: authHeader,
                    responseType: 'text'
                });
                const coords = parseGpxToLatLng(res.data);
                setGpxCoords(prev => ({ ...prev, [row.id]: coords }));
            } catch (e) {
                console.error('GPX fetch/parse failed', e);
                setGpxCoords(prev => ({ ...prev, [row.id]: [] }));
            }
        }
    };

    // Inline quick edits already in your UI
    const handleFrikaChange = (id, checked) =>
        setSubs(s => s.map(r => (r.id === id ? { ...r, frikadelle_eaten: checked } : r)));

    const handleExternalCommentChange = (id, text) =>
        setSubs(s => s.map(r => (r.id === id ? { ...r, external_comment: text } : r)));

    const handleMedalOverrideChange = (id, value) =>
        setSubs(s => s.map(r => (r.id === id ? { ...r, medal_override: value || null } : r)));

    // === Edit row ===
    const startEdit = (r) => {
        setEditingId(r.id);
        setEdit({
            name: r.name || '',
            date: toDateInput(r.activity_date), // YYYY-MM-DD
            timeHms: secsToHMS(Number(r.moving_time_seconds)),
            matchPct: r.match_percentage != null && r.match_percentage !== ''
                ? String(Number(r.match_percentage))
                : '',
            external_comment: r.external_comment || '',
            frikadelle_eaten: !!r.frikadelle_eaten,
            medal_override: r.medal_override || '',
            strava_activity_url: r.strava_activity_url || '',
            strava_activity_id: r.strava_activity_id ? String(r.strava_activity_id) : '',
            proofFile: null,
            gpxFile: null,
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEdit({});
    };

    const saveEdit = async (id) => {
        // build multipart only if files are present, else JSON
        const bodyHasFiles = !!(edit.proofFile || edit.gpxFile);
        const payload = bodyHasFiles ? new FormData() : {};

        const put = (k, v) => {
            if (bodyHasFiles) payload.append(k, v ?? '');
            else payload[k] = v;
        };

        const activity_date = parseDateInput(edit.date); // YYYY-MM-DD or null
        const moving_time_seconds = hmsToSecs(edit.timeHms);
        const match_percentage = numOrNull(edit.matchPct);

        put('name', edit.name);
        if (activity_date) put('activity_date', activity_date);
        if (moving_time_seconds != null) put('moving_time_seconds', String(moving_time_seconds));
        if (match_percentage != null) put('match_percentage', String(match_percentage));
        put('external_comment', strToNull(edit.external_comment));
        put('frikadelle_eaten', edit.frikadelle_eaten ? '1' : '0');
        put('medal_override', edit.medal_override === '' ? '' : edit.medal_override);
        put('strava_activity_url', strToNull(edit.strava_activity_url));
        put('strava_activity_id', strToNull(edit.strava_activity_id));

        if (edit.proofFile) put('frikadelleImage', edit.proofFile);
        if (edit.gpxFile) put('gpx', edit.gpxFile);

        await axios.put(`/api/admin/submissions/${id}`, payload, {
            headers: bodyHasFiles
                ? { ...authHeader, 'Content-Type': 'multipart/form-data' }
                : { ...authHeader }
        });

        await loadSubs();
        setEditingId(null);
        setEdit({});
    };

    // === Add new row ===
    const addNew = async (e) => {
        e.preventDefault();
        const moving_time_seconds = hmsToSecs(adding.timeHms);
        if (!adding.name || !adding.date || moving_time_seconds == null) {
            alert('Name, Date, and Moving time are required');
            return;
        }

        await axios.post(
            '/api/admin/submissions',
            {
                name: adding.name,
                activity_date: adding.date,               // YYYY-MM-DD
                moving_time_seconds,
                external_comment: adding.external_comment || null,
                frikadelle_eaten: !!adding.frikadelle_eaten,
                medal_override: adding.medal_override || null,
                // everything else (match %, proof image, GPX, Strava) omitted on purpose
            },
            { headers: authHeader }
        );

        // reset + refresh
        setAdding({
            name: '',
            date: '',
            timeHms: '',
            external_comment: '',
            frikadelle_eaten: false,
            medal_override: '',
        });
        await loadSubs();
    };

    return (
        <div style={{ maxWidth: 1150, margin: 'auto', padding: '1rem' }}>
            <h1>Admin Dashboard</h1>

            {/* Add new submission */}
            <details style={{ marginBottom: '2rem' }}>
                <summary
                    style={{
                        fontSize: '1.15rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '0.4rem 0',
                        listStyle: 'none'
                    }}
                >
                    Add new submission
                </summary>

                <form
                    onSubmit={addNew}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '160px 1fr 160px 1fr',
                        gap: '0.5rem 1rem',
                        marginTop: '0.75rem'
                    }}
                >
                    <label style={{ alignSelf: 'center' }}>Name *</label>
                    <input
                        value={adding.name}
                        onChange={e => setAdding(a => ({ ...a, name: e.target.value }))}
                        required
                    />

                    <label style={{ alignSelf: 'center' }}>Date *</label>
                    <input
                        type="date"
                        value={adding.date}
                        onChange={e => setAdding(a => ({ ...a, date: e.target.value }))}
                        required
                    />

                    <label style={{ alignSelf: 'center' }}>Moving time (H:MM:SS) *</label>
                    <input
                        placeholder="H:MM:SS"
                        value={adding.timeHms}
                        onChange={e => setAdding(a => ({ ...a, timeHms: e.target.value }))}
                        required
                    />

                    <label style={{ alignSelf: 'center' }}>External comment</label>
                    <input
                        value={adding.external_comment}
                        onChange={e => setAdding(a => ({ ...a, external_comment: e.target.value }))}
                    />

                    <label style={{ alignSelf: 'center' }}>Ate Frikadelle</label>
                    <input
                        type="checkbox"
                        checked={adding.frikadelle_eaten}
                        onChange={e => setAdding(a => ({ ...a, frikadelle_eaten: e.target.checked }))}
                    />

                    <label style={{ alignSelf: 'center' }}>Medal override</label>
                    <select
                        value={adding.medal_override}
                        onChange={e => setAdding(a => ({ ...a, medal_override: e.target.value }))}
                    >
                        <option value="">auto</option>
                        <option value="gold">gold</option>
                        <option value="silver">silver</option>
                        <option value="bronze">bronze</option>
                        <option value="none">none</option>
                    </select>

                    <div />
                    <div />
                    <button type="submit" style={{ gridColumn: '1 / span 4', justifySelf: 'end' }}>
                        Add submission
                    </button>
                </form>
            </details>

            {/* CSV import */}
            <details style={{ marginBottom: '1.5rem' }}>
  <summary
    style={{
      fontSize: '1.15rem',
      fontWeight: 600,
      cursor: 'pointer',
      padding: '0.4rem 0',
      listStyle: 'none'
    }}
  >
    Import existing CSV
  </summary>

  <form onSubmit={handleImport} style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem' }}>
    <label>
      Upload CSV File
      <input
        type="file"
        accept=".csv"
        onChange={e => {
          setFile(e.target.files[0] || null);
          setCsvText('');
        }}
      />
    </label>

    <div style={{ textAlign: 'center' }}>— or —</div>

    <label>
      Paste CSV Text
      <textarea
        rows={6}
        value={csvText}
        onChange={e => {
          setCsvText(e.target.value);
          setFile(null);
        }}
        placeholder="semicolon-separated CSV…"
      />
    </label>

    <button type="submit" disabled={importing}>
      {importing ? 'Importing…' : 'Import CSV'}
    </button>
  </form>
</details>

            {/* Submissions table */}
            <section>
                <h2>Submissions</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Name</th>
                            <th>Moving Time</th>
                            <th>Match %</th>
                            <th>Internal</th>
                            <th>External</th>
                            <th>Proof</th>
                            <th>Strava / GPX</th>
                            <th>Medal (override)</th>
                            <th>Ate</th>
                            <th>Accepted</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subs.map(r => {
                            const match =
                                r.match_percentage != null && r.match_percentage !== ''
                                    ? Number(r.match_percentage)
                                    : null;

                            const stravaUrl =
                                r.strava_activity_url ||
                                (r.strava_activity_id ? `https://www.strava.com/activities/${r.strava_activity_id}` : null);

                            const gpxAvail = !!r.has_gpx || !!r.gpx_xml;
                            const thisGpx = gpxCoords[r.id] || [];

                            let bounds = null;
                            if (openMapRow === r.id && thisGpx.length && refCoords.length) {
                                const all = [...thisGpx, ...refCoords];
                                const lats = all.map(c => c[0]);
                                const lons = all.map(c => c[1]);
                                bounds = [
                                    [Math.min(...lats), Math.min(...lons)],
                                    [Math.max(...lats), Math.max(...lons)],
                                ];
                            }

                            const isEditing = editingId === r.id;

                            return (
                                <React.Fragment key={r.id}>
                                    <tr style={{ borderTop: '1px solid #ccc', verticalAlign: 'top' }}>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    type="date"
                                                    value={edit.date}
                                                    onChange={e => setEdit(ed => ({ ...ed, date: e.target.value }))}
                                                />
                                            ) : (
                                                formatDate(r.activity_date)
                                            )}
                                        </td>

                                        <td>
                                            {isEditing ? (
                                                <input
                                                    value={edit.name}
                                                    onChange={e => setEdit(ed => ({ ...ed, name: e.target.value }))}
                                                />
                                            ) : (
                                                r.name
                                            )}
                                        </td>

                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {isEditing ? (
                                                <input
                                                    placeholder="H:MM:SS"
                                                    value={edit.timeHms}
                                                    onChange={e => setEdit(ed => ({ ...ed, timeHms: e.target.value }))}
                                                />
                                            ) : (
                                                secsToHMS(Number(r.moving_time_seconds))
                                            )}
                                        </td>

                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={edit.matchPct}
                                                    onChange={e => setEdit(ed => ({ ...ed, matchPct: e.target.value }))}
                                                    style={{ width: 90 }}
                                                />
                                            ) : match != null && !Number.isNaN(match) ? (
                                                `${match.toFixed(1)} %`
                                            ) : (
                                                '—'
                                            )}
                                        </td>

                                        <td style={{ whiteSpace: 'pre-wrap', maxWidth: 220 }}>
                                            {r.internal_comment || '—'}
                                        </td>

                                        <td style={{ minWidth: 180 }}>
                                            {isEditing ? (
                                                <input
                                                    value={edit.external_comment}
                                                    onChange={e => setEdit(ed => ({ ...ed, external_comment: e.target.value }))}
                                                />
                                            ) : (
                                                <textarea
                                                    value={r.external_comment || ''}
                                                    onChange={e => setSubs(s => s.map(x => x.id === r.id ? { ...x, external_comment: e.target.value } : x))}
                                                    rows={2}
                                                    style={{ width: '100%' }}
                                                    disabled={r.accepted || isEditing}
                                                />
                                            )}
                                        </td>

                                        {/* Proof column */}
                                        <td style={{ textAlign: 'center', width: 120 }}>
                                            {isEditing ? (
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => setEdit(ed => ({ ...ed, proofFile: e.target.files?.[0] ?? null }))}
                                                />
                                            ) : (
                                                <ProofThumb id={r.id} token={token} />
                                            )}
                                        </td>

                                        {/* Strava / GPX */}
                                        <td style={{ textAlign: 'center', minWidth: 160 }}>
                                            {isEditing ? (
                                                <div style={{ display: 'grid', gap: 4 }}>
                                                    <input
                                                        placeholder="Strava URL"
                                                        value={edit.strava_activity_url}
                                                        onChange={e => setEdit(ed => ({ ...ed, strava_activity_url: e.target.value }))}
                                                    />
                                                    <input
                                                        placeholder="Strava ID"
                                                        value={edit.strava_activity_id}
                                                        onChange={e => setEdit(ed => ({ ...ed, strava_activity_id: e.target.value }))}
                                                    />
                                                    <div>
                                                        <label style={{ fontSize: 12, opacity: 0.8 }}>Replace GPX:</label>
                                                        <input
                                                            type="file"
                                                            accept=".gpx,application/gpx+xml"
                                                            onChange={e => setEdit(ed => ({ ...ed, gpxFile: e.target.files?.[0] ?? null }))}
                                                        />
                                                    </div>
                                                </div>
                                            ) : stravaUrl ? (
                                                <a href={stravaUrl} target="_blank" rel="noreferrer">Open in Strava</a>
                                            ) : gpxAvail ? (
                                                <button onClick={() => openMap(r)}>
                                                    {openMapRow === r.id ? 'Hide Map' : 'View Map'}
                                                </button>
                                            ) : (
                                                '—'
                                            )}
                                        </td>

                                        {/* Medal override */}
                                        <td>
                                            {isEditing ? (
                                                <select
                                                    value={edit.medal_override}
                                                    onChange={e => setEdit(ed => ({ ...ed, medal_override: e.target.value }))}
                                                >
                                                    <option value="">auto</option>
                                                    <option value="gold">gold</option>
                                                    <option value="silver">silver</option>
                                                    <option value="bronze">bronze</option>
                                                    <option value="none">none</option>
                                                </select>
                                            ) : (
                                                <select
                                                    value={r.medal_override || ''}
                                                    onChange={e => handleMedalOverrideChange(r.id, e.target.value)}
                                                    disabled={r.accepted}
                                                >
                                                    <option value="">auto</option>
                                                    <option value="gold">gold</option>
                                                    <option value="silver">silver</option>
                                                    <option value="bronze">bronze</option>
                                                    <option value="none">none</option>
                                                </select>
                                            )}
                                        </td>

                                        <td style={{ textAlign: 'center' }}>
                                            {isEditing ? (
                                                <input
                                                    type="checkbox"
                                                    checked={!!edit.frikadelle_eaten}
                                                    onChange={e => setEdit(ed => ({ ...ed, frikadelle_eaten: e.target.checked }))}
                                                />
                                            ) : (
                                                <input
                                                    type="checkbox"
                                                    checked={!!r.frikadelle_eaten}
                                                    onChange={e => handleFrikaChange(r.id, e.target.checked)}
                                                    disabled={r.accepted}
                                                />
                                            )}
                                        </td>

                                        <td style={{ textAlign: 'center' }}>
                                            {r.accepted ? '✅' : '❌'}
                                        </td>

                                        <td>
                                            {isEditing ? (
                                                <>
                                                    <button onClick={() => saveEdit(r.id)} style={{ marginRight: 6 }}>Save</button>
                                                    <button onClick={cancelEdit}>Cancel</button>
                                                </>
                                            ) : (
                                                <>
                                                    {!r.accepted && <button onClick={() => approve(r.id)} style={{ marginRight: 6 }}>Approve</button>}
                                                    <button onClick={() => startEdit(r)}>Edit</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>

                                    {openMapRow === r.id && gpxAvail && (
                                        <tr>
                                            <td colSpan={12}>
                                                {bounds ? (
                                                    <div style={{ height: 320, margin: '8px 0' }}>
                                                        <MapContainer bounds={bounds} scrollWheelZoom={false} style={{ height: '100%' }}>
                                                            <TileLayer
                                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                                attribution="© OpenStreetMap contributors"
                                                            />
                                                            <Polyline positions={refCoords} color="blue" />
                                                            <Polyline positions={thisGpx} color="red" />
                                                        </MapContainer>
                                                    </div>
                                                ) : (
                                                    <em>Loading GPX…</em>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </section>
        </div>
    );
}