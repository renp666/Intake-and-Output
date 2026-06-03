import { prisma } from '../lib/prisma';

/**
 * Check and generate alerts for a patient based on their records
 * Checks: oliguria, polyuria, anuria, imbalance
 */
export async function checkPatientAlerts(patientId: string): Promise<void> {
  try {
    // Get patient info
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient || patient.status === 'discharged') {
      return;
    }

    // Get global alert thresholds
    const globalThresholds = await getGlobalThresholds();

    // Get personalized thresholds (if any)
    const personalizedThresholds = await getPersonalizedThresholds(patientId);

    // Merge thresholds (personalized overrides global)
    const thresholds = {
      ...globalThresholds,
      ...personalizedThresholds,
    };

    // Calculate 24-hour stats
    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const records = await prisma.intakeOutputRecord.findMany({
      where: {
        patientId,
        isDeleted: false,
        confirmedAt: {
          not: null,
          gte: startTime,
          lte: now,
        },
      },
      select: {
        recordType: true,
        itemName: true,
        amount: true,
      },
    });

    // Calculate totals
    let totalIntake = 0;
    let totalOutput = 0;
    let urineOutput = 0;

    for (const record of records) {
      if (record.recordType === 'intake') {
        totalIntake += record.amount;
      } else {
        totalOutput += record.amount;
        // Track urine separately
        if (isUrineItem(record.itemName)) {
          urineOutput += record.amount;
        }
      }
    }

    const balance = totalIntake - totalOutput;

    // Check each alert type
    await checkOliguria(patientId, patient.hospitalNumber, urineOutput, thresholds, patient.weight);
    await checkPolyuria(patientId, patient.hospitalNumber, urineOutput, thresholds);
    await checkAnuria(patientId, patient.hospitalNumber, urineOutput, thresholds);
    await checkImbalance(patientId, patient.hospitalNumber, balance, thresholds);
  } catch (error) {
    console.error('Error checking patient alerts:', error);
  }
}

/**
 * Check for oliguria (low urine output)
 */
async function checkOliguria(
  patientId: string,
  hospitalNumber: string,
  urineOutput: number,
  thresholds: AlertThresholds,
  weight?: number | null
): Promise<void> {
  let threshold = thresholds.oliguria_default || 400; // Default 400ml

  // If patient has weight, calculate based on weight
  if (weight && thresholds.oliguria_factor) {
    threshold = weight * thresholds.oliguria_factor; // ml/kg/day
  }

  // Check if existing alert exists and is unhandled
  const existingAlert = await prisma.alertRecord.findFirst({
    where: {
      patientId,
      alertType: 'low_urine',
      handled: false,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
      },
    },
  });

  if (urineOutput < threshold) {
    if (!existingAlert) {
      // Create new alert
      await prisma.alertRecord.create({
        data: {
          patientId,
          hospitalNumber,
          alertType: 'low_urine',
          alertLevel: urineOutput < threshold * 0.5 ? 'critical' : 'warning',
          thresholdValue: threshold,
          actualValue: urineOutput,
          description: `24h urine output (${urineOutput}ml) is below threshold (${threshold}ml)`,
        },
      });
    }
  } else if (existingAlert) {
    // Auto-handle if condition resolved
    await prisma.alertRecord.update({
      where: { id: existingAlert.id },
      data: {
        handled: true,
        handledAt: new Date(),
        handleNotes: 'Condition resolved automatically',
      },
    });
  }
}

/**
 * Check for polyuria (high urine output)
 */
async function checkPolyuria(
  patientId: string,
  hospitalNumber: string,
  urineOutput: number,
  thresholds: AlertThresholds
): Promise<void> {
  const threshold = thresholds.polyuria || 2500; // Default 2500ml

  const existingAlert = await prisma.alertRecord.findFirst({
    where: {
      patientId,
      alertType: 'high_urine',
      handled: false,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  if (urineOutput > threshold) {
    if (!existingAlert) {
      await prisma.alertRecord.create({
        data: {
          patientId,
          hospitalNumber,
          alertType: 'high_urine',
          alertLevel: urineOutput > threshold * 1.5 ? 'critical' : 'warning',
          thresholdValue: threshold,
          actualValue: urineOutput,
          description: `24h urine output (${urineOutput}ml) exceeds threshold (${threshold}ml)`,
        },
      });
    }
  } else if (existingAlert) {
    await prisma.alertRecord.update({
      where: { id: existingAlert.id },
      data: {
        handled: true,
        handledAt: new Date(),
        handleNotes: 'Condition resolved automatically',
      },
    });
  }
}

/**
 * Check for anuria (no urine output)
 */
async function checkAnuria(
  patientId: string,
  hospitalNumber: string,
  urineOutput: number,
  thresholds: AlertThresholds
): Promise<void> {
  const threshold = thresholds.anuria || 100; // Default 100ml

  const existingAlert = await prisma.alertRecord.findFirst({
    where: {
      patientId,
      alertType: 'anuria',
      handled: false,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  if (urineOutput < threshold) {
    if (!existingAlert) {
      await prisma.alertRecord.create({
        data: {
          patientId,
          hospitalNumber,
          alertType: 'anuria',
          alertLevel: 'critical',
          thresholdValue: threshold,
          actualValue: urineOutput,
          description: `24h urine output (${urineOutput}ml) indicates anuria (threshold: ${threshold}ml)`,
        },
      });
    }
  } else if (existingAlert) {
    await prisma.alertRecord.update({
      where: { id: existingAlert.id },
      data: {
        handled: true,
        handledAt: new Date(),
        handleNotes: 'Condition resolved automatically',
      },
    });
  }
}

/**
 * Check for imbalance (intake vs output)
 */
async function checkImbalance(
  patientId: string,
  hospitalNumber: string,
  balance: number,
  thresholds: AlertThresholds
): Promise<void> {
  const threshold = thresholds.imbalance || 1000; // Default 1000ml

  const existingAlert = await prisma.alertRecord.findFirst({
    where: {
      patientId,
      alertType: 'balance',
      handled: false,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  // Positive balance means more intake than output (fluid retention risk)
  if (balance > threshold) {
    if (!existingAlert) {
      await prisma.alertRecord.create({
        data: {
          patientId,
          hospitalNumber,
          alertType: 'balance',
          alertLevel: balance > threshold * 1.5 ? 'critical' : 'warning',
          thresholdValue: threshold,
          actualValue: balance,
          description: `24h fluid balance (+${balance}ml) indicates potential fluid retention (threshold: ${threshold}ml)`,
        },
      });
    }
  } else if (existingAlert) {
    await prisma.alertRecord.update({
      where: { id: existingAlert.id },
      data: {
        handled: true,
        handledAt: new Date(),
        handleNotes: 'Condition resolved automatically',
      },
    });
  }
}

/**
 * Check if an item is urine-related
 */
function isUrineItem(itemName: string): boolean {
  const urineKeywords = ['尿', '尿量', '小便'];
  return urineKeywords.some((keyword) => itemName.includes(keyword));
}

/**
 * Get global alert thresholds from system config
 */
async function getGlobalThresholds(): Promise<AlertThresholds> {
  const configs = await prisma.systemConfig.findMany({
    where: {
      configKey: {
        startsWith: 'alert.',
      },
    },
  });

  const configMap: { [key: string]: string } = {};
  for (const config of configs) {
    configMap[config.configKey] = config.configValue;
  }

  return {
    oliguria_factor: parseFloat(configMap['alert.oliguria_factor'] || '12'),
    oliguria_default: parseFloat(configMap['alert.oliguria_default'] || '400'),
    polyuria: parseFloat(configMap['alert.polyuria'] || '2500'),
    anuria: parseFloat(configMap['alert.anuria'] || '100'),
    imbalance: parseFloat(configMap['alert.imbalance'] || '1000'),
  };
}

/**
 * Get personalized thresholds for a patient
 */
async function getPersonalizedThresholds(patientId: string): Promise<Partial<AlertThresholds>> {
  const thresholds = await prisma.patientAlertThreshold.findMany({
    where: { patientId },
  });

  const result: Partial<AlertThresholds> = {};

  for (const threshold of thresholds) {
    switch (threshold.alertType) {
      case 'low_urine':
        if (threshold.thresholdUnit === 'ml/kg/day') {
          result.oliguria_factor = threshold.thresholdValue;
        } else {
          result.oliguria_default = threshold.thresholdValue;
        }
        break;
      case 'high_urine':
        result.polyuria = threshold.thresholdValue;
        break;
      case 'anuria':
        result.anuria = threshold.thresholdValue;
        break;
      case 'balance':
        result.imbalance = threshold.thresholdValue;
        break;
    }
  }

  return result;
}

/**
 * Alert thresholds interface
 */
interface AlertThresholds {
  oliguria_factor?: number; // ml/kg/day
  oliguria_default?: number; // ml (when weight unknown)
  polyuria?: number; // ml
  anuria?: number; // ml
  imbalance?: number; // ml (positive balance threshold)
}
