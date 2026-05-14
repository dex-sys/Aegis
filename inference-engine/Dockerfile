# Dockerfile para el Motor de Inferencia y Ingesta
FROM node:20-alpine

# Instalar dependencias del sistema para Python (si usamos scripts híbridos)
RUN apk add --no-cache python3 py3-pip bash postgresql-client

# Instalar gemini-cli de forma global
RUN npm install -g @google/gemini-cli

WORKDIR /app

# Copiar dependencias de Python si existen
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY . .

# El comando por defecto se sobreescribirá en docker-compose para los diferentes servicios
CMD ["bash"]
