import "reflect-metadata"
import { MemoryUsageHealthCheckProvider } from "./memory-usage"

describe("MemoryUsageHealthCheckProvider", () => {
  describe("name", () => {
    it("returns expected value", async () => {
      // arrange
      const provider = new MemoryUsageHealthCheckProvider()
      // act
      const name = provider.name
      // assert
      expect(name).toBe("memory:utilization")
    })
  })

  describe("get", () => {
    it("returns cpu usage", async () => {
      // arrange
      const usage = 1000
      process.memoryUsage.rss = jest.fn().mockReturnValueOnce(usage)
      const provider = new MemoryUsageHealthCheckProvider()
      // act
      const result = await provider.get()
      // assert
      expect(result).toMatchObject({
        componentType: "system",
        observedValue: usage,
        observedUnit: "B",
        status: "pass",
      })
    })
  })
})
