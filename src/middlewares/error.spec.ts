/* eslint-disable jest/expect-expect */
import "reflect-metadata"
import { NextFunction, Request, Response } from "express"
import { getLoggerMock } from "../../test/logger"
import { It, Mock, Times } from "../../test/moq"
import { getErrorHandler } from "./error"

describe("ErrorMiddleware", () => {
  it("returns an invalid payload", async () => {
    // arrange
    const fakeError = new Error("fakeError")
    const fakeMethod = "METHOD"
    const fakeUrl = "http://fake.url"
    const fakeHeaders = { header1: "value1", header2: "value2" }
    const fakeParams = { param1: "value1", param2: "value2" }
    const fakeReq = new Mock<Request>()
      .setup((e) => e.method)
      .returns(fakeMethod)
      .setup((e) => e.originalUrl)
      .returns(fakeUrl)
      .setup((e) => e.headers)
      .returns(fakeHeaders)
      .setup((e) => e.params)
      .returns(fakeParams)
      .object()
    const resMock = new Mock<Response>()
    const fakeRes = resMock.object()
    resMock
      .setup((e) => e.status(It.IsAny()))
      .returns(fakeRes)
      .setup((e) => e.send(It.IsAny()))
      .returns(fakeRes)
    const fakeNext = new Mock<NextFunction>().object()
    const loggerMock = getLoggerMock({
      builder: (mock, logger) =>
        mock
          .setup((e) => e.error(It.IsAny(), It.IsAny()))
          .returns(logger)
          .setup((e) => e.debug(It.IsAny(), It.IsAny()))
          .returns(logger),
    })
    const handler = getErrorHandler(loggerMock.object())
    // act
    handler(fakeError, fakeReq, fakeRes, fakeNext)
    // assert
    const expectedMessage = `Cannot ${fakeMethod} ${fakeUrl}`
    resMock
      .verify((e) => e.status(500), Times.Once())
      .verify((e) => e.send(`${expectedMessage}: ${fakeError.message}`), Times.Once())
    loggerMock
      .verify((e) => e.error(`${expectedMessage}:`, fakeError), Times.Once())
      .verify((e) => e.debug("Headers", fakeHeaders), Times.Once())
      .verify((e) => e.debug("Body", fakeParams), Times.Once())
  })
})
