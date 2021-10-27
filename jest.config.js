/** @type {import('@jest/types').Config.InitialOptions} **/
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/src/**/*.spec.ts"],
  testResultsProcessor: "jest-sonar-reporter",
  collectCoverageFrom: ["<rootDir>/src/**/*.ts", "!<rootDir>/src/**/*.spec.ts"],
}
