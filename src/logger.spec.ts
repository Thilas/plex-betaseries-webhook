import { toLoggerError } from "./logger"

describe("toLoggerError", () => {
  it("returns an Error if the input is a string", () => {
    // arrange
    const input = "error!"
    // act
    const result = toLoggerError(input)
    // assert
    expect(result).toEqual({ message: String(input) })
  })

  it("returns an Error if the input is an Error", () => {
    // arrange
    const input = new Error("error!")
    // act
    const result = toLoggerError(input)
    // assert
    expect(result).toEqual(input)
  })
})
