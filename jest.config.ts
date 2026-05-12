import type { Config } from "jest"

export default {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/src/**/*.spec.ts"],
  testResultsProcessor: "jest-sonar-reporter",
  collectCoverageFrom: ["<rootDir>/src/**/*.ts", "!<rootDir>/src/**/*.spec.ts"],
  transformIgnorePatterns: [
    '/node_modules/(?!inversify)/',
  ],
  transform: {
    '^.+\\.m?[jt]sx?$': [
      'ts-jest', {
        diagnostics: {
          ignoreCodes: [151002],
        },
      }
    ],
  },
} satisfies Config
