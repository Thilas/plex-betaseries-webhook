import "../container"
import MockAdapter from "axios-mock-adapter/types"
import { AxiosInstanceMock } from "../../test/axios"
import { getLoggerMock } from "../../test/logger"
import { BetaSeries, BetaSeriesPrincipal } from "./betaseries"
import { BetaSeriesMovieStatus } from "./models"

const fakeLogger = getLoggerMock().object()
const fakeConfiguration = {
  server: {
    url: "http://fake.self.url",
    port: 12345,
  },
  betaseries: {
    url: "http://fake.url",
    client: {
      url: "http://fake.api.url",
      apiVersion: "version",
      timeoutInSeconds: 1,
      clientId: "fakeClientId",
      clientSecret: "fakeClientSecret",
    },
  },
}
const fakeAccessToken = "fakeAccessToken"
const fakeAuthorizationHeader = expect.objectContaining({ Authorization: `Bearer ${fakeAccessToken}` })
const fakeLogin = "fakeLogin"
const fakeUser = { accessToken: fakeAccessToken, login: fakeLogin }
const fakePrincipal = { accessToken: fakeAccessToken, login: fakeLogin }

let axiosInstanceMock: AxiosInstanceMock
const mockAxiosInstanceForMember = (params?: { login?: boolean; builder?: (adapter: MockAdapter) => void }) => {
  axiosInstanceMock.register((adapter) => {
    const handler = adapter.onGet("members/infos", { headers: fakeAuthorizationHeader })
    if (params?.login ?? true) handler.replyOnce(200, { member: { login: fakeLogin } })
    else handler.replyOnce(400, { errors: [{ code: 2001, text: "Invalid!" }] })
    if (params?.builder) params.builder(adapter)
  })
}

const betaseries = new BetaSeries(fakeLogger, fakeConfiguration)

describe("BetaSeries", () => {
  //#region Axios mock
  beforeEach(() => {
    axiosInstanceMock = new AxiosInstanceMock()
  })
  afterEach(() => {
    axiosInstanceMock.dispose()
  })
  //#endregion

  describe("getAuthenticationUrl", () => {
    it("succeeds", () => {
      // act
      const authUrl = betaseries.getAuthenticationUrl()
      // assert
      const bsUrl = fakeConfiguration.betaseries.url
      const clientId = fakeConfiguration.betaseries.client.clientId
      const serverUrl = fakeConfiguration.server.url
      expect(authUrl).toBe(`${bsUrl}/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(serverUrl)}`)
    })
  })

  describe("getUser", () => {
    it("succeeds", async () => {
      // arrange
      const fakeCode = "fakeCode"
      axiosInstanceMock.register((adapter) => {
        adapter
          .onPost(
            "oauth/access_token",
            {
              client_id: fakeConfiguration.betaseries.client.clientId,
              client_secret: fakeConfiguration.betaseries.client.clientSecret,
              redirect_uri: fakeConfiguration.server.url,
              code: fakeCode,
            },
            {
              headers: expect.not.objectContaining({ Authorization: expect.anything() }),
            },
          )
          .replyOnce(200, { access_token: fakeAccessToken })
      })
      mockAxiosInstanceForMember()
      // act
      const user = await betaseries.getUser(fakeCode)
      // assert
      expect(user).toEqual(fakeUser)
    })
  })

  describe("getPrincipal", () => {
    it("succeeds if empty access token", async () => {
      // act
      const principal = await betaseries.getPrincipal("")
      // assert
      expect(principal.details).toBeUndefined()
    })

    it("fails if invalid access token", async () => {
      // arrange
      mockAxiosInstanceForMember({ login: false })
      // act
      const principalPromise = betaseries.getPrincipal(fakeAccessToken)
      // assert
      await expect(principalPromise).rejects.toHaveProperty(
        "message",
        "Request failed with status code 400\n- [2001] Invalid!",
      )
    })

    it("succeeds if valid access token", async () => {
      // arrange
      mockAxiosInstanceForMember()
      // act
      const principal = await betaseries.getPrincipal(fakeAccessToken)
      // assert
      expect(principal.details).toEqual(fakePrincipal)
    })
  })

  describe("getMember", () => {
    it("fails if empty access token", async () => {
      // act
      const principalPromise = betaseries.getMember({ accessToken: "", login: "" })
      // assert
      await expect(principalPromise).rejects.toEqual(new Error("Empty access token"))
    })
  })
})

