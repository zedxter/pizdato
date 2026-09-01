# pizdato — multi-stage Docker image
# Stage 1: Build frontend (npm)
# Stage 2: Build backend (cargo)
# Stage 3: Runtime — slim with backend binary + frontend dist
# Image pushed to GHCR, pulled on VPS (never built on VPS).

FROM node:22-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM rust:latest AS backend-builder
WORKDIR /src
# Cache dependencies first (docker layer caching)
COPY Cargo.toml Cargo.lock /src/
COPY backend/Cargo.toml /src/backend/
RUN mkdir -p /src/backend/src && \
    echo "fn main() {}" > /src/backend/src/main.rs && \
    cargo build -p backend --release 2>/dev/null || true
# Real build — clear cached dummy artifact
COPY backend /src/backend
RUN rm -f /src/target/release/backend /src/target/release/deps/backend-* && \
    cargo build -p backend --release

FROM debian:12-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /src/target/release/backend /backend
COPY --from=frontend-builder /app/frontend/dist /frontend/dist

EXPOSE 8080

HEALTHCHECK CMD curl -fsS http://127.0.0.1:8080/health >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/backend"]