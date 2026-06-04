import { http } from '../index'
import { buildPresetItemsParams, mapPresetItems } from './preset-items-transforms.js'

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
export function getPresetItems(type: 'intake' | 'output') {
  return http
    .get('/preset-items', { params: buildPresetItemsParams(type) })
    .then((res: any) => mapPresetItems(res, type))
}
