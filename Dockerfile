FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY server ./server
COPY src ./src
COPY scripts/build-server.mjs ./scripts/build-server.mjs
RUN npm run build:server

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/build/server ./build/server
COPY public/benchmark ./public/benchmark
COPY public/examples/demo_frequency_qa.json ./public/examples/demo_frequency_qa.json
USER node
EXPOSE 8080
CMD ["node", "build/server/index.js"]
