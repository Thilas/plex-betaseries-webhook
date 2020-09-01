# Plex Webhook for BetaSeries

[Plex webhook](https://support.plex.tv/articles/115002267687-webhooks/) to mark series and movies as watched on [BetaSeries](https://www.betaseries.com/).

## Usage

Here are some snippets to help get started creating a docker container.

### docker

```bash
docker create \
  --name=plex-betaseries-webhook \
  -e SERVER_URL=https://my.plex.webhook \
  -e BETASERIES_CLIENTID=xxxxxxxxxxxx \
  -e BETASERIES_CLIENTSECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  -p 12000:12000 \
  --restart unless-stopped \
  thilas/plex-betaseries-webhook
```

### docker-compose

```yaml
version: "3.8"
services:
  plex-betaseries-webhook:
    image: thilas/plex-betaseries-webhook
    container_name: plex-betaseries-webhook
    environment:
      - SERVER_URL=https://my.plex.webhook
      - BETASERIES_CLIENTID=xxxxxxxxxxxx
      - BETASERIES_CLIENTSECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    ports:
      - 12000:12000
    restart: unless-stopped
```

## Parameters

| Parameter                        | Description                                                 |
| -------------------------------- | ----------------------------------------------------------- |
| `-e SERVER_URL=xxx`              | Public url to access the webhook                            |
| `-e BETASERIES_CLIENTID=xxx`     | [BetaSeries](https://www.betaseries.com/api/) client id     |
| `-e BETASERIES_CLIENTSECRET=xxx` | [BetaSeries](https://www.betaseries.com/api/) client secret |
| `-p 12000:12000`                 | Plex webhook port                                           |

Public url is expected to be forwarded to the container on the exposed port.

## Webhook Setup

In order to configure the Plex webhook, its url must be obtained thanks to the following steps:

- access the webhook using its public url for a browser
- after redirection to BetaSeries, log in using your account (if not already done)

The url will look like `<public url>?accessToken=xxxxxxxxxxxx` and can be used as a Plex webhook.

## Support Info

- Shell access on the container: `docker exec -it plex-betaseries-webhook /bin/bash`
- Realtime logs of the container: `docker logs -f plex-betaseries-webhook`

## Updating Info

Here are some instructions to update an existing container.

### docker

- Update the image: `docker pull thilas/plex-betaseries-webhook`
- Stop the running container: `docker stop plex-betaseries-webhook`
- Delete the container: `docker rm plex-betaseries-webhook`
- Recreate a new container with the same docker create parameters as instructed above
- Start the new container: `docker start plex-betaseries-webhook`
- You can also remove the old dangling images: `docker image prune`

### docker-compose

- Update all images: `docker-compose pull`
  - or update a single image: `docker-compose pull plex-betaseries-webhook`
- Let compose update all containers as necessary: `docker-compose up -d`
  - or update a single container: `docker-compose up -d plex-betaseries-webhook`
- You can also remove the old dangling images: `docker image prune`
