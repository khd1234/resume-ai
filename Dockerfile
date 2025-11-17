# 1. Build stage
FROM node:20-alpine3.18 AS builder
WORKDIR /app

# Install openssl compatibility
RUN apk add --no-cache openssl

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the app
COPY . .

# Generate Prisma client at build time
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build Next.js for production
RUN npm run build

# Then prune devDependencies after build
RUN npm prune --omit=dev

ENV NODE_ENV=production

# 2. Run stage
FROM node:20-alpine3.18 AS runner
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

# Set environment variables
EXPOSE 3000

# Start app
CMD ["node_modules/.bin/next", "start"]
