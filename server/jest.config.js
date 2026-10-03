module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  clearMocks: true,
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/tests/db/"],
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts", "!src/entities/**"],
  coverageDirectory: "reports/coverage",
  coverageReporters: ["text-summary", "lcov", "json-summary"],
};
