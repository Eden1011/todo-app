
ARG NODE_VERSION=18
ARG ALPINE_VERSION=3.18


FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS builder


ARG BUILD_DATE
ARG VERSION=1.0.0
ARG SERVICE_NAME=frontend-service


LABEL maintainer="todo-app-team"
LABEL build-date=${BUILD_DATE}
LABEL version=${VERSION}
LABEL service=${SERVICE_NAME}


RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++

WORKDIR /app


COPY package*.json ./


RUN npm ci && npm cache clean --force


COPY . .


RUN if grep -q '"build":' package.json; then npm run build; fi


RUN apk del .build-deps


FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS production


ARG NODE_ENV=production
ARG PORT=3001
ARG SERVICE_NAME=frontend-service


ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}
ENV SERVICE_NAME=${SERVICE_NAME}


RUN apk add --no-cache \
    wget \
    curl \
    dumb-init

WORKDIR /app


COPY package*.json ./


RUN npm ci --only=production && npm cache clean --force


COPY --from=builder /app .


RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs


RUN chown -R nodejs:nodejs /app


USER nodejs


EXPOSE ${PORT}


HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1


ENTRYPOINT ["dumb-init", "--"]


CMD ["node", "server.js"]
