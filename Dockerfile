FROM node:24.16.0-alpine@sha256:21f403ab171f2dc89bad4dd69d7721bfd15f084ccb46cdd225f31f2bc59b5c9a

WORKDIR /home/node/app
COPY . .
RUN ["npm", "ci", "--omit=dev"]

EXPOSE 12000
CMD ["npm", "start"]

HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
  CMD npm run health-check
