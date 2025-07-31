import "../container"
import { NextFunction, Request, RequestHandler, Response } from "express"
import { It, Mock, Times } from "../../test/moq"
import { Configuration } from "../configuration"
import { IMulterFactory, MulterMiddleware } from "./multer"

type MulterFactoryParameters = Parameters<IMulterFactory>["0"]

describe("MulterMiddleware", () => {
  // eslint-disable-next-line jest/expect-expect
  it("succeeds", async () => {
    // arrange
    const fakeConfiguration = {
      server: {
        temp: "fakeTemp",
      },
    } as Configuration
    const fakeReq = new Mock<Request>().object()
    const fakeRes = new Mock<Response>().object()
    const fakeNext = new Mock<NextFunction>().object()
    const multerHandlerMock = new Mock<RequestHandler>().setup((e) => e(fakeReq, fakeRes, fakeNext)).returns(undefined)
    const fakeMulterFactory = new Mock<IMulterFactory>()
      .setup((e) => e(It.Is<MulterFactoryParameters>((p) => p?.dest === fakeConfiguration.server.temp)))
      .returns(
        new Mock<ReturnType<IMulterFactory>>()
          .setup((e) => e.any())
          .returns(multerHandlerMock.object())
          .object(),
      )
      .object()
    const middleware = new MulterMiddleware(fakeConfiguration, fakeMulterFactory)
    // act
    middleware.handler(fakeReq, fakeRes, fakeNext)
    // assert
    multerHandlerMock.verify((e) => e(fakeReq, fakeRes, fakeNext), Times.Once())
  })
})
