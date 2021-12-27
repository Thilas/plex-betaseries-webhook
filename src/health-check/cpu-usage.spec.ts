import "reflect-metadata"
import { CpuUsageHealthCheckProvider } from "./cpu-usage"

describe("CpuUsageHealthCheckProvider", () => {
  describe("name", () => {
    it("returns expected value", async () => {
      // arrange
      const provider = new CpuUsageHealthCheckProvider()
      // act
      const name = provider.name
      // assert
      expect(name).toBe("cpu:utilization")
    })
  })

  describe("get", () => {
    it("returns cpu usage", async () => {
      // arrange
      const usage1 = { user: 10000, system: 20000 }
      const usage2 = { user: 40000, system: 80000 }
      const now1 = 1000
      const now2 = 1500
      process.cpuUsage = jest.fn().mockReturnValueOnce(usage1).mockReturnValueOnce(usage2)
      Date.now = jest.fn().mockReturnValueOnce(now1).mockReturnValueOnce(now2)
      const provider = new CpuUsageHealthCheckProvider()
      // act
      const result = await provider.get()
      // assert
      expect(result).toMatchObject({
        componentType: "system",
        observedValue: ((usage2.user + usage2.system) / (now2 - now1) / 1000) * 100,
        observedUnit: "%",
        status: "pass",
      })
    })
  })
})
