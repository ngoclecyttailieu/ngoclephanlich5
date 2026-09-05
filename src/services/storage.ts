import { AppDatabase, Major, Curriculum, ClassProgress, CohortBlock, StudentClass, Teacher, Subject, TeachingAssignment, SessionSchedule, WeekConfig, ClassSubjectQuota, LectureHall, Department, CombinedClassAlias } from '../types';
import { PRESET_COLORS } from './colorPresets';

const STORAGE_KEY = 'cdyt_thanhhoa_tkb_database_v2';

export const INITIAL_LECTURE_HALLS: LectureHall[] = [
  // Giảng đường đặc biệt
  { id: 'hall-phong-tm', code: 'Phòng TM', name: 'Phòng TM', excelName: 'Phòng TM', building: 'Khu Giảng đường', capacity: 80, isActive: true, order: 1 },
  // Khu Giảng đường A
  { id: 'hall-101', code: '101', name: '101', excelName: '101', building: 'Khu Nhà A', capacity: 80, isActive: true, order: 2 },
  { id: 'hall-102', code: '102', name: '102', excelName: '102', building: 'Khu Nhà A', capacity: 80, isActive: true, order: 3 },
  { id: 'hall-103', code: '103', name: '103', excelName: '103', building: 'Khu Nhà A', capacity: 80, isActive: true, order: 4 },
  { id: 'hall-104', code: '104', name: '104', excelName: '104', building: 'Khu Nhà A', capacity: 80, isActive: true, order: 5 },
  { id: 'hall-201', code: '201', name: '201', excelName: '201', building: 'Khu Nhà A', capacity: 90, isActive: true, order: 6 },
  { id: 'hall-202', code: '202', name: '202', excelName: '202', building: 'Khu Nhà A', capacity: 90, isActive: true, order: 7 },
  { id: 'hall-203', code: '203', name: '203', excelName: '203', building: 'Khu Nhà A', capacity: 90, isActive: true, order: 8 },
  { id: 'hall-204', code: '204', name: '204', excelName: '204', building: 'Khu Nhà A', capacity: 90, isActive: true, order: 9 },
  // Khu Giảng đường B
  { id: 'hall-301', code: '301', name: '301', excelName: '301', building: 'Khu Nhà B', capacity: 90, isActive: true, order: 10 },
  { id: 'hall-302', code: '302', name: '302', excelName: '302', building: 'Khu Nhà B', capacity: 90, isActive: true, order: 11 },
  { id: 'hall-303', code: '303', name: '303', excelName: '303', building: 'Khu Nhà B', capacity: 90, isActive: true, order: 12 },
  { id: 'hall-304', code: '304', name: '304', excelName: '304', building: 'Khu Nhà B', capacity: 90, isActive: true, order: 13 },
  { id: 'hall-401', code: '401', name: '401', excelName: '401', building: 'Khu Nhà B', capacity: 100, isActive: true, order: 14 },
  { id: 'hall-402', code: '402', name: '402', excelName: '402', building: 'Khu Nhà B', capacity: 100, isActive: true, order: 15 },
  // Khu Nhà B6
  { id: 'hall-b6p1', code: 'B6P1', name: 'B6P1', excelName: 'B6P1', building: 'Khu Nhà B6', capacity: 60, isActive: true, order: 16 },
  { id: 'hall-b6p2', code: 'B6P2', name: 'B6P2', excelName: 'B6P2', building: 'Khu Nhà B6', capacity: 60, isActive: true, order: 17 },
  // Khu Nhà B7
  { id: 'hall-b7p1', code: 'B7P1', name: 'B7P1', excelName: 'B7P1', building: 'Khu Nhà B7', capacity: 60, isActive: true, order: 18 },
  { id: 'hall-b7p2', code: 'B7P2', name: 'B7P2', excelName: 'B7P2', building: 'Khu Nhà B7', capacity: 60, isActive: true, order: 19 },
  // Khu Nhà B8
  { id: 'hall-b8p1', code: 'B8P1', name: 'B8P1', excelName: 'B8P1', building: 'Khu Nhà B8', capacity: 60, isActive: true, order: 20 },
  { id: 'hall-b8p2', code: 'B8P2', name: 'B8P2', excelName: 'B8P2', building: 'Khu Nhà B8', capacity: 60, isActive: true, order: 21 },
  // Khu Nhà B9
  { id: 'hall-b9p1', code: 'B9P1', name: 'B9P1', excelName: 'B9P1', building: 'Khu Nhà B9', capacity: 60, isActive: true, order: 22 },
  { id: 'hall-b9p2', code: 'B9P2', name: 'B9P2', excelName: 'B9P2', building: 'Khu Nhà B9', capacity: 60, isActive: true, order: 23 },
  { id: 'hall-b9p3', code: 'B9P3', name: 'B9P3', excelName: 'B9P3', building: 'Khu Nhà B9', capacity: 60, isActive: true, order: 24 },
  { id: 'hall-b9p4', code: 'B9P4', name: 'B9P4', excelName: 'B9P4', building: 'Khu Nhà B9', capacity: 60, isActive: true, order: 25 },
  { id: 'hall-b9p5', code: 'B9P5', name: 'B9P5', excelName: 'B9P5', building: 'Khu Nhà B9', capacity: 60, isActive: true, order: 26 },
  { id: 'hall-b9p6', code: 'B9P6', name: 'B9P6', excelName: 'B9P6', building: 'Khu Nhà B9', capacity: 60, isActive: true, order: 27 },
];

