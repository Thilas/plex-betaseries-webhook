import { It, Mock } from "moq.ts"
import request from "supertest"
import { BetaSeries, IBetaSeriesMember } from "./betaseries/betaseries"
import { BetaSeriesEpisode, BetaSeriesMovie, BetaSeriesMovieStatus } from "./betaseries/models"
import * as plex from "./plex/plex"
import { initializeServer } from "./server"

describe("server", () => {
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

  describe("configuration", () => {
    //#region Webhook mock
    let webhook: ReturnType<typeof initializeServer>
    beforeEach(() => {
      jest.spyOn(plex, "usePlexWebhook")
    })
    afterEach(async () => {
      jest.restoreAllMocks()
      const server = await webhook.server
      server?.close()
    })
    //#endregion

    const betaSeries = new Mock<BetaSeries>().object()

    it("uses default url", () => {
      // act
      webhook = initializeServer(betaSeries, undefined, true)
      // assert
      expect(plex.usePlexWebhook).toHaveBeenCalledTimes(1)
      expect(plex.usePlexWebhook).toHaveBeenCalledWith(
        webhook.app,
        "http://localhost:12000/",
        expect.anything(),
        betaSeries,
      )
    })

    it("uses default url with specified port", () => {
      // act
      webhook = initializeServer(betaSeries, { port: 1234 })
      // assert
      expect(plex.usePlexWebhook).toHaveBeenCalledTimes(1)
      expect(plex.usePlexWebhook).toHaveBeenCalledWith(
        webhook.app,
        "http://localhost:1234/",
        expect.anything(),
        betaSeries,
      )
    })

    it("uses specified url", () => {
      // act
      webhook = initializeServer(betaSeries, { url: "fakeUrl", port: 80 })
      // assert
      expect(plex.usePlexWebhook).toHaveBeenCalledTimes(1)
      expect(plex.usePlexWebhook).toHaveBeenCalledWith(webhook.app, "fakeUrl", expect.anything(), betaSeries)
    })

    it("uses port 80", () => {
      // act
      webhook = initializeServer(betaSeries, { port: 80 })
      // assert
      expect(plex.usePlexWebhook).toHaveBeenCalledTimes(1)
      expect(plex.usePlexWebhook).toHaveBeenCalledWith(webhook.app, "http://localhost/", expect.anything(), betaSeries)
    })
  })

  const url = "/token/fakeAccessToken"

  describe("betaseries authentication", () => {
    it("redirects if no code", async () => {
      // arrange
      const betaSeries = new Mock<BetaSeries>()
        .setup((i) => i.getAuthenticationUrl(It.IsAny()))
        .returns("fakeAuthUrl")
        .object()
      const { app } = initializeServer(betaSeries)
      // act
      const res = await request(app).get("/")
      // assert
      expect(res.redirect).toBeTruthy()
      expect(res.headers).toHaveProperty("location", "fakeAuthUrl")
    })

    it("gets and displays access token if code", async () => {
      // arrange
      const betaSeries = new Mock<BetaSeries>()
        .setup((i) => i.getAccessToken(It.IsAny(), It.IsAny()))
        .returns(Promise.resolve({ accessToken: "fakeAccessToken", login: "fakeLogin" }))
        .object()
      const { app } = initializeServer(betaSeries, { url: "fakeWebhookUrl" })
      // act
      const res = await request(app).get("/?code=fakeCode")
      // assert
      expect(res.status).toEqual(200)
      expect(res.text).toMatch(/\bfakeLogin\b.*\bfakeWebhookUrl\/token\/fakeAccessToken\b/)
    })

    it("displays access token if code", async () => {
      // arrange
      const member = new Mock<IBetaSeriesMember>()
        .setup((i) => i.login)
        .returns("fakeLogin")
        .object()
      const betaSeries = new Mock<BetaSeries>()
        .setup((i) => i.getMember(It.IsAny()))
        .returns(Promise.resolve(member))
        .object()
      const { app } = initializeServer(betaSeries, { url: "fakeWebhookUrl" })
      // act
      const res = await request(app).get(url)
      // assert
      expect(res.status).toEqual(200)
      expect(res.text).toMatch(/\bfakeLogin\b.*\bfakeWebhookUrl\/token\/fakeAccessToken\b/)
    })
  })

  describe("plex webhook", () => {
    const initialize = () => {
      const memberMock = new Mock<IBetaSeriesMember>()
      const betaSeriesMock = new Mock<BetaSeries>()
        .setup((bs) => bs.getMember(It.IsAny()))
        .returns(Promise.resolve(memberMock.object()))
      const { app } = initializeServer(betaSeriesMock.object())
      return { app, memberMock }
    }

    describe("payload", () => {
      it("fails if missing", async () => {
        // arrange
        const { app } = initialize()
        // act
        const res = await request(app).post(url).send("data")
        // assert
        expect(res.status).toEqual(400)
        expect(res.text).toEqual("Missing payload")
      })

      it("succeeds if the user has no webhook", async () => {
        // arrange
        const { app } = initialize()
        // act
        const res = await request(app)
          .post(url)
          .field({ payload: JSON.stringify({ user: false }) })
        // assert
        expect(res.status).toEqual(200)
      })
    })

    describe("metadata type", () => {
      it("succeeds if missing", async () => {
        // arrange
        const { app } = initialize()
        console.warn = jest.fn()
        // act
        const res = await request(app)
          .post(url)
          .field({ payload: JSON.stringify({ user: true }) })
        // assert
        expect(res.status).toEqual(200)
      })

      it("warns if unknown", async () => {
        // arrange
        const { app } = initialize()
        console.warn = jest.fn()
        // act
        await request(app)
          .post(url)
          .field({ payload: JSON.stringify({ user: true, Metadata: { type: "fakeType" } }) })
        // assert
        expect(console.warn).toHaveBeenCalledTimes(1)
        expect(console.warn).toHaveBeenCalledWith("Unknown Plex metadata type: fakeType")
      })
    })

    describe("media id", () => {
      it("fails if missing", async () => {
        // arrange
        const { app } = initialize()
        // act
        const res = await request(app)
          .post(url)
          .field({ payload: JSON.stringify({ event: "media.scrobble", user: true, Metadata: { type: "episode" } }) })
        // assert
        expect(res.status).toEqual(400)
        expect(res.text).toEqual("No guids")
      })

      it("warns if empty", async () => {
        // arrange
        const { app } = initialize()
        console.warn = jest.fn()
        // act
        await request(app)
          .post(url)
          .field({
            payload: JSON.stringify({
              event: "media.scrobble",
              user: true,
              Metadata: { type: "episode", Guid: [undefined] }
            })
          })
        // assert
        expect(console.warn).toHaveBeenCalledTimes(1)
        expect(console.warn).toHaveBeenCalledWith("Empty guid")
      })

      it("warns if invalid", async () => {
        // arrange
        const { app } = initialize()
        console.warn = jest.fn()
        // act
        await request(app)
          .post(url)
          .field({
            payload: JSON.stringify({
              event: "media.scrobble",
              user: true,
              Metadata: { type: "episode", Guid: [{ id: "fakeGuid" }] },
            }),
          })
        // assert
        expect(console.warn).toHaveBeenCalledTimes(1)
        expect(console.warn).toHaveBeenCalledWith("Invalid guid: fakeGuid")
      })

      it("warns if unknown", async () => {
        // arrange
        const { app } = initialize()
        console.warn = jest.fn()
        // act
        await request(app)
          .post(url)
          .field({
            payload: JSON.stringify({
              event: "media.scrobble",
              user: true,
              Metadata: { type: "episode", Guid: [{ id: "fakeAgent://fakeId" }] },
            }),
          })
        // assert
        expect(console.warn).toHaveBeenCalledTimes(1)
        expect(console.warn).toHaveBeenCalledWith("Unknown Plex agent: fakeAgent://fakeId")
      })
    })

    describe("event", () => {
      describe("unsupported", () => {
        it("succeeds", async () => {
          // arrange
          const { app } = initialize()
          // act
          const res = await request(app)
            .post(url)
            .field({
              payload: JSON.stringify({
                event: "fakeEvent",
                user: true,
                Metadata: {
                  type: "movie",
                  Guid: [{ id: "imdb://fakeId" }],
                  title: "fakeTitle",
                },
              }),
            })
          // assert
          expect(res.status).toEqual(200)
        })
      })

      describe("scrobble", () => {
        describe("episode", () => {
          it("fails if missing title", async () => {
            // arrange
            const { app } = initialize()
            // act
            const res = await request(app)
              .post(url)
              .field({
                payload: JSON.stringify({
                  event: "media.scrobble",
                  user: true,
                  Metadata: {
                    type: "episode",
                    Guid: [{ id: "tvdb://fakeId" }],
                    parentIndex: 1,
                    index: 2,
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Invalid episode: undefined S01E02 (fakeId@tvdb)")
          })

          it("fails if missing season", async () => {
            // arrange
            const { app } = initialize()
            // act
            const res = await request(app)
              .post(url)
              .field({
                payload: JSON.stringify({
                  event: "media.scrobble",
                  user: true,
                  Metadata: {
                    type: "episode",
                    Guid: [{ id: "tvdb://fakeId" }],
                    grandparentTitle: "fakeTitle",
                    index: 2,
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Invalid episode: fakeTitle S??E02 (fakeId@tvdb)")
          })

          it("fails if missing episode", async () => {
            // arrange
            const { app } = initialize()
            // act
            const res = await request(app)
              .post(url)
              .field({
                payload: JSON.stringify({
                  event: "media.scrobble",
                  user: true,
                  Metadata: {
                    type: "episode",
                    Guid: [{ id: "tvdb://fakeId" }],
                    grandparentTitle: "fakeTitle",
                    parentIndex: 1,
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Invalid episode: fakeTitle S01E?? (fakeId@tvdb)")
          })

          it("fails if unsupported id", async () => {
            // arrange
            const { app } = initialize()
            // act
            const res = await request(app)
              .post(url)
              .field({
                payload: JSON.stringify({
                  event: "media.scrobble",
                  user: true,
                  Metadata: {
                    type: "episode",
                    Guid: [{ id: "imdb://fakeId" }],
                    grandparentTitle: "fakeTitle",
                    parentIndex: 1,
                    index: 2,
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Unsupported episode id for fakeTitle S01E02: fakeId@imdb")
          })

          const payload = {
            payload: JSON.stringify({
              event: "media.scrobble",
              user: true,
              Metadata: {
                type: "episode",
                Guid: [{ id: "tvdb://fakeId" }],
                grandparentTitle: "fakeTitle",
                parentIndex: 1,
                index: 2,
              },
            }),
          }

          it("fails if not found", async () => {
            // arrange
            const { app, memberMock: mbMock } = initialize()
            mbMock.setup((i) => i.getEpisode(It.IsAny())).returns(Promise.resolve(undefined))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("No episode found for: fakeTitle S01E02 (fakeId@tvdb)")
          })

          it("succeeds if already scrobbled", async () => {
            // arrange
            const { app, memberMock: mbMock } = initialize()
            mbMock
              .setup((i) => i.getEpisode(It.IsAny()))
              .returns(Promise.resolve({ user: { seen: true } } as BetaSeriesEpisode))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(200)
          })

          const betaSeriesEpisode = {
            id: 1,
            user: { seen: false },
          } as BetaSeriesEpisode

          it("fails if unable to scrobble", async () => {
            // arrange
            const { app, memberMock: mbMock } = initialize()
            mbMock.setup((i) => i.getEpisode(It.IsAny())).returns(Promise.resolve(betaSeriesEpisode))
            mbMock
              .setup((i) => i.markEpisodeAsWatched(It.IsAny()))
              .returns(Promise.resolve({ user: { seen: false } } as BetaSeriesEpisode))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Episode not marked as watched for: fakeTitle S01E02 (fakeId@tvdb)")
          })

          it("succeeds if not already scrobbled", async () => {
            // arrange
            const { app, memberMock: mbMock } = initialize()
            mbMock.setup((i) => i.getEpisode(It.IsAny())).returns(Promise.resolve(betaSeriesEpisode))
            mbMock
              .setup((i) => i.markEpisodeAsWatched(It.IsAny()))
              .returns(Promise.resolve({ user: { seen: true } } as BetaSeriesEpisode))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(200)
          })
        })

        describe("movie", () => {
          it("fails if missing title", async () => {
            // arrange
            const { app } = initialize()
            // act
            const res = await request(app)
              .post(url)
              .field({
                payload: JSON.stringify({
                  event: "media.scrobble",
                  user: true,
                  Metadata: {
                    type: "movie",
                    Guid: [{ id: "imdb://fakeId" }],
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Invalid movie: undefined (fakeId@imdb)")
          })

          it("fails if unsupported id", async () => {
            // arrange
            const { app } = initialize()
            // act
            const res = await request(app)
              .post(url)
              .field({
                payload: JSON.stringify({
                  event: "media.scrobble",
                  user: true,
                  Metadata: {
                    type: "movie",
                    Guid: [{ id: "tvdb://fakeId" }],
                    title: "fakeTitle",
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Unsupported movie id for fakeTitle: fakeId@tvdb")
          })

          const imdbPayload = {
            payload: JSON.stringify({
              event: "media.scrobble",
              user: true,
              Metadata: {
                type: "movie",
                Guid: [{ id: "imdb://fakeId" }],
                title: "fakeTitle",
              },
            }),
          }
          const tmdbPayload = {
            payload: JSON.stringify({
              event: "media.scrobble",
              user: true,
              Metadata: {
                type: "movie",
                Guid: [{ id: "tmdb://fakeId2" }],
                title: "fakeTitle2",
              },
            }),
          }

          it("fails if not found", async () => {
            // arrange
            const { app, memberMock: mbMock } = initialize()
            mbMock.setup((i) => i.getMovie(It.IsAny())).returns(Promise.resolve(undefined))
            // act
            const res = await request(app).post(url).field(imdbPayload)
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("No movie found for: fakeTitle (fakeId@imdb)")
          })

          it("succeeds if already scrobbled", async () => {
            // arrange
            const { app, memberMock: mbMock } = initialize()
            mbMock
              .setup((i) => i.getMovie(It.IsAny()))
              .returns(Promise.resolve({ user: { status: BetaSeriesMovieStatus.seen } } as BetaSeriesMovie))
            // act
            const res = await request(app).post(url).field(tmdbPayload)
            // assert
            expect(res.status).toEqual(200)
          })

          const betaSeriesMovie = {
            id: 1,
            user: { status: BetaSeriesMovieStatus.none },
          } as BetaSeriesMovie

          it("fails if unable to scrobble", async () => {
            // arrange
            const { app, memberMock: mbMock } = initialize()
            mbMock.setup((i) => i.getMovie(It.IsAny())).returns(Promise.resolve(betaSeriesMovie))
            mbMock
              .setup((i) => i.updateMovie(It.IsAny()))
              .returns(Promise.resolve({ user: { status: BetaSeriesMovieStatus.none } } as BetaSeriesMovie))
            // act
            const res = await request(app).post(url).field(imdbPayload)
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Movie not marked as watched for: fakeTitle (fakeId@imdb)")
          })

          it("succeeds if not already scrobbled", async () => {
            // arrange
            const { app, memberMock: mbMock } = initialize()
            mbMock.setup((i) => i.getMovie(It.IsAny())).returns(Promise.resolve(betaSeriesMovie))
            mbMock
              .setup((i) => i.updateMovie(It.IsAny()))
              .returns(Promise.resolve({ user: { status: BetaSeriesMovieStatus.seen } } as BetaSeriesMovie))
            // act
            const res = await request(app).post(url).field(imdbPayload)
            // assert
            expect(res.status).toEqual(200)
          })
        })
      })
    })
  })
})
