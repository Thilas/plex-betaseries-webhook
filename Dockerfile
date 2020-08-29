FROM node:alpine AS base
RUN ["apk", "add", "tzdata"]
WORKDIR /home/node/app
COPY package.json package-lock.json ./
RUN ["npm", "ci", "--production"]

FROM base AS builder
RUN ["npm", "ci"]
COPY . .
RUN ["npm", "build"]

FROM base
ENV NODE_ENV=production
COPY --from=builder /home/node/app/dist ./dist
VOLUME /home/node/app/dist/config
CMD ["npm", "start"]
