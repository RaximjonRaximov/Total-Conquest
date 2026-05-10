FROM node:22-alpine

WORKDIR /app

# Dependencies avval (layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src

# Non-root user — xavfsizlik
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "src/app.js"]
