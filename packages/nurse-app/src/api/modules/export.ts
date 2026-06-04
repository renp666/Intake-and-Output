import api from '../index'

export const exportApi = {
  exportExcel(params: {
    patientId?: number
    startDate?: string
    endDate?: string
    type?: 'daily' | 'custom' | 'shift'
  }) {
    return api.get('/export/excel', {
      params,
      responseType: 'blob'
    })
  },

  exportPdf(params: {
    patientId?: number
    startDate?: string
    endDate?: string
    type?: 'daily' | 'custom' | 'shift'
  }) {
    return api.get('/export/pdf', {
      params,
      responseType: 'blob'
    })
  }
}