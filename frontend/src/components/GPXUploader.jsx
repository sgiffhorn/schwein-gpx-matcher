import { useState } from 'react'
import axios from 'axios'
export default function GPXUploader({ onMatched }){
  const [file, setFile] = useState()
  async function submit(){
    const fd = new FormData()
    fd.append('gpx', file)
    const res = await axios.post('/api/upload-match', fd)
    onMatched(res.data)
  }
  return <>
    <input type="file" accept=".gpx" onChange={e=>setFile(e.target.files[0])}/>
    <button disabled={!file} onClick={submit}>Match GPX</button>
  </>
}