/**
 * Startup Proof Enforcement Utility
 * Verifies if an achievement, project highlight, or credential has a valid proof URL.
 * Achievements without proof links are removed or flagged as unverified.
 */

export interface ParsedAchievement {
  title: string
  proofUrl?: string
  isVerified: boolean
}

/**
 * Checks if a given text or item contains a valid proof link (http://, https://, or github.com link).
 */
export function hasProofUrl(text: string): boolean {
  if (!text) return false
  const urlRegex = /(https?:\/\/[^\s]+|github\.com\/[^\s]+)/i
  return urlRegex.test(text)
}

/**
 * Extracts the title and proof URL from an achievement entry.
 * Supports format: "Project Title - https://..." or "[Project Title](https://...)" or simple text with embedded link.
 */
export function parseAchievement(entry: string): ParsedAchievement {
  const trimmed = entry.trim()
  if (!trimmed) {
    return { title: '', isVerified: false }
  }

  // Check markdown style [Title](URL)
  const markdownMatch = trimmed.match(/^\[(.*?)\]\((https?:\/\/[^\s]+)\)$/)
  if (markdownMatch) {
    return {
      title: markdownMatch[1].trim(),
      proofUrl: markdownMatch[2].trim(),
      isVerified: true,
    }
  }

  // Check "Title - URL" or "Title (URL)"
  const urlMatch = trimmed.match(/(https?:\/\/[^\s]+|github\.com\/[^\s]+)/i)
  if (urlMatch) {
    const rawUrl = urlMatch[0]
    const proofUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
    const title = trimmed.replace(rawUrl, '').replace(/[-–—()]\s*$/, '').replace(/^\s*[-–—()]/, '').trim() || 'Verified Achievement'
    return {
      title,
      proofUrl,
      isVerified: true,
    }
  }

  // No URL found -> Unverified achievement (no proof)
  return {
    title: trimmed,
    isVerified: false,
  }
}

/**
 * Filters a list of achievement strings and returns ONLY those with valid proof URLs.
 */
export function filterVerifiedAchievements(achievements: string[]): ParsedAchievement[] {
  return achievements
    .map(parseAchievement)
    .filter((item) => item.title.length > 0 && item.isVerified)
}
