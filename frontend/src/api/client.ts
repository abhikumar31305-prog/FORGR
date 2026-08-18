const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

let accessToken = ''
let unauthorizedHandler: (() => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token ?? ''
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

  if (authenticated && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

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