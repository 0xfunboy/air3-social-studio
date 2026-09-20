# Source compilation uses the lockfile and vendored compiler packages, not a mutable npm resolution.
FROM node:22-bookworm-slim AS build
WORKDIR /build
COPY package.json package-lock.json tsconfig.json ./
COPY vendor ./vendor
RUN npm ci --offline --ignore-scripts --no-audit --no-fund
COPY src ./src
COPY tests ./tests
COPY scripts ./scripts
COPY web ./web
COPY main.ts cli.ts ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=node:node /build/dist ./dist
COPY --from=build --chown=node:node /build/web ./web
COPY --from=build --chown=node:node /build/package.json ./
RUN mkdir /app/data && chown node:node /app/data
USER node
ENV HOST=0.0.0.0 PORT=3100 DATA_DIR=/app/data NODE_ENV=production
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3100/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","dist/main.js"]
