FROM node:24.19.0-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43

WORKDIR /home/node/app
COPY . .
RUN ["npm", "ci", "--omit=dev"]

EXPOSE 12000
CMD ["npm", "start"]

HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
  CMD npm run health-check
