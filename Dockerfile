# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the app
COPY . .

# Generate Prisma client at build time
RUN npx prisma generate


# Expose port
EXPOSE 3000

# Start in development mode
CMD ["npm", "run", "dev"]
