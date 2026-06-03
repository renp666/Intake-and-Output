import api from '../index'

export const exportApi = {
  exportExcel(params: {
    patientId?: number
    startTime?: string
    endTime?: string
    type?: 'daily' | 'custom' | 'shift'
  }) {
    return api.get('/export/excel', {
      params,
      responseType: 'blob'
    })
  },

  exportPdf(params: {
    patientId?: number
    startTime?: string
    endTime?: string
    type?: 'daily' | 'custom' | 'shift'
  }) {
    return api.get('/export/pdf', {
      params,
      responseType: 'blob'
    })
  }
}