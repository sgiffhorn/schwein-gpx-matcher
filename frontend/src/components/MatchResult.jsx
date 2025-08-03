import { MapContainer, TileLayer, Polyline } from 'react-leaflet'
export default function MatchResult({ matchPercentage, movingTimeSeconds, referenceTrack, activityTrack }){
  return <>
    <p>Match: {matchPercentage}% — Time: {new Date(movingTimeSeconds*1000).toISOString().substr(11,8)}</p>
    <MapContainer style={{height:400}} bounds={[
      referenceTrack.map(p=>[p.lat,p.lon]),
      activityTrack.map(p=>[p.lat,p.lon])
    ]}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <Polyline positions={referenceTrack.map(p=>[p.lat,p.lon])} color="blue"/>
      <Polyline positions={activityTrack.map(p=>[p.lat,p.lon])} color="red"/>
    </MapContainer>
  </>
}