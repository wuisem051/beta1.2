# Etapa 1: Construcción (Build)
FROM node:20-alpine AS build-stage
WORKDIR /app

# --- Variables de Entorno (ARG para inyección en build) ---
# Define estas variables en Coolify como "Build Variables"
ARG REACT_APP_FIREBASE_API_KEY
ARG REACT_APP_FIREBASE_AUTH_DOMAIN
ARG REACT_APP_FIREBASE_PROJECT_ID
ARG REACT_APP_FIREBASE_STORAGE_BUCKET
ARG REACT_APP_FIREBASE_MESSAGING_SENDER_ID
ARG REACT_APP_FIREBASE_APP_ID
ARG REACT_APP_FIREBASE_MEASUREMENT_ID
ARG GENERATE_SOURCEMAP=false

# Mapeo a ENV para que React las tome durante el build
ENV REACT_APP_FIREBASE_API_KEY=$REACT_APP_FIREBASE_API_KEY
ENV REACT_APP_FIREBASE_AUTH_DOMAIN=$REACT_APP_FIREBASE_AUTH_DOMAIN
ENV REACT_APP_FIREBASE_PROJECT_ID=$REACT_APP_FIREBASE_PROJECT_ID
ENV REACT_APP_FIREBASE_STORAGE_BUCKET=$REACT_APP_FIREBASE_STORAGE_BUCKET
ENV REACT_APP_FIREBASE_MESSAGING_SENDER_ID=$REACT_APP_FIREBASE_MESSAGING_SENDER_ID
ENV REACT_APP_FIREBASE_APP_ID=$REACT_APP_FIREBASE_APP_ID
ENV REACT_APP_FIREBASE_MEASUREMENT_ID=$REACT_APP_FIREBASE_MEASUREMENT_ID
ENV GENERATE_SOURCEMAP=$GENERATE_SOURCEMAP

# Copiar archivos de configuración de dependencias
COPY package.json ./
COPY package-lock.json* ./

# Instalación de dependencias
RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Construcción de la aplicación
RUN CI=false npm run build

# Etapa 2: Servidor de Producción (Nginx)
FROM nginx:stable-alpine

# Copiar los archivos construidos
COPY --from=build-stage /app/build /usr/share/nginx/html

# Configuración de Nginx para SPA (Corregida para evitar errores de sintaxis)
RUN printf 'server { \n\
    listen 80; \n\
    location / { \n\
    root /usr/share/nginx/html; \n\
    index index.html index.htm; \n\
    try_files $uri $uri/ /index.html; \n\
    } \n\
    add_header X-Frame-Options "SAMEORIGIN"; \n\
    add_header X-XSS-Protection "1; mode=block"; \n\
    add_header X-Content-Type-Options "nosniff"; \n\
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
