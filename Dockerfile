# Etapa 1: Construcción (Build)
FROM node:20-alpine AS build-stage
WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package.json ./
COPY package-lock.json* ./

# Instalación de dependencias
# Se usa --legacy-peer-deps por si hay conflictos de versiones comunes en proyectos migrados
RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Construcción de la aplicación
# IMPORTANTE: Establecemos CI=false para que los warnings de ESLint no detengan el build
RUN CI=false npm run build

# Etapa 2: Servidor de Producción (Nginx)
FROM nginx:stable-alpine

# Copiar los archivos construidos desde la etapa anterior
# CRA genera la carpeta 'build/', asegurate de que coincide
COPY --from=build-stage /app/build /usr/share/nginx/html

# Configuración de Nginx para aplicaciones Single Page (SPA)
# Esto evita el error 404 al recargar la página en rutas internas
RUN echo 'server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    # Configuración básica de cabeceras para seguridad \
    add_header X-Frame-Options "SAMEORIGIN"; \
    add_header X-XSS-Protection "1; mode=block"; \
    add_header X-Content-Type-Options "nosniff"; \
    }' > /etc/nginx/conf.d/default.conf

# Exponer el puerto 80 (estándar para HTTP)
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
