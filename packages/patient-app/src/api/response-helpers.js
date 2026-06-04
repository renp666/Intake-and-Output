export function unwrapApiResponse(payload) {
  if (
    payload &&
    typeof payload === 'object' &&
    typeof payload.code === 'number' &&
    Object.prototype.hasOwnProperty.call(payload, 'data')
  ) {
    return payload.data
  }

  if (
    payload &&
    typeof payload === 'object' &&
    typeof payload.success === 'boolean'
  ) {
    if (payload.success) {
      return payload.data !== undefined ? payload.data : payload
    }

    throw new Error(payload.error?.message || payload.message || '请求失败')
  }

  return payload
}
