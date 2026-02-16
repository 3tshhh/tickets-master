# ---- Builder Stage ----
FROM node:20 AS builder

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ---- Production Stage ----
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN apt-get update && apt-get install -y python3 make g++ && \
    npm ci --omit=dev && \
    apt-get purge -y python3 make g++ && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist

RUN mkdir -p qr-images/regular qr-images/vip qr-images/test

EXPOSE 3000

CMD ["node", "dist/index.js"]
