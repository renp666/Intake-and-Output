import type { MenuOption } from 'naive-ui'

export interface BuildMenuOptionsArgs {
  isAdmin: boolean
  navigate: (path: string) => void
  renderIcon?: (icon: unknown) => () => unknown
  renderLabel?: (label: string, key: string) => () => unknown
  icons?: Record<string, unknown>
}

export function buildMenuOptions(args: BuildMenuOptionsArgs): MenuOption[]
