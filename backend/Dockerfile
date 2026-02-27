# Use Node.js 20 slim image
FROM node:20-bookworm-slim

# Install dependencies for better-sqlite3 (native build)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create data directory for SQLite volume
RUN mkdir -p /app/data

# Environment defaults
ENV PORT=3001
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/database.sqlite

EXPOSE 3001

# Run the backend
CMD ["npm", "start"]
