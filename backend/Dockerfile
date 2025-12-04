# Backend service
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the backend source
COPY . .

# Expose backend port
EXPOSE 4003

# Start the backend server
CMD ["npm", "run", "dev"]
