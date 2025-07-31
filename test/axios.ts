import axios, { AxiosInstance, AxiosRequestConfig } from "axios"
import MockAdapter from "axios-mock-adapter"

const createInstance = axios.create

export class AxiosInstanceMock {
  readonly #createMock = (axios.create = jest.fn<AxiosInstance, [AxiosRequestConfig]>(() => {
    throw new Error("Missing mock.")
  }))

  register(builder?: (adapter: MockAdapter) => void) {
    this.#createMock.mockImplementationOnce((config) => {
      const instance = createInstance(config)
      const adapter = new MockAdapter(instance)
      if (builder) builder(adapter)
      return instance
    })
  }

  dispose() {
    axios.create = createInstance
  }
}
