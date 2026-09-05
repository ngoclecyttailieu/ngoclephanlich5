export type SessionType = 'morning' | 'afternoon';
export type PeriodType = 'LT' | 'TH' | 'LS'; // Lý thuyết, Thực hành, Lâm sàng
export type PracticeClassType = 'full' | 'half' | 'group1' | 'group2'; // Cả lớp, 1/2 lớp (chung), Tổ 1, Tổ 2

export interface CohortBlock {
  id: string;
  name: string; // e.g. "CĐ3", "CĐ2", "CĐ1", "GĐ", "TC"
  description?: string;
  order: number;
}

export interface StudentClass {
  id: string;
  code: string; // e.g. "CDDD26A"
  name: string; // e.g. "CĐĐD 26A"
  shortName?: string; // Tên viết tắt lớp đơn (e.g. "ĐD26A", "D14A", "YS2A", "XN15")
  cohortId: string; // Khối (CĐ3, CĐ2...)
  academicYear: string; // e.g. "2024-2027"
  studentCount: number; // Sĩ số
  faculty: string; // Khoa Điều dưỡng, Khoa Dược...
  majorId?: string; // Liên kết với Ngành đào tạo
  curriculumId?: string; // Liên kết với Chương trình đào tạo
}

export interface CombinedClassAlias {
  id: string;
  classIds: string[]; // Danh sách ID các lớp ghép (e.g. ["cls-cddd26a", "cls-cddd26b"])
  classNames?: string[]; // Danh sách tên lớp (e.g. ["CĐĐD 26A", "CĐĐD 26B"])
  alias: string; // Tên viết tắt lớp ghép tùy chỉnh (e.g. "ĐD26A,B" hoặc "ĐD26AB")
  shortName?: string; // alias
  note?: string;
}

export interface Teacher {
  id: string;
  code: string; // e.g. "GV001"
  name: string; // e.g. "ThS.BS. Nguyễn Văn A"
  faculty: string; // e.g. "Bộ môn Y học Lâm sàng"
  specialty: string; // Chuyên môn
  maxPeriodsPerWeek: number; // Số tiết tối đa / tuần
  phone?: string;
  email?: string;
}

export interface Subject {
  id: string;
  code: string; // e.g. "MH01"
  name: string; // e.g. "Bệnh học Nội khoa & Lâm sàng"
  shortName?: string; // Tên viết tắt môn học (e.g. "Nội", "Ngoại", "Dược lý", "ĐDCS", "Sản", "Nhi"...) dùng cho TKB & Excel tinh gọn
  credits: number;
  theoryPeriods: number; // Số tiết Lý thuyết (LT)
  practicePeriods: number; // Số tiết Thực hành (TH) (mỗi tổ của lớp phải học đủ số tiết này)
  clinicalPeriods: number;
  testPeriods?: number; // Số tiết Lâm sàng (LS)
  totalPeriods: number;
  colorBg: string; // Màu nền pastel (e.g. "#dbeafe" hoặc "#fce7f3")
  colorText: string; // Màu chữ tương phản (e.g. "#1e3a8a")
  colorBorder: string; // Màu viền
  departmentId?: string; // Bộ môn quản lý phòng thực hành
}

export interface LectureHall {
  id: string;
  code: string; // e.g. "101", "102", "B6P1", "Phòng TM"
  name: string; // e.g. "101", "102", "B6P1", "Phòng TM"
  excelName?: string; // Tên hiển thị trên tiêu đề cột Excel do người dùng tùy chỉnh (e.g. "101", "Phòng TM", "GĐ 101")
  building: string; // e.g. "Khu Nhà A", "Khu B6", "Khu Giảng đường"
  capacity: number; // Sức chứa SV
  type?: 'LT' | 'TH' | 'LS'; // Loại phòng: Lý thuyết, Thực hành, Lâm sàng
  note?: string;
  isActive: boolean;
  order?: number;
}