describe("BetaSeriesPrincipal", () => {
  describe("isAuthenticated", () => {
    it("returns false when not authenticated", async () => {
      // arrange
      const principal = new BetaSeriesPrincipal()
      // act
      const result = await principal.isAuthenticated()
      // assert
      expect(result).toBeFalsy()
    })

    it("returns true when authenticated", async () => {
      // arrange
      const principal = new BetaSeriesPrincipal(fakeUser)
      // act
      const result = await principal.isAuthenticated()
      // assert
      expect(result).toBeTruthy()
    })
  })

  describe("isResourceOwner", () => {
    it("returns always false", async () => {
      // arrange
      const principal = new BetaSeriesPrincipal()
      // act
      const result = await principal.isResourceOwner()
      // assert
      expect(result).toBeFalsy()
    })
  })

  describe("isInRole", () => {
    it("returns always false", async () => {
      // arrange
      const principal = new BetaSeriesPrincipal()
      // act
      const result = await principal.isInRole()
      // assert
      expect(result).toBeFalsy()
    })
  })
})

describe("BetaSeriesMember", () => {
  //#region Axios mock
  beforeEach(() => {
    axiosInstanceMock = new AxiosInstanceMock()
  })
  afterEach(() => {
    axiosInstanceMock.dispose()
  })
  //#endregion

  describe("getEpisode", () => {
    it("gets an episode from its TheTVDB id", async () => {
      // arrange
      const expectedEpisode = { id: 12, title: "fakeTitle", user: { seen: false } }
      mockAxiosInstanceForMember({
        builder: (adapter) => {
          adapter
            .onGet("episodes/display", { params: { thetvdb_id: "123" }, headers: fakeAuthorizationHeader })
            .replyOnce(200, { episode: expectedEpisode })
        },
      })
      const member = await betaseries.getMember(fakeUser)
      // act
      const episode = await member.getEpisode({ id: { kind: "tvdb", value: "123" } })
      // assert
      expect(episode).toEqual(expectedEpisode)
    })
  })

  describe("markEpisodeAsWatched", () => {
    it("marks an episode as watched", async () => {
      // arrange
      const expectedEpisode = { id: 12, title: "fakeTitle", season: 4, episode: 5, user: { seen: true } }
      mockAxiosInstanceForMember({
        builder: (adapter) => {
          adapter
            .onPost("episodes/watched", { id: 12, bulk: false }, { headers: fakeAuthorizationHeader })
            .replyOnce(200, { episode: expectedEpisode })
        },
      })
      const member = await betaseries.getMember(fakePrincipal)
      // act
      const episode = await member.markEpisodeAsWatched({ id: 12, bulk: false })
      // assert
      expect(episode).toEqual(expectedEpisode)
    })
  })

  describe("getMovie", () => {
    it("gets a movie from its IMDb id", async () => {
      // arrange
      const expectedMovie = { id: 12, title: "fakeTitle", user: { status: BetaSeriesMovieStatus.none } }
      mockAxiosInstanceForMember({
        builder: (adapter) => {
          adapter
            .onGet("movies/movie", { params: { imdb_id: "123" }, headers: fakeAuthorizationHeader })
            .replyOnce(200, { movie: expectedMovie })
        },
      })
      const member = await betaseries.getMember(fakePrincipal)
      // act
      const movie = await member.getMovie({ id: { kind: "imdb", value: "123" } })
      // assert
      expect(movie).toEqual(expectedMovie)
    })

    it("gets a movie from its TMDb id", async () => {
      // arrange
      const expectedMovie = { id: 12, title: "fakeTitle", user: { status: BetaSeriesMovieStatus.none } }
      mockAxiosInstanceForMember({
        builder: (adapter) => {
          adapter
            .onGet("movies/movie", { params: { tmdb_id: "123" }, headers: fakeAuthorizationHeader })
            .replyOnce(200, { movie: expectedMovie })
        },
      })
      const member = await betaseries.getMember(fakePrincipal)
      // act
      const movie = await member.getMovie({ id: { kind: "tmdb", value: "123" } })
      // assert
      expect(movie).toEqual(expectedMovie)
    })
  })

  describe("updateMovie", () => {
    it("updates a movie", async () => {
      // arrange
      const expectedMovie = { id: 12, title: "fakeTitle", user: { status: BetaSeriesMovieStatus.none } }
      mockAxiosInstanceForMember({
        builder: (adapter) => {
          adapter
            .onPost("movies/movie", { id: 12, state: BetaSeriesMovieStatus.seen }, { headers: fakeAuthorizationHeader })
            .replyOnce(200, { movie: expectedMovie })
        },
      })
      const member = await betaseries.getMember(fakePrincipal)
      // act
      const movie = await member.updateMovie({ id: 12, state: BetaSeriesMovieStatus.seen })
      // assert
      expect(movie).toEqual(expectedMovie)
    })
  })
})