export const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'bm-dd', code: 'BM-DD', name: 'Bộ môn Điều dưỡng', practiceRoomCount: 4, practiceRoomNames: ['Phòng TH Điều dưỡng 1', 'Phòng TH Điều dưỡng 2', 'Phòng TH Điều dưỡng 3', 'Phòng TH Hồi sức Cấp cứu'], note: 'Tối đa 4 phòng thực hành cùng thời điểm' },
  { id: 'bm-duoc', code: 'BM-DUOC', name: 'Khoa/Bộ môn Dược', practiceRoomCount: 3, practiceRoomNames: ['Lab Dược lý', 'Xưởng Bào chế', 'Phòng Kiểm nghiệm Dược liệu'], note: 'Tối đa 3 phòng thực hành cùng thời điểm' },
  { id: 'bm-ycs', code: 'BM-YCS', name: 'Bộ môn Y học cơ sở & Xét nghiệm', practiceRoomCount: 3, practiceRoomNames: ['Phòng TH Giải phẫu - Sinh lý', 'Lab Vi sinh - Ký sinh trùng', 'Lab Huyết học - Sinh hóa'], note: 'Tối đa 3 phòng thực hành cùng thời điểm' },
  { id: 'bm-ls', code: 'BM-LS', name: 'Bộ môn Y học Lâm sàng', practiceRoomCount: 2, practiceRoomNames: ['Phòng Tiền lâm sàng 1', 'Phòng Tiền lâm sàng 2'], note: 'Tối đa 2 phòng tiền lâm sàng tại trường' },
  { id: 'bm-cntt', code: 'BM-CNTT', name: 'Bộ môn Tin học & Ngoại ngữ', practiceRoomCount: 2, practiceRoomNames: ['Phòng Máy tính 1', 'Phòng Máy tính 2'], note: 'Tối đa 2 phòng máy' },
  { id: 'bm-phcn', code: 'BM-PHCN', name: 'Bộ môn Phục hồi chức năng - YHCT', practiceRoomCount: 2, practiceRoomNames: ['Phòng TH Châm cứu - Xoa bóp', 'Phòng Vật lý trị liệu'], note: 'Tối đa 2 phòng' },
];

export const INITIAL_COHORTS: CohortBlock[] = [
  { id: 'cohort-cd3', name: 'CĐ3', description: 'Cao đẳng Khóa 3 (Năm 3)', order: 1 },
  { id: 'cohort-cd2', name: 'CĐ2', description: 'Cao đẳng Khóa 2 (Năm 2)', order: 2 },
  { id: 'cohort-cd1', name: 'CĐ1', description: 'Cao đẳng Khóa 1 (Năm 1)', order: 3 },
  { id: 'cohort-gd', name: 'GĐ', description: 'Giai đoạn Đại cương & Liên kết', order: 4 },
  { id: 'cohort-tc', name: 'TC', description: 'Trung cấp & Chứng chỉ nghề', order: 5 },
];

