import { ILogger } from "../src/logger"
import { IMock, It, Mock } from "./moq"

export function getLoggerMock(args?: { builder?: (mock: IMock<ILogger>, logger: ILogger) => void }) {
  const loggerMock = new Mock<ILogger>()
  const fakeLogger = loggerMock.object()

  loggerMock
    .setup((e) => e.error(It.IsAny()))
    .returns(fakeLogger)
    .setup((e) => e.warn(It.IsAny()))
    .returns(fakeLogger)
    .setup((e) => e.info(It.IsAny()))
    .returns(fakeLogger)
    .setup((e) => e.debug(It.IsAny()))
    .returns(fakeLogger)

    .setup((e) => e.error(It.IsAny(), It.IsAny()))
    .returns(fakeLogger)
    .setup((e) => e.warn(It.IsAny(), It.IsAny()))
    .returns(fakeLogger)
    .setup((e) => e.info(It.IsAny(), It.IsAny()))
    .returns(fakeLogger)
    .setup((e) => e.debug(It.IsAny(), It.IsAny()))
    .returns(fakeLogger)

    .setup((e) => e.isErrorEnabled())
    .returns(true)
    .setup((e) => e.isWarnEnabled())
    .returns(true)
    .setup((e) => e.isInfoEnabled())
    .returns(true)
    .setup((e) => e.isDebugEnabled())
    .returns(true)

  if (args?.builder) {
    args.builder(loggerMock, fakeLogger)
  }

  return loggerMock
}
