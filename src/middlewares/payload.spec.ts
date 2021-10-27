import "reflect-metadata"
import { NextFunction, Request, Response } from "express"
import { Mock, Times } from "../../test/moq"
import { BetaSeriesPrincipal } from "../betaseries/betaseries"
import { container } from "../container"
import { ids } from "../decorators"
import { PayloadMiddleware, PayloadProvider } from "./payload"

describe("PayloadMiddleware", () => {
  const fakeRes = new Mock<Response>().object()

  it("returns an invalid payload", async () => {
    // arrange
    const fakeReq = new Mock<Request>()
      .setup((e) => e.body)
      .returns(undefined)
      .object()
    const nextMock = new Mock<NextFunction>().setup((e) => e()).returns()
    const httpContext = {
      request: fakeReq,
      response: fakeRes,
      container: container.createChild(),
      user: new BetaSeriesPrincipal(),
    }
    const middleware = new PayloadMiddleware()
    middleware.httpContext = httpContext
    // act
    middleware.handler(fakeReq, fakeRes, nextMock.object())
    // assert
    const payloadPromise = container.get<PayloadProvider>(ids.payloadProvider)()
    await expect(payloadPromise).rejects.toBe("No payload in this context.")
    nextMock.verify((e) => e(), Times.Once())
  })

  it("returns a valid payload", async () => {
    // arrange
    const fakePayload = {
      event: "fakeEvent",
      user: "fakeUser",
      owner: "fakeOwner",
    }
    const fakeReq = new Mock<Request>()
      .setup((e) => e.body)
      .returns({ payload: JSON.stringify(fakePayload) })
      .object()
    const nextMock = new Mock<NextFunction>().setup((e) => e()).returns()
    const httpContext = {
      request: fakeReq,
      response: fakeRes,
      container: container.createChild(),
      user: new BetaSeriesPrincipal(),
    }
    const middleware = new PayloadMiddleware()
    middleware.httpContext = httpContext
    // act
    middleware.handler(fakeReq, fakeRes, nextMock.object())
    // assert
    const payloadProvider = httpContext.container.get<PayloadProvider>(ids.payloadProvider)
    const payloadPromise = payloadProvider()
    await expect(payloadPromise).resolves.toEqual(fakePayload)
    nextMock.verify((e) => e(), Times.Once())
  })
})
