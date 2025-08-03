// src/components/SubmissionForm.jsx
import React, { useState } from 'react'
import axios from 'axios'
import {
  MapContainer,
  TileLayer,
  Polyline
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export default function SubmissionForm({
  initial,
  referenceTrack,
  activityTrack,
  onCancel
}) {
  // editable
  const [name, setName] = useState(initial.name || '')
  // read-only
  const movingTime = initial.movingTimeSeconds
  const matchPct   = initial.matchPercentage
  const activityDate       = initial.activityDate
  // format hh:mm:ss
  const formatTime = sec => {
    const h = Math.floor(sec/3600)
    const m = Math.floor((sec%3600)/60)
    const s = sec%60
    return `${h>0? h+':' : ''}`
      + `${String(m).padStart(2,'0')}`
      + `:${String(s).padStart(2,'0')}`
  }

  // turn both kinds of tracks into [[lat,lon],…]
  const refCoords = Array.isArray(referenceTrack)
    ? referenceTrack.map(p => [p.lat, p.lon])
    : []

  const actCoords = Array.isArray(activityTrack)
    ? activityTrack.map(p =>
        Array.isArray(p)
          ? [p[0], p[1]]          // already [lat,lon]
          : [p.lat, p.lon]        // {lat,lon}
      )
    : []


  // only show map if both have at least one point
  const canShowMap = refCoords.length > 0 && actCoords.length > 0

  // compute bounds once
  let bounds = null
  if (canShowMap) {
    const allLats = [...refCoords, ...actCoords].map(c => c[0])
    const allLons = [...refCoords, ...actCoords].map(c => c[1])
    const minLat = Math.min(...allLats), maxLat = Math.max(...allLats)
    const minLon = Math.min(...allLons), maxLon = Math.max(...allLons)
    bounds = [[minLat, minLon], [maxLat, maxLon]]
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await axios.post('/api/submissions', {
      name,
      date,
      movingTimeSeconds: movingTime,
      matchPercentage:   matchPct
    })
    alert('Submitted! Pending approval.')
  }

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
        </MapContainer>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.5rem' }}>
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </label>

        <label>
          Date
          <input
            type="text"
            value={new Date(activityDate).toLocaleDateString()}
            readOnly
          />
        </label>

        <label>
          Moving Time
          <input
            type="text"
            value={formatTime(movingTime)}
            readOnly
          />
        </label>

        <label>
          Match %
          <input
            type="text"
            value={`${matchPct.toFixed(1)}%`}
            readOnly
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit">Create Submission</button>
        </div>
      </form>
    </div>
  )
}