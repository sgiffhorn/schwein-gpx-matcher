import React, { useState } from 'react';

export default function GPXMatcher({ onMatch, onError }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!file) {
      return onError({ error: 'invalid_gpx' });
    }
    const fd = new FormData();
    fd.append('gpx', file);
    setLoading(true);
    try {
      await onMatch(fd);
    } catch (e) {
      onError(e.response?.data || e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
      <h3>Match via GPX Upload</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '0.5rem' }}>
          <input
            type="file"
            accept=".gpx"
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Uploading…' : 'Upload & Match'}
        </button>
      </form>
    </div>
  );
}