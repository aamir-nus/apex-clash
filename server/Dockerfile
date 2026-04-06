FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
RUN npm install --workspaces --include-workspace-root

COPY . .

EXPOSE 4000

CMD ["npm", "run", "start", "-w", "server"]
