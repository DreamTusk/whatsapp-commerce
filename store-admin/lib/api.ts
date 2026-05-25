import axios from 'axios'
import Cookies from 'js-cookie'
import { getApiBaseUrl } from './config'

const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl()
  const token = Cookies.get('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['ngrok-skip-browser-warning'] = 'true'
  // Let the browser set Content-Type for FormData (needs the multipart boundary)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      const refreshToken = Cookies.get('refresh_token')
      if (!refreshToken) {
        Cookies.remove('access_token')
        Cookies.remove('refresh_token')
        Cookies.remove('auth_user')
        if (typeof window !== 'undefined') window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(
          `${getApiBaseUrl()}/api/auth/refresh`,
          { refresh_token: refreshToken }
        )
        Cookies.set('access_token', data.access_token, { expires: 1 / 36, sameSite: 'lax' })
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        Cookies.remove('access_token')
        Cookies.remove('refresh_token')
        Cookies.remove('auth_user')
        if (typeof window !== 'undefined') window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
