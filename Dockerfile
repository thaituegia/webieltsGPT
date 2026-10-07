FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=ca_cert,target=/tmp/ca.crt \
    if [ -f /tmp/ca.crt ]; then export NODE_EXTRA_CA_CERTS=/tmp/ca.crt; fi; npm ci
COPY client ./client
COPY vite.config.js ./
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3001 DATABASE_PATH=/app/data/ielts.sqlite
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=ca_cert,target=/tmp/ca.crt \
    if [ -f /tmp/ca.crt ]; then export NODE_EXTRA_CA_CERTS=/tmp/ca.crt; fi; \
    npm ci --omit=dev && mkdir /app/data && chown node:node /app/data
COPY --from=build /app/dist ./dist
COPY server ./server
USER node
EXPOSE 3001
CMD ["node", "server/index.js"]