export const INITIAL_CLASSES: StudentClass[] = [
  // CĐ3
  { id: 'cls-cddd26a', code: 'CDDD26A', name: 'CĐĐD 26A', shortName: 'ĐD26A', cohortId: 'cohort-cd3', academicYear: '2024-2027', studentCount: 38, faculty: 'Khoa Điều dưỡng' },
  { id: 'cls-cddd26b', code: 'CDDD26B', name: 'CĐĐD 26B', shortName: 'ĐD26B', cohortId: 'cohort-cd3', academicYear: '2024-2027', studentCount: 36, faculty: 'Khoa Điều dưỡng' },
  { id: 'cls-duock14a', code: 'DUOCK14A', name: 'DƯỢC K14A', shortName: 'D14A', cohortId: 'cohort-cd3', academicYear: '2024-2027', studentCount: 42, faculty: 'Khoa Dược' },
  { id: 'cls-duock14b', code: 'DUOCK14B', name: 'DƯỢC K14B', shortName: 'D14B', cohortId: 'cohort-cd3', academicYear: '2024-2027', studentCount: 40, faculty: 'Khoa Dược' },
  { id: 'cls-cdxn15', code: 'CDXN15', name: 'CĐXN 15', shortName: 'XN15', cohortId: 'cohort-cd3', academicYear: '2024-2027', studentCount: 30, faculty: 'Khoa Kỹ thuật Y học' },
  
  // CĐ2
  { id: 'cls-cddd27a', code: 'CDDD27A', name: 'CĐĐD 27A', shortName: 'ĐD27A', cohortId: 'cohort-cd2', academicYear: '2025-2028', studentCount: 35, faculty: 'Khoa Điều dưỡng' },
  { id: 'cls-duock15a', code: 'DUOCK15A', name: 'DƯỢC K15A', shortName: 'D15A', cohortId: 'cohort-cd2', academicYear: '2025-2028', studentCount: 38, faculty: 'Khoa Dược' },
  { id: 'cls-ysk2a', code: 'YSK2A', name: 'YS K2A', shortName: 'YS2A', cohortId: 'cohort-cd2', academicYear: '2025-2028', studentCount: 32, faculty: 'Khoa Y học Lâm sàng' },
  
  // CĐ1
  { id: 'cls-cddd28a', code: 'CDDD28A', name: 'CĐĐD 28A', shortName: 'ĐD28A', cohortId: 'cohort-cd1', academicYear: '2026-2029', studentCount: 40, faculty: 'Khoa Điều dưỡng' },
  { id: 'cls-duock16a', code: 'DUOCK16A', name: 'DƯỢC K16A', shortName: 'D16A', cohortId: 'cohort-cd1', academicYear: '2026-2029', studentCount: 45, faculty: 'Khoa Dược' },
];

export const INITIAL_COMBINED_ALIASES: CombinedClassAlias[] = [
  {
    id: 'alias-cddd26ab',
    classIds: ['cls-cddd26a', 'cls-cddd26b'],
    classNames: ['CĐĐD 26A', 'CĐĐD 26B'],
    alias: 'ĐD26A,B',
    note: 'Ghép 2 lớp Điều dưỡng 26A + 26B',
  },
  {
    id: 'alias-duock14ab',
    classIds: ['cls-duock14a', 'cls-duock14b'],
    classNames: ['DƯỢC K14A', 'DƯỢC K14B'],
    alias: 'D14A,B',
    note: 'Ghép 2 lớp Dược 14A + 14B',
  },
];

/**
 * Intelligent helper to generate short name for a single class (e.g. CĐĐD 26A -> ĐD26A, DƯỢC K14A -> D14A)
 */
export function generateClassShortName(name: string, code?: string): string {
  if (!name && !code) return '';
  const str = (name || code || '').trim();
  
  let result = str
    .replace(/^cao\s*đẳng\s*/i, '')
    .replace(/^cđ\s*/i, '')
    .replace(/^khoa\s*/i, '')
    .replace(/^lớp\s*/i, '');

  if (/^điều\s*dưỡng/i.test(result) || /^đd/i.test(result)) {
    result = result.replace(/^điều\s*dưỡng\s*/i, 'ĐD').replace(/^đd\s*/i, 'ĐD');
  } else if (/^dược/i.test(result)) {
    result = result.replace(/^dược\s*(k)?/i, 'D');
  } else if (/^xét\s*nghiệm/i.test(result) || /^xn/i.test(result)) {
    result = result.replace(/^xét\s*nghiệm\s*/i, 'XN').replace(/^xn\s*/i, 'XN');
  } else if (/^y\s*sĩ/i.test(result) || /^ys/i.test(result)) {
    result = result.replace(/^y\s*sĩ\s*(k)?/i, 'YS').replace(/^ys\s*(k)?/i, 'YS');
  } else if (/^hộ\s*sinh/i.test(result) || /^hs/i.test(result)) {
    result = result.replace(/^hộ\s*sinh\s*/i, 'HS').replace(/^hs\s*/i, 'HS');
  } else if (/^phục\s*hồi/i.test(result) || /^phcn/i.test(result)) {
    result = result.replace(/^phục\s*hồi\s*chức\s*năng\s*/i, 'PHCN').replace(/^phcn\s*/i, 'PHCN');
  }

  // Remove spaces
  result = result.replace(/\s+/g, '');
  return result || str;
}

/**
 * Returns the effective short name for a single class from database configuration or auto generator
 */
export function getClassShortName(clsOrId: StudentClass | string | undefined, db?: AppDatabase): string {
  if (!clsOrId) return '';
  let cls: StudentClass | undefined;
  if (typeof clsOrId === 'string') {
    if (db) {
      cls = db.classes.find(c => c.id === clsOrId || c.name === clsOrId || c.code === clsOrId);
    }
    if (!cls) return generateClassShortName(clsOrId);
  } else {
    cls = clsOrId;
  }

  if (cls.shortName && cls.shortName.trim()) {
    return cls.shortName.trim();
  }
  if (db?.classShortNames && db.classShortNames[cls.id]) {
    return db.classShortNames[cls.id].trim();
  }
  return generateClassShortName(cls.name, cls.code);
}

/**
 * Returns the effective abbreviation for a combined class group
 */
