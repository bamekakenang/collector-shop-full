# Frontend service - build stage
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build-time API URL for Vite (passed from docker-compose build args)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build static assets
RUN npm run build

# Frontend service - runtime stage
FROM nginx:alpine

# Copy built assets into Nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
