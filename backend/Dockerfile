# --- Stage 1: Build ---
FROM node:20-alpine AS build

# Install native build dependencies for better-sqlite3 and canvas (Alpine versions)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev \
    build-base \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev \
    libpng-dev \
    freetype-dev \
    harfbuzz-dev

WORKDIR /app

# Install dependencies separately to leverage Docker cache
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# --- Stage 2: Runtime ---
FROM node:20-alpine

# Install runtime dependencies for canvas/sqlite (minimized)
RUN apk add --no-cache \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg \
    pixman \
    libpng \
    freetype \
    harfbuzz \
    sqlite-libs \
    libc6-compat

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/app/data/database.sqlite

WORKDIR /app

# Copy artifacts from build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src

# Create directories and set permissions
RUN mkdir -p /app/data && \
    chown -R node:node /app/data

# Use non-root user
USER node

EXPOSE 3001

# Start the application
CMD ["node", "--max-old-space-size=4096", "src/server.js"]
