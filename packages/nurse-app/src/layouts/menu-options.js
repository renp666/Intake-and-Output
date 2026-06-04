function createMenuOption({ label, key, icon, navigate, children, renderLabel }) {
  const option = {
    label: renderLabel ? renderLabel(label, key) : label,
    key,
    props: {
      onClick: () => navigate(key),
    },
  }

  if (icon) {
    option.icon = icon
  }

  if (children) {
    option.children = children
  }

  return option
}

export function buildMenuOptions({ isAdmin, navigate, renderIcon, renderLabel, icons = {} }) {
  const options = [
    createMenuOption({
      label: '首页',
      key: '/dashboard',
      icon: renderIcon?.(icons.HomeOutlined),
      navigate,
      renderLabel,
    }),
    createMenuOption({
      label: '记录查询',
      key: '/records',
      icon: renderIcon?.(icons.FileTextOutlined),
      navigate,
      renderLabel,
    }),
    createMenuOption({
      label: '病人管理',
      key: '/patients',
      icon: renderIcon?.(icons.TeamOutlined),
      navigate,
      renderLabel,
    }),
    createMenuOption({
      label: '床位管理',
      key: '/beds',
      icon: renderIcon?.(icons.MedicineBoxOutlined),
      navigate,
      renderLabel,
    }),
    createMenuOption({
      label: '统计',
      key: '/statistics',
      icon: renderIcon?.(icons.BarChartOutlined),
      navigate,
      renderLabel,
    }),
  ]

  if (isAdmin) {
    options.push(
      createMenuOption({
        label: '系统设置',
        key: '/settings',
        icon: renderIcon?.(icons.SettingOutlined),
        navigate,
        renderLabel,
        children: [
          createMenuOption({
            label: '科室管理',
            key: '/settings/departments',
            icon: renderIcon?.(icons.ApartmentOutlined),
            navigate,
            renderLabel,
          }),
          createMenuOption({
            label: '用户管理',
            key: '/settings/users',
            icon: renderIcon?.(icons.TeamOutlined),
            navigate,
            renderLabel,
          }),
          createMenuOption({
            label: '预设项目',
            key: '/settings/preset-items',
            icon: renderIcon?.(icons.UnorderedListOutlined),
            navigate,
            renderLabel,
          }),
          createMenuOption({
            label: '系统配置',
            key: '/settings/system',
            icon: renderIcon?.(icons.ToolOutlined),
            navigate,
            renderLabel,
          }),
          createMenuOption({
            label: '班次配置',
            key: '/settings/shifts',
            icon: renderIcon?.(icons.ClockCircleOutlined),
            navigate,
            renderLabel,
          }),
          createMenuOption({
            label: '操作日志',
            key: '/settings/logs',
            icon: renderIcon?.(icons.AuditOutlined),
            navigate,
            renderLabel,
          }),
        ],
      })
    )
  }

  return options
}
