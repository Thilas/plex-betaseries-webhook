import "../container"
import { UptimeHealthCheck } from "./uptime"

describe("UptimeHealthCheck", () => {
  describe("name", () => {
    it("returns expected value", async () => {
      // arrange
      const provider = new UptimeHealthCheck()
      // act
      const name = provider.name
      // assert
      expect(name).toBe("uptime")
    })
  })

  describe("invoke", () => {
    it("returns cpu usage", async () => {
      // arrange
      const uptime = 1000
      process.uptime = jest.fn().mockReturnValueOnce(uptime)
      const provider = new UptimeHealthCheck()
      // act
      const result = await provider.invoke()
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
