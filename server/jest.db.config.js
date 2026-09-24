// Database integration tests. Requires PostgreSQL; run with `npm run test:db`.
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/db/**/*.test.ts"],
  globalSetup: "<rootDir>/tests/db/global-setup.ts",
  setupFiles: ["<rootDir>/tests/db/setup-env.ts"],
  testTimeout: 30000,
  maxWorkers: 1,
};
