FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53

WORKDIR /home/node/app
COPY . .
RUN ["npm", "ci", "--omit=dev"]

EXPOSE 12000
CMD ["npm", "start"]

HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
  CMD npm run health-check
