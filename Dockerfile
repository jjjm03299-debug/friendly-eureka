# Use an official lightweight Node image
FROM node:20-slim

# Install system dependencies, including curl, ca-certificates, and zstd for model extraction
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    zstd \
    && rm -rf /var/lib/apt/lists/*

# Install the official Ollama binary
RUN curl -fsSL https://ollama.com/install.sh | sh

# Set the working directory inside the container
WORKDIR /app

# Copy your setup script into the container
COPY setup-ollama.js ./

# Set environment variables (change 'llama3' if you want a different model)
ENV OLLAMA_MODEL=llama3
ENV OLLAMA_HOST=127.0.0.1
ENV OLLAMA_PORT=11434

# --- STAGE 1: Build Phase ---
ENV PREP_ONLY=true
RUN node setup-ollama.js

# --- STAGE 2: Runtime Phase ---
ENV PREP_ONLY=false

# Expose the standard Ollama port
EXPOSE 11434

# Run the script when the container starts
CMD ["node", "setup-ollama.js"]
