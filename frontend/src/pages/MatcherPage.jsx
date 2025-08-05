import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StravaMatcher from '../components/StravaMatcher.jsx';
import GPXMatcher    from '../components/GPXMatcher.jsx';
import Tabs          from '../components/Tabs.jsx';
import SubmissionForm from '../components/SubmissionForm.jsx';

export default function MatcherPage() {
  const [tab, setTab]           = useState('strava');
  const [athleteId, setAthlete] = useState(null);
  const [error, setError]       = useState(null);
  const [matchData, setMatch]   = useState(null);

  // on mount, check session
  useEffect(() => {
    axios
      .get('/auth/me')
      .then(res => {
        setAthlete(res.data.athleteId);
        localStorage.setItem('athleteId', res.data.athleteId);
      })
      .catch(() => {
        // not authenticated — leave athleteId null
        localStorage.removeItem('athleteId');
        setAthlete(null);
      });
  }, []);

  // Disconnect handler
  const handleDisconnect = async () => {
    await axios.post('/auth/logout', { athleteId });
    localStorage.removeItem('athleteId');
    setAthlete(null);
    setMatch(null);
    setError(null);
  };

  useEffect(() => {
    setMatch(null);
    setError(null);
  }, [tab]);

  // match callbacks
  const handleMatch = data => {
    setError(null);
    setMatch(data);
  };
  const handleError = err => {
    setError(err.error || 'Unknown error');
    setMatch(null);
  };

  return (
    <div style={{ padding: '1rem', maxWidth: 800, margin: '0 auto' }}>
      <h1>Submit Your Ride</h1>

          <div style={{ marginBottom: '1rem' }}>
            {athleteId ? (
              <button onClick={handleDisconnect} style={{ float: 'right' }}>
                Disconnect Strava
              </button>
            ) : null}
            <Tabs
              tabs={[
                { id: 'strava', label: 'Strava', disabled: false },
                { id: 'gpx',    label: 'Upload GPX' },
              ]}
              activeTab={tab}
              onChange={setTab}
            />
          </div>

          {error && <p style={{ color: 'red' }}>{error}</p>}

          {tab === 'strava' ? (
            athleteId
              ? <StravaMatcher
                  athleteId={athleteId}
                  onMatch={handleMatch}
                  onError={handleError}
                />
              : <button onClick={() => window.location.href = '/auth/login'}>
                  Connect with Strava
                </button>
          ) : (
            <GPXMatcher
              onMatch={handleMatch}
              onError={handleError}
            />
          )}

      {matchData && (
        <SubmissionForm
          initial={matchData}
          referenceTrack={matchData.referenceTrack}
          activityTrack={matchData.activityTrack}
          onCancel={() => setMatch(null)}
        />
      )}
    </div>
  );
}