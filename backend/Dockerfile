FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV HOST_IP=0.0.0.0
ENV PORT=5001

EXPOSE 5001

CMD ["npm", "start"]
