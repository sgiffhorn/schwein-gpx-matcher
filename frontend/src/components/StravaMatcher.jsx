import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function StravaMatcher({ athleteId, onMatch, onError }) {
  const [years, setYears] = useState([]);
  const [months] = useState([
    { value: 1,  label: 'Jan' }, { value: 2,  label: 'Feb' },
    { value: 3,  label: 'Mar' }, { value: 4,  label: 'Apr' },
    { value: 5,  label: 'May' }, { value: 6,  label: 'Jun' },
    { value: 7,  label: 'Jul' }, { value: 8,  label: 'Aug' },
    { value: 9,  label: 'Sep' }, { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
  ]);
  const [year, setYear]         = useState(null);
  const [month, setMonth]       = useState(null);
  const [activities, setActs]   = useState([]);
  const [loadingActs, setLA]    = useState(false);
  const [loadingMatch, setLM]   = useState(false);

  // populate years & default month/year
  useEffect(() => {
    const cy = new Date().getFullYear();
    setYears(Array.from({length: cy - 2006}, (_, i) => cy - i));
    setYear(cy);
    setMonth(new Date().getMonth() + 1);
  }, []);

  // Disconnect handler
    const handleDisconnect = async () => {
      await axios.post('/auth/logout', { athleteId });
      localStorage.removeItem('athleteId');
      setAthlete(null);
      setMatch(null);
      setError(null);
    };

  const loadActivities = async () => {
    if (!year || !month) return;
    setLA(true);
    setActs([]);
    try {
      const res = await axios.get(
        `/api/activities?athleteId=${athleteId}&year=${year}&month=${month}`
      );
      setActs(res.data);
    } catch (e) {
      onError(e.response?.data || e);
    } finally {
      setLA(false);
    }
  };

  const handleSelect = async e => {
    const id = e.target.value;
    if (!id) return;
    setLM(true);
    try {
      const res = await axios.get(
        `/api/activities/${id}/match?athleteId=${athleteId}`
      );
      const act = activities.find(a => a.id.toString() === id.toString());
      onMatch({
        ...res.data,
        activityDate: act?.start_date || new Date().toISOString(),
        stravaActivityId: act?.id,
      });
    } catch (e) {
      onError(e.response?.data || e);
    } finally {
      setLM(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
      <h3>Match via Strava</h3>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <select value={year||''} onChange={e => setYear(+e.target.value)}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month||''} onChange={e => setMonth(+e.target.value)}>
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <button className="btn btn-secondary" onClick={loadActivities} disabled={loadingActs}>
          {loadingActs ? 'Loading…' : 'Load Rides'}
        </button>
      </div>

      {activities.length>0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <select onChange={handleSelect} disabled={loadingMatch}>
            <option value="">— select a ride —</option>
            {activities.map(a => (
              <option key={a.id} value={a.id}>
                {new Date(a.start_date).toLocaleDateString()} – {a.name} ({(a.distance/1000).toFixed(1)} km)
              </option>
            ))}
          </select>
        </div>
      )}
      {athleteId ? (
          <button className="btn btn-secondary" onClick={handleDisconnect}>
            Disconnect Strava
          </button>
        ) : null}

      {loadingMatch && <p>Matching…</p>}
    </div>
  );
}