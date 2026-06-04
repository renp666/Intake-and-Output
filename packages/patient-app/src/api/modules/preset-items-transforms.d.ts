import type { PresetItem } from './config'

export function buildPresetItemsParams(type: 'intake' | 'output'): Record<string, string>

export function mapPresetItems(items: any[], type: 'intake' | 'output'): PresetItem[]
