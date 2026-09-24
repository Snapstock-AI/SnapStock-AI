module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  clearMocks: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts", "!src/entities/**"],
  coverageDirectory: "reports/coverage",
  coverageReporters: ["text-summary", "lcov", "json-summary"],
};
