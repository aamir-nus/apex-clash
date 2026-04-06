FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY web/package.json web/package.json
RUN npm install --workspaces --include-workspace-root

COPY . .

ARG VITE_API_BASE_URL=http://localhost:4000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build -w web

FROM nginx:1.27-alpine

COPY --from=build /app/web/dist /usr/share/nginx/html

EXPOSE 80
