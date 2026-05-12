import { NextFunction, Response } from "express"
import { getLoggerMock } from "../../test/logger"
import { It, Mock, Times } from "../../test/moq"
import { WebhookRequest } from "../controllers/webhook"
import { Payload, PayloadMiddleware } from "./payload"

describe("PayloadMiddleware", () => {
  const fakeRes = new Mock<Response>().object()

  it("returns an empty payload when no payload is provided", async () => {
    // arrange
    const loggerMock = getLoggerMock()
    const fakeReq = new Mock<WebhookRequest>()
      .setup((r) => r.body)
      .returns({})
      .object()
    const nextMock = new Mock<NextFunction>().setup((e) => e()).returns()
    const middleware = new PayloadMiddleware(loggerMock.object())
    // act
    middleware.execute(fakeReq, fakeRes, nextMock.object())
    // assert
    loggerMock.verify((e) => e.error("Unable to parse payload", It.IsAny<Error>()), Times.Never())
    nextMock.verify((e) => e(), Times.Once())
  })

  it("returns an empty payload when an invalid payload is provided", async () => {
    // arrange
    const loggerMock = getLoggerMock()
    const fakeReq = new Mock<WebhookRequest>()
      .setup((r) => r.body)
      .returns({ payload: "{invalid}" })
      .object()
    const nextMock = new Mock<NextFunction>().setup((e) => e()).returns()
    const middleware = new PayloadMiddleware(loggerMock.object())
    // act
    middleware.execute(fakeReq, fakeRes, nextMock.object())
    // assert
    loggerMock.verify((e) => e.error("Unable to parse payload", It.IsAny<Error>()), Times.Once())
    nextMock.verify((e) => e(), Times.Once())
  })

  it("returns a valid payload", async () => {
    // arrange
    const loggerMock = getLoggerMock()
    const fakePayload = {
      event: "fakeEvent",
      user: true,
      owner: true,
    } as Payload
    const fakeReq = new Mock<WebhookRequest>()
      .setup((r) => r.body)
      .returns({ payload: JSON.stringify(fakePayload) })
      .setup((r) => { r.payload = fakePayload })
      .returns()
      .object()
    const nextMock = new Mock<NextFunction>().setup((e) => e()).returns()
    const middleware = new PayloadMiddleware(loggerMock.object())
    // act
    middleware.execute(fakeReq, fakeRes, nextMock.object())
    // assert
    loggerMock.verify((e) => e.error("Unable to parse payload", It.IsAny<Error>()), Times.Never())
    nextMock.verify((e) => e(), Times.Once())
  })
})
