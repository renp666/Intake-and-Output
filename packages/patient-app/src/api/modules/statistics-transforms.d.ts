import type { DailyStats, StatsQueryParams } from './statistics'

export function buildDailyStatsParams(
  params?: StatsQueryParams
): Record<string, string>

export function mapDailyStatsResponse(payload: any): DailyStats
