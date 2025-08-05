// src/components/SubmissionForm.jsx
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  MapContainer,
  TileLayer,
  Polyline,
  useMap
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function LegendControl() {
  const map = useMap()
  useEffect(() => {
    const legend = L.control({ position: 'bottomleft' })
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend')
      div.style.background = 'rgba(255,255,255,0.7)'
      div.style.padding = '6px'
      div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)'
      div.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:4px;">
          <span style="background:blue; width:16px; height:16px; display:inline-block; margin-right:6px;"></span>
          Reference Track
        </div>
        <div style="display:flex; align-items:center;">
          <span style="background:red; width:16px; height:16px; display:inline-block; margin-right:6px;"></span>
          Your Ride
        </div>
      `
      return div
    }
    legend.addTo(map)
    return () => map.removeControl(legend)
  }, [map])
  return null
}

export default function SubmissionForm({
  initial,
  referenceTrack,
  activityTrack,
  onCancel
}) {
  // editable
  const [name, setName] = useState(initial.name || '')
  const [comment, setComment] = useState(initial.externalComment || '')

  // date state: if initial date provided, use it, otherwise null
  const initialDate = initial.activityDate ? new Date(initial.activityDate) : null
  const [dateObj, setDateObj] = useState(initialDate)

  // time state in seconds: if initial movingTimeSeconds >0, use it, else null
  const initialTime = initial.movingTimeSeconds > 0 ? initial.movingTimeSeconds : null
  const [timeSec, setTimeSec] = useState(initialTime)

  const matchPct = initial.matchPercentage

  // helpers
  const formatTime = sec => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${h > 0 ? h + ':' : ''}`
      + `${String(m).padStart(2, '0')}`
      + `:${String(s).padStart(2, '0')}`
  }
  const formatDate = d => {
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = d.getFullYear()
    return `${dd}.${mm}.${yy}`
  }
  const toInputDate = d => {
    return d.toISOString().substring(0,10)
  }
  const parseTimeInput = val => {
    const [h,m,s] = val.split(':').map(x => parseInt(x,10) || 0)
    return h*3600 + m*60 + s
  }

  // map coords
  const refCoords = Array.isArray(referenceTrack)
    ? referenceTrack.map(p => [p.lat, p.lon]) : []
  const actCoords = Array.isArray(activityTrack)
    ? activityTrack.map(p => Array.isArray(p) ? p : [p.lat, p.lon]) : []

  const canShowMap = refCoords.length > 0 && actCoords.length > 0
  let bounds = null
  if (canShowMap) {
    const lats = [...refCoords, ...actCoords].map(c => c[0])
    const lons = [...refCoords, ...actCoords].map(c => c[1])
    bounds = [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]]
  }

  // validation
  const missingName = !name.trim()
  const missingDate = !dateObj
  const missingTime = timeSec == null
  const minPct = 85
  const pctTooLow = typeof matchPct === 'number' && matchPct < minPct

  async function handleSubmit(e) {
    e.preventDefault()
    if (missingName || missingDate || missingTime || pctTooLow) return
    const isoDate = dateObj.toISOString().slice(0, 10)
    await axios.post('/api/submission', {
      name,
      externalComment: comment,
      activityDate: isoDate,
      movingTimeSeconds: timeSec,
      matchPercentage: matchPct
    })
    alert('Submitted! Pending approval.')
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {canShowMap && bounds && (
        <MapContainer bounds={bounds} scrollWheelZoom={false}
          style={{ height: 300, marginBottom: '1rem' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          <Polyline positions={refCoords} color="blue" />
          <Polyline positions={actCoords} color="red" />
          <LegendControl />
        </MapContainer>
      )}

      {/* summary line */}
      <div style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 500, textAlign: 'center' }}>
        <strong>Match:</strong> {typeof matchPct === 'number' ? `${matchPct.toFixed(1)}%` : '—'}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem 1rem', alignItems: 'center' }}>
        {/* name */}
        <label style={{ justifySelf: 'end' }}>Name</label>
        <div>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            style={{ padding: '0.5rem', width: '100%' }} />
          {missingName && <div style={{ color:'red', fontSize:'0.85rem' }}>Required</div>}
        </div>

        {/* date */}
        <label style={{ justifySelf: 'end' }}>Date</label>
        <div>
          <input type="date"
            value={dateObj ? toInputDate(dateObj) : ''}
            onChange={e => setDateObj(e.target.value ? new Date(e.target.value) : null)}
            style={{ padding: '0.5rem', width: '100%' }} />
          {missingDate && <div style={{ color:'red', fontSize:'0.85rem' }}>Required</div>}
        </div>

        {/* time */}
        <label style={{ justifySelf: 'end' }}>Moving Time</label>
        <div>
          <input type="time" step="1"
            value={timeSec != null ? formatTime(timeSec) : ''}
            onChange={e => setTimeSec(parseTimeInput(e.target.value))}
            style={{ padding: '0.5rem', width: '100%' }} />
          {missingTime && <div style={{ color:'red', fontSize:'0.85rem' }}>Required</div>}
        </div>

        {/* comment */}
        <label style={{ justifySelf: 'end', alignSelf: 'start', marginTop: '0.25rem' }}>Comment</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
          style={{ padding: '0.5rem', width: '100%' }} />

        {/* filler */}<div />
        {/* warning for low % */}
        <div style={{ color: 'red', fontSize: '0.9rem' }}>
          {pctTooLow && `Match must be ≥ ${minPct}% to submit.`}
        </div>

        {/* controls */}<div />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={missingName || missingDate || missingTime || pctTooLow}>
            Create Submission
          </button>
        </div>
      </form>
    </div>
  )
}
