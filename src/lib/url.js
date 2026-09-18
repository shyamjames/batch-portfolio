/**
 * Utility functions for sanitizing and formatting external URLs.
 * Ensures external links (GitHub, LinkedIn, Portfolios, Projects, Certs)
 * always have an absolute protocol (https://) and don't navigate relatively.
 */

export function formatGithubUrl(input) {
  if (!input) return ''
  let val = input.trim()
  if (!val) return ''
  if (/^https?:\/\//i.test(val)) return val
  // Remove leading @ if user typed @username
  val = val.replace(/^@/, '')
  // If user typed github.com/username or www.github.com/username
  if (/^(www\.)?github\.com\//i.test(val)) {
    return `https://${val}`
  }
  // If user just typed their username (no slashes, no dots)
  if (!val.includes('/') && !val.includes('.')) {
    return `https://github.com/${val}`
  }
  return `https://${val}`
}

export function formatLinkedinUrl(input) {
  if (!input) return ''
  let val = input.trim()
  if (!val) return ''
  if (/^https?:\/\//i.test(val)) return val
  // If user typed linkedin.com/... or www.linkedin.com/...
  if (/^(www\.)?linkedin\.com\//i.test(val)) {
    return `https://${val}`
  }
  // If user typed in/username
  if (/^in\//i.test(val)) {
    return `https://linkedin.com/${val}`
  }
  // If user just typed their handle/username without slashes or dots
  if (!val.includes('/') && !val.includes('.')) {
    return `https://linkedin.com/in/${val}`
  }
  return `https://${val}`
}

export function formatExternalUrl(input) {
  if (!input) return ''
  let val = input.trim()
  if (!val) return ''
  if (/^https?:\/\//i.test(val)) return val
  return `https://${val}`
}
