FROM node:20-alpine
WORKDIR /app
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm install --no-audit --no-fund --loglevel=info
COPY . .
RUN npx prisma generate
EXPOSE 8080
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]