FROM node:20-alpine

WORKDIR /app

# better-sqlite3 needs Python + build tools for native compilation
RUN apk add --no-cache python3 make g++

COPY server/package*.json ./
RUN npm install --production

COPY server/ .
COPY scrapper/transactions.js ./scrapper/transactions.js

RUN mkdir -p /app/data

ENV DATA_DIR=/app/data
ENV PORT=3001

EXPOSE 3001

CMD ["node", "index.js"]
