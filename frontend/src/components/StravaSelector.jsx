import { useState, useEffect } from 'react'
import axios from 'axios'
export default function StravaSelector({ onMatched }){
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth()+1)
  const [activities, setActivities] = useState([])

  async function load() {
    const res = await axios.get(`/api/activities?year=${year}&month=${month}`)
    setActivities(res.data)
  }
  async function match(actId){
    const res = await axios.get(`/api/activities/${actId}/match`)
    onMatched(res.data)
  }

  return <>
    <select value={year} onChange={e=>setYear(+e.target.value)}>…</select>
    <select value={month} onChange={e=>setMonth(+e.target.value)}>…</select>
    <button onClick={load}>Load rides ≥300km</button>
    <ul>
      {activities.map(a=>
        <li key={a.id}>
          <button onClick={()=>match(a.id)}>
            {a.name} — {(a.distance/1000).toFixed(1)}km
          </button>
        </li>
      )}
    </ul>
  </>
}