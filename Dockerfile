# Build the Angular app and serve the static output with nginx.
FROM node:22-alpine AS build
WORKDIR /build

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist/digital-bank-web/browser /usr/share/nginx/html
EXPOSE 80
