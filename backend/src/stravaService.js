// src/stravaService.js
import axios from 'axios';

const BASE_URL = 'https://www.strava.com/api/v3';

export async function getActivities(accessToken, after, before, page = 1, perPage = 200) {
  const res = await axios.get(`${BASE_URL}/athlete/activities`, {
    params: { after, before, page, per_page: perPage },
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return res.data;
}

export async function getActivityStreams(accessToken, activityId) {
  const res = await axios.get(
    `${BASE_URL}/activities/${activityId}/streams`,
    {
      params: { keys: 'time,latlng', key_by_type: true },
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  return res.data;
}

export async function getActivity(accessToken, activityId) {
  const res = await axios.get(`${BASE_URL}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return res.data;  // contains moving_time, distance, etc.
}
