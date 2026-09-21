FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci


FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG DEMO_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=${DEMO_BASE_PATH}

RUN npm run build


FROM node:22-alpine AS runner

WORKDIR /app

ARG DEMO_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=${DEMO_BASE_PATH}

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# IMPORTANT pentru basePath la next start
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "start"]
