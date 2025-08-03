// src/pages/MatcherPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import StravaMatcher from '../components/StravaMatcher.jsx';
import GPXMatcher from '../components/GPXMatcher.jsx';
import Tabs from '../components/Tabs.jsx';
import SubmissionForm from '../components/SubmissionForm.jsx';

export default function MatcherPage() {
    const navigate = useNavigate();

    const [tab, setTab] = useState('strava');
    const [athleteId, setAthlete] = useState(null);
    const [error, setError] = useState(null);
    const [matchData, setMatch] = useState(null);

    // 1) on mount, verify Strava session
    useEffect(() => {
        axios
            .get('/auth/me')
            .then(res => {
                setAthlete(res.data.athleteId);
                localStorage.setItem('athleteId', res.data.athleteId);
            })
            .catch(() => {
                // if not logged in, force to login flow
                window.location.href = '/auth/login';
            });
    }, []);

    // 2) callbacks for both matcher components
    function handleMatch(data) {
        setError(null);
        setMatch(data);
    }
    function handleError(err) {
        setError(err.error || 'Unknown error');
        setMatch(null);
    }

    return (
        <div style={{ padding: '1rem' }}>
            <h1>Submit Your Ride</h1>

            {/* if we haven’t matched yet, show the tabs & matcher */}
            {!matchData && (
                <>
                    <Tabs
                        tabs={[
                            { id: 'strava', label: 'Strava', disabled: !athleteId },
                            { id: 'gpx', label: 'Upload GPX' },
                        ]}
                        activeTab={tab}
                        onChange={setTab}
                    />

                    {error && <p style={{ color: 'red' }}>{error}</p>}

                    {tab === 'strava' ? (
                        <StravaMatcher
                            onMatch={handleMatch}
                            onError={handleError}
                        />
                    ) : (
                        <GPXMatcher
                            onMatch={handleMatch}
                            onError={handleError}
                        />
                    )}
                </>
            )}

            {/* once we have matchData, render map + submission form */}
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