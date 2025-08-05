import { useState } from 'react'
import axios from 'axios'
export default function GPXMatcher({ onMatch }){
  const [file, setFile] = useState()
  async function submit(){
    const fd = new FormData()
    fd.append('gpx', file)
    const res = await axios.post('/api/upload-match', fd)
    onMatch(res.data)
  }
  return <>
    <input type="file" accept=".gpx" onChange={e=>setFile(e.target.files[0])}/>
    <button disabled={!file} onClick={submit}>Match GPX</button>
  </>
}