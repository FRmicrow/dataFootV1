# --- Stage 1: Build ---
FROM node:20-bookworm-slim AS build

# Install native build dependencies for better-sqlite3 and canvas (Debian versions)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies separately to leverage Docker cache
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# --- Stage 2: Runtime ---
FROM node:20-bookworm-slim

# Install runtime dependencies for better-sqlite3 and canvas (Debian versions)
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    libpng16-16 \
    libfreetype6 \
    libharfbuzz0b \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

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
