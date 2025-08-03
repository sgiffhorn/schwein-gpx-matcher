import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function AdminDashboard() {
  const [subs, setSubs] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) return navigate('/admin/login');
    axios.get('/api/admin/submissions', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setSubs(res.data))
      .catch(() => navigate('/admin/login'));
  }, [token]);

  const approve = async id => {
    await axios.put(`/api/admin/submissions/${id}/approve`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setSubs(s => s.map(r => r.id === id ? { ...r, accepted: true } : r));
  };

  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: '1rem' }}>
      <h1>Admin Dashboard</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Moving Time</th>
            <th>Frikadelle Proof</th>
            <th>Accepted</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {subs.map(r => (
            <tr key={r.id}>
              <td>{r.date.slice(0,10)}</td>
              <td>{r.firstName} {r.lastName}</td>
              <td>{Math.floor(r.movingTimeSeconds/60)}:{String(r.movingTimeSeconds%60).padStart(2,'0')}</td>
              <td>
                {r.frikadelleProof
                  ? <a href={`/api/admin/submissions/${r.id}/proof`} target="_blank">View</a>
                  : '—'}
              </td>
              <td>{r.accepted ? '✅' : '❌'}</td>
              <td>
                {!r.accepted && (
                  <button onClick={() => approve(r.id)}>Approve</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}