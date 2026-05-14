# Dockerfile unificado para Aegis (Node.js)
FROM node:20-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache bash postgresql-client

# Instalar gemini-cli de forma global
RUN npm install -g @google/gemini-cli

WORKDIR /app

# Instalar dependencias de Node
COPY package.json ./
RUN npm install

# Copiar el resto del código
COPY . .

CMD ["npm", "start"]
