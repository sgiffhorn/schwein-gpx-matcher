// src/components/GPXMatcher.jsx
import { useState, useRef } from 'react';
import axios from 'axios';

export default function GPXMatcher({ onMatch, onError }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  async function submit() {
    if (!file || busy) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('gpx', file);

      const { data } = await axios.post('/api/upload-match', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // carry the original File forward so SubmissionForm can upload it to /api/submission
      // (your backend will store it in `gpx_xml`)
      onMatch?.({
        ...data,
        gpxFile: file,                // <-- important
      });
    } catch (err) {
      const message = err?.response?.data?.error || err.message || 'Error matching GPX';
      onError?.({ error: message });
      // optional UX
      // alert(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".gpx,application/gpx+xml"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button disabled={!file || busy} onClick={submit}>
        {busy ? 'Matching…' : 'Match GPX'}
      </button>
    </div>
  );
}