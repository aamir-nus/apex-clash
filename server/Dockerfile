FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY web/package.json web/package.json
COPY server/package.json server/package.json
RUN npm ci --workspace server && npm cache clean --force

COPY server ./server
COPY shared ./shared
COPY .env.example ./.env.example

EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["npm", "run", "start", "-w", "server"]
