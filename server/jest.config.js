module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  globalSetup: '<rootDir>/tests/globalSetup.js',
  testTimeout: 60000,
  verbose: true,
};