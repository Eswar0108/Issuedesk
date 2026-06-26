FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for PostgreSQL adapter compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend app source code
COPY . .

# Set default port to 8008 (which FastAPI binds to locally, but cloud services override)
EXPOSE 8008

# Start the application using Uvicorn, binding to the dynamic PORT environment variable provided by cloud hosts
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8008}"]
