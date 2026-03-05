package class_service_test

import (
	"context"
	"errors"
	"testing"

	"connectrpc.com/connect"
	sqlmock "github.com/DATA-DOG/go-sqlmock"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
	class_service "github.com/wargasipil/facego/internal/services/class_service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ── ListSchedules ─────────────────────────────────────────────────────────────

func TestListSchedules_Success(t *testing.T) {
	db, mock := newMockDB(t)
	svc := class_service.NewService(db)

	mock.ExpectQuery(`SELECT`).
		WillReturnRows(sqlmock.NewRows(scheduleCols()).
			AddRow(int64(1), int64(10), int32(1), mustParseTime("08:00"), mustParseTime("09:30"), "Math", "101").
			AddRow(int64(2), int64(10), int32(3), mustParseTime("10:00"), mustParseTime("11:30"), "Physics", "102"))

	res, err := svc.ListSchedules(context.Background(), connect.NewRequest(&classesv1.ListSchedulesRequest{ClassId: 10}))
	require.NoError(t, err)
	require.Len(t, res.Msg.Schedules, 2)
	assert.Equal(t, int64(1), res.Msg.Schedules[0].Id)
	assert.Equal(t, int32(1), res.Msg.Schedules[0].DayOfWeek)
	assert.Equal(t, "08:00", res.Msg.Schedules[0].StartTime)
	assert.Equal(t, "09:30", res.Msg.Schedules[0].EndTime)
	assert.Equal(t, "Math", res.Msg.Schedules[0].Subject)
	assert.Equal(t, int64(2), res.Msg.Schedules[1].Id)
	assert.Equal(t, "10:00", res.Msg.Schedules[1].StartTime)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestListSchedules_Empty(t *testing.T) {
	db, mock := newMockDB(t)
	svc := class_service.NewService(db)

	mock.ExpectQuery(`SELECT`).
		WillReturnRows(sqlmock.NewRows(scheduleCols()))

	res, err := svc.ListSchedules(context.Background(), connect.NewRequest(&classesv1.ListSchedulesRequest{ClassId: 99}))
	require.NoError(t, err)
	assert.Empty(t, res.Msg.Schedules)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestListSchedules_DBError(t *testing.T) {
	db, mock := newMockDB(t)
	svc := class_service.NewService(db)

	mock.ExpectQuery(`SELECT`).
		WillReturnError(errors.New("connection reset"))

	_, err := svc.ListSchedules(context.Background(), connect.NewRequest(&classesv1.ListSchedulesRequest{ClassId: 10}))
	require.Error(t, err)
	assert.Equal(t, connect.CodeInternal, connectCode(err))
	require.NoError(t, mock.ExpectationsWereMet())
}

// TestListSchedules_LateNightTimeNotShifted is a regression test for the timezone
// bug where times >= 17:00 were shifted by +7h (WIB) when read back from PostgreSQL.
// e.g. "23:59" was returned as "06:59". Fix: TimeZone=UTC in DSN.
func TestListSchedules_LateNightTimeNotShifted(t *testing.T) {
	db, mock := newMockDB(t)
	svc := class_service.NewService(db)

	mock.ExpectQuery(`SELECT`).
		WillReturnRows(scheduleRow(1, 10, 5, "22:00", "23:59", "Night Class", "202"))

	res, err := svc.ListSchedules(context.Background(), connect.NewRequest(&classesv1.ListSchedulesRequest{ClassId: 10}))
	require.NoError(t, err)
	require.Len(t, res.Msg.Schedules, 1)
	s := res.Msg.Schedules[0]
	assert.Equal(t, "22:00", s.StartTime)
	assert.Equal(t, "23:59", s.EndTime, "23:59 must not be shifted to 06:59 (timezone bug)")
	require.NoError(t, mock.ExpectationsWereMet())
}