export function getCombinedClassShortName(classIds: string[], db?: AppDatabase): string {
  if (!classIds || classIds.length === 0) return '';
  if (classIds.length === 1) {
    return getClassShortName(classIds[0], db);
  }

  const sortedIds = [...classIds].sort();

  // 1. Check custom aliases in database
  if (db?.combinedClassAliases && db.combinedClassAliases.length > 0) {
    const found = db.combinedClassAliases.find(a => {
      if (!a.classIds || a.classIds.length !== sortedIds.length) return false;
      const aSorted = [...a.classIds].sort();
      return aSorted.every((id, idx) => id === sortedIds[idx]);
    });
    if (found && found.alias.trim()) {
      return found.alias.trim();
    }
  }

  // 2. Auto generate smart combined abbreviation
  const shortNames = sortedIds.map(id => getClassShortName(id, db));
  
  // Check if they share a common base prefix (e.g. "ĐD26A" and "ĐD26B" -> "ĐD26A,B")
  if (shortNames.length === 2) {
    const s1 = shortNames[0];
    const s2 = shortNames[1];
    const base1 = s1.slice(0, -1);
    const base2 = s2.slice(0, -1);
    const last1 = s1.slice(-1);
    const last2 = s2.slice(-1);
    if (base1 === base2 && base1.length > 1) {
      return `${base1}${last1},${last2}`;
    }
  }

  return shortNames.join(',');
}

/**
 * Returns the customized Excel display name for a lecture hall
 */
export function getLectureHallExcelName(hall: LectureHall): string {
  if (hall.excelName && hall.excelName.trim()) {
    return hall.excelName.trim();
  }
  return hall.name || hall.code;
}

export const INITIAL_TEACHERS: Teacher[] = [
  { id: 'gv-01', code: 'GV01', name: 'ThS.BS. Nguyễn Văn Hùng', faculty: 'Bộ môn Y học Lâm sàng', specialty: 'Nội khoa & Hồi sức cấp cứu', maxPeriodsPerWeek: 24, phone: '0912.345.678', email: 'hungnv@cdytthanhhoa.edu.vn' },
  { id: 'gv-02', code: 'GV02', name: 'DSCK1. Lê Thị Mai', faculty: 'Khoa Dược', specialty: 'Dược lý & Dược lâm sàng', maxPeriodsPerWeek: 22, phone: '0983.123.456', email: 'mailt@cdytthanhhoa.edu.vn' },
  { id: 'gv-03', code: 'GV03', name: 'ThS.ĐD. Trần Quốc Toản', faculty: 'Khoa Điều dưỡng', specialty: 'Điều dưỡng cơ sở & Ngoại khoa', maxPeriodsPerWeek: 26, phone: '0904.567.890', email: 'toantq@cdytthanhhoa.edu.vn' },
  { id: 'gv-04', code: 'GV04', name: 'BSCK1. Phạm Minh Tuấn', faculty: 'Bộ môn Y học Lâm sàng', specialty: 'Ngoại khoa & Phẫu thuật thực hành', maxPeriodsPerWeek: 20, phone: '0977.888.999', email: 'tuanpm@cdytthanhhoa.edu.vn' },
  { id: 'gv-05', code: 'GV05', name: 'ThS. Hoàng Thị Lan', faculty: 'Khoa Khoa học Cơ bản', specialty: 'Giải phẫu - Sinh lý', maxPeriodsPerWeek: 24, phone: '0915.666.777', email: 'lanht@cdytthanhhoa.edu.vn' },
  { id: 'gv-06', code: 'GV06', name: 'ThS.DS. Bùi Đình Thắng', faculty: 'Khoa Dược', specialty: 'Bào chế & Quản lý Dược', maxPeriodsPerWeek: 22, phone: '0945.112.233', email: 'thangbd@cdytthanhhoa.edu.vn' },
  { id: 'gv-07', code: 'GV07', name: 'CN. Đỗ Thị Thu Trang', faculty: 'Khoa Kỹ thuật Y học', specialty: 'Huyết học & Sinh hóa lâm sàng', maxPeriodsPerWeek: 25, phone: '0936.445.566', email: 'trangdtt@cdytthanhhoa.edu.vn' },
  { id: 'gv-08', code: 'GV08', name: 'ThS.BS. Đinh Văn Sơn', faculty: 'Bộ môn Y học Lâm sàng', specialty: 'Nhi khoa & Truyền nhiễm', maxPeriodsPerWeek: 20, phone: '0988.223.344', email: 'sondv@cdytthanhhoa.edu.vn' },
];

