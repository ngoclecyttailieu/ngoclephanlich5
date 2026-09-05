import { saveAs } from 'file-saver';
import { AppDatabase } from '../types';
import { getInitialDatabase } from './storage';

export function exportBackupJSON(db: AppDatabase): void {
  const jsonStr = JSON.stringify(db, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const dateStr = new Date().toISOString().split('T')[0];
  saveAs(blob, `Backup_TKB_CDYT_ThanhHoa_${dateStr}.json`);
}

export function importBackupJSON(file: File): Promise<AppDatabase> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result as string;
        const parsed = JSON.parse(raw) as AppDatabase;
        if (!parsed.classes || !parsed.teachers || !parsed.subjects) {
          throw new Error('Định dạng file sao lưu không hợp lệ!');
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Không thể đọc file'));
    reader.readAsText(file);
  });
}

/**
 * Generate SQLite relational SQL DDL & DML script
 */
export function exportBackupSQL(db: AppDatabase): void {
  let sql = `-- =============================================================\n`;
  sql += `-- HE THONG PHAN TIET & THOI KHOA BIEU - CD Y TE THANH HOA\n`;
  sql += `-- SQLITE DATABASE DUMP & SCHEMA EXPORT\n`;
  sql += `-- Created At: ${new Date().toISOString()}\n`;
  sql += `-- =============================================================\n\n`;

  sql += `PRAGMA foreign_keys = ON;\n\n`;

  // 1. Table cohorts
  sql += `-- Table: cohorts (Khối học / Sheet tabs)\n`;
  sql += `CREATE TABLE IF NOT EXISTS cohorts (\n`;
  sql += `  id TEXT PRIMARY KEY,\n`;
  sql += `  name TEXT NOT NULL UNIQUE,\n`;
  sql += `  description TEXT,\n`;
  sql += `  display_order INTEGER DEFAULT 1\n`;
  sql += `);\n\n`;

  db.cohorts.forEach(c => {
    sql += `INSERT OR REPLACE INTO cohorts (id, name, description, display_order) VALUES ('${escapeSql(c.id)}', '${escapeSql(c.name)}', '${escapeSql(c.description || '')}', ${c.order});\n`;
  });
  sql += `\n`;

  // 2. Table classes
  sql += `-- Table: classes (Lớp học)\n`;
  sql += `CREATE TABLE IF NOT EXISTS classes (\n`;
  sql += `  id TEXT PRIMARY KEY,\n`;
  sql += `  code TEXT NOT NULL UNIQUE,\n`;
  sql += `  name TEXT NOT NULL,\n`;
  sql += `  cohort_id TEXT REFERENCES cohorts(id),\n`;
  sql += `  academic_year TEXT,\n`;
  sql += `  student_count INTEGER DEFAULT 35,\n`;
  sql += `  faculty TEXT\n`;
  sql += `);\n\n`;

  db.classes.forEach(c => {
    sql += `INSERT OR REPLACE INTO classes (id, code, name, cohort_id, academic_year, student_count, faculty) VALUES ('${escapeSql(c.id)}', '${escapeSql(c.code)}', '${escapeSql(c.name)}', '${escapeSql(c.cohortId)}', '${escapeSql(c.academicYear)}', ${c.studentCount}, '${escapeSql(c.faculty)}');\n`;
  });
  sql += `\n`;

  // 3. Table teachers
  sql += `-- Table: teachers (Giáo viên / Giảng viên)\n`;
  sql += `CREATE TABLE IF NOT EXISTS teachers (\n`;
  sql += `  id TEXT PRIMARY KEY,\n`;
  sql += `  code TEXT NOT NULL UNIQUE,\n`;
  sql += `  name TEXT NOT NULL,\n`;
  sql += `  faculty TEXT NOT NULL,\n`;
  sql += `  specialty TEXT,\n`;
  sql += `  max_periods_per_week INTEGER DEFAULT 24,\n`;
  sql += `  phone TEXT,\n`;
  sql += `  email TEXT\n`;
  sql += `);\n\n`;

  db.teachers.forEach(t => {
    sql += `INSERT OR REPLACE INTO teachers (id, code, name, faculty, specialty, max_periods_per_week, phone, email) VALUES ('${escapeSql(t.id)}', '${escapeSql(t.code)}', '${escapeSql(t.name)}', '${escapeSql(t.faculty)}', '${escapeSql(t.specialty)}', ${t.maxPeriodsPerWeek}, '${escapeSql(t.phone || '')}', '${escapeSql(t.email || '')}');\n`;
  });
  sql += `\n`;

  // 4. Table subjects
  sql += `-- Table: subjects (Môn học & Quỹ tiết LT, TH, LS)\n`;
  sql += `CREATE TABLE IF NOT EXISTS subjects (\n`;
  sql += `  id TEXT PRIMARY KEY,\n`;
  sql += `  code TEXT NOT NULL UNIQUE,\n`;
  sql += `  name TEXT NOT NULL,\n`;
  sql += `  credits INTEGER DEFAULT 3,\n`;
  sql += `  theory_periods INTEGER DEFAULT 0,\n`;
  sql += `  practice_periods INTEGER DEFAULT 0,\n`;
  sql += `  clinical_periods INTEGER DEFAULT 0,\n`;
  sql += `  total_periods INTEGER DEFAULT 0,\n`;
  sql += `  color_bg TEXT DEFAULT '#DBEAFE',\n`;
  sql += `  color_text TEXT DEFAULT '#1E3A8A'\n`;
  sql += `);\n\n`;

  db.subjects.forEach(s => {
    sql += `INSERT OR REPLACE INTO subjects (id, code, name, credits, theory_periods, practice_periods, clinical_periods, total_periods, color_bg, color_text) VALUES ('${escapeSql(s.id)}', '${escapeSql(s.code)}', '${escapeSql(s.name)}', ${s.credits}, ${s.theoryPeriods}, ${s.practicePeriods}, ${s.clinicalPeriods}, ${s.totalPeriods}, '${escapeSql(s.colorBg)}', '${escapeSql(s.colorText)}');\n`;
  });
  sql += `\n`;

  // 5. Table assignments
  sql += `-- Table: assignments (Phân công giảng dạy)\n`;
  sql += `CREATE TABLE IF NOT EXISTS assignments (\n`;
  sql += `  id TEXT PRIMARY KEY,\n`;
  sql += `  class_id TEXT REFERENCES classes(id),\n`;
  sql += `  subject_id TEXT REFERENCES subjects(id),\n`;
  sql += `  theory_teachers TEXT,\n`;
  sql += `  practice_teachers TEXT,\n`;
  sql += `  clinical_teachers TEXT,\n`;
  sql += `  notes TEXT\n`;
  sql += `);\n\n`;

  db.assignments.forEach(a => {
    sql += `INSERT OR REPLACE INTO assignments (id, class_id, subject_id, theory_teachers, practice_teachers, clinical_teachers, notes) VALUES ('${escapeSql(a.id)}', '${escapeSql(a.classId)}', '${escapeSql(a.subjectId)}', '${escapeSql(JSON.stringify(a.theoryTeacherIds))}', '${escapeSql(JSON.stringify(a.practiceTeacherIds))}', '${escapeSql(JSON.stringify(a.clinicalTeacherIds))}', '${escapeSql(a.notes || '')}');\n`;
  });
  sql += `\n`;

  // 6. Table schedules & session_periods
  sql += `-- Table: session_schedules (Lịch học theo buổi)\n`;
  sql += `CREATE TABLE IF NOT EXISTS session_schedules (\n`;
  sql += `  id TEXT PRIMARY KEY,\n`;
  sql += `  week_number INTEGER NOT NULL,\n`;
  sql += `  academic_year TEXT NOT NULL,\n`;
  sql += `  class_id TEXT REFERENCES classes(id),\n`;
  sql += `  day_of_week INTEGER NOT NULL,\n`;
  sql += `  session TEXT NOT NULL,\n`;
  sql += `  periods_data_json TEXT NOT NULL,\n`;
  sql += `  updated_at TEXT\n`;
  sql += `);\n\n`;

  db.schedules.forEach(sc => {
    sql += `INSERT OR REPLACE INTO session_schedules (id, week_number, academic_year, class_id, day_of_week, session, periods_data_json, updated_at) VALUES ('${escapeSql(sc.id)}', ${sc.weekNumber}, '${escapeSql(sc.academicYear)}', '${escapeSql(sc.classId)}', ${sc.dayOfWeek}, '${escapeSql(sc.session)}', '${escapeSql(JSON.stringify(sc.periods))}', '${escapeSql(sc.updatedAt || new Date().toISOString())}');\n`;
  });

  const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `Database_CDYT_ThanhHoa_Schema_Data.sql`);
}

function escapeSql(str: string): string {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

export function restoreDefaultDatabase(): AppDatabase {
  const initial = getInitialDatabase();
  return initial;
}
