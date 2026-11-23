FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
ENV USERS_API_URL=http://users-api:3001 \
    CATALOG_API_URL=http://catalog-api:3003 \
    ORDERS_API_URL=http://orders-api:3002 \
    NGINX_ENVSUBST_FILTER=_API_URL$
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1:8080/health || exit 1
