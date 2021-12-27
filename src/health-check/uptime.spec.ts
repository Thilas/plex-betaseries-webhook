import "reflect-metadata"
import { UptimeHealthCheckProvider } from "./uptime"

describe("UptimeHealthCheckProvider", () => {
  describe("name", () => {
    it("returns expected value", async () => {
      // arrange
      const provider = new UptimeHealthCheckProvider()
      // act
      const name = provider.name
      // assert
      expect(name).toBe("uptime")
    })
  })

  describe("get", () => {
    it("returns cpu usage", async () => {
      // arrange
      const uptime = 1000
      process.uptime = jest.fn().mockReturnValueOnce(uptime)
      const provider = new UptimeHealthCheckProvider()
      // act
      const result = await provider.get()
      // assert
      expect(result).toMatchObject({
        componentType: "system",
        observedValue: uptime,
        observedUnit: "s",
        status: "pass",
      })
    })
  })
})
