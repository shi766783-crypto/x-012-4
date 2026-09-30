const DAY_MS = 24 * 60 * 60 * 1000

export function todayISO() {
  return toISODate(new Date())
}

export function toISODate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDaysISO(dateISO, amount) {
  const date = new Date(`${dateISO}T00:00:00`)
  date.setDate(date.getDate() + amount)
  return toISODate(date)
}

export function isISODate(dateISO) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return false
  const date = new Date(`${dateISO}T00:00:00`)
  return !Number.isNaN(date.getTime())
}

export function daysBetween(startISO, endISO = todayISO()) {
  if (!startISO) return 0
  const start = new Date(`${startISO}T00:00:00`)
  const end = new Date(`${endISO}T00:00:00`)
  return Math.floor((end - start) / DAY_MS)
}

export function monthOf(dateISO) {
  return dateISO?.slice(0, 7) || ''
}

export function formatDate(dateISO) {
  if (!dateISO) return '未记录'
  return dateISO.replaceAll('-', '/')
}
