# Backend service
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Configure npm to be resilient to registry hiccups and allow registry override
ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV \
  NPM_CONFIG_REGISTRY=${NPM_REGISTRY} \
  NPM_CONFIG_FETCH_RETRIES=5 \
  NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
  NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
  NPM_CONFIG_AUDIT=false \
  NPM_CONFIG_FUND=false

# Install dependencies first (better layer caching)
COPY package*.json ./
# Use lockfile-based install for determinism and speed
RUN npm ci

# Copy the rest of the backend source
COPY . .

# Generate Prisma client (needed after schema changes)
RUN npx prisma generate

# Expose backend port
EXPOSE 4003

# Start the backend server
CMD ["npm", "run", "dev"]
