FROM node:22-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci --include=dev

COPY . .
ENV DATABASE_URL="file:./dev.db"
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]