export const formatDate = (date: string | Date): string => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatTime = (date: string | Date): string => {
  const d = new Date(date)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export const formatDateTime = (date: string | Date): string => {
  return `${formatDate(date)} ${formatTime(date)}`
}

export const formatAmount = (amount: number, unit: string): string => {
  return `${amount} ${unit}`
}

export const getStatusColor = (status: string): string => {
  const statusColorMap: Record<string, string> = {
    pending: 'warning',
    confirmed: 'success',
    deleted: 'error',
    admitted: 'success',
    discharged: 'default',
    active: 'success',
    inactive: 'default',
    free: 'default',
    occupied: 'success'
  }
  return statusColorMap[status] || 'default'
}

export const getStatusLabel = (status: string): string => {
  const statusLabelMap: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    deleted: '已删除',
    admitted: '在院',
    discharged: '出院',
    active: '启用',
    inactive: '禁用',
    free: '空闲',
    occupied: '已分配'
  }
  return statusLabelMap[status] || status
}

export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) {
    return '刚刚'
  } else if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 30) {
    return `${days}天前`
  } else {
    return formatDate(date)
  }
}