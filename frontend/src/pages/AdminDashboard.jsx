// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function AdminDashboard() {
  const [subs, setSubs] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');
  const [csvText, setCsvText] = useState('');
  const [file, setFile]   = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!token) return navigate('/admin/login');
    axios
      .get('/api/admin/submissions', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setSubs(res.data))
      .catch(() => navigate('/admin/login'));
  }, [token, navigate]);

  const handleFrikaChange = (id, checked) => {
    setSubs(s =>
      s.map(r => (r.id === id ? { ...r, frikadelle_eaten: checked } : r))
    );
  };

  const handleExternalCommentChange = (id, text) => {
    setSubs(s =>
      s.map(r => (r.id === id ? { ...r, external_comment: text } : r))
    );
  };

  const approve = async id => {
    const row = subs.find(r => r.id === id);
    await axios.put(
      `/api/admin/submissions/${id}/approve`,
      {
        frikadelle_eaten: row.frikadelle_eaten,
        external_comment: row.external_comment
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setSubs(s =>
      s.map(r =>
        r.id === id ? { ...r, accepted: true } : r
      )
    );
  };

  // Import CSV handler
  const handleImport = async e => {
    e.preventDefault();
    if (!file && !csvText) return alert('Please choose a file or paste CSV');
    setImporting(true);
    try {
      const form = new FormData();
      if (file) form.append('csv', file);
      else     form.append('text', csvText);
      await axios.post('/api/admin/submissions/import', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      setFile(null);
      setCsvText('');
      loadSubs();
      alert('Import successful');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const formatDate = iso => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };

  return (
    <div style={{ maxWidth: 1000, margin: 'auto', padding: '1rem' }}>
      <h1>Admin Dashboard</h1>
      <section style={{ marginBottom: '2rem' }}>
        <h2>Import existing CSV</h2>
        <form onSubmit={handleImport} style={{ display: 'grid', gap: '0.5rem' }}>
          <label>
            Upload CSV File
            <input
              type="file"
              accept=".csv"
              onChange={e => {
                setFile(e.target.files[0]);
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
      </section>
      <section>
        <h2>Submissions</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Moving Time</th>
            <th>Match %</th>
            <th>Internal Comment</th>
            <th>External Comment</th>
            <th>Proof</th>
            <th>Ate Frikadelle</th>
            <th>Accepted</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {subs.map(r => (
            <tr key={r.id} style={{ borderTop: '1px solid #ccc' }}>
              <td>{formatDate(r.activity_date)}</td>
              <td>{r.name}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {Math.floor(r.moving_time_seconds / 3600)}:
                {String(Math.floor((r.moving_time_seconds % 3600) / 60)).padStart(2, '0')}:
                {String(r.moving_time_seconds % 60).padStart(2, '0')}
              </td>
              {r.match_percentage != null
          ? `${r.match_percentage.toFixed(1)} %`
          : '—'}
              <td style={{ whiteSpace: 'pre-wrap' }}>
                {r.internal_comment || '—'}
              </td>
              <td>
                <textarea
                  value={r.external_comment || ''}
                  onChange={e => handleExternalCommentChange(r.id, e.target.value)}
                  rows={2}
                  style={{ width: '100%' }}
                  disabled={r.accepted}
                />
              </td>
              <td style={{ textAlign: 'center' }}>
                {r.frikadelle_image ? (
                  <img
                    src={`/api/admin/submissions/${r.id}/proof`}
                    alt="proof"
                    style={{ maxWidth: 80, maxHeight: 80 }}
                  />
                ) : (
                  '—'
                )}
              </td>
              <td style={{ textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={Boolean(r.frikadelle_eaten)}
                  onChange={e => handleFrikaChange(r.id, e.target.checked)}
                  disabled={r.accepted}
                />
              </td>
              <td style={{ textAlign: 'center' }}>
                {r.accepted ? '✅' : '❌'}
              </td>
              <td>
                {!r.accepted && (
                  <button onClick={() => approve(r.id)}>
                    Approve
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </section>
    </div>
  );
}