export interface Department {
  id: string;
  code: string; // e.g. "BM-DD", "BM-DUOC", "BM-YCS", "BM-LS"
  name: string; // e.g. "Bộ môn Điều dưỡng", "Bộ môn Dược", "Bộ môn Y học cơ sở"
  practiceRoomCount: number; // Số lượng phòng thực hành cố định
  practiceRoomNames?: string[]; // Tên hoặc danh sách phòng TH
  note?: string;
}

export interface TeachingAssignment {
  id: string;
  classId: string;
  subjectId: string;
  theoryTeacherIds: string[]; // Các GV dạy lý thuyết
  practiceTeacherIds: string[]; // Các GV dạy thực hành
  clinicalTeacherIds: string[]; // Các GV dạy lâm sàng
  notes?: string;
}

export interface PeriodDetail {
  subjectId: string;
  periodType: PeriodType; // LT / TH / LS
  practiceType: PracticeClassType; // full / half
  periodsCount: number; // 1, 2, 3, 4 tiết
  teacherIds: string[];
  roomOrHospital: string; // e.g. "P.201 Giảng đường A" or "BV Đa khoa Tỉnh"
  lessonTitle?: string; // Tên bài học (tùy chọn)
  notes?: string;
  isExam?: boolean; // Thi kết thúc môn học
  examAttempt?: number; // Thi lần 1, 2, 3...
}

export interface SessionSchedule {
  id: string;
  weekNumber: number;
  academicYear: string; // e.g. "2026-2027"
  classId: string;
  dayOfWeek: number; // 2 -> 7 (Thứ 2 -> Thứ 7), 8 là Chủ nhật
  session: SessionType; // 'morning' | 'afternoon'
  periods: PeriodDetail[]; // Danh sách 1 hoặc 2 môn trong cùng 1 buổi (tối đa tổng 4 tiết)
  combinedGroupId?: string; // ID nhóm lớp ghép (nếu học ghép chung với lớp khác)
  combinedClassIds?: string[]; // Danh sách ID các lớp học ghép cùng buổi này
  updatedAt?: string;
}

export interface WeekConfig {
  weekNumber: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  note?: string;
}

export interface ClassSubjectQuota {
  classId: string;
  subjectId: string;
  // Quỹ tiết ban đầu
  initialTheory: number;
  initialPractice: number;
  initialClinical: number;
  // Số tiết đã xếp
  usedTheory: number;
  usedPractice: number;
  usedClinical: number;
  // Override do Admin tùy chỉnh
  overrideRemainingTheory?: number;
  overrideRemainingPractice?: number;
  overrideRemainingClinical?: number;
}

export interface LectureHallCellColor {
  bgHex?: string;
  textHex?: string;
  customNote?: string;
}

export interface LectureHallStyleConfig {
  includeInExport?: boolean; // Default true: xuất kèm sheet Lịch Giảng Đường
  colorMode?: 'subject' | 'session' | 'custom'; // 'subject' = dùng màu môn, 'session' = sáng/chiều, 'custom' = tùy biến hàng/cột/ô
  morningBg?: string; // e.g. '#EFF6FF'
  afternoonBg?: string; // e.g. '#FFF7ED'
  rowColors?: Record<string, string>; // key: `${dayOfWeek}_${session}` => bgHex (e.g. "2_morning": "#DBEAFE")
  colColors?: Record<string, string>; // key: hallCode (lowercase, e.g. "101": "#FEF3C7")
  cellColors?: Record<string, LectureHallCellColor>; // key: `${weekNumber}_${dayOfWeek}_${session}_${hallCode}` => { bgHex, textHex, customNote }
  hallOrder?: string[]; // array of lecture hall IDs or codes in custom display order
  hiddenHallIds?: string[]; // array of lecture hall IDs to temporarily hide
}

