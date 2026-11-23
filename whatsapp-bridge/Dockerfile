FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY index.mjs ./
ENV DATA_DIR=/data
VOLUME /data
CMD ["node", "index.mjs"]
