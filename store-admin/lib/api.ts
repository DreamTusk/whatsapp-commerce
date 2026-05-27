import axios from 'axios'
import Cookies from 'js-cookie'
import { getApiBaseUrl } from './config'

const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  config.baseURL = getApiBaseUrl()

  let token = Cookies.get('access_token')

  // Proactively refresh before the request goes out if the access token is
  // missing but a refresh token exists — avoids the round-trip 401 dance.
  if (!token && Cookies.get('refresh_token')) {
    try {
      token = await doRefresh()
    } catch (err: unknown) {
      if ((err as { response?: unknown }).response) forceLogout()
      return Promise.reject(new Error('Session expired'))
    }
  }

  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['ngrok-skip-browser-warning'] = 'true'
  // Let the browser set Content-Type for FormData (needs the multipart boundary)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Single shared promise so concurrent 401s only trigger one refresh call
let refreshPromise: Promise<string> | null = null

function doRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise
  refreshPromise = axios
    .post(`${getApiBaseUrl()}/api/auth/refresh`, {
      refresh_token: Cookies.get('refresh_token'),
    })
    .then(({ data }) => {
      Cookies.set('access_token', data.access_token, { expires: 1 / 36, sameSite: 'lax' })
      return data.access_token as string
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

function forceLogout() {
  Cookies.remove('access_token')
  Cookies.remove('refresh_token')
  Cookies.remove('auth_user')
  if (typeof window !== 'undefined') window.location.href = '/login'
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (!Cookies.get('refresh_token')) {
        forceLogout()
        return Promise.reject(error)
      }

      try {
        const accessToken = await doRefresh()
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch (refreshError: unknown) {
        const hasResponse = !!(refreshError as { response?: unknown }).response
        // Only force logout when the backend explicitly rejects the refresh token (4xx/5xx).
        // Network errors (no response) mean the server is temporarily unreachable — don't log the user out.
        if (hasResponse) forceLogout()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
