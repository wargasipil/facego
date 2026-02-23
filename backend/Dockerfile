# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM golang:alpine AS builder

WORKDIR /app

# Download deps first (cached unless go.mod / go.sum change)
COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /facego-server ./cmd/server

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /facego-server /usr/local/bin/facego-server
COPY configs/ configs/

# Uploads directory (mount a volume here in production)
RUN mkdir -p /var/facego/uploads

EXPOSE 8080

ENTRYPOINT ["facego-server"]
CMD ["--config", "configs/docker.yaml"]
