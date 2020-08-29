# Plex Webhook for BetaSeries

Plex webhook to mark series and movies as watched on BetaSeries.

## Development

### VS Code

- Restore node modules from terminal: `npm ci`
- Run Build Task (`Ctrl` + `Shift` + `B`)
- Run Target `Launch Program` (`F5`)
- Run Target `Test Program` (`F5`)

### Bash

```bash
# Restore node modules
npm ci
# Build ts files
npm build
# Run tests
npm test
# Start bots
npm start
```

## Deployment

```bash
# Build a new docker image
./build.sh
# Test it (interactively)
./run.sh --test
# Deploy it
./run.sh
```
