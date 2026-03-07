# FaceGo

**Face recognition attendance system for schools — built with Go, React, and AI.**

FaceGo replaces paper attendance sheets with a webcam. Teachers open the browser, point the camera at students, and the system automatically marks who is present in real time using on-device face recognition. No cloud API. No per-request fees. Works on your own server.

---

## Features

- **Live face recognition** — detect and identify multiple students simultaneously from a webcam feed using face-api.js (TF.js WebGL / CPU backend)
- **Student registration** — capture up to 15 face samples per student directly from the browser; embeddings stored in PostgreSQL with pgvector
- **Attendance tracking** — daily attendance records per class and schedule; absent students are seeded automatically
- **Parent notifications** — WhatsApp alerts sent to parents when a student is absent or late, powered by whatsmeow
- **Class & schedule management** — full CRUD for grades, classes, teachers, weekly schedules, and study programs
- **Role-based access** — admin, teacher, and operator roles with JWT authentication
- **Self-contained binary** — frontend is embedded into the Go binary; deploy a single `.exe` with a config file
- **GPU / CPU toggle** — switch TensorFlow.js backend between WebGL (GPU) and CPU from the UI

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go · ConnectRPC · GORM · PostgreSQL 17 + pgvector |
| Frontend | React 19 · TypeScript · Vite · Chakra UI |
| Face AI | face-api.js · TensorFlow.js (WebGL / CPU) |
| Messaging | WhatsApp via whatsmeow (no third-party API) |
| Auth | JWT (golang-jwt) |
| RPC | Protocol Buffers · Buf · ConnectRPC |

---

## Quick Start

### Prerequisites

- PostgreSQL 17 with pgvector extension
- Go 1.25+
- Node.js 24+

### 1. Configure

```bash
cp backend/configs/sample.yaml backend/configs/dev.yaml
# Edit dev.yaml: set DB DSN, JWT secret, port
```

### 2. Run database migrations

```bash
cd backend
go run ./cmd/server automigrate
```

### 3. Start backend

```bash
go run ./cmd/server
```

### 4. Start frontend (dev)

```bash
cd attendance_frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — default admin credentials are set during `automigrate`.

---

## Build (single binary)

```bash
# Windows
build.bat
# Output: dist/windows/facego-windows.zip
```

The zip contains `facego.exe` (with embedded frontend) + `configs/sample.yaml`. Copy to any Windows machine with PostgreSQL access and run.

---

## Docker

```bash
docker-compose up
```

Starts PostgreSQL, backend, and frontend together.

---

## Release

Tagged releases are built automatically by GitHub Actions and published as `facego-windows.zip` on the [Releases](../../releases) page.

```bash
git tag v1.x.x
git push origin v1.x.x
```

---

## License

MIT
