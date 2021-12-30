import { container } from "./container"
import { injectable } from "inversify"
import { IProcess, startProcess } from "./process"

describe("process", () => {
  //#region Container
  beforeEach(() => {
    container.snapshot()
  })
  afterEach(() => {
    container.restore()
  })
  //#endregion

  describe("startProcess", () => {
    const startError = "Start Error"

    @injectable()
    class TestProcess implements IProcess {
      start() {
        throw new Error(startError)
      }
    }

    it("starts the expected process", async () => {
      // arrange
      container.bind(TestProcess).toSelf().inSingletonScope()
      // act
      const lambda = () => startProcess(TestProcess)
      // assert
      expect(lambda).toThrow(startError)
    })
  })
})
