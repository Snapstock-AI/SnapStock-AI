# ---------- Build React ----------
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG VITE_API_URL=/snapstock-backend-http
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build


# ---------- Serve React ----------
FROM nginx:1.27-alpine

# nginx renders /etc/nginx/templates/*.template into conf.d at start (envsubst).
# The default keeps the image working where no backend proxy is needed (e.g. the K3s gateway
# routes /snapstock-backend-http itself).
ENV BACKEND_UPSTREAM=127.0.0.1:5000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]