export function generateSubjectShortName(name: string): string {
  const clean = name.trim();
  const lower = clean.toLowerCase();
  
  if (lower.includes('nội khoa') || lower.includes('nội')) return 'Nội';
  if (lower.includes('ngoại khoa') || lower.includes('ngoại')) return 'Ngoại';
  if (lower.includes('sản phụ') || lower.includes('phụ sản') || lower.includes('sản')) return 'Sản';
  if (lower.includes('nhi khoa') || lower.includes('nhi')) return 'Nhi';
  if (lower.includes('truyền nhiễm') || lower.includes('nhiễm')) return 'Truyền nhiễm';
  if (lower.includes('dược lý')) return 'Dược lý';
  if (lower.includes('điều dưỡng cơ sở') || lower.includes('đdcs')) return 'ĐDCS';
  if (lower.includes('điều dưỡng')) return 'Điều dưỡng';
  if (lower.includes('giải phẫu')) return 'Giải phẫu - SL';
  if (lower.includes('bào chế')) return 'Bào chế';
  if (lower.includes('huyết học') || lower.includes('xét nghiệm')) return 'Xét nghiệm';
  if (lower.includes('dược liệu')) return 'Dược liệu';
  if (lower.includes('hóa dược')) return 'Hóa dược';
  if (lower.includes('vi sinh')) return 'Vi sinh';
  if (lower.includes('ký sinh trùng') || lower.includes('kí sinh')) return 'KST';
  if (lower.includes('yhct') || lower.includes('cổ truyền')) return 'YHCT';
  if (lower.includes('phục hồi') || lower.includes('phcn')) return 'PHCN';
  if (lower.includes('tin học')) return 'Tin học';
  if (lower.includes('tiếng anh') || lower.includes('ngoại ngữ')) return 'Tiếng Anh';
  if (lower.includes('pháp luật') || lower.includes('chính trị')) return 'Chính trị';
  
  // Default: take first 3-4 words or clean name
  const words = clean.split(/\s+/);
  if (words.length <= 3) return clean;
  return words.slice(0, 3).join(' ');
}

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'sub-01',
    code: 'DUOC-LY',
    name: 'Dược lý học',
    shortName: 'Dược lý',
    credits: 3,
    theoryPeriods: 30,
    practicePeriods: 15,
    clinicalPeriods: 0,
    totalPeriods: 45,
    departmentId: 'bm-duoc',
    colorBg: PRESET_COLORS[0].bgHex, // Xanh dương
    colorText: PRESET_COLORS[0].textHex,
    colorBorder: PRESET_COLORS[0].borderHex,
  },
  {
    id: 'sub-02',
    code: 'DD-COSO',
    name: 'Điều dưỡng cơ sở',
    shortName: 'ĐDCS',
    credits: 4,
    theoryPeriods: 30,
    practicePeriods: 30,
    clinicalPeriods: 0,
    totalPeriods: 60,
    departmentId: 'bm-dd',
    colorBg: PRESET_COLORS[1].bgHex, // Hồng
    colorText: PRESET_COLORS[1].textHex,
    colorBorder: PRESET_COLORS[1].borderHex,
  },
  {
    id: 'sub-03',
    code: 'NOI-KHOA',
    name: 'Bệnh học Nội khoa & Lâm sàng',
    shortName: 'Nội',
    credits: 4,
    theoryPeriods: 25,
    practicePeriods: 0,
    clinicalPeriods: 35,
    totalPeriods: 60,
    departmentId: 'bm-ls',
    colorBg: PRESET_COLORS[2].bgHex, // Cam
    colorText: PRESET_COLORS[2].textHex,
    colorBorder: PRESET_COLORS[2].borderHex,
  },
  {
    id: 'sub-04',
    code: 'GIAIPHAU-SL',
    name: 'Giải phẫu - Sinh lý',
    shortName: 'Giải phẫu',
    credits: 3,
    theoryPeriods: 30,
    practicePeriods: 15,
    clinicalPeriods: 0,
    totalPeriods: 45,
    departmentId: 'bm-ycs',
    colorBg: PRESET_COLORS[3].bgHex, // Vàng
    colorText: PRESET_COLORS[3].textHex,
    colorBorder: PRESET_COLORS[3].borderHex,
  },
  {
    id: 'sub-05',
    code: 'NGOAI-KHOA',
    name: 'Bệnh học Ngoại khoa & Lâm sàng',
    shortName: 'Ngoại',
    credits: 3,
    theoryPeriods: 20,
    practicePeriods: 0,
    clinicalPeriods: 25,
    totalPeriods: 45,
    departmentId: 'bm-ls',
    colorBg: PRESET_COLORS[4].bgHex, // Xanh lá
    colorText: PRESET_COLORS[4].textHex,
    colorBorder: PRESET_COLORS[4].borderHex,
  },
  {
    id: 'sub-06',
    code: 'BAO-CHE',
    name: 'Bào chế và Sinh dược học',
    shortName: 'Bào chế',
    credits: 3,
    theoryPeriods: 20,
    practicePeriods: 25,
    clinicalPeriods: 0,
    totalPeriods: 45,
    departmentId: 'bm-duoc',
    colorBg: PRESET_COLORS[5].bgHex, // Đỏ san hô
    colorText: PRESET_COLORS[5].textHex,
    colorBorder: PRESET_COLORS[5].borderHex,
  },
  {
    id: 'sub-07',
    code: 'XET-NGHIEM',
    name: 'Kỹ thuật Xét nghiệm Huyết học',
    shortName: 'Xét nghiệm',
    credits: 3,
    theoryPeriods: 15,
    practicePeriods: 30,
    clinicalPeriods: 0,
    totalPeriods: 45,
    departmentId: 'bm-ycs',
    colorBg: PRESET_COLORS[6].bgHex, // Tím
    colorText: PRESET_COLORS[6].textHex,
    colorBorder: PRESET_COLORS[6].borderHex,
  },
];

