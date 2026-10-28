# syntax = docker/dockerfile:1
FROM node:24-slim

WORKDIR /app

ENV NODE_ENV="production"
ENV PORT="8765"
ENV FRONTLINE_PORT="8765"

# Копируем метаданные и код игры
COPY package.json ./
COPY server.cjs ./
COPY dist/ ./dist/

# Открываем рабочий порт сервера Frontline
EXPOSE 8765

# Запуск игрового сервера
CMD ["node", "server.cjs"]
