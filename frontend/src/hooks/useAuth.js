import { useState } from 'react'
import axios from 'axios'

export default function useAuth(){
  const [token, setToken] = useState(localStorage.getItem('adminToken'))

  async function login(username, password) {
    const { data } = await axios.post('/auth/admin-login', { username, password })
    localStorage.setItem('adminToken', data.token)
    setToken(data.token)
  }
  function logout(){
    localStorage.removeItem('adminToken')
    setToken(null)
  }
  function authHeader(){
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return { token, login, logout, authHeader }
}