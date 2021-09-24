import MockAdapter from "axios-mock-adapter/types"
import { AxiosInstanceMock } from "../../test/axios"
import { BetaSeries } from "./betaseries"
import { BetaSeriesMovieStatus } from "./models"

describe("betaseries", () => {
  //#region Axios mock
  let axiosInstanceMock: AxiosInstanceMock
  beforeEach(() => {
    axiosInstanceMock = new AxiosInstanceMock()
  })
  afterEach(() => {
    axiosInstanceMock.dispose()
  })
  //#endregion
  //#region Console mock
  const backup = {
    error: console.error,
    warn: console.warn,
    log: console.log,
  }
  beforeAll(() => {
    console.error = jest.fn()
    console.log = jest.fn()
  })
  afterAll(() => {
    console.error = backup.error
    console.log = backup.log
  })
  afterEach(() => {
    console.warn = backup.warn
  })
  //#endregion

  const betaSeries = new BetaSeries({
    url: "fakeUrl",
    client: {
      url: "fakeApiUrl",
      apiVersion: "version",
      timeoutInSeconds: 1,
      clientId: "fakeClientId",
      clientSecret: "fakeClientSecret",
    },
  })

  const authorizationHeader = expect.objectContaining({ Authorization: "Bearer fakeAccessToken" })
  const mockAxiosInstanceForMember = (params?: { login?: boolean; builder?: (adapter: MockAdapter) => void }) => {
    axiosInstanceMock.register((adapter) => {
      const handler = adapter.onGet("members/infos", undefined, authorizationHeader)
      if (params?.login ?? true) handler.replyOnce(200, { member: { login: "fakeLogin" } })
      else handler.replyOnce(400, { errors: [{ code: 2001, text: "Invalid!" }] })
      if (params?.builder) params.builder(adapter)
    })
  }

  describe("redirect for user code", () => {
    it("succeeds", () => {
      // act
      const authUrl = betaSeries.getAuthenticationUrl("fakeSelfUrl")
      // assert
      expect(authUrl).toEqual("fakeUrl/authorize?client_id=fakeClientId&redirect_uri=fakeSelfUrl")
    })
  })

  describe("display access token", () => {
    it("succeeds", async () => {
      // arrange
      axiosInstanceMock.register((adapter) => {
        adapter
          .onPost(
            "oauth/access_token",
            {
              client_id: "fakeClientId",
              client_secret: "fakeClientSecret",
              redirect_uri: "fakeSelfUrl",
              code: "fakeCode",
            },
            expect.not.objectContaining({ Authorization: expect.anything() }),
          )
          .replyOnce(200, { access_token: "fakeAccessToken" })
      })
      mockAxiosInstanceForMember()
      // act
      const { accessToken, login } = await betaSeries.getAccessToken("fakeSelfUrl", "fakeCode")
      // assert
      expect(accessToken).toEqual("fakeAccessToken")
      expect(login).toEqual("fakeLogin")
    })
  })

  describe("getMember", () => {
    it("fails if empty access token", async () => {
      // act
      const memberPromise = betaSeries.getMember("")
      // assert
      await expect(memberPromise).rejects.toThrow("Empty access token")
    })

    it("fails if invalid access token", async () => {
      // arrange
      mockAxiosInstanceForMember({ login: false })
      // act
      const memberPromise = betaSeries.getMember("fakeAccessToken")
      // assert
      await expect(memberPromise).rejects.toHaveProperty(
        "message",
        "Request failed with status code 400\n- [2001] Invalid!",
      )
    })

    it("succeeds if valid access token", async () => {
      // arrange
      mockAxiosInstanceForMember()
      // act
      const member = await betaSeries.getMember("fakeAccessToken")
      // assert
      expect(member.login).toEqual("fakeLogin")
    })
  })

  describe("members", () => {
    describe("episode", () => {
      it("gets episode from its TheTVDB id", async () => {
        // arrange
        const expectedEpisode = { id: 12, title: "fakeTitle", user: { seen: false } }
        mockAxiosInstanceForMember({
          builder: (adapter) => {
            adapter
              .onGet("episodes/display", { thetvdb_id: 123 }, authorizationHeader)
              .replyOnce(200, { episode: expectedEpisode })
          },
        })
        const member = await betaSeries.getMember("fakeAccessToken")
        // act
        const episode = await member.getEpisode({ id: { kind: "tvdb", value: "123" } })
        // assert
        expect(episode).toEqual(expectedEpisode)
      })

      it("marks an episode as watched", async () => {
        // arrange
        const expectedEpisode = { id: 12, title: "fakeTitle", season: 4, episode: 5, user: { seen: true } }
        mockAxiosInstanceForMember({
          builder: (adapter) => {
            adapter
              .onPost("episodes/watched", { id: 12, bulk: false }, authorizationHeader)
              .replyOnce(200, { episode: expectedEpisode })
          },
        })
        const member = await betaSeries.getMember("fakeAccessToken")
        // act
        const episode = await member.markEpisodeAsWatched({ id: 12, bulk: false })
        // assert
        expect(episode).toEqual(expectedEpisode)
      })
    })

    describe("movies", () => {
      it("gets a movie from its IMDb id", async () => {
        // arrange
        const expectedMovie = { id: 12, title: "fakeTitle", user: { status: BetaSeriesMovieStatus.none } }
        mockAxiosInstanceForMember({
          builder: (adapter) => {
            adapter
              .onGet("movies/movie", { imdb_id: 123 }, authorizationHeader)
              .replyOnce(200, { movie: expectedMovie })
          },
        })
        const member = await betaSeries.getMember("fakeAccessToken")
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
              .onGet("movies/movie", { tmdb_id: 123 }, authorizationHeader)
              .replyOnce(200, { movie: expectedMovie })
          },
        })
        const member = await betaSeries.getMember("fakeAccessToken")
        // act
        const movie = await member.getMovie({ id: { kind: "tmdb", value: "123" } })
        // assert
        expect(movie).toEqual(expectedMovie)
      })

      it("updates a movie", async () => {
        // arrange
        const expectedMovie = { id: 12, title: "fakeTitle", user: { status: BetaSeriesMovieStatus.none } }
        mockAxiosInstanceForMember({
          builder: (adapter) => {
            adapter
              .onPost("movies/movie", { id: 12, state: BetaSeriesMovieStatus.seen }, authorizationHeader)
              .replyOnce(200, { movie: expectedMovie })
          },
        })
        const member = await betaSeries.getMember("fakeAccessToken")
        // act
        const movie = await member.updateMovie({ id: 12, state: BetaSeriesMovieStatus.seen })
        // assert
        expect(movie).toEqual(expectedMovie)
      })
    })
  })
})
