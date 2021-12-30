FROM node:alpine

ARG BUILD_DATE=now
ARG VERSION=1.0.0

LABEL \
  maintainer="thilas" \
  build_date="build-date: ${BUILD_DATE}" \
  version="version: ${VERSION}"

WORKDIR /home/node/app
COPY . .
RUN ["npm", "ci", "--production"]

EXPOSE 12000
CMD ["npm", "start"]

HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
  CMD npm run health-check
