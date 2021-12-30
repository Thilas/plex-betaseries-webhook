import "../container"
import { MemoryUsageHealthCheck } from "./memory-usage"

describe("MemoryUsageHealthCheck", () => {
  describe("name", () => {
    it("returns expected value", async () => {
      // arrange
      const provider = new MemoryUsageHealthCheck()
      // act
      const name = provider.name
      // assert
      expect(name).toBe("memory:utilization")
    })
  })

  describe("invoke", () => {
    it("returns cpu usage", async () => {
      // arrange
      const usage = 1000
      process.memoryUsage.rss = jest.fn().mockReturnValueOnce(usage)
      const provider = new MemoryUsageHealthCheck()
      // act
      const result = await provider.invoke()
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
