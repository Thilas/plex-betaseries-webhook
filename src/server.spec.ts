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
    afterEach((done) => {
      jest.restoreAllMocks()
      webhook.server?.then((server) => {
        server.close()
        done()
      })
      if (!webhook.server) done()
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
      it("warns if missing", async () => {
        // arrange
        const { app } = initialize()
        console.warn = jest.fn()
        // act
        await request(app)
          .post(url)
          .field({ payload: JSON.stringify({ user: true, fakeKey: "fakeValue" }) })
        // assert
        expect(console.warn).toHaveBeenCalledTimes(1)
        expect(console.warn).toHaveBeenCalledWith("Unknown Plex metadata type: undefined")
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
        expect(res.text).toEqual("Empty guid")
      })

      it("fails if invalid", async () => {
        // arrange
        const { app } = initialize()
        // act
        const res = await request(app)
          .post(url)
          .field({
            payload: JSON.stringify({
              event: "media.scrobble",
              user: true,
              Metadata: { type: "episode", guid: "fakeGuid" },
            }),
          })
        // assert
        expect(res.status).toEqual(400)
        expect(res.text).toEqual("Invalid guid: fakeGuid")
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
              Metadata: { type: "episode", guid: "com.plexapp.agents.fakeAgent://fakeId\b" },
            }),
          })
        // assert
        expect(console.warn).toHaveBeenCalledTimes(1)
        expect(console.warn).toHaveBeenCalledWith("Unknown Plex agent: fakeAgent")
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
                  guid: "com.plexapp.agents.imdb://fakeId\b",
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
                    guid: "com.plexapp.agents.thetvdb://fakeId\b",
                    parentIndex: 1,
                    index: 2,
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Invalid episode: undefined (fakeId@tvdb) S01E02")
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
                    guid: "com.plexapp.agents.thetvdb://fakeId\b",
                    grandparentTitle: "fakeTitle",
                    index: 2,
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Invalid episode: fakeTitle (fakeId@tvdb) S??E02")
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
                    guid: "com.plexapp.agents.thetvdb://fakeId\b",
                    grandparentTitle: "fakeTitle",
                    parentIndex: 1,
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Invalid episode: fakeTitle (fakeId@tvdb) S01E??")
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
                    guid: "com.plexapp.agents.imdb://fakeId\b",
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
                guid: "com.plexapp.agents.thetvdb://fakeId\b",
                grandparentTitle: "fakeTitle",
                parentIndex: 1,
                index: 2,
              },
            }),
          }

          it("fails if not found", async () => {
            // arrange
            const { app, memberMock: mbMock } = initialize()
            mbMock.setup((i) => i.getEpisodes(It.IsAny())).returns(Promise.resolve([]))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("No episode found for: fakeTitle (fakeId@tvdb) S01E02")
          })

          it("fails if found multiple times", async () => {
            // arrange
            const { app, memberMock: mbMock } = initialize()
            mbMock
              .setup((i) => i.getEpisodes(It.IsAny()))
              .returns(Promise.resolve([{} as BetaSeriesEpisode, {} as BetaSeriesEpisode]))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Multiple episodes found for: fakeTitle (fakeId@tvdb) S01E02")
          })

          it("succeeds if already scrobbled", async () => {
            // arrange
            const { app, memberMock: mbMock } = initialize()
            mbMock
              .setup((i) => i.getEpisodes(It.IsAny()))
              .returns(Promise.resolve([{ user: { seen: true } } as BetaSeriesEpisode]))
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
            mbMock.setup((i) => i.getEpisodes(It.IsAny())).returns(Promise.resolve([betaSeriesEpisode]))
            mbMock
              .setup((i) => i.markEpisodeAsWatched(It.IsAny()))
              .returns(Promise.resolve({ user: { seen: false } } as BetaSeriesEpisode))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Episode not marked as watched for: fakeTitle (fakeId@tvdb) S01E02")
          })

          it("succeeds if not already scrobbled", async () => {
            // arrange
            const { app, memberMock: mbMock } = initialize()
            mbMock.setup((i) => i.getEpisodes(It.IsAny())).returns(Promise.resolve([betaSeriesEpisode]))
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
                    guid: "com.plexapp.agents.imdb://fakeId\b",
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
                    guid: "com.plexapp.agents.thetvdb://fakeId\b",
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
                guid: "com.plexapp.agents.imdb://fakeId\b",
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
                guid: "com.plexapp.agents.themoviedb://fakeId2\b",
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
