FROM node:22-alpine

WORKDIR /app

# Instala só as dependências de produção primeiro, para aproveitar o cache de camadas.
COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY src ./src
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Roda como usuário sem privilégios.
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/saude || exit 1

CMD ["node", "server.js"]
