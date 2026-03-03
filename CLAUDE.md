# FaceGo — Claude Instructions

Face recognition attendance system. Go backend + React frontend + Python TUI client.
All RPC via ConnectRPC (gRPC-compatible).

## Project Structure

```
backend/          Go server (Connect-RPC, GORM, PostgreSQL)
backend_python/   Python TUI face-capture client (Textual, InsightFace, gRPC)
attendance_frontend/  React + TypeScript + Vite SPA (Chakra UI)
protos/           Proto definitions (source of truth)
```

## Go Backend

**Module:** `github.com/wargasipil/facego`

**Key paths:**
- `backend/cmd/server/` — entry point (`run.go`, `automigrate.go`)
- `backend/internal/db_models/` — GORM models (never auto-migrate manually)
- `backend/internal/services/` — one package per domain, `New(db *gorm.DB)` constructor
- `backend/gen/` — generated proto code, **never edit by hand**
- `backend/configs/` — YAML configs (`dev.yaml`, `docker.yaml`, `prod.yaml`)

**Commands:**
```bash
cd backend
go build ./...                          # build
go test ./...                           # run all tests
go run ./cmd/server                     # start (uses configs/dev.yaml)
go run ./cmd/server automigrate         # run GORM AutoMigrate + seed admin
```

**Database:** PostgreSQL 17 with pgvector. DSN built in `internal/configs/app_config.go`.
- Always includes `TimeZone=<time.Local.String()>` — do not change to UTC.
- `SeenAt` in `DetectionLog` is stored as `.Local()` (converted from protobuf UTC).

**Timezone convention:**
- Schedule `start_time`/`end_time`: parsed with `time.ParseInLocation("15:04", s, time.Local)` — local time.
- Detection `seen_at`: `msg.SeenAt.AsTime().Local()` — protobuf UTC converted to local before storing.
- Date filters from proto Timestamp: use `.AsTime().In(time.Local)` before `.Format(time.DateOnly)`.
- DSN session timezone = system local → all `timestamptz` round-trips stay in local time.

**Service pattern:**
```go
// service.go
type Service struct { db *gorm.DB }
func New(db *gorm.DB) *Service { return &Service{db: db} }
```

**Compile-time interface check** (add to service.go):
```go
var _ somev1connect.SomeServiceHandler = (*Service)(nil)
```

**Tests:** use `go-sqlmock` + GORM postgres driver. See `grade_service_test.go` as reference.
```go
func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) { ... }
```
- External test package: `package foo_service_test`
- Wrap writes: `ExpectBegin / ExpectExec or ExpectQuery / ExpectCommit`

**AutoMigrate:** add new models to `backend/cmd/server/automigrate.go`.

**Register new service in `run.go`:** instantiate → `mux.Handle(connect.NewXxxHandler(...))` → add name to reflector.

## Services

| Service | Package | Notes |
|---------|---------|-------|
| AttendanceService | `attendance_service` | `StartProcessor(ctx)` runs background job |
| NotifierService | `notifier_service` | Parent notification via WhatsApp |
| WhatsappService | `whatsapp_service` | WhatsApp connectivity + message log |
| ClassService | `class_service` | |
| UserService | `user_service` | |
| AuthService | `auth_service` | JWT; Login is public endpoint |
| FaceEmbeddingService | `face_embedding_service` | pgvector embeddings |

## Proto / Buf

**Generate:**
```bash
buf lint        # validate
buf generate    # generates Go, Python, TypeScript stubs
```
Or use `./generate.bat` (runs both).

- Go → `backend/gen/`
- Python → `backend_python/gen/`
- TypeScript → `attendance_frontend/src/gen/`

**Never edit generated files.** Edit `.proto` → run `buf generate`.

**Key proto files:**
- `protos/attendance/v1/attendance.proto` — `AttendanceRecord`, `NotifyStatus`, `GetDailyAttendance`
- `protos/notifiers/v1/notifier.proto` — `NotifyParentRequest` (oneof: all / student)
- `protos/whatsapp/v1/whatsapp.proto` — `SendMessage`, `SendAttendanceAlerts`

## Frontend

**Framework:** React 19 + TypeScript + Vite + Chakra UI

```bash
cd attendance_frontend
npm run dev      # dev server (proxies /*.v1/* to localhost:8080)
npm run build    # TypeScript check + bundle
```

**Services** (`src/services/`):
- `attendance_service.ts` — ConnectRPC client for AttendanceService
- `notifier_service.ts` — ConnectRPC client for NotifierService
- `whatsapp_service.ts` — ConnectRPC client for WhatsappService

**Key pages/components:**
- `pages/classes/tabs/attendance.tsx` — attendance tab with notify parent, pagination, import/export
- `components/ScheduleSelector.tsx` — shared schedule filter dropdown (matches TeacherSelector style)
- `components/ClassPagination.tsx` — pagination component

**`bigint` for proto `int64`** — all `int64` fields are TypeScript `bigint`; use `BigInt(x)` / `String(id)`.

## Docker

```bash
docker-compose up          # starts PostgreSQL, ClickHouse, backend, frontend
docker-compose up db       # just the database
```

## Conventions

- **RPC framework:** ConnectRPC (`connectrpc.com/connect`) — not plain gRPC
- **Error codes:** `connect.CodeNotFound`, `connect.CodeInternal`, etc.
- **Logging:** `log/slog` (structured)
- **Chain middleware:** `common_helpers.NewChainParam[*gorm.DB](...)` for multi-step DB operations
- **Proto validation:** `buf.build/bufbuild/protovalidate` annotations on request fields
- **No Makefile** — use go/npm/buf/docker commands directly
- **Notify status flow:** `UNSPECIFIED` → button shown → `PENDING` after send → `NOTIFIED` after delivery
