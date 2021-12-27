FROM node:alpine

ARG BUILD_DATE=now
ARG VERSION=1.0.0

RUN apk --no-cache add curl

LABEL \
  maintainer="thilas" \
  build_date="build-date: ${BUILD_DATE}" \
  version="version: ${VERSION}"

WORKDIR /home/node/app
COPY . .
RUN ["npm", "ci", "--production"]

EXPOSE 12000
CMD ["npm", "start"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:12000/health || exit 1
