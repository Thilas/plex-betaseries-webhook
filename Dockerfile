FROM node:24.17.0-alpine@sha256:156b55f92e98ccd5ef49578a8cea0df4679826564bad1c9d4ef04462b9f0ded6

WORKDIR /home/node/app
COPY . .
RUN ["npm", "ci", "--omit=dev"]

EXPOSE 12000
CMD ["npm", "start"]

HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
  CMD npm run health-check
