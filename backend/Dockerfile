# ─── Build stage ───────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

# Enable Yarn via corepack (included in Node 24)
RUN corepack enable && corepack prepare yarn@stable --activate

# Install all dependencies (including dev deps for build)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source and build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src/ ./src/
RUN yarn build

# ─── Production stage ──────────────────────────────────────────
FROM node:24-alpine
WORKDIR /app

RUN corepack enable && corepack prepare yarn@stable --activate

# Copy package files
COPY package.json yarn.lock ./

# Install all dependencies so the TypeORM migration CLI (ts-node) works.
# For a leaner image, replace this with --production and run migrations
# separately via a builder-based entrypoint.
RUN yarn install --frozen-lockfile && yarn cache clean

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy tsconfig files needed by the TypeORM CLI for migrations
COPY tsconfig.json tsconfig.build.json tsconfig.typeorm.json nest-cli.json ./

EXPOSE 3001

CMD ["node", "dist/main"]
