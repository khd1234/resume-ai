# 1. Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the app
COPY . .

# Generate Prisma client at build time
RUN npx prisma generate

# Build Next.js for production
RUN npm run build


# 2. Run stage
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

# Set environment variables
ENV NODE_ENV=production
EXPOSE 3000

# Start app
CMD ["npm", "start"]
