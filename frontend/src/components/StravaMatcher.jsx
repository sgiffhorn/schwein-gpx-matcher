import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function StravaMatcher({
  onMatch = () => {},  // ← no-op default
  onError = () => {},  // ← no-op default
}) {
  const [athleteId, setAthleteId] = useState(null);
  const [years, setYears] = useState([]);
  const [months] = useState([
    { value: 1, label: 'Jan' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dec' },
  ]);
  const [year, setYear] = useState(null);
  const [month, setMonth] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('athleteId');
    if (!id) {
      onError({ error: 'not_authenticated' });
      return;
    }
    setAthleteId(id);

    // populate year dropdown
    const cy = new Date().getFullYear();
    const ys = [];
    for (let y = cy; y >= 2007; y--) ys.push(y);
    setYears(ys);
    setYear(cy);
    setMonth(new Date().getMonth() + 1);
  }, [onError]);

  const loadActivities = async () => {
    if (!year || !month) return;
    setLoadingActivities(true);
    setActivities([]);
    try {
      const res = await axios.get(
        `/api/activities?athleteId=${athleteId}&year=${year}&month=${month}`
      );
      setActivities(res.data);
    } catch (e) {
      onError(e.response?.data || e);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleSelect = async e => {
    const id = e.target.value;
    if (!id) return;
    setLoadingMatch(true);
    try {
      const res = await axios.get(
        `/api/activities/${id}/match?athleteId=${athleteId}`
      );
      onMatch(res.data);
    } catch (e) {
      onError(e.response?.data || e);
    } finally {
      setLoadingMatch(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
      <h3>Match via Strava</h3>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <select value={year || ''} onChange={e => setYear(+e.target.value)}>
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={month || ''} onChange={e => setMonth(+e.target.value)}>
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <button onClick={loadActivities} disabled={loadingActivities}>
          {loadingActivities ? 'Loading…' : 'Load Rides'}
        </button>
      </div>

      {activities.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <select onChange={handleSelect} disabled={loadingMatch}>
            <option value="">— select a ride —</option>
            {activities.map(a => (
              <option key={a.id} value={a.id}>
                {new Date(a.start_date).toLocaleDateString()} – {a.name} ({(a.distance/1000).toFixed(1)} km)
              </option>
            ))}
          </select>
        </div>
      )}

      {loadingMatch && <p>Matching…</p>}
    </div>
  );
}