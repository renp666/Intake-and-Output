/**
 * Prisma mock helper for unit tests
 * Provides a fully mocked PrismaClient with chainable query methods
 */

import { vi } from 'vitest';

/**
 * Creates a deep mock of PrismaClient for unit testing.
 * Each model's methods (findUnique, findMany, create, update, etc.)
 * return chainable objects that can be configured per-test via mockResolvedValue.
 */
export function createMockPrisma() {
  const createModelMock = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  });

  return {
    user: createModelMock(),
    patient: createModelMock(),
    bed: createModelMock(),
    intakeOutputRecord: createModelMock(),
    recordChangeLog: createModelMock(),
    presetItem: createModelMock(),
    department: createModelMock(),
    systemConfig: createModelMock(),
    patientAlertThreshold: createModelMock(),
    alertRecord: createModelMock(),
    shiftConfig: createModelMock(),
    operationLog: createModelMock(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn((callback: any) => callback(mockPrismaInstance)),
  };
}

// Singleton mock instance used across tests
export const mockPrismaInstance = createMockPrisma();

/**
 * Reset all mocks to their initial state.
 * Call this in beforeEach() to ensure test isolation.
 */
export function resetMockPrisma() {
  const instance = mockPrismaInstance;
  for (const key of Object.keys(instance)) {
    const model = (instance as any)[key];
    if (model && typeof model === 'object') {
      for (const method of Object.keys(model)) {
        if (typeof model[method]?.mockReset === 'function') {
          model[method].mockReset();
        }
      }
    }
  }
}
