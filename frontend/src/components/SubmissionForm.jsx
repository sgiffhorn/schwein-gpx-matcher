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
  const [name, setName] = useState(initial.name || '')
  const [comment, setComment] = useState('')
  const movingTime = initial.movingTimeSeconds
  const matchPct   = initial.matchPercentage
  const dateRaw    = new Date(initial.activityDate)

  const formatTime = sec => {
    const h = Math.floor(sec/3600)
    const m = Math.floor((sec%3600)/60)
    const s = sec%60
    return `${h>0? h+':' : ''}`
      + `${String(m).padStart(2,'0')}`
      + `:${String(s).padStart(2,'0')}`
  }

  const formatDate = d => {
    const dd = String(d.getDate()).padStart(2,'0')
    const mm = String(d.getMonth()+1).padStart(2,'0')
    const yy = d.getFullYear()
    return `${dd}.${mm}.${yy}`
  }

  const refCoords = Array.isArray(referenceTrack)
    ? referenceTrack.map(p => [p.lat, p.lon]) : []
  const actCoords = Array.isArray(activityTrack)
    ? activityTrack.map(p => Array.isArray(p) ? p : [p.lat,p.lon]) : []

  const canShowMap = refCoords.length && actCoords.length
  let bounds = null
  if (canShowMap) {
    const lats = [...refCoords, ...actCoords].map(c => c[0])
    const lons = [...refCoords, ...actCoords].map(c => c[1])
    bounds = [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]]
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await axios.post('/api/submission', {
      name,
      comment,
      date: dateRaw.toISOString(),
      movingTimeSeconds: movingTime,
      matchPercentage:   matchPct
    })
    alert('Submitted! Pending approval.')
  }

  const minPct = 85;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {canShowMap && bounds && (
        <MapContainer
          bounds={bounds}
          scrollWheelZoom={false}
          style={{ height: 300, marginBottom: '1rem' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          <Polyline positions={refCoords} color="blue" />
          <Polyline positions={actCoords} color="red" />
          <div 
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              background: 'rgba(255,255,255,0.8)',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: '0.9em',
              boxShadow: '0 0 4px rgba(0,0,0,0.3)'
            }}
          >
            <LegendControl />
          </div>
        </MapContainer>
      )}

      {/* summary line */}
      <div style={{
        marginBottom: '1rem',
        fontSize: '0.95rem',
        fontWeight: 500,
        textAlign: 'center'
      }}>
        <strong>Date:</strong> {formatDate(dateRaw)} &nbsp;|&nbsp;
          <strong>Time:</strong> {formatTime(movingTime)} &nbsp;|&nbsp;
          <strong>Match:</strong> {typeof matchPct === 'number'
    ? `${matchPct.toFixed(1)}%`
    : '—'}%
      </div>

      <form onSubmit={handleSubmit} style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        gap: '0.75rem 1rem',
        alignItems: 'center'
      }}>
        <label style={{ justifySelf: 'end' }}>Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          style={{ padding: '0.5rem', width: '100%' }}
        />

        <label style={{ justifySelf: 'end', alignSelf: 'start', marginTop: '0.25rem' }}>
          Comment
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          style={{ padding: '0.5rem', width: '100%' }}
        />

        {/* filler */}
        <div></div>
        <div style={{ color: 'red', fontSize: '0.9rem' }}>
          {matchPct < minPct &&
            `Your match percentage is below ${minPct}%, so you cannot submit.`}
        </div>

        <div></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button
            type="submit"
            disabled={matchPct < minPct}
          >
            Create Submission
          </button>
        </div>
      </form>
    </div>
  )
}