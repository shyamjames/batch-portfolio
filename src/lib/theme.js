// Theme toggle — reads/writes localStorage, applies data-theme to <html>
export function getTheme() {
  try {
    return localStorage.getItem('theme') || 'auto'
  } catch { return 'auto' }
}

export function setTheme(theme) {
  try { localStorage.setItem('theme', theme) } catch {}
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme')
  setTheme(current === 'dark' ? 'light' : 'dark')
}

export function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark'
}
