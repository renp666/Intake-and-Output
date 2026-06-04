/**
 * Unit tests for src/utils/alert.ts
 * Tests the patient alert checking logic with mocked Prisma
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrismaInstance, resetMockPrisma } from '../../helpers/mockPrisma';
import { mockPatient, mockSystemConfigs } from '../../helpers/fixtures';

// Mock the prisma module before importing the function under test
vi.mock('../../../lib/prisma', () => ({
  prisma: mockPrismaInstance,
}));

// Import AFTER mock setup
import { checkPatientAlerts } from '../../../utils/alert';

describe('checkPatientAlerts()', () => {
  beforeEach(() => {
    resetMockPrisma();
  });

  it('should trigger oliguria alert when urine output is below threshold', async () => {
    const p = mockPrismaInstance as any;

    // Patient exists and is active
    p.patient.findUnique.mockResolvedValue(mockPatient);
    // Global thresholds
    p.systemConfig.findMany.mockResolvedValue(mockSystemConfigs);
    // No personalized thresholds
    p.patientAlertThreshold.findMany.mockResolvedValue([]);
    // No existing alert
    p.alertRecord.findFirst.mockResolvedValue(null);
    // Records: 200ml urine output (< 400ml default threshold)
    p.intakeOutputRecord.findMany.mockResolvedValue([
      { recordType: 'output', itemName: '尿量', amount: 200 },
    ]);
    p.alertRecord.create.mockResolvedValue({ id: 'alert-1' });

    await checkPatientAlerts('patient-1');

    expect(p.alertRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alertType: 'low_urine',
          actualValue: 200,
        }),
      })
    );
  });

  it('should trigger polyuria alert when urine output exceeds 2500ml', async () => {
    const p = mockPrismaInstance as any;

    p.patient.findUnique.mockResolvedValue(mockPatient);
    p.systemConfig.findMany.mockResolvedValue(mockSystemConfigs);
    p.patientAlertThreshold.findMany.mockResolvedValue([]);
    p.alertRecord.findFirst.mockResolvedValue(null);
    // Records: 3000ml urine (> 2500ml threshold)
    p.intakeOutputRecord.findMany.mockResolvedValue([
      { recordType: 'output', itemName: '尿量', amount: 3000 },
    ]);
    p.alertRecord.create.mockResolvedValue({ id: 'alert-2' });

    await checkPatientAlerts('patient-1');

    expect(p.alertRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alertType: 'high_urine',
          actualValue: 3000,
        }),
      })
    );
  });

  it('should trigger anuria alert when urine output is below 100ml', async () => {
    const p = mockPrismaInstance as any;

    p.patient.findUnique.mockResolvedValue(mockPatient);
    p.systemConfig.findMany.mockResolvedValue(mockSystemConfigs);
    p.patientAlertThreshold.findMany.mockResolvedValue([]);
    // Simulate: first call is for oliguria check, second is for anuria check
    p.alertRecord.findFirst.mockResolvedValue(null);
    // Records: 50ml urine (< 100ml anuria threshold)
    p.intakeOutputRecord.findMany.mockResolvedValue([
      { recordType: 'output', itemName: '尿量', amount: 50 },
    ]);
    p.alertRecord.create.mockResolvedValue({ id: 'alert-3' });

    await checkPatientAlerts('patient-1');

    // Should create an anuria alert
    const createCalls = p.alertRecord.create.mock.calls;
    const anuriaCall = createCalls.find(
      (call: any) => call[0].data.alertType === 'anuria'
    );
    expect(anuriaCall).toBeDefined();
    expect(anuriaCall[0].data.alertLevel).toBe('critical');
  });

  it('should trigger imbalance alert when balance exceeds 1000ml', async () => {
    const p = mockPrismaInstance as any;

    p.patient.findUnique.mockResolvedValue(mockPatient);
    p.systemConfig.findMany.mockResolvedValue(mockSystemConfigs);
    p.patientAlertThreshold.findMany.mockResolvedValue([]);
    p.alertRecord.findFirst.mockResolvedValue(null);
    // 3000ml intake, 500ml output => balance = 2500ml (> 1000ml threshold)
    p.intakeOutputRecord.findMany.mockResolvedValue([
      { recordType: 'intake', itemName: '口服液体', amount: 3000 },
      { recordType: 'output', itemName: '尿量', amount: 500 },
    ]);
    p.alertRecord.create.mockResolvedValue({ id: 'alert-4' });

    await checkPatientAlerts('patient-1');

    const createCalls = p.alertRecord.create.mock.calls;
    const imbalanceCall = createCalls.find(
      (call: any) => call[0].data.alertType === 'balance'
    );
    expect(imbalanceCall).toBeDefined();
    expect(imbalanceCall[0].data.actualValue).toBe(2500);
  });

  it('should use personalized thresholds when available', async () => {
    const p = mockPrismaInstance as any;

    // Patient without weight to avoid weight-based calculation
    p.patient.findUnique.mockResolvedValue({ ...mockPatient, weight: null });
    p.systemConfig.findMany.mockResolvedValue(mockSystemConfigs);
    // Personalized: set oliguria threshold to 600ml (absolute value)
    p.patientAlertThreshold.findMany.mockResolvedValue([
      { alertType: 'low_urine', thresholdValue: 600, thresholdUnit: 'ml' },
    ]);
    p.alertRecord.findFirst.mockResolvedValue(null);
    // 500ml urine: below personalized threshold (600) but above default (400)
    p.intakeOutputRecord.findMany.mockResolvedValue([
      { recordType: 'output', itemName: '尿量', amount: 500 },
    ]);
    p.alertRecord.create.mockResolvedValue({ id: 'alert-5' });

    await checkPatientAlerts('patient-1');

    expect(p.alertRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alertType: 'low_urine',
          thresholdValue: 600,
          actualValue: 500,
        }),
      })
    );
  });

  it('should calculate oliguria threshold based on patient weight', async () => {
    const p = mockPrismaInstance as any;

    // Patient with weight 70kg
    p.patient.findUnique.mockResolvedValue({ ...mockPatient, weight: 70 });
    p.systemConfig.findMany.mockResolvedValue(mockSystemConfigs);
    // Personalized factor: 15 ml/kg/day
    p.patientAlertThreshold.findMany.mockResolvedValue([
      { alertType: 'low_urine', thresholdValue: 15, thresholdUnit: 'ml/kg/day' },
    ]);
    p.alertRecord.findFirst.mockResolvedValue(null);
    // 70kg * 15 = 1050ml threshold; actual 500ml < 1050ml
    p.intakeOutputRecord.findMany.mockResolvedValue([
      { recordType: 'output', itemName: '尿量', amount: 500 },
    ]);
    p.alertRecord.create.mockResolvedValue({ id: 'alert-6' });

    await checkPatientAlerts('patient-1');

    expect(p.alertRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alertType: 'low_urine',
          thresholdValue: 1050, // 70 * 15
          actualValue: 500,
        }),
      })
    );
  });

  it('should not create alert when existing unhandled alert exists', async () => {
    const p = mockPrismaInstance as any;

    p.patient.findUnique.mockResolvedValue(mockPatient);
    p.systemConfig.findMany.mockResolvedValue(mockSystemConfigs);
    p.patientAlertThreshold.findMany.mockResolvedValue([]);
    // Existing unhandled alert
    p.alertRecord.findFirst.mockResolvedValue({ id: 'existing-alert' });
    p.intakeOutputRecord.findMany.mockResolvedValue([
      { recordType: 'output', itemName: '尿量', amount: 200 },
    ]);

    await checkPatientAlerts('patient-1');

    // Should NOT create a new alert since one already exists
    expect(p.alertRecord.create).not.toHaveBeenCalled();
  });

  it('should auto-handle existing alert when condition is resolved', async () => {
    const p = mockPrismaInstance as any;
    const existingAlert = { id: 'alert-to-handle' };

    p.patient.findUnique.mockResolvedValue(mockPatient);
    p.systemConfig.findMany.mockResolvedValue(mockSystemConfigs);
    p.patientAlertThreshold.findMany.mockResolvedValue([]);
    p.alertRecord.findFirst.mockResolvedValue(existingAlert);
    // Urine output above threshold: condition resolved
    p.intakeOutputRecord.findMany.mockResolvedValue([
      { recordType: 'output', itemName: '尿量', amount: 800 },
    ]);
    p.alertRecord.update.mockResolvedValue({});

    await checkPatientAlerts('patient-1');

    expect(p.alertRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'alert-to-handle' },
        data: expect.objectContaining({
          handled: true,
          handleNotes: 'Condition resolved automatically',
        }),
      })
    );
  });

  it('should skip alert check for discharged patients', async () => {
    const p = mockPrismaInstance as any;

    p.patient.findUnique.mockResolvedValue({ ...mockPatient, status: 'discharged' });

    await checkPatientAlerts('patient-1');

    // Should not query records or create alerts
    expect(p.intakeOutputRecord.findMany).not.toHaveBeenCalled();
    expect(p.alertRecord.create).not.toHaveBeenCalled();
  });

  it('should skip alert check when patient is not found', async () => {
    const p = mockPrismaInstance as any;

    p.patient.findUnique.mockResolvedValue(null);

    await checkPatientAlerts('nonexistent-id');

    expect(p.intakeOutputRecord.findMany).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully without throwing', async () => {
    const p = mockPrismaInstance as any;

    p.patient.findUnique.mockRejectedValue(new Error('Database error'));

    // Should not throw
    await expect(checkPatientAlerts('patient-1')).resolves.not.toThrow();
  });

  it('should recognize various urine item names', async () => {
    const p = mockPrismaInstance as any;

    p.patient.findUnique.mockResolvedValue(mockPatient);
    p.systemConfig.findMany.mockResolvedValue(mockSystemConfigs);
    p.patientAlertThreshold.findMany.mockResolvedValue([]);
    p.alertRecord.findFirst.mockResolvedValue(null);
    // Different urine item names: '尿', '尿量', '小便'
    p.intakeOutputRecord.findMany.mockResolvedValue([
      { recordType: 'output', itemName: '小便', amount: 50 },
    ]);
    p.alertRecord.create.mockResolvedValue({ id: 'alert-7' });

    await checkPatientAlerts('patient-1');

    // '小便' should be recognized as urine, triggering anuria alert
    const createCalls = p.alertRecord.create.mock.calls;
    const anuriaCall = createCalls.find(
      (call: any) => call[0].data.alertType === 'anuria'
    );
    expect(anuriaCall).toBeDefined();
  });
});
