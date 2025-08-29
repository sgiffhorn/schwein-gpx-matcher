import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StravaMatcher from '../components/StravaMatcher.jsx';
import GPXMatcher    from '../components/GPXMatcher.jsx';
import Tabs          from '../components/Tabs.jsx';
import SubmissionForm from '../components/SubmissionForm.jsx';
import { Link } from 'react-router-dom'; 

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
  <div className="container">
    <div className="page-header">
        <h1>Submit Your Ride</h1>
        <Link to="/fame" className="btn btn-primary">
          Back to Hall of Fame
        </Link>
      </div>

    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <Tabs
          tabs={[
            { id: 'strava', label: 'Strava', disabled: false },
            { id: 'gpx',    label: 'Upload GPX' },
          ]}
          activeTab={tab}
          onChange={setTab}
        />

        {error && <p style={{ color: 'var(--danger)', marginTop: '.75rem' }}>{error}</p>}

        <div style={{ marginTop: '1rem' }}>
          {tab === 'strava' ? (
            athleteId ? (
              <StravaMatcher athleteId={athleteId} onMatch={handleMatch} onError={handleError} />
            ) : (
              <button className="btn btn-primary" onClick={() => (window.location.href = '/auth/login')}>
                Mit Strava verbinden
              </button>
            )
          ) : (
            <GPXMatcher onMatch={handleMatch} onError={handleError} />
          )}
        </div>
      </div>
    </div>

    {matchData && (
      <div className="card">
        <div className="card-body">
          <SubmissionForm
            initial={matchData}
            referenceTrack={matchData.referenceTrack}
            activityTrack={matchData.activityTrack}
            onCancel={() => setMatch(null)}
          />
        </div>
      </div>
    )}
  </div>
);
}