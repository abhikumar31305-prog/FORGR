function base64UrlToBase64(value: string) {
  return value.replace(/-/g, '+').replace(/_/g, '/')
}

function decodePayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }

  try {
    const payload = atob(base64UrlToBase64(parts[1]))
    return JSON.parse(payload) as Record<string, unknown>
  } catch {
    return null
  }
}

export function getJwtExpiration(token: string): number | null {
  const payload = decodePayload(token)
  const exp = payload?.exp
  return typeof exp === 'number' ? exp : null
}

export function isJwtExpired(token: string, skewSeconds = 15) {
  const exp = getJwtExpiration(token)
  if (!exp) {
    return true
  }

  const expiresAtMs = exp * 1000
  return Date.now() >= expiresAtMs - skewSeconds * 1000
}