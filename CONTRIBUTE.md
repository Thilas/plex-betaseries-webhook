# Contribute

Contributions are most welcome.

## Development

### VS Code

Restore node modules from terminal: `npm ci`

Debug program:

- Run Build Task (`Ctrl` + `Shift` + `B`)
- Run Target `Launch Program` (`F5`)

Debug tests:

You need to have [vscode-jest](https://github.com/jest-community/vscode-jest) extension:

- Right click on a test either in the Test Explorer or from CodeLens
- Click on `Debug Test`

### Bash

```bash
# Restore node modules
npm ci
# Build ts files
npm run build
# Run tests
npm test
# Start program
npm start
```

### Docker

```bash
# Build a new docker image
docker build --pull -t plex-betaseries-webhook .
# Optionally, run ngrok
ngrok http 12000
# Test the new docker image interactively
docker run -it --rm --name plex-betaseries-webhook \
  -e SERVER_URL=https://xxxxxxxxxxxx.ngrok.io \
  -e BETASERIES_CLIENTID=xxxxxxxxxxxx \
  -e BETASERIES_CLIENTSECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  -p 12000:12000 plex-betaseries-webhook
```

where:

- `SERVER_URL` is a public url to access the webhook (using for instance [ngrok](https://ngrok.com/))
- `BETASERIES_CLIENTID` and `BETASERIES_CLIENTSECRET` can be obtained on [BetaSeries](https://www.betaseries.com/api/)