export const INITIAL_ASSIGNMENTS: TeachingAssignment[] = [
  {
    id: 'asg-01',
    classId: 'cls-cddd26a',
    subjectId: 'sub-02', // DD Co so
    theoryTeacherIds: ['gv-03'],
    practiceTeacherIds: ['gv-03'],
    clinicalTeacherIds: [],
    notes: 'Phân công chính kỳ 1',
  },
  {
    id: 'asg-02',
    classId: 'cls-cddd26a',
    subjectId: 'sub-03', // Noi khoa
    theoryTeacherIds: ['gv-01'],
    practiceTeacherIds: [],
    clinicalTeacherIds: ['gv-01', 'gv-08'],
    notes: 'Thực tập lâm sàng tại BVĐK Tỉnh',
  },
  {
    id: 'asg-03',
    classId: 'cls-duock14a',
    subjectId: 'sub-01', // Duoc ly
    theoryTeacherIds: ['gv-02'],
    practiceTeacherIds: ['gv-02'],
    clinicalTeacherIds: [],
    notes: 'Thực hành tại Phòng TN Dược',
  },
  {
    id: 'asg-04',
    classId: 'cls-duock14a',
    subjectId: 'sub-06', // Bao che
    theoryTeacherIds: ['gv-06'],
    practiceTeacherIds: ['gv-06'],
    clinicalTeacherIds: [],
    notes: 'Xưởng thực hành Bào chế',
  },
  {
    id: 'asg-05',
    classId: 'cls-cddd26b',
    subjectId: 'sub-02', // DD Co so
    theoryTeacherIds: ['gv-03'],
    practiceTeacherIds: ['gv-03'],
    clinicalTeacherIds: [],
  },
  {
    id: 'asg-06',
    classId: 'cls-cddd26b',
    subjectId: 'sub-04', // Giai phau SL
    theoryTeacherIds: ['gv-05'],
    practiceTeacherIds: ['gv-05'],
    clinicalTeacherIds: [],
  },
];

// Generate weeks aligned with perpetual calendar (Mặc định 1 tuần từ Thứ 2 đến Thứ 7, có tùy chọn Chủ Nhật)
export function generatePerpetualWeeks(
  week1StartDate: string,
  totalWeeks: number = 45,
  includeSunday: boolean = false
): WeekConfig[] {
  const parts = week1StartDate.split('-').map(Number);
  const startD = new Date(parts[0], parts[1] - 1, parts[2]);
  
  const weeks: WeekConfig[] = [];
  const daysSpan = includeSunday ? 6 : 5; // 5 ngày cộng vào Thứ 2 = Thứ 7; 6 ngày = Chủ Nhật

  for (let i = 1; i <= totalWeeks; i++) {
    const wStart = new Date(startD);
    wStart.setDate(startD.getDate() + (i - 1) * 7);

    const wEnd = new Date(wStart);
    wEnd.setDate(wStart.getDate() + daysSpan);

    const sYear = wStart.getFullYear();
    const sMonth = String(wStart.getMonth() + 1).padStart(2, '0');
    const sDay = String(wStart.getDate()).padStart(2, '0');
    const sStr = `${sYear}-${sMonth}-${sDay}`;

    const eYear = wEnd.getFullYear();
    const eMonth = String(wEnd.getMonth() + 1).padStart(2, '0');
    const eDay = String(wEnd.getDate()).padStart(2, '0');
    const eStr = `${eYear}-${eMonth}-${eDay}`;

    weeks.push({
      weekNumber: i,
      startDate: sStr,
      endDate: eStr,
      note: `Tuần ${i} (${includeSunday ? 'T2 - CN' : 'T2 - T7'})`,
    });
  }

  return weeks;
}

// Generate 45 weeks for academic year 2026-2027 starting around August 2026 (Mặc định Thứ 2 đến Thứ 7)
export function generateInitialWeeks(): WeekConfig[] {
  return generatePerpetualWeeks('2026-08-10', 45, false);
}

