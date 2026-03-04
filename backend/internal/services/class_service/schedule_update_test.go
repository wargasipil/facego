package class_service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"connectrpc.com/connect"
	sqlmock "github.com/DATA-DOG/go-sqlmock"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
	class_service "github.com/wargasipil/facego/internal/services/class_service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

func connectCode(err error) connect.Code {
	var ce *connect.Error
	if errors.As(err, &ce) {
		return ce.Code()
	}
	return connect.Code(0)
}

func scheduleCols() []string {
	return []string{"id", "class_id", "day_of_week", "start_time", "end_time", "subject", "room"}
}

func mustParseTime(s string) time.Time {
	t, _ := time.Parse("15:04", s)
	return t
}

func scheduleRow(id, classID int64, dow int32, start, end, subject, room string) *sqlmock.Rows {
	return sqlmock.NewRows(scheduleCols()).
		AddRow(id, classID, dow, mustParseTime(start), mustParseTime(end), subject, room)
}

// ── UpdateSchedule ────────────────────────────────────────────────────────────

func TestUpdateSchedule_Success(t *testing.T) {
	db, mock := newMockDB(t)
	svc := class_service.NewService(db)

	// UPDATE
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "class_schedules"`).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// SELECT after update (First)
	mock.ExpectQuery(`SELECT`).
		WillReturnRows(scheduleRow(1, 10, 1, "08:00", "09:30", "Math", "101"))

	res, err := svc.UpdateSchedule(context.Background(), connect.NewRequest(&classesv1.UpdateScheduleRequest{
		Id:        1,
		DayOfWeek: 1,
		StartTime: "08:00",
		EndTime:   "09:30",
		Subject:   "Math",
		Room:      "101",
	}))
	require.NoError(t, err)
	s := res.Msg.Schedule
	assert.Equal(t, int64(1), s.Id)
	assert.Equal(t, int64(10), s.ClassId)
	assert.Equal(t, int32(1), s.DayOfWeek)
	assert.Equal(t, "08:00", s.StartTime)
	assert.Equal(t, "09:30", s.EndTime)
	assert.Equal(t, "Math", s.Subject)
	assert.Equal(t, "101", s.Room)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateSchedule_NotFound(t *testing.T) {
	db, mock := newMockDB(t)
	svc := class_service.NewService(db)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "class_schedules"`).
		WillReturnResult(sqlmock.NewResult(0, 0)) // 0 rows affected
	mock.ExpectCommit()

	_, err := svc.UpdateSchedule(context.Background(), connect.NewRequest(&classesv1.UpdateScheduleRequest{
		Id:        99,
		DayOfWeek: 1,
		StartTime: "08:00",
		EndTime:   "09:30",
	}))
	require.Error(t, err)
	assert.Equal(t, connect.CodeNotFound, connectCode(err))
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateSchedule_UpdateError(t *testing.T) {
	db, mock := newMockDB(t)
	svc := class_service.NewService(db)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "class_schedules"`).
		WillReturnError(errors.New("db error"))
	mock.ExpectRollback()

	_, err := svc.UpdateSchedule(context.Background(), connect.NewRequest(&classesv1.UpdateScheduleRequest{
		Id:        1,
		DayOfWeek: 1,
		StartTime: "08:00",
		EndTime:   "09:30",
	}))
	require.Error(t, err)
	assert.Equal(t, connect.CodeInternal, connectCode(err))
	require.NoError(t, mock.ExpectationsWereMet())
}

// TestUpdateSchedule_LateNightTime is a regression test for a timezone bug where
// times >= 17:00 UTC were shifted by +7h (WIB) when read back from PostgreSQL,
// e.g. "23:59" was returned as "06:59". Fix: add TimeZone=UTC to the DSN.
func TestUpdateSchedule_LateNightTime(t *testing.T) {
	db, mock := newMockDB(t)
	svc := class_service.NewService(db)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "class_schedules"`).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	mock.ExpectQuery(`SELECT`).
		WillReturnRows(scheduleRow(1, 10, 5, "22:00", "23:59", "Night Class", "202"))

	res, err := svc.UpdateSchedule(context.Background(), connect.NewRequest(&classesv1.UpdateScheduleRequest{
		Id:        1,
		DayOfWeek: 5,
		StartTime: "22:00",
		EndTime:   "23:59",
		Subject:   "Night Class",
		Room:      "202",
	}))
	require.NoError(t, err)
	assert.Equal(t, "22:00", res.Msg.Schedule.StartTime)
	assert.Equal(t, "23:59", res.Msg.Schedule.EndTime, "23:59 must not be shifted (timezone bug)")
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateSchedule_FetchError(t *testing.T) {
	db, mock := newMockDB(t)
	svc := class_service.NewService(db)

	// UPDATE succeeds
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "class_schedules"`).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// SELECT (First) fails
	mock.ExpectQuery(`SELECT`).
		WillReturnError(errors.New("connection reset"))

	_, err := svc.UpdateSchedule(context.Background(), connect.NewRequest(&classesv1.UpdateScheduleRequest{
		Id:        1,
		DayOfWeek: 1,
		StartTime: "08:00",
		EndTime:   "09:30",
	}))
	require.Error(t, err)
	assert.Equal(t, connect.CodeInternal, connectCode(err))
	require.NoError(t, mock.ExpectationsWereMet())
}
