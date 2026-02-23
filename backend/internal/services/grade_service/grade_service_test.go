package grade_service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"connectrpc.com/connect"
	sqlmock "github.com/DATA-DOG/go-sqlmock"
	gradesv1 "github.com/wargasipil/facego/gen/grades/v1"
	grade_service "github.com/wargasipil/facego/internal/services/grade_service"
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

func gradeColumns() []string {
	return []string{"id", "level", "label", "description", "created_at", "class_count", "student_count"}
}

func gradeRow(id int64, level, label, desc string, classCount, studentCount int64) *sqlmock.Rows {
	return sqlmock.NewRows(gradeColumns()).
		AddRow(id, level, label, desc, time.Now(), classCount, studentCount)
}

func connectCode(err error) connect.Code {
	var ce *connect.Error
	if errors.As(err, &ce) {
		return ce.Code()
	}
	return connect.Code(0)
}

// ── ListGrades ────────────────────────────────────────────────────────────────

func TestListGrades_ReturnsAllGrades(t *testing.T) {
	db, mock := newMockDB(t)
	svc := grade_service.New(db)

	mock.ExpectQuery(`SELECT`).
		WillReturnRows(sqlmock.NewRows(gradeColumns()).
			AddRow(int64(1), "10", "Grade 10", "", time.Now(), int64(3), int64(30)).
			AddRow(int64(2), "11", "Grade 11", "", time.Now(), int64(2), int64(20)))

	res, err := svc.ListGrades(context.Background(), connect.NewRequest(&gradesv1.ListGradesRequest{}))
	require.NoError(t, err)
	require.Len(t, res.Msg.Grades, 2)
	assert.Equal(t, int64(1), res.Msg.Grades[0].Id)
	assert.Equal(t, "10", res.Msg.Grades[0].Level)
	assert.Equal(t, "Grade 10", res.Msg.Grades[0].Label)
	assert.Equal(t, int32(3), res.Msg.Grades[0].ClassCount)
	assert.Equal(t, int32(30), res.Msg.Grades[0].StudentCount)
	assert.Equal(t, int64(2), res.Msg.Grades[1].Id)
	assert.Equal(t, "11", res.Msg.Grades[1].Level)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestListGrades_EmptyResult(t *testing.T) {
	db, mock := newMockDB(t)
	svc := grade_service.New(db)

	mock.ExpectQuery(`SELECT`).
		WillReturnRows(sqlmock.NewRows(gradeColumns()))

	res, err := svc.ListGrades(context.Background(), connect.NewRequest(&gradesv1.ListGradesRequest{}))
	require.NoError(t, err)
	assert.Empty(t, res.Msg.Grades)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestListGrades_DBError(t *testing.T) {
	db, mock := newMockDB(t)
	svc := grade_service.New(db)

	mock.ExpectQuery(`SELECT`).WillReturnError(errors.New("connection reset"))

	_, err := svc.ListGrades(context.Background(), connect.NewRequest(&gradesv1.ListGradesRequest{}))
	require.Error(t, err)
	assert.Equal(t, connect.CodeInternal, connectCode(err))
}

// ── GetGrade ──────────────────────────────────────────────────────────────────

func TestGetGrade_Found(t *testing.T) {
	db, mock := newMockDB(t)
	svc := grade_service.New(db)

	mock.ExpectQuery(`SELECT`).
		WithArgs(int64(1)).
		WillReturnRows(gradeRow(1, "10", "Grade 10", "Tenth grade", 5, 50))

	res, err := svc.GetGrade(context.Background(), connect.NewRequest(&gradesv1.GetGradeRequest{Id: 1}))
	require.NoError(t, err)
	assert.Equal(t, int64(1), res.Msg.Grade.Id)
	assert.Equal(t, "10", res.Msg.Grade.Level)
	assert.Equal(t, "Grade 10", res.Msg.Grade.Label)
	assert.Equal(t, "Tenth grade", res.Msg.Grade.Description)
	assert.Equal(t, int32(5), res.Msg.Grade.ClassCount)
	assert.Equal(t, int32(50), res.Msg.Grade.StudentCount)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetGrade_NotFound(t *testing.T) {
	db, mock := newMockDB(t)
	svc := grade_service.New(db)

	mock.ExpectQuery(`SELECT`).
		WithArgs(int64(99)).
		WillReturnRows(sqlmock.NewRows(gradeColumns())) // 0 rows

	_, err := svc.GetGrade(context.Background(), connect.NewRequest(&gradesv1.GetGradeRequest{Id: 99}))
	require.Error(t, err)
	assert.Equal(t, connect.CodeNotFound, connectCode(err))
	require.NoError(t, mock.ExpectationsWereMet())
}

// ── CreateGrade ───────────────────────────────────────────────────────────────

func TestCreateGrade_Success(t *testing.T) {
	db, mock := newMockDB(t)
	svc := grade_service.New(db)

	// INSERT
	mock.ExpectBegin()
	mock.ExpectQuery(`INSERT INTO "grades"`).
		WithArgs("10", "Grade 10", "Tenth grade", sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(int64(1)))
	mock.ExpectCommit()

	// fetchGrade after insert
	mock.ExpectQuery(`SELECT`).
		WithArgs(int64(1)).
		WillReturnRows(gradeRow(1, "10", "Grade 10", "Tenth grade", 0, 0))

	res, err := svc.CreateGrade(context.Background(), connect.NewRequest(&gradesv1.CreateGradeRequest{
		Level:       "10",
		Label:       "Grade 10",
		Description: "Tenth grade",
	}))
	require.NoError(t, err)
	assert.Equal(t, int64(1), res.Msg.Grade.Id)
	assert.Equal(t, "10", res.Msg.Grade.Level)
	assert.Equal(t, "Grade 10", res.Msg.Grade.Label)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateGrade_InsertError(t *testing.T) {
	db, mock := newMockDB(t)
	svc := grade_service.New(db)

	mock.ExpectBegin()
	mock.ExpectQuery(`INSERT INTO "grades"`).
		WillReturnError(errors.New("unique constraint violation"))
	mock.ExpectRollback()

	_, err := svc.CreateGrade(context.Background(), connect.NewRequest(&gradesv1.CreateGradeRequest{
		Level: "10",
		Label: "Grade 10",
	}))
	require.Error(t, err)
	assert.Equal(t, connect.CodeInternal, connectCode(err))
	require.NoError(t, mock.ExpectationsWereMet())
}

// ── UpdateGrade ───────────────────────────────────────────────────────────────

func TestUpdateGrade_Success(t *testing.T) {
	db, mock := newMockDB(t)
	svc := grade_service.New(db)

	// UPDATE
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "grades"`).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// fetchGrade after update
	mock.ExpectQuery(`SELECT`).
		WithArgs(int64(1)).
		WillReturnRows(gradeRow(1, "10", "Grade 10 Updated", "Updated", 2, 15))

	res, err := svc.UpdateGrade(context.Background(), connect.NewRequest(&gradesv1.UpdateGradeRequest{
		Id:          1,
		Level:       "10",
		Label:       "Grade 10 Updated",
		Description: "Updated",
	}))
	require.NoError(t, err)
	assert.Equal(t, int64(1), res.Msg.Grade.Id)
	assert.Equal(t, "Grade 10 Updated", res.Msg.Grade.Label)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateGrade_NotFound(t *testing.T) {
	db, mock := newMockDB(t)
	svc := grade_service.New(db)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "grades"`).
		WillReturnResult(sqlmock.NewResult(0, 0)) // 0 rows affected
	mock.ExpectCommit()

	_, err := svc.UpdateGrade(context.Background(), connect.NewRequest(&gradesv1.UpdateGradeRequest{
		Id:    99,
		Level: "99",
		Label: "Grade 99",
	}))
	require.Error(t, err)
	assert.Equal(t, connect.CodeNotFound, connectCode(err))
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateGrade_DBError(t *testing.T) {
	db, mock := newMockDB(t)
	svc := grade_service.New(db)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "grades"`).
		WillReturnError(errors.New("db error"))
	mock.ExpectRollback()

	_, err := svc.UpdateGrade(context.Background(), connect.NewRequest(&gradesv1.UpdateGradeRequest{
		Id:    1,
		Level: "10",
		Label: "Grade 10",
	}))
	require.Error(t, err)
	assert.Equal(t, connect.CodeInternal, connectCode(err))
}

// ── DeleteGrade ───────────────────────────────────────────────────────────────

func TestDeleteGrade_Success(t *testing.T) {
	db, mock := newMockDB(t)
	svc := grade_service.New(db)

	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM "grades"`).
		WithArgs(int64(1)).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	_, err := svc.DeleteGrade(context.Background(), connect.NewRequest(&gradesv1.DeleteGradeRequest{Id: 1}))
	require.NoError(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteGrade_NotFound(t *testing.T) {
	db, mock := newMockDB(t)
	svc := grade_service.New(db)

	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM "grades"`).
		WithArgs(int64(99)).
		WillReturnResult(sqlmock.NewResult(0, 0)) // 0 rows affected
	mock.ExpectCommit()

	_, err := svc.DeleteGrade(context.Background(), connect.NewRequest(&gradesv1.DeleteGradeRequest{Id: 99}))
	require.Error(t, err)
	assert.Equal(t, connect.CodeNotFound, connectCode(err))
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteGrade_DBError(t *testing.T) {
	db, mock := newMockDB(t)
	svc := grade_service.New(db)

	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM "grades"`).
		WillReturnError(errors.New("db error"))
	mock.ExpectRollback()

	_, err := svc.DeleteGrade(context.Background(), connect.NewRequest(&gradesv1.DeleteGradeRequest{Id: 1}))
	require.Error(t, err)
	assert.Equal(t, connect.CodeInternal, connectCode(err))
}
