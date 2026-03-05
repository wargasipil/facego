package attendance_service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"connectrpc.com/connect"
	sqlmock "github.com/DATA-DOG/go-sqlmock"
	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
	attendance_service "github.com/wargasipil/facego/internal/services/attendance_service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// ── helpers ───────────────────────────────────────────────────────────────────

func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	gormDB, err := gorm.Open(
		postgres.New(postgres.Config{Conn: sqlDB}),
		&gorm.Config{Logger: logger.Default.LogMode(logger.Silent)},
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })
	return gormDB, mock
}

func newPushLogReq(sessionID string, userID, classID int64, seenAt time.Time) *connect.Request[attendancev1.AttendancePushLogRequest] {
	return connect.NewRequest(&attendancev1.AttendancePushLogRequest{
		SessionId:   sessionID,
		UserId:      userID,
		StudentId:   "S001",
		StudentName: "Alice",
		ClassId:     classID,
		ClassName:   "Math",
		SeenAt:      timestamppb.New(seenAt),
	})
}

// ── AttendancePushLog ─────────────────────────────────────────────────────────

func TestAttendancePushLog_Success(t *testing.T) {
	db, mock := newMockDB(t)
	svc := attendance_service.NewService(db)

	mock.ExpectBegin()
	mock.ExpectQuery(`INSERT INTO "detection_logs"`).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(int64(1)))
	mock.ExpectCommit()

	res, err := svc.AttendancePushLog(context.Background(), newPushLogReq(
		"sess-abc", 42, 10, time.Now().UTC(),
	))
	require.NoError(t, err)
	assert.NotNil(t, res.Msg)
	require.NoError(t, mock.ExpectationsWereMet())
}

// TestAttendancePushLog_SeenAtPreservesUTC verifies there is no timezone shift for
// seen_at. Unlike schedule StartTime/EndTime (which are parsed from "HH:MM" strings),
// seen_at comes from google.protobuf.Timestamp.AsTime() which always returns UTC.
// Storing a UTC time in timestamptz is timezone-neutral — no conversion bug here.
func TestAttendancePushLog_SeenAtPreservesUTC(t *testing.T) {
	db, mock := newMockDB(t)
	svc := attendance_service.NewService(db)

	// A late-night UTC timestamp: 2024-01-15 23:30:00 UTC.
	// With WIB (UTC+7) this would be 06:30 the next day locally.
	// The value must be stored exactly as-is — no shift.
	seenAt := time.Date(2024, 1, 15, 23, 30, 0, 0, time.UTC)

	mock.ExpectBegin()
	mock.ExpectQuery(`INSERT INTO "detection_logs"`).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(int64(1)))
	mock.ExpectCommit()

	_, err := svc.AttendancePushLog(context.Background(), newPushLogReq("sess-xyz", 5, 3, seenAt))
	require.NoError(t, err, "late-night UTC timestamp must not cause an error")
	require.NoError(t, mock.ExpectationsWereMet())
}

// TestAttendancePushLog_InsertError_StillReturnsSuccess verifies that AttendancePushLog
// is fire-and-forget: it always returns a nil error even when the DB insert fails.
// The error is only logged (slog.Warn) and the RPC caller is not notified.
func TestAttendancePushLog_InsertError_StillReturnsSuccess(t *testing.T) {
	db, mock := newMockDB(t)
	svc := attendance_service.NewService(db)

	mock.ExpectBegin()
	mock.ExpectQuery(`INSERT INTO "detection_logs"`).
		WillReturnError(errors.New("unique constraint violation"))
	mock.ExpectRollback()

	res, err := svc.AttendancePushLog(context.Background(), newPushLogReq(
		"sess-dup", 1, 1, time.Now().UTC(),
	))
	// Must still succeed — insert errors are swallowed internally
	require.NoError(t, err)
	assert.NotNil(t, res.Msg)
	require.NoError(t, mock.ExpectationsWereMet())
}
