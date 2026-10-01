FROM node:20-alpine
WORKDIR /app
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
COPY package*.json ./
RUN npm install --no-audit --no-fund --loglevel=info
COPY . .
EXPOSE 8081
CMD ["npm", "run", "dev"]

