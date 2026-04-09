# Use Node.js 20 slim image
FROM node:20-bookworm-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Environment defaults
ENV VITE_PORT=5173

EXPOSE 5173

# Run the frontend in dev mode for now (host 0.0.0.0 is crucial for Docker)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
