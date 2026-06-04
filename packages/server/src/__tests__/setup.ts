/**
 * Vitest global setup file
 * Configures the test environment for the server package
 */

// Set test environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.PORT = '0'; // Random port for testing
process.env.CORS_ORIGIN = '*';
