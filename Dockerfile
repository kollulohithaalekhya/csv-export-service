FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

RUN mkdir -p /app/exports

EXPOSE 8080

CMD ["node", "src/index.js"]
