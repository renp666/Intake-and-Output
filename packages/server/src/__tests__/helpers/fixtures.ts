/**
 * Test fixtures - realistic mock data matching the Prisma schema
 */

export const mockDepartment = {
  id: 'dept-1',
  name: '内科',
  code: 'NEI',
  description: '内科病房',
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const mockUser = {
  id: 'user-1',
  username: 'nurse01',
  passwordHash: '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012', // bcrypt hash of 'password123'
  role: 'nurse',
  name: '张护士',
  departmentId: 'dept-1',
  isActive: true,
  lastLoginAt: new Date('2025-06-01'),
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  department: mockDepartment,
};

export const mockAdminUser = {
  ...mockUser,
  id: 'admin-1',
  username: 'admin',
  role: 'admin',
  name: '管理员',
};

export const mockDisabledUser = {
  ...mockUser,
  id: 'user-disabled',
  username: 'disabled_user',
  isActive: false,
};

export const mockPatient = {
  id: 'patient-1',
  name: '李四',
  hospitalNumber: 'H20250001',
  bedNumber: 'A001',
  height: 175,
  weight: 70,
  admissionDate: new Date('2025-05-01'),
  dischargeDate: null,
  attendingDoctor: '王医生',
  chargeNurse: '张护士',
  status: 'active',
  notes: null,
  deviceFingerprint: null,
  createdAt: new Date('2025-05-01'),
  updatedAt: new Date('2025-05-01'),
};

export const mockDischargedPatient = {
  ...mockPatient,
  id: 'patient-discharged',
  status: 'discharged',
  dischargeDate: new Date('2025-06-01'),
};

export const mockBed = {
  id: 'bed-1',
  bedNumber: 'A001',
  departmentId: 'dept-1',
  patientId: 'patient-1',
  qrcode: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  department: mockDepartment,
  patient: mockPatient,
};

export const mockEmptyBed = {
  id: 'bed-2',
  bedNumber: 'A002',
  departmentId: 'dept-1',
  patientId: null,
  qrcode: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  department: mockDepartment,
  patient: null,
};

export const mockIntakeRecord = {
  id: 'record-1',
  patientId: 'patient-1',
  hospitalNumber: 'H20250001',
  bedNumber: 'A001',
  recordType: 'intake',
  itemName: '口服液体',
  amount: 200,
  unit: 'ml',
  description: null,
  recordTime: new Date('2025-06-01T10:00:00Z'),
  confirmedAt: null,
  confirmedBy: null,
  inputMethod: 'manual',
  recordedBy: 'user-1',
  deviceFingerprint: null,
  notes: null,
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
  createdAt: new Date('2025-06-01T10:00:00Z'),
  updatedAt: new Date('2025-06-01T10:00:00Z'),
  patient: {
    id: 'patient-1',
    name: '李四',
    hospitalNumber: 'H20250001',
  },
  recorder: {
    id: 'user-1',
    name: '张护士',
    role: 'nurse',
  },
  confirmer: null,
};

export const mockOutputRecord = {
  ...mockIntakeRecord,
  id: 'record-2',
  recordType: 'output',
  itemName: '尿量',
  amount: 300,
  unit: 'ml',
};

export const mockConfirmedRecord = {
  ...mockIntakeRecord,
  id: 'record-confirmed',
  confirmedAt: new Date('2025-06-01T11:00:00Z'),
  confirmedBy: 'user-1',
};

export const mockDeletedRecord = {
  ...mockIntakeRecord,
  id: 'record-deleted',
  isDeleted: true,
  deletedAt: new Date('2025-06-01T12:00:00Z'),
  deletedBy: 'user-1',
};

export const mockPresetItemNurseOnly = {
  id: 'preset-1',
  name: '静脉输液',
  type: 'intake',
  unit: 'ml',
  permission: 'nurse_only',
  isActive: true,
  sortOrder: 1,
  isSystem: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const mockPresetItemSelf = {
  id: 'preset-2',
  name: '口服液体',
  type: 'intake',
  unit: 'ml',
  permission: 'self',
  isActive: true,
  sortOrder: 2,
  isSystem: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const mockSystemConfigs = [
  { id: 'cfg-1', configKey: 'alert.oliguria_factor', configValue: '12', description: null, updatedAt: new Date() },
  { id: 'cfg-2', configKey: 'alert.oliguria_default', configValue: '400', description: null, updatedAt: new Date() },
  { id: 'cfg-3', configKey: 'alert.polyuria', configValue: '2500', description: null, updatedAt: new Date() },
  { id: 'cfg-4', configKey: 'alert.anuria', configValue: '100', description: null, updatedAt: new Date() },
  { id: 'cfg-5', configKey: 'alert.imbalance', configValue: '1000', description: null, updatedAt: new Date() },
];

export const mockOperationLog = {
  id: 'log-1',
  userId: 'user-1',
  patientId: 'patient-1',
  operationType: 'create',
  targetTable: 'intake_output_records',
  targetId: 'record-1',
  detail: 'Created record',
  ipAddress: '127.0.0.1',
  deviceFingerprint: null,
  createdAt: new Date(),
};