export const INITIAL_SCHEDULES: SessionSchedule[] = [
  // Tuần 3, CĐĐD 26A, Thứ 2 sáng: Môn Dược lý (2 tiết) + Giải phẫu (2 tiết)
  {
    id: 'sch-001',
    weekNumber: 3,
    academicYear: '2026-2027',
    classId: 'cls-cddd26a',
    dayOfWeek: 2, // Thứ 2
    session: 'morning',
    periods: [
      {
        subjectId: 'sub-01',
        periodType: 'LT',
        practiceType: 'full',
        periodsCount: 2,
        teacherIds: ['gv-02'],
        roomOrHospital: '201',
        lessonTitle: 'Đại cương Dược lực học',
      },
      {
        subjectId: 'sub-04',
        periodType: 'LT',
        practiceType: 'full',
        periodsCount: 2,
        teacherIds: ['gv-05'],
        roomOrHospital: '201',
        lessonTitle: 'Hệ tuần hoàn và Tim',
      }
    ],
  },
  // Tuần 3, CĐĐD 26A, Thứ 3 sáng: TT Điều dưỡng cơ sở (4 tiết) - 1/2 lớp
  {
    id: 'sch-002',
    weekNumber: 3,
    academicYear: '2026-2027',
    classId: 'cls-cddd26a',
    dayOfWeek: 3, // Thứ 3
    session: 'morning',
    periods: [
      {
        subjectId: 'sub-02',
        periodType: 'TH',
        practiceType: 'half',
        periodsCount: 4,
        teacherIds: ['gv-03'],
        roomOrHospital: '',
        lessonTitle: 'Kỹ thuật tiêm truyền cơ bản',
      }
    ],
  },
  // Tuần 3, CĐĐD 26A, Thứ 4 sáng: Lâm sàng Bệnh học Nội khoa (4 tiết)
  {
    id: 'sch-003',
    weekNumber: 3,
    academicYear: '2026-2027',
    classId: 'cls-cddd26a',
    dayOfWeek: 4, // Thứ 4
    session: 'morning',
    periods: [
      {
        subjectId: 'sub-03',
        periodType: 'LS',
        practiceType: 'full',
        periodsCount: 4,
        teacherIds: ['gv-01'],
        roomOrHospital: 'BVĐK Tỉnh Thanh Hóa',
        lessonTitle: 'Khám và chăm sóc bệnh nhân tăng huyết áp',
      }
    ],
  },
  // Tuần 3, DƯỢC K14A, Thứ 2 sáng: TT Dược lý (4 tiết)
  {
    id: 'sch-004',
    weekNumber: 3,
    academicYear: '2026-2027',
    classId: 'cls-duock14a',
    dayOfWeek: 2, // Thứ 2
    session: 'morning',
    periods: [
      {
        subjectId: 'sub-01',
        periodType: 'TH',
        practiceType: 'half',
        periodsCount: 4,
        teacherIds: ['gv-02'],
        roomOrHospital: '',
        lessonTitle: 'Thử nghiệm tác dụng thuốc trên động vật',
      }
    ],
  },
  // Tuần 3, DƯỢC K14A, Thứ 3 chiều: Bào chế (4 tiết)
  {
    id: 'sch-005',
    weekNumber: 3,
    academicYear: '2026-2027',
    classId: 'cls-duock14a',
    dayOfWeek: 3, // Thứ 3
    session: 'afternoon',
    periods: [
      {
        subjectId: 'sub-06',
        periodType: 'LT',
        practiceType: 'full',
        periodsCount: 4,
        teacherIds: ['gv-06'],
        roomOrHospital: '303',
        lessonTitle: 'Kỹ thuật bào chế dung dịch thuốc',
      }
    ],
  },
  // Tuần 3, CĐĐD 26B, Thứ 2 chiều: Giải phẫu (4 tiết)
  {
    id: 'sch-006',
    weekNumber: 3,
    academicYear: '2026-2027',
    classId: 'cls-cddd26b',
    dayOfWeek: 2, // Thứ 2
    session: 'afternoon',
    periods: [
      {
        subjectId: 'sub-04',
        periodType: 'LT',
        practiceType: 'full',
        periodsCount: 4,
        teacherIds: ['gv-05'],
        roomOrHospital: '202',
        lessonTitle: 'Giải phẫu hệ thần kinh trung ương',
      }
    ],
  }
];

export const INITIAL_MAJORS: Major[] = [
  { id: 'major-dd', code: 'DD', name: 'Điều dưỡng', order: 1 },
  { id: 'major-duoc', code: 'DUOC', name: 'Dược', order: 2 },
  { id: 'major-ysdk', code: 'YSDK', name: 'Y sỹ đa khoa', order: 3 },
  { id: 'major-xn', code: 'XN', name: 'Xét nghiệm', order: 4 },
  { id: 'major-ha', code: 'HA', name: 'Hình ảnh', order: 5 },
  { id: 'major-phcn', code: 'PHCN', name: 'Phục hồi chức năng', order: 6 },
  { id: 'major-phr', code: 'PHR', name: 'Phục hình răng', order: 7 },
  { id: 'major-yhct', code: 'YHCT', name: 'Y học cổ truyền', order: 8 },
  { id: 'major-hs', code: 'HS', name: 'Hộ sinh', order: 9 },
  { id: 'major-dinhduong', code: 'DDG', name: 'Dinh dưỡng', order: 10 },
];

