# pizdato backend — multi-stage Rust build
# Builder: compile with stable Rust
FROM rust:latest AS builder

WORKDIR /src

# Cache dependencies first (docker layer caching)
COPY Cargo.toml Cargo.lock /src/
COPY backend/Cargo.toml /src/backend/
RUN mkdir -p /src/backend/src && \
    echo "fn main() {}" > /src/backend/src/main.rs && \
    cargo build -p backend --release 2>/dev/null || true

# Real build — clear the cached (dummy) artifact first: COPY preserves git
# checkout mtimes, so cargo would otherwise see the dummy binary as up-to-date
# and ship it. rm the backend artifact so the real main.rs forces a rebuild.
COPY backend /src/backend
RUN rm -f /src/target/release/backend /src/target/release/deps/backend-* && \
    cargo build -p backend --release

# Runtime — slim with curl for healthcheck
FROM debian:12-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /src/target/release/backend /backend

EXPOSE 8080

HEALTHCHECK CMD curl -fsS http://127.0.0.1:8080/health >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/backend"]