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
  let detail = 'Request failed.'

  try {
    const body = (await response.json()) as { detail?: string }
    if (body.detail) {
      detail = body.detail
    }
  } catch {
    // Keep the generic error message.
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

  // Determine candidate URLs for resilience (Vite proxy -> configured URL -> 127.0.0.1:8000 -> localhost:8000)
  const candidateUrls: string[] = [path]
  if (CONFIGURED_API_URL && !candidateUrls.includes(`${CONFIGURED_API_URL}${path}`)) {
    candidateUrls.push(`${CONFIGURED_API_URL}${path}`)
  }
  if (!candidateUrls.includes(`http://127.0.0.1:8000${path}`)) {
    candidateUrls.push(`http://127.0.0.1:8000${path}`)
  }
  if (!candidateUrls.includes(`http://localhost:8000${path}`)) {
    candidateUrls.push(`http://localhost:8000${path}`)
  }

  let lastError: unknown = null
  let response: Response | null = null

  for (const url of candidateUrls) {
    try {
      response = await fetch(url, {
        ...init,
        headers,
      })
      break
    } catch (err) {
      lastError = err
    }
  }

  if (!response) {
    throw new Error(
      `Unable to connect to backend server. Ensure backend is running at http://127.0.0.1:8000 (${lastError instanceof Error ? lastError.message : 'Network error'})`
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