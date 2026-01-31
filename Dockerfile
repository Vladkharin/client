# ./client/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Устанавливаем ВСЕ зависимости (включая dev) для сборки
COPY package*.json ./
RUN npm ci  # ← УБРАТЬ --only=production здесь!

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Финальный образ — только продакшен
FROM node:18-alpine

WORKDIR /app

# Копируем готовую сборку и зависимости
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Можно оставить --only=production здесь (но лучше скопировать готовые node_modules)
RUN npm ci --only=production

EXPOSE 3000

CMD ["npm", "start"]