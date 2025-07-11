# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Copy .env file before build so Vite can use it
COPY .env ./

# Build the application
RUN npm run build

# Use nginx to serve the built application
FROM nginx:alpine

# Copy built application to nginx
COPY --from=0 /app/dist /usr/share/nginx/html
# Ensure animations directory is copied (in case Vite does not copy unused assets)
COPY --from=0 /app/public/animations /usr/share/nginx/html/animations

# Copy nginx configuration (optional - you can create a custom nginx.conf if needed)
# COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
