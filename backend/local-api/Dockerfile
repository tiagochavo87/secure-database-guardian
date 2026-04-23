FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY src ./src

EXPOSE 3001

CMD ["npm", "start"]