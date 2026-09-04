/**
 * Jest is scoped to `src/__tests__`. The suites here run without a database:
 * Mongoose query builders are stubbed, so what is under test is the request
 * pipeline — router, validator, controller, serialiser — and the JSON that
 * actually leaves the process.
 */


/* afsehwe*/ 
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
  setupFiles: ['<rootDir>/src/__tests__/setup-env.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
};
