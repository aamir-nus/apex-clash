FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY web/package.json web/package.json
COPY server/package.json server/package.json
RUN npm ci --workspace server

COPY . .

EXPOSE 4000

CMD ["npm", "run", "start", "-w", "server"]
