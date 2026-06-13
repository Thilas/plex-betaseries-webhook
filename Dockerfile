FROM node:24.16.0-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0

WORKDIR /home/node/app
COPY . .
RUN ["npm", "ci", "--omit=dev"]

EXPOSE 12000
CMD ["npm", "start"]

HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
  CMD npm run health-check
