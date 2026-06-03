/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format time to HH:mm
 */
export function formatTime(date: string | Date): string {
  const d = new Date(date)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Format datetime to YYYY-MM-DD HH:mm
 */
export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

/**
 * Format amount with unit (ml)
 */
export function formatAmount(amount: number, unit: string = 'ml'): string {
  if (amount === 0) return `0${unit}`
  return `${amount}${unit}`
}

/**
 * Format relative time (e.g., 2小时前, 3天前)
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return formatDate(date)
}

/**
 * Get current time as HH:mm
 */
export function getCurrentTime(): string {
  return formatTime(new Date())
}

/**
 * Get current datetime as ISO string
 */
export function getCurrentDateTime(): string {
  return new Date().toISOString()
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: string | Date, date2: string | Date): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

/**
 * Get today's date range (start and end)
 */
export function getTodayRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

/**
 * Group records by date
 */
export function groupByDate<T extends { recordTime: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  items.forEach((item) => {
    const dateKey = formatDate(item.recordTime)
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(item)
  })
  return groups
}
