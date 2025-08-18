// src/components/ProofThumb.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ProofThumb({ id, token }) {
  const [url, setUrl] = useState(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    let objectUrl;
    axios.get(`/api/admin/submissions/${id}/proof`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    })
    .then(res => {
      objectUrl = URL.createObjectURL(res.data);
      setUrl(objectUrl);
    })
    .catch(() => setUrl(null));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, token]);

  if (!url) return <span>—</span>;

  return (
    <>
      <img
        src={url}
        alt="proof"
        style={{ maxWidth: 80, maxHeight: 80, cursor: 'pointer' }}
        onClick={() => setFull(true)}
      />
      {full && (
        <div
          onClick={() => setFull(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <img
            src={url}
            alt="proof large"
            style={{ maxWidth: '90vw', maxHeight: '90vh', boxShadow: '0 0 20px #000' }}
          />
        </div>
      )}
    </>
  );
}