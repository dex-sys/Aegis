FROM node:20-alpine

# Instalar docker-cli
RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
