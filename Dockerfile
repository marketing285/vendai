FROM node:20-alpine
ARG CACHEBUST=3

WORKDIR /app

# Build frontend (Next.js → static export)
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend ./frontend
RUN cd frontend && npm run build

# Build backend (Express/TypeScript)
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["node", "dist/server.js"]
