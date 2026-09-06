const CONFIGURED_API_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const SESSION_STORAGE_KEY = 'forgr_user_session'

let accessToken = ''
let unauthorizedHandler: (() => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token ?? ''
}

export function getEffectiveAccessToken(): string {
  if (accessToken) return accessToken
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.accessToken) {
        accessToken = parsed.accessToken
        return accessToken
      }
    }
  } catch {
    return ''
  }
  return ''
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

async function parseError(response: Response) {
  let detail = ''

  try {
    const body = (await response.json()) as { detail?: unknown; message?: unknown }
    if (typeof body.detail === 'string') {
      detail = body.detail
    } else if (Array.isArray(body.detail)) {
      detail = body.detail.map((d: any) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d))).join(', ')
    } else if (typeof body.message === 'string') {
      detail = body.message
    } else if (body.detail) {
      detail = JSON.stringify(body.detail)
    }
  } catch {
    // Non-JSON response (e.g. HTML error page or static rewrite)
  }

  if (!detail) {
    if (response.status === 404) {
      detail = 'Endpoint not found (HTTP 404). Please verify backend URL and routes.'
    } else if (response.status === 405) {
      detail = 'Method not allowed (HTTP 405). The request hit the static frontend instead of the backend.'
    } else if (response.status === 502 || response.status === 503) {
      detail = 'Backend is waking up or temporarily unavailable (HTTP 502/503). Free tier backends take ~30-60s to wake up on Render.'
    } else {
      detail = `Request failed (HTTP ${response.status}).`
    }
  }

  return detail
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(init.headers)
  const hasBody = init.body !== undefined && init.body !== null

  if (hasBody && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  headers.set('Accept', 'application/json')

  if (authenticated) {
    const token = getEffectiveAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    } else {
      unauthorizedHandler?.()
      throw new Error('Authentication required. Please sign in.')
    }
  }

  // Determine candidate URLs for resilience:
  // 1. If VITE_API_BASE_URL is configured (e.g. in production on Vercel), it must be tried FIRST.
  // 2. Otherwise fall back to relative path (Vite dev proxy) and local dev ports.
  const candidateUrls: string[] = []
  if (CONFIGURED_API_URL) {
    candidateUrls.push(`${CONFIGURED_API_URL}${path}`)
  } else {
    candidateUrls.push(path)
  }

  // Fallbacks for local development
  if (typeof window === 'undefined' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    if (!candidateUrls.includes(`http://127.0.0.1:8000${path}`)) {
      candidateUrls.push(`http://127.0.0.1:8000${path}`)
    }
    if (!candidateUrls.includes(`http://localhost:8000${path}`)) {
      candidateUrls.push(`http://localhost:8000${path}`)
    }
  }

  let lastError: unknown = null
  let response: Response | null = null

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        ...init,
        headers,
      })
      // If a relative path or fallback returned 404/405 and we have more candidates, continue to next
      if ((res.status === 404 || res.status === 405) && candidateUrls.length > 1 && url === path) {
        response = res
        continue
      }
      response = res
      break
    } catch (err) {
      lastError = err
    }
  }

  if (!response) {
    const target = CONFIGURED_API_URL || 'http://127.0.0.1:8000'
    throw new Error(
      `Unable to connect to backend server at ${target} (${lastError instanceof Error ? lastError.message : 'Network error'}). Ensure backend is live.`
    )
  }

  if (response.status === 401) {
    unauthorizedHandler?.()
    throw new Error('Session expired. Please sign in again.')
  }

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}