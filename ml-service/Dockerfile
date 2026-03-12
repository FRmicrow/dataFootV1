# Use Python 3.10 slim image
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Environment defaults
ENV PORT=8008
ENV MODELS_PATH=/app/models

# Expose the ML service port
EXPOSE 8008

# Start the ML service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8008"]
