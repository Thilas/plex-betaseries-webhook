import "../container"
import MockAdapter from "axios-mock-adapter/types"
import { AxiosInstanceMock } from "../../test/axios"
import { getLoggerMock } from "../../test/logger"
import { Configuration } from "../configuration"
import { HealthCheckPath } from "../controllers/health-check"
import { HealthCheckClient } from "./client"
import { HealthStatus } from "./models"

const fakeLogger = getLoggerMock().object()
const fakeConfiguration = {
  server: {
    port: 12345,
  },
} as Configuration
let axiosInstanceMock: AxiosInstanceMock
function mockAxiosInstance(args: {
  httpStatus?: number
  healthStatus?: HealthStatus
  builder?: (adapter: MockAdapter) => void
}) {
  axiosInstanceMock.register((adapter) => {
    if (args.httpStatus && args.healthStatus) {
      adapter.onGet(HealthCheckPath).replyOnce(args.httpStatus, { status: args.healthStatus })
    }
    if (args.builder) {
      args.builder(adapter)
    }
  })
}

const client = new HealthCheckClient(fakeLogger, fakeConfiguration)

describe("HealthCheckClient", () => {
  //#region Axios mock
  beforeEach(() => {
    axiosInstanceMock = new AxiosInstanceMock()
  })
  afterEach(() => {
    axiosInstanceMock.dispose()
  })
  //#endregion

  describe("start", () => {
    it("fails when the server is unhealthy", async () => {
      // arrange
      mockAxiosInstance({ httpStatus: 503, healthStatus: "fail" })
      // act
      await client.start()
      // assert
      expect(process.exitCode).toBe(1)
    })

    it("fails in case of unexpected error", async () => {
      // arrange
      mockAxiosInstance({ builder: (adapter) => adapter.onGet(HealthCheckPath).networkErrorOnce() })
      // act
      await client.start()
      // assert
      expect(process.exitCode).toBe(1)
    })

    it("succeeds when the server is healthy", async () => {
      // arrange
      mockAxiosInstance({ httpStatus: 200, healthStatus: "pass" })
      // act
      await client.start()
      // assert
      expect(process.exitCode).toBe(0)
    })

    it("succeeds when the server returns a warning", async () => {
      // arrange
      mockAxiosInstance({ httpStatus: 299, healthStatus: "warn" })
      // act
      await client.start()
      // assert
      expect(process.exitCode).toBe(0)
    })
  })
})