export const INITIAL_CURRICULUMS: Curriculum[] = [];
export const INITIAL_CLASS_PROGRESSES: ClassProgress[] = [];

export function getInitialDatabase(): AppDatabase {
  return {
    cohorts: INITIAL_COHORTS,
    classes: INITIAL_CLASSES,
    majors: INITIAL_MAJORS,
    curriculums: INITIAL_CURRICULUMS,
    classProgresses: INITIAL_CLASS_PROGRESSES,
    teachers: INITIAL_TEACHERS,
    subjects: INITIAL_SUBJECTS,
    assignments: INITIAL_ASSIGNMENTS,
    schedules: INITIAL_SCHEDULES,
    weeks: generateInitialWeeks(),
    quotas: [],
    lectureHalls: INITIAL_LECTURE_HALLS,
    departments: INITIAL_DEPARTMENTS,
    combinedClassAliases: INITIAL_COMBINED_ALIASES,
    classShortNames: {},
    lectureHallStyles: {
      includeInExport: true,
      colorMode: 'subject',
      morningBg: '#EFF6FF',
      afternoonBg: '#FFF7ED',
      rowColors: {},
      colColors: {},
      cellColors: {},
    },
    academicYear: '2026-2027',
    selectedWeek: 3, // Default week 3 as in user brief
    schoolName: 'TRƯỜNG CAO ĐẲNG Y TẾ THANH HÓA',
    exportOptions: {
      hideTeacherName: false,
      hideLessonTitle: false,
      hidePeriodCount: false,
      hideStudentCount: true,
      selectedCohortIds: ['cohort-cd3', 'cohort-cd2', 'cohort-cd1'],
      includeLectureHallSheet: true,
      lectureHallColorMode: 'subject',
      schoolName: 'TRƯỜNG CAO ĐẲNG Y TẾ THANH HÓA',
      headerTitle: 'THỜI KHÓA BIỂU GIẢNG DẠY VÀ HỌC TẬP',
    },
  };
}

export function loadDatabase(): AppDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialDatabase();
      saveDatabase(initial);
      return initial;
    }
    const data = JSON.parse(raw) as AppDatabase;
    // ensure fallback fields
    if (!data.cohorts || data.cohorts.length === 0) data.cohorts = INITIAL_COHORTS;
    if (!data.classes || data.classes.length === 0) {
      data.classes = INITIAL_CLASSES;
    } else {
      data.classes.forEach(c => {
        if (!c.shortName || !c.shortName.trim()) {
          c.shortName = generateClassShortName(c.name, c.code);
        }
      });
    }
    if (!data.teachers || data.teachers.length === 0) data.teachers = INITIAL_TEACHERS;
    if (!data.subjects || data.subjects.length === 0) {
      data.subjects = INITIAL_SUBJECTS;
    } else {
      // Ensure all subjects have shortName
      data.subjects.forEach(s => {
        if (!s.shortName || !s.shortName.trim()) {
          s.shortName = generateSubjectShortName(s.name);
        }
      });
    }
    if (!data.weeks || data.weeks.length === 0) data.weeks = generateInitialWeeks();
    if (!Array.isArray(data.lectureHalls)) {
      data.lectureHalls = INITIAL_LECTURE_HALLS;
    } else {
      data.lectureHalls.forEach((h, idx) => {
        if (!h.excelName) h.excelName = h.name || h.code;
        if (h.order === undefined) h.order = idx + 1;
      });
    }
    if (!data.departments || data.departments.length === 0) data.departments = INITIAL_DEPARTMENTS;
    if (!data.combinedClassAliases || data.combinedClassAliases.length === 0) {
      data.combinedClassAliases = INITIAL_COMBINED_ALIASES;
    }
    if (!data.exportOptions) {
      data.exportOptions = {
        hideTeacherName: false,
        hideLessonTitle: false,
        hidePeriodCount: false,
        hideStudentCount: true,
        selectedCohortIds: ['cohort-cd3', 'cohort-cd2', 'cohort-cd1'],
        schoolName: 'TRƯỜNG CAO ĐẲNG Y TẾ THANH HÓA',
        headerTitle: 'THỜI KHÓA BIỂU GIẢNG DẠY VÀ HỌC TẬP',
      };
    }
    return data;
  } catch (err) {
    console.error('Failed to load database from localStorage:', err);
    const initial = getInitialDatabase();
    saveDatabase(initial);
    return initial;
  }
}

export function saveDatabase(data: AppDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save database to localStorage:', err);
  }
}

export function restoreDefaultDatabase(): AppDatabase {
  localStorage.removeItem(STORAGE_KEY);
  const initial = getInitialDatabase();
  saveDatabase(initial);
  return initial;
}
