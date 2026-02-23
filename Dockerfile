# Etapa de build
FROM node:18-alpine AS builder
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH

# Copiar package.json y package-lock.json (si existe) e instalar dependencias
COPY package*.json ./
RUN npm ci --silent

# Copiar el resto del proyecto y construir la aplicación (Vite crea la carpeta `dist`)
COPY . .
RUN npm run build

# Etapa de producción: servir con nginx
FROM nginx:stable-alpine
# Copiar los artefactos de producción
COPY --from=builder /app/dist /usr/share/nginx/html
# Exponer puerto por defecto de nginx
EXPOSE 80
# Ejecutar nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
