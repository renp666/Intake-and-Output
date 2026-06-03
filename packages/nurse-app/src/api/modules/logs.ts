import api from '../index'

export interface OperationLog {
  id: number
  userId: number
  username: string
  userName: string
  action: string
  target: string
  targetId: number | null
  detail: string
  ipAddress: string
  createdAt: string
}

export interface LogListParams {
  page?: number
  pageSize?: number
  userId?: number
  action?: string
  startTime?: string
  endTime?: string
}

export interface LogListResponse {
  items: OperationLog[]
  total: number
}

export const logsApi = {
  list(params?: LogListParams) {
    return api.get<any, LogListResponse>('/logs', { params })
  }
}