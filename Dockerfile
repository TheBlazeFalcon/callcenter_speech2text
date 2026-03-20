# Stage 1: Build the frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Final image
FROM python:3.11-slim
WORKDIR /app

# Install curl for healthcheck and ffmpeg for audio processing
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m falconuser && \
    mkdir -p /app/audio /app/outputs && \
    chown -R falconuser:falconuser /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Ensure permissions for the non-root user
RUN chown -R falconuser:falconuser /app

# Switch to non-root user
USER falconuser

# Expose the port FastAPI will run on
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