export interface TimetableStyleConfig {
  dayColors?: Record<number, string>; // dayOfWeek 2..7 => bgHex (e.g. 2: "#E0F2FE")
  classColors?: Record<string, string>; // classId => bgHex
  headerCornerBg?: string;
  headerClassRowBg?: string;
  dayColBg?: string;
  sessionColBg?: string;
  classOrder?: Record<string, string[]>; // cohortId => array of classIds in custom display order
  hiddenClassIds?: string[]; // array of classIds that user wants to temporarily hide
}

export interface ExportExcelOptions {
  hideTeacherName: boolean; // Phương án 1: không để tên giảng viên
  hideLessonTitle: boolean; // Phương án 2: không để tên bài học
  hidePeriodCount: boolean; // Phương án 3: không hiện số tiết học của buổi học
  hideStudentCount: boolean; // Không hiện sĩ số lớp (mặc định true)
  selectedCohortIds?: string[]; // Chọn các sheet xuất
  includeLectureHallSheet?: boolean; // Xuất kèm Sheet Lịch Giảng Đường (GĐ)
  lectureHallColorMode?: 'subject' | 'session' | 'custom'; // Kiểu tô màu cho sheet GĐ
  schoolName: string;
  headerTitle: string;
}

export interface ScheduleConflict {
  id: string;
  type: 'TEACHER_CONFLICT' | 'CLASS_OVERLOAD' | 'ROOM_CONFLICT' | 'PRACTICE_ROOM_OVERLOAD' | 'LECTURE_HALL_CONFLICT';
  severity: 'warning' | 'error';
  message: string;
  weekNumber: number;
  dayOfWeek: number;
  session: SessionType;
  details: {
    teacherId?: string;
    teacherName?: string;
    classIds?: string[];
    classNames?: string[];
    room?: string;
    departmentId?: string;
    departmentName?: string;
    practiceLimit?: number;
    practiceCurrent?: number;
    totalPeriods?: number;
  };
}

export interface Major {
  id: string;
  code: string; // e.g. "DD"
  name: string; // e.g. "Điều dưỡng"
  order: number;
}

export interface CurriculumItem {
  id: string;
  subjectId: string;
  theoryPeriods: number;
  practicePeriods: number;
  clinicalPeriods: number;
  testPeriods?: number;
  semester?: number; // Học kỳ dự kiến
}

export interface Curriculum {
  id: string;
  majorId: string;
  name: string; // e.g. "Chương trình Điều dưỡng 2024"
  items: CurriculumItem[];
}

export interface ProgressLog {
  id: string;
  timestamp: string;
  subjectId: string;
  oldValue: number;
  newValue: number;
  note?: string;
}

export interface ClassProgress {
  classId: string;
  curriculumId: string;
  completedTheory: Record<string, number>; // subjectId -> number
  completedPractice: Record<string, number>; // subjectId -> number
  completedClinical: Record<string, number>; // subjectId -> number
  plannedSemester: number; // Học kỳ hiện tại đang lên lịch
  remainingOverrides?: Record<string, number>; // subjectId -> overridden remaining total
  progressLogs?: ProgressLog[];
}

export interface AppDatabase {
  cohorts: CohortBlock[];
  classes: StudentClass[];
  majors?: Major[];
  curriculums?: Curriculum[];
  classProgresses?: ClassProgress[];
  teachers: Teacher[];
  subjects: Subject[];
  assignments: TeachingAssignment[];
  schedules: SessionSchedule[];
  weeks: WeekConfig[];
  quotas: ClassSubjectQuota[];
  lectureHalls?: LectureHall[];
  departments?: Department[];
  combinedClassAliases?: CombinedClassAlias[];
  classShortNames?: Record<string, string>;
  lectureHallStyles?: LectureHallStyleConfig;
  timetableStyles?: TimetableStyleConfig;
  academicYear: string;
  selectedWeek: number;
  schoolName: string;
  exportOptions: ExportExcelOptions;
}
