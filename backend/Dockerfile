# Stage 1: install deps
FROM node:18-alpine AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

# Stage 2: copy code & build (if you have a build step—otherwise skip)
FROM node:18-alpine AS build
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
# If you transpile or bundle backend, run it here. Otherwise you can skip this stage.

# Final image
FROM node:18-alpine
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]