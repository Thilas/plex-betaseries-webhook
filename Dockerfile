FROM node:alpine AS base
RUN ["apk", "add", "tzdata"]
WORKDIR /home/node/app
COPY LICENSE README.md package.json package-lock.json ./
COPY config/default.yml config/custom-environment-variables.yml ./config/
RUN ["npm", "ci", "--production"]

FROM base AS builder
COPY . .
RUN ["npm", "ci"]
RUN ["npm", "run", "build"]
RUN ["npm", "test"]

FROM base
LABEL maintainer="thilas"
COPY --from=builder /home/node/app/dist ./dist/
EXPOSE 12000
CMD ["npm", "start"]
