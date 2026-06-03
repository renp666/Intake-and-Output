import { http } from '../index'

export interface PresetItem {
  code: string
  name: string
  emoji: string
  type: 'intake' | 'output'
  defaultAmount?: number
  unit: string
  sortOrder: number
  isActive: boolean
  hasBristolScale?: boolean
}

/**
 * Get preset items for recording
 */
export function getPresetItems() {
  return http.get<PresetItem[]>('/config/preset-items')
}
