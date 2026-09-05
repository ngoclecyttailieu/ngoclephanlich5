import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { AppDatabase, PeriodDetail, PracticeClassType, ScheduleConflict, SessionSchedule, StudentClass, Subject, Teacher, LectureHall } from '../types';
import { cleanLectureHallCode, detectConflicts, formatSubjectDisplayName } from './schedulerService';
import { generateSubjectShortName, getClassShortName } from './storage';

export interface DiffSessionItem {
  id?: string;
  weekNumber: number;
  classId: string;
  className: string;
  dayOfWeek: number; // 2 -> 8 (2: Thứ 2, 8: Chủ nhật)
  session: 'morning' | 'afternoon';
  periods: PeriodDetail[];
  combinedGroupId?: string;
  combinedClassIds?: string[];
  rawSourceText?: string;
}

export type DiffChangeType = 'added' | 'modified' | 'removed' | 'unchanged';

export interface ScheduleDiffRecord {
  id: string;
  type: DiffChangeType;
  weekNumber: number;
  dayOfWeek: number;
  session: 'morning' | 'afternoon';
  classId: string;
  className: string;
  oldSession?: SessionSchedule;
  newSession?: SessionSchedule;
  differences: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  explanation: string;
}

export interface DiffAnalysisResult {
  summary: {
    totalOriginal: number;
    totalUploaded: number;
    addedCount: number;
    modifiedCount: number;
    removedCount: number;
    unchangedCount: number;
    conflictCount: number;
  };
  changes: {
    added: ScheduleDiffRecord[];
    modified: ScheduleDiffRecord[];
    removed: ScheduleDiffRecord[];
    unchanged: ScheduleDiffRecord[];
  };
  conflicts: ScheduleConflict[];
  naturalLanguageSummary: string;
  conflictReport: string;
  structuredJson: {
    version: string;
    timestamp: string;
    metadata: {
      targetWeek?: number;
      totalChanges: number;
      hasConflicts: boolean;
    };
    summary: {
      addedCount: number;
      modifiedCount: number;
      removedCount: number;
      unchangedCount: number;
      conflictCount: number;
    };
    records: {
      added: any[];
      modified: any[];
      removed: any[];
    };
    conflicts: any[];
    syncPayload: SessionSchedule[];
  };
  finalMasterSchedules: SessionSchedule[];
}

/**
 * Format day of week to Vietnamese text
 */
export function formatDayOfWeek(day: number): string {
  if (day === 8) return 'Chủ Nhật';
  return `Thứ ${day}`;
}

export function formatSessionName(session: 'morning' | 'afternoon'): string {
  return session === 'morning' ? 'Sáng' : 'Chiều';
}

/**
 * Helper to normalize string for comparison (stripping accents, extra spaces, punctuation)
 */
export function normalizeStr(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Strip teacher academic/professional titles to obtain the clean base name
 */
export function stripTeacherTitles(name: string): string {
  if (!name) return '';
  return name
    .replace(/^(?:pgs\.ts\.|ts\.bs\.|ths\.bs\.|bs\.ckii\.|bs\.cki\.|bsckii\.|bscki\.|bsck2\.|bsck1\.|dsckii\.|dscki\.|dsck2\.|dsck1\.|dscbii\.|dscbi\.|ths\.đd\.|ths\.dd\.|cn\.đd\.|cn\.dd\.|ths\.|ts\.|bs\.|ds\.|cn\.|đd\.|dd\.|gv\.|gv|thầy|cô)\s*/gi, '')
    .trim();
}

/**
 * Enhanced Class lookup in Database
 */
export function findClassInDb(query: string, db: AppDatabase): StudentClass | undefined {
  if (!query) return undefined;
  const cleanQ = query.trim().replace(/^lớp:\s*/i, '').replace(/^lop:\s*/i, '').trim();
  const normQ = normalizeStr(cleanQ);
  if (!normQ) return undefined;

  // 1. Exact or ID / Code match
  let found = db.classes.find(c =>
    c.id.toLowerCase() === cleanQ.toLowerCase() ||
    c.code.toLowerCase() === cleanQ.toLowerCase() ||
    c.name.toLowerCase() === cleanQ.toLowerCase() ||
    (c.shortName && c.shortName.toLowerCase() === cleanQ.toLowerCase())
  );
  if (found) return found;

  // 2. Normalized search
  found = db.classes.find(c =>
    normalizeStr(c.name) === normQ ||
    normalizeStr(c.code) === normQ ||
    (c.shortName && normalizeStr(c.shortName) === normQ) ||
    normalizeStr(getClassShortName(c, db)) === normQ
  );
  if (found) return found;

  // 3. Partial / Substring match (e.g. "CĐĐD 26A" matching "ĐD 26A" or "CDDD26A")
  found = db.classes.find(c => {
    const cNormName = normalizeStr(c.name);
    const cNormCode = normalizeStr(c.code);
    const cNormShort = normalizeStr(c.shortName || '');
    return normQ.includes(cNormName) ||
           cNormName.includes(normQ) ||
           normQ.includes(cNormCode) ||
           (cNormShort && normQ.includes(cNormShort));
  });

  return found;
}

/**
 * Common medical subjects alias dictionary to resolve abbreviations
 */
const SUBJECT_ALIASES: Record<string, string[]> = {
  'noi': ['bệnh học nội khoa', 'nội khoa', 'nội', 'benh hoc noi khoa & lam sang', 'benh hoc noi khoa'],
  'ngoai': ['bệnh học ngoại khoa', 'ngoại khoa', 'ngoại', 'benh hoc ngoai khoa & phau thuat', 'benh hoc ngoai khoa'],
  'san': ['sản phụ khoa', 'sản khoa', 'sản', 'phụ sản', 'cham soc suc khoe phu nu'],
  'nhi': ['bệnh học nhi khoa', 'nhi khoa', 'nhi', 'cham soc suc khoe tre em'],
  'duocly': ['dược lý học', 'dược lý', 'duoc ly'],
  'ddcs': ['điều dưỡng cơ sở', 'điều dưỡng cơ sở 1', 'điều dưỡng cơ sở 2', 'đdcs', 'dieu duong co so'],
  'giaiphau': ['giải phẫu - sinh lý', 'giải phẫu', 'sinh lý', 'giai phau - sinh ly', 'giai phau'],
  'baoche': ['bào chế và sản xuất thuốc', 'bào chế', 'bao che'],
  'xetnghiem': ['huyết học & sinh hóa lâm sàng', 'huyết học', 'sinh hóa', 'xét nghiệm', 'huyet hoc & sinh hoa lam sang'],
  'duoclieu': ['dược liệu - cổ truyền', 'dược liệu', 'duoc lieu'],
  'visinh': ['vi sinh - ký sinh trùng', 'vi sinh', 'ký sinh trùng', 'kst', 'vi sinh - ky sinh trung'],
  'yhct': ['y học cổ truyền', 'phục hồi chức năng', 'yhct - phcn', 'yhct', 'phcn', 'cham cuu'],
  'tinhoc': ['tin học ứng dụng', 'tin học', 'tin hoc'],
  'tienganh': ['tiếng anh chuyên ngành', 'ngoại ngữ', 'tiếng anh', 'tieng anh'],
};

/**
 * Enhanced Subject lookup in Database with intelligent abbreviation and alias resolution
 */
export function findSubjectInDb(
  query: string,
  db: AppDatabase,
  classContext?: StudentClass
): Subject | undefined {
  if (!query) return undefined;
  let cleanQ = query.trim()
    .replace(/^môn:\s*/i, '')
    .replace(/^mon:\s*/i, '')
    .replace(/^học phần:\s*/i, '')
    .trim();
  
  // Strip LS / TT / TH prefixes if left over
  cleanQ = cleanQ.replace(/^(?:ls|tt|th)\s*[-:]?\s*/i, '').trim();
  // Strip group suffixes like "1/2", "Tổ 1", "(Tổ 1)", "2/2", "(Tổ 2)"
  cleanQ = cleanQ.replace(/\s*(?:\(Tổ\s*\d+\)|Tổ\s*\d+|\d+\/\d+|\(\d+\/\d+\))\s*$/i, '').trim();

  const normQ = normalizeStr(cleanQ);
  if (!normQ) return undefined;

  // 1. Exact ID, code, name, or shortName match
  let found = db.subjects.find(s =>
    s.id.toLowerCase() === cleanQ.toLowerCase() ||
    s.code.toLowerCase() === cleanQ.toLowerCase() ||
    s.name.toLowerCase() === cleanQ.toLowerCase() ||
    (s.shortName && s.shortName.toLowerCase() === cleanQ.toLowerCase())
  );
  if (found) return found;

  // 2. Normalized direct search
  found = db.subjects.find(s =>
    normalizeStr(s.name) === normQ ||
    normalizeStr(s.code) === normQ ||
    (s.shortName && normalizeStr(s.shortName) === normQ) ||
    normalizeStr(generateSubjectShortName(s.name)) === normQ
  );
  if (found) return found;

  // 3. Class context search (prioritize subjects assigned to this class or cohort)
  if (classContext) {
    const classAssignments = db.assignments.filter(a => a.classId === classContext.id);
    if (classAssignments.length > 0) {
      const assignedSubjectIds = new Set(classAssignments.map(a => a.subjectId));
      const candidate = db.subjects.filter(s => assignedSubjectIds.has(s.id));
      const matched = candidate.find(s => {
        const sNorm = normalizeStr(s.name);
        const sShortNorm = normalizeStr(s.shortName || generateSubjectShortName(s.name));
        return sNorm === normQ || sShortNorm === normQ || sNorm.includes(normQ) || normQ.includes(sShortNorm);
      });
      if (matched) return matched;
    }
  }

  // 4. Check abbreviation aliases (e.g. "noi" -> "Bệnh học Nội khoa")
  for (const [aliasKey, patterns] of Object.entries(SUBJECT_ALIASES)) {
    if (normQ === aliasKey || patterns.some(p => normalizeStr(p) === normQ)) {
      found = db.subjects.find(s => {
        const sNorm = normalizeStr(s.name);
        const sShort = normalizeStr(s.shortName || '');
        return sNorm.includes(aliasKey) || sShort.includes(aliasKey) || patterns.some(p => sNorm.includes(normalizeStr(p)));
      });
      if (found) return found;
    }
  }

  // 5. Word overlap / Token search
  found = db.subjects.find(s => {
    const sNorm = normalizeStr(s.name);
    const sShort = normalizeStr(s.shortName || generateSubjectShortName(s.name));
    return sNorm.includes(normQ) || normQ.includes(sShort) || (sShort.length >= 3 && sShort.includes(normQ));
  });

  return found;
}

/**
 * Enhanced Teacher lookup in Database with comprehensive academic title stripping
 */
export function findTeacherInDb(query: string, db: AppDatabase): Teacher | undefined {
  if (!query) return undefined;
  const cleanQ = query.trim();
  const strippedName = stripTeacherTitles(cleanQ);
  const normQ = normalizeStr(cleanQ);
  const normStripped = normalizeStr(strippedName);

  if (!normStripped && !normQ) return undefined;

  // 1. Exact ID, code, or name match
  let found = db.teachers.find(t =>
    t.id.toLowerCase() === cleanQ.toLowerCase() ||
    t.code.toLowerCase() === cleanQ.toLowerCase() ||
    t.name.toLowerCase() === cleanQ.toLowerCase()
  );
  if (found) return found;

  // 2. Stripped title match
  found = db.teachers.find(t => {
    const tStripped = stripTeacherTitles(t.name);
    return normalizeStr(tStripped) === normStripped ||
           normalizeStr(t.name) === normQ ||
           normalizeStr(t.name) === normStripped;
  });
  if (found) return found;

  // 3. Substring match (e.g. "Nguyễn Văn Hùng" within "ThS.BS. Nguyễn Văn Hùng")
  found = db.teachers.find(t => {
    const tStrippedNorm = normalizeStr(stripTeacherTitles(t.name));
    if (tStrippedNorm.length < 3) return false;
    return normStripped.includes(tStrippedNorm) || tStrippedNorm.includes(normStripped);
  });

  return found;
}

/**
 * Parse a cell's text content from a timetable grid cell into PeriodDetail
 */
export function parseTimetableCellText(
  cellText: string,
  db: AppDatabase,
  classContext?: StudentClass
): PeriodDetail | null {
  if (!cellText || !cellText.trim()) return null;
  const clean = cellText.trim();
  const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let periodType: 'LT' | 'TH' | 'LS' = 'LT';
  let practiceType: PracticeClassType = 'full';
  let periodsCount = 4;
  let roomOrHospital = '';
  let teacherIds: string[] = [];
  let lessonTitle = '';
  let subjectNameRaw = lines[0];

  // 1. Detect LS / TT / TH from first line
  if (subjectNameRaw.startsWith('LS ') || subjectNameRaw.startsWith('LS-') || subjectNameRaw.startsWith('LS:')) {
    periodType = 'LS';
    subjectNameRaw = subjectNameRaw.replace(/^LS[-:\s]+/i, '').trim();
  } else if (
    subjectNameRaw.startsWith('TT ') || subjectNameRaw.startsWith('TH ') ||
    subjectNameRaw.startsWith('TT-') || subjectNameRaw.startsWith('TH-') ||
    subjectNameRaw.startsWith('TT:') || subjectNameRaw.startsWith('TH:')
  ) {
    periodType = 'TH';
    subjectNameRaw = subjectNameRaw.replace(/^(?:TT|TH)[-:\s]+/i, '').trim();
    
    // Detect practice group: 1/2 or Tổ 1 -> group1, 2/2 or Tổ 2 -> group2
    if (subjectNameRaw.includes('1/2') || subjectNameRaw.includes('Tổ 1') || subjectNameRaw.includes('to 1') || subjectNameRaw.includes('To 1')) {
      practiceType = 'group1';
      subjectNameRaw = subjectNameRaw.replace(/\s*(?:\(Tổ\s*1\)|Tổ\s*1|to\s*1|1\/2|\(1\/2\))/gi, '').trim();
    } else if (subjectNameRaw.includes('2/2') || subjectNameRaw.includes('Tổ 2') || subjectNameRaw.includes('to 2') || subjectNameRaw.includes('To 2')) {
      practiceType = 'group2';
      subjectNameRaw = subjectNameRaw.replace(/\s*(?:\(Tổ\s*2\)|Tổ\s*2|to\s*2|2\/2|\(2\/2\))/gi, '').trim();
    }
  }

  // 2. Scan remaining lines for details (Lesson Title, Teachers, Room, Periods count)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Lesson Title (marked with bullet • or -)
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      lessonTitle = line.replace(/^[•\-\*]\s*/, '').trim();
      continue;
    }

    // Teacher line: "GV: ...", "Giảng viên: ...", "Cán bộ giảng dạy: ..."
    if (line.toLowerCase().startsWith('gv:') || line.toLowerCase().startsWith('gv') || line.toLowerCase().startsWith('giảng viên:')) {
      const tStr = line.replace(/^(?:gv:|gv|giảng viên:|cbgd:)\s*/i, '').trim();
      const rawNames = tStr.split(/[,;\+&]/).map(n => n.trim()).filter(Boolean);
      for (const rName of rawNames) {
        const foundTeacher = findTeacherInDb(rName, db);
        if (foundTeacher && !teacherIds.includes(foundTeacher.id)) {
          teacherIds.push(foundTeacher.id);
        }
      }
      continue;
    }

    // Check [X tiết] count
    const countMatch = line.match(/\[?(\d+)\s*tiết\]?/i);
    if (countMatch) {
      periodsCount = parseInt(countMatch[1], 10) || 4;
    }

    // Check Room / Lecture Hall inside parentheses e.g. "(101)", "(Phòng TM)", "(B6P1)"
    const roomMatch = line.match(/\(([^)]+)\)/);
    if (roomMatch) {
      roomOrHospital = cleanLectureHallCode(roomMatch[1]);
    } else if (line.match(/^(?:gđ|p\.|phòng|b\d|bv|bệnh viện|k\d)/i)) {
      roomOrHospital = cleanLectureHallCode(line);
    }
  }

  // 3. Match Subject from Database
  const matchedSubject = findSubjectInDb(subjectNameRaw, db, classContext);
  const subjectId = matchedSubject ? matchedSubject.id : (db.subjects[0]?.id || 'sub_default');

  return {
    subjectId,
    periodType,
    practiceType,
    periodsCount,
    teacherIds,
    roomOrHospital,
    lessonTitle,
    notes: '',
  };
}

/**
 * Check if cell (r, c) falls inside a merged range in SheetJS worksheet
 */
function findMergeRange(merges: XLSX.Range[] | undefined, r: number, c: number): XLSX.Range | undefined {
  if (!merges || merges.length === 0) return undefined;
  return merges.find(m => r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c);
}

/**
 * Parse an Excel File (ArrayBuffer) into standard SessionSchedule objects with complete merge awareness.
 * Supports both Official Grid Timetable Sheets (CĐ3, CĐ2, CĐ1...) and Tabular List Sheets.
 */
export function parseScheduleExcel(
  data: ArrayBuffer,
  db: AppDatabase,
  defaultWeek: number = 1
): { sessions: SessionSchedule[]; parseErrors: string[]; detectedSheets: string[] } {
  const parseErrors: string[] = [];
  const detectedSheets: string[] = [];
  const sessionAccumulator = new Map<string, SessionSchedule>();

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, { type: 'array' });
  } catch (err: any) {
    return {
      sessions: [],
      parseErrors: [`Không thể đọc tệp Excel: ${err.message || 'Tệp bị lỗi hoặc không đúng định dạng.'}`],
      detectedSheets: [],
    };
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return {
      sessions: [],
      parseErrors: ['Tệp Excel không có trang tính (sheet) nào.'],
      detectedSheets: [],
    };
  }

  detectedSheets.push(...workbook.SheetNames);

  for (const sheetName of workbook.SheetNames) {
    const lowerSheet = sheetName.toLowerCase().trim();
    // Skip reference or auxiliary sheets
    if (
      lowerSheet.includes('danh_muc') ||
      lowerSheet.includes('giảng đường') ||
      lowerSheet.includes('lich_giang_duong') ||
      lowerSheet.includes('phong_thuc_hanh') ||
      lowerSheet.includes('thong_ke')
    ) {
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rawGrid: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rawGrid.length === 0) continue;

    const merges: XLSX.Range[] | undefined = sheet['!merges'];

    // 1. Detect Week Number from sheet header (Rows 0-6) or sheet name
    let sheetWeek = defaultWeek;
    const sheetNameWeekMatch = sheetName.match(/(?:tuần|w|week)\s*(\d+)/i);
    if (sheetNameWeekMatch) {
      const w = parseInt(sheetNameWeekMatch[1], 10);
      if (w >= 1 && w <= 60) sheetWeek = w;
    } else {
      for (let r = 0; r < Math.min(8, rawGrid.length); r++) {
        const rowStr = (rawGrid[r] || []).join(' ');
        const weekMatch = rowStr.match(/(?:tuần|w|week)\s*(\d+)/i);
        if (weekMatch) {
          const w = parseInt(weekMatch[1], 10);
          if (w >= 1 && w <= 60) {
            sheetWeek = w;
            break;
          }
        }
      }
    }

    // 2. Determine if sheet is Tabular List or Grid Timetable
    let isTabular = false;
    let headerRowIdx = -1;

    for (let r = 0; r < Math.min(12, rawGrid.length); r++) {
      const rowText = (rawGrid[r] || []).map(c => String(c).toLowerCase()).join(' ');
      if (
        (rowText.includes('lớp') || rowText.includes('malop') || rowText.includes('class')) &&
        (rowText.includes('môn') || rowText.includes('mamon') || rowText.includes('subject')) &&
        (rowText.includes('thứ') || rowText.includes('day') || rowText.includes('buổi') || rowText.includes('session'))
      ) {
        isTabular = true;
        headerRowIdx = r;
        break;
      }
    }

    if (isTabular && headerRowIdx >= 0) {
      // TABULAR SHEET PARSER
      const headers = (rawGrid[headerRowIdx] || []).map(c => String(c).trim());
      for (let r = headerRowIdx + 1; r < rawGrid.length; r++) {
        const row = rawGrid[r] || [];
        if (row.length === 0 || row.every((c: any) => !c || String(c).trim() === '')) continue;

        const rowObj: Record<string, string> = {};
        headers.forEach((h, colIdx) => {
          rowObj[h] = String(row[colIdx] || '').trim();
        });

        let weekNum = sheetWeek;
        let dayOfWeek = 2;
        let session: 'morning' | 'afternoon' = 'morning';
        let targetClass: StudentClass | undefined;
        let targetSubject: Subject | undefined;
        let teacherNames: string[] = [];
        let room = '';
        let periodsCount = 4;
        let periodType: 'LT' | 'TH' | 'LS' = 'LT';
        let practiceType: PracticeClassType = 'full';
        let lessonTitle = '';

        for (const [colHeader, val] of Object.entries(rowObj)) {
          if (!val) continue;
          const hLower = colHeader.toLowerCase();

          // Week
          if (hLower.includes('tuần') || hLower.includes('week')) {
            const wMatch = val.match(/(\d+)/);
            if (wMatch) weekNum = parseInt(wMatch[1], 10) || sheetWeek;
          }

          // Day
          if (hLower.includes('thứ') || hLower.includes('ngày') || hLower.includes('day')) {
            const dMatch = val.match(/(?:thứ|t)?\s*([2-7]|cn|chủ nhật)/i);
            if (dMatch) {
              const dStr = dMatch[1].toLowerCase();
              if (dStr === 'cn' || dStr === 'chủ nhật') dayOfWeek = 8;
              else dayOfWeek = parseInt(dStr, 10) || 2;
            }
          }

          // Session
          if (hLower.includes('buổi') || hLower.includes('ca') || hLower.includes('session')) {
            if (val.toLowerCase().includes('chiều') || val.toLowerCase() === 'c' || val.toLowerCase() === 'pm') {
              session = 'afternoon';
            } else {
              session = 'morning';
            }
          }

          // Class
          if (hLower.includes('lớp') || hLower.includes('class')) {
            targetClass = findClassInDb(val, db);
          }

          // Subject
          if (hLower.includes('môn') || hLower.includes('subject') || hLower.includes('học phần')) {
            targetSubject = findSubjectInDb(val, db);
          }

          // Teacher
          if (hLower.includes('giáo viên') || hLower.includes('giảng viên') || hLower.includes('gv') || hLower.includes('teacher')) {
            const gvNames = val.split(/[,;\+]/).map(t => t.trim()).filter(Boolean);
            for (const gvName of gvNames) {
              const t = findTeacherInDb(gvName, db);
              if (t && !teacherNames.includes(t.id)) teacherNames.push(t.id);
            }
          }

          // Room
          if (hLower.includes('phòng') || hLower.includes('giảng đường') || hLower.includes('room') || hLower.includes('địa điểm')) {
            room = cleanLectureHallCode(val);
          }

          // Period count
          if (hLower.includes('số tiết') || hLower.includes('tiết') || hLower.includes('periods')) {
            const p = parseInt(val, 10);
            if (p >= 1 && p <= 4) periodsCount = p;
          }

          // Type
          if (hLower.includes('loại') || hLower.includes('hình thức') || hLower.includes('type')) {
            if (val.toUpperCase().includes('TH') || val.toLowerCase().includes('thực hành')) periodType = 'TH';
            else if (val.toUpperCase().includes('LS') || val.toLowerCase().includes('lâm sàng')) periodType = 'LS';
            else periodType = 'LT';
          }

          // Practice group
          if (hLower.includes('tổ') || hLower.includes('nhóm')) {
            if (val.includes('1') || val.includes('1/2')) practiceType = 'group1';
            else if (val.includes('2') || val.includes('2/2')) practiceType = 'group2';
          }

          // Lesson title
          if (hLower.includes('bài') || hLower.includes('tên bài') || hLower.includes('nội dung')) {
            lessonTitle = val;
          }
        }

        if (!targetClass) {
          parseErrors.push(`Trang [${sheetName}], Dòng ${r + 1}: Không nhận diện được Lớp học ("${Object.values(rowObj).join(', ')}")`);
          continue;
        }

        if (!targetSubject) {
          targetSubject = db.subjects[0];
        }

        const key = `${weekNum}_${targetClass.id}_${dayOfWeek}_${session}`;
        const pDetail: PeriodDetail = {
          subjectId: targetSubject ? targetSubject.id : 'sub_default',
          periodType,
          practiceType,
          periodsCount,
          teacherIds: teacherNames,
          roomOrHospital: room,
          lessonTitle,
          notes: '',
        };

        if (sessionAccumulator.has(key)) {
          sessionAccumulator.get(key)!.periods.push(pDetail);
        } else {
          sessionAccumulator.set(key, {
            id: `excel_${weekNum}_${targetClass.id}_${dayOfWeek}_${session}_${Math.random().toString(36).substring(2, 6)}`,
            weekNumber: weekNum,
            academicYear: '2026-2027',
            classId: targetClass.id,
            dayOfWeek,
            session,
            periods: [pDetail],
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } else {
      // GRID TIMETABLE SHEET PARSER (e.g. CĐ3, CĐ2, CĐ1 format)
      // Find row with "THỨ" in Col A and "BUỔI" in Col B and Class names in Col C+
      let gridHeaderRow = -1;
      for (let r = 0; r < Math.min(15, rawGrid.length); r++) {
        const row = rawGrid[r] || [];
        const col0 = String(row[0] || '').toLowerCase().trim();
        const col1 = String(row[1] || '').toLowerCase().trim();
        if (
          (col0.includes('thứ') || col0.includes('thu') || col0.includes('ngày')) &&
          (col1.includes('buổi') || col1.includes('buoi') || col1.includes('ca'))
        ) {
          gridHeaderRow = r;
          break;
        }
      }

      if (gridHeaderRow === -1) {
        // Fallback: look for row where 2+ columns match classes in database
        for (let r = 0; r < Math.min(15, rawGrid.length); r++) {
          const row = rawGrid[r] || [];
          let classCount = 0;
          for (let c = 2; c < row.length; c++) {
            if (findClassInDb(String(row[c] || ''), db)) classCount++;
          }
          if (classCount >= 1) {
            gridHeaderRow = r;
            break;
          }
        }
      }

      if (gridHeaderRow >= 0) {
        const headerRow = rawGrid[gridHeaderRow] || [];
        const colToClass = new Map<number, StudentClass>();
        for (let c = 2; c < headerRow.length; c++) {
          const cellVal = String(headerRow[c] || '').trim();
          if (!cellVal) continue;
          const cls = findClassInDb(cellVal, db);
          if (cls) {
            colToClass.set(c, cls);
          }
        }

        if (colToClass.size === 0) {
          parseErrors.push(`Trang [${sheetName}]: Không tìm thấy cột lớp nào tương ứng trong hệ thống.`);
          continue;
        }

        // Process rows below gridHeaderRow
        let currentDay = 2;
        let currentSession: 'morning' | 'afternoon' = 'morning';

        // Track processed cell merge ranges to avoid duplicate period creation for merged sub-rows
        const processedCellMerges = new Set<string>();

        for (let r = gridHeaderRow + 1; r < rawGrid.length; r++) {
          const row = rawGrid[r] || [];
          if (row.length === 0) continue;

          // Resolve Col 0 (THỨ) - respect merged range if top cell had the value
          let col0Text = String(row[0] || '').trim();
          if (!col0Text && merges) {
            const m0 = findMergeRange(merges, r, 0);
            if (m0) {
              col0Text = String(rawGrid[m0.s.r]?.[m0.s.c] || '').trim();
            }
          }

          // Check if table reached signature block at bottom
          if (
            col0Text.toLowerCase().includes('người lập') ||
            col0Text.toLowerCase().includes('trưởng phòng') ||
            col0Text.toLowerCase().includes('ban giám hiệu') ||
            col0Text.toLowerCase().includes('thanh hóa, ngày')
          ) {
            break;
          }

          if (col0Text) {
            const dayMatch = col0Text.match(/(?:thứ|t)\s*([2-7]|cn|chủ nhật)/i) || col0Text.match(/^([2-7])$/);
            if (dayMatch) {
              const dStr = dayMatch[1].toLowerCase();
              if (dStr === 'cn' || dStr === 'chủ nhật') currentDay = 8;
              else currentDay = parseInt(dStr, 10) || 2;
            }
          }

          // Resolve Col 1 (BUỔI) - respect merged range
          let col1Text = String(row[1] || '').trim();
          if (!col1Text && merges) {
            const m1 = findMergeRange(merges, r, 1);
            if (m1) {
              col1Text = String(rawGrid[m1.s.r]?.[m1.s.c] || '').trim();
            }
          }

          if (col1Text) {
            if (col1Text.toLowerCase().includes('chiều') || col1Text.toLowerCase() === 'c' || col1Text.toLowerCase() === 'pm') {
              currentSession = 'afternoon';
            } else if (col1Text.toLowerCase().includes('sáng') || col1Text.toLowerCase() === 's' || col1Text.toLowerCase() === 'am') {
              currentSession = 'morning';
            }
          }

          // For each class column in the grid
          colToClass.forEach((cls, colIdx) => {
            // Check if cell is part of a horizontal or vertical merge
            const cellMerge = findMergeRange(merges, r, colIdx);
            let cellVal = '';
            let isCombinedHorizontal = false;
            let combinedClasses: StudentClass[] = [cls];

            if (cellMerge) {
              const mergeKey = `${cellMerge.s.r}_${cellMerge.s.c}_${cellMerge.e.r}_${cellMerge.e.c}`;
              
              // If we already processed this exact multi-row merge for this class, don't duplicate
              if (processedCellMerges.has(`${mergeKey}_cls_${cls.id}`)) {
                return;
              }
              processedCellMerges.add(`${mergeKey}_cls_${cls.id}`);

              // Retrieve text from master cell of merge
              cellVal = String(rawGrid[cellMerge.s.r]?.[cellMerge.s.c] || '').trim();

              // Check if merge spans across multiple class columns (COMBINED CLASSES!)
              if (cellMerge.e.c > cellMerge.s.c) {
                isCombinedHorizontal = true;
                const classesInMerge: StudentClass[] = [];
                for (let c = cellMerge.s.c; c <= cellMerge.e.c; c++) {
                  const targetCls = colToClass.get(c);
                  if (targetCls && !classesInMerge.some(k => k.id === targetCls.id)) {
                    classesInMerge.push(targetCls);
                  }
                }
                if (classesInMerge.length > 1) {
                  combinedClasses = classesInMerge;
                }
              }
            } else {
              cellVal = String(row[colIdx] || '').trim();
            }

            if (!cellVal) return;

            const pDetail = parseTimetableCellText(cellVal, db, cls);
            if (!pDetail) return;

            const combinedClassIds = isCombinedHorizontal && combinedClasses.length > 1
              ? combinedClasses.map(c => c.id).sort()
              : undefined;
            const combinedGroupId = combinedClassIds
              ? `comb_${combinedClassIds.join('_')}`
              : undefined;

            // Apply parsed session to all classes in the combined group
            combinedClasses.forEach(targetClass => {
              const key = `${sheetWeek}_${targetClass.id}_${currentDay}_${currentSession}`;
              if (sessionAccumulator.has(key)) {
                const existing = sessionAccumulator.get(key)!;
                // Add period if not duplicate
                const alreadyHas = existing.periods.some(
                  p => p.subjectId === pDetail.subjectId &&
                       p.periodType === pDetail.periodType &&
                       p.practiceType === pDetail.practiceType &&
                       p.lessonTitle === pDetail.lessonTitle
                );
                if (!alreadyHas) {
                  existing.periods.push(pDetail);
                }
                if (combinedGroupId) {
                  existing.combinedGroupId = combinedGroupId;
                  existing.combinedClassIds = combinedClassIds;
                }
              } else {
                sessionAccumulator.set(key, {
                  id: `grid_${sheetWeek}_${targetClass.id}_${currentDay}_${currentSession}_${Math.random().toString(36).substring(2, 6)}`,
                  weekNumber: sheetWeek,
                  academicYear: '2026-2027',
                  classId: targetClass.id,
                  dayOfWeek: currentDay,
                  session: currentSession,
                  periods: [pDetail],
                  combinedGroupId,
                  combinedClassIds,
                  updatedAt: new Date().toISOString(),
                });
              }
            });
          });
        }
      }
    }
  }

  const sessions = Array.from(sessionAccumulator.values());
  return { sessions, parseErrors, detectedSheets };
}

/**
 * Download a standard Schedule Diff Excel Template with reference data sheets
 */
export function downloadScheduleDiffTemplate(db: AppDatabase, currentWeek: number = 1): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Tabular Template for Schedule Diffing
  const wsData = [
    ['Tuần (*)', 'Thứ (2-7, CN) (*)', 'Buổi (Sáng/Chiều) (*)', 'Mã/Tên Lớp (*)', 'Tên/Mã Môn Học (*)', 'Họ Tên/Mã Giảng Viên', 'Giảng Đường/Phòng TH', 'Số Tiết (1-4)', 'Hình Thức (LT/TH/LS)', 'Tổ Thực Hành (Tổ 1/Tổ 2)', 'Tên Bài Học'],
    [`Tuần ${currentWeek}`, 'Thứ 2', 'Sáng', db.classes[0]?.name || 'CĐĐD 26A', db.subjects[0]?.name || 'Bệnh học Nội khoa & Lâm sàng', db.teachers[0]?.name || 'ThS.BS. Nguyễn Văn Hùng', '101', 4, 'LT', '', 'Bài 1: Tổng quan bệnh học'],
    [`Tuần ${currentWeek}`, 'Thứ 3', 'Chiều', db.classes[0]?.name || 'CĐĐD 26A', db.subjects[1]?.name || 'Dược lý học', db.teachers[1]?.name || 'DSCK1. Lê Thị Mai', '', 4, 'TH', 'Tổ 1', 'Bài thực hành số 1'],
    [`Tuần ${currentWeek}`, 'Thứ 4', 'Sáng', db.classes[1]?.name || 'CĐĐD 26B', db.subjects[0]?.name || 'Bệnh học Nội khoa & Lâm sàng', db.teachers[0]?.name || 'ThS.BS. Nguyễn Văn Hùng', '102', 4, 'LT', '', 'Bài 1: Tổng quan bệnh học'],
    [`Tuần ${currentWeek}`, 'Thứ 5', 'Sáng', db.classes[1]?.name || 'CĐĐD 26B', db.subjects[2]?.name || 'Điều dưỡng cơ sở', db.teachers[2]?.name || 'ThS.ĐD. Trần Quốc Toản', '101', 4, 'LT', '', 'Bài 2: Kỹ thuật vô khuẩn'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 20 },
    { wch: 30 },
    { wch: 28 },
    { wch: 22 },
    { wch: 14 },
    { wch: 20 },
    { wch: 22 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_TKB_Doi_Chieu');

  // Reference sheets
  const refClasses = [
    ['Mã Lớp', 'Tên Lớp', 'Tên Viết Tắt', 'Khối', 'Sĩ số'],
    ...db.classes.map(c => [c.code, c.name, c.shortName || '', c.cohortId, c.studentCount || 35]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(refClasses), 'Danh_Muc_Lop');

  const refSubjects = [
    ['Mã Môn', 'Tên Môn Học', 'Tên Viết Tắt', 'LT', 'TH', 'LS'],
    ...db.subjects.map(s => [s.code, s.name, s.shortName || '', s.theoryPeriods, s.practicePeriods, s.clinicalPeriods]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(refSubjects), 'Danh_Muc_Mon_Hoc');

  const refTeachers = [
    ['Mã GV', 'Họ và Tên', 'Khoa / Bộ Môn', 'Chuyên môn'],
    ...db.teachers.map(t => [t.code, t.name, t.faculty, t.specialty || '']),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(refTeachers), 'Danh_Muc_Giang_Vien');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Mau_Excel_Doi_Chieu_TKB_Tuan_${currentWeek}.xlsx`);
}

/**
 * Parse uploaded text or CSV into standard SessionSchedule objects
 */
export function parseScheduleTextOrCSV(
  rawText: string,
  db: AppDatabase,
  defaultWeek: number = 1
): { sessions: SessionSchedule[]; parseErrors: string[] } {
  const parseErrors: string[] = [];
  const sessions: SessionSchedule[] = [];
  const text = rawText.trim();

  if (!text) {
    return { sessions: [], parseErrors: ['Nội dung tệp trống. Vui lòng cung cấp dữ liệu.'] };
  }

  // 1. JSON parser
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.classId && item.dayOfWeek && item.session && Array.isArray(item.periods)) {
            sessions.push({
              id: item.id || `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              weekNumber: item.weekNumber || defaultWeek,
              academicYear: item.academicYear || '2026-2027',
              classId: item.classId,
              dayOfWeek: Number(item.dayOfWeek),
              session: item.session,
              periods: item.periods,
              combinedGroupId: item.combinedGroupId,
              combinedClassIds: item.combinedClassIds,
              updatedAt: new Date().toISOString(),
            });
          }
        }
        if (sessions.length > 0) {
          return { sessions, parseErrors: [] };
        }
      } else if (parsed.schedules && Array.isArray(parsed.schedules)) {
        return { sessions: parsed.schedules, parseErrors: [] };
      } else if (parsed.records || parsed.syncPayload) {
        const payload = parsed.syncPayload || [...(parsed.records?.added || []), ...(parsed.records?.modified || [])];
        if (Array.isArray(payload) && payload.length > 0) {
          return { sessions: payload, parseErrors: [] };
        }
      }
    } catch {
      // Continue to CSV / text parser
    }
  }

  // 2. CSV / TSV parser
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) {
    return { sessions: [], parseErrors: ['Không có dòng dữ liệu hợp lệ nào.'] };
  }

  let startIndex = 0;
  const firstLine = lines[0].toLowerCase();
  if (
    firstLine.includes('tuần') || firstLine.includes('thứ') ||
    firstLine.includes('lớp') || firstLine.includes('môn') ||
    firstLine.includes('week') || firstLine.includes('class')
  ) {
    startIndex = 1;
  }

  const sessionAccumulator = new Map<string, SessionSchedule>();

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    let cols: string[] = [];
    if (rawLine.includes('\t')) {
      cols = rawLine.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
    } else if (rawLine.includes(';')) {
      cols = rawLine.split(';').map(c => c.trim().replace(/^["']|["']$/g, ''));
    } else if (rawLine.includes(',')) {
      cols = rawLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^["']|["']$/g, ''));
    } else {
      cols = rawLine.split(/\s{2,}/).map(c => c.trim());
    }

    if (cols.length < 3) continue;

    let weekNum = defaultWeek;
    let dayOfWeek = 2;
    let session: 'morning' | 'afternoon' = 'morning';
    let targetClass: StudentClass | undefined;
    let targetSubject: Subject | undefined;
    let teacherNames: string[] = [];
    let room = '';
    let periodsCount = 4;
    let periodType: 'LT' | 'TH' | 'LS' = 'LT';
    let practiceType: PracticeClassType = 'full';
    let lessonTitle = '';

    for (let c = 0; c < cols.length; c++) {
      const val = cols[c];
      if (!val) continue;

      const weekMatch = val.match(/(?:tuần|w|week)\s*(\d+)/i) || (c === 0 && val.match(/^(\d{1,2})$/));
      if (weekMatch && !val.toLowerCase().includes('thứ') && !val.toLowerCase().includes('t')) {
        const w = parseInt(weekMatch[1], 10);
        if (w >= 1 && w <= 60) weekNum = w;
      }

      const dayMatch = val.match(/(?:thứ|t)\s*([2-7]|cn|chủ nhật)/i) || val.match(/^([2-7])$/);
      if (dayMatch) {
        const dStr = dayMatch[1].toLowerCase();
        if (dStr === 'cn' || dStr === 'chủ nhật') dayOfWeek = 8;
        else dayOfWeek = parseInt(dStr, 10);
      }

      if (val.toLowerCase().includes('chiều') || val.toLowerCase() === 'c' || val.toLowerCase() === 'pm' || val.toLowerCase() === 'afternoon') {
        session = 'afternoon';
      } else if (val.toLowerCase().includes('sáng') || val.toLowerCase() === 's' || val.toLowerCase() === 'am' || val.toLowerCase() === 'morning') {
        session = 'morning';
      }

      if (!targetClass) {
        const matchedClass = findClassInDb(val, db);
        if (matchedClass) {
          targetClass = matchedClass;
          continue;
        }
      }

      if (!targetSubject) {
        const matchedSub = findSubjectInDb(val, db);
        if (matchedSub) {
          targetSubject = matchedSub;
          continue;
        }
      }

      const matchedTeacher = findTeacherInDb(val, db);
      if (matchedTeacher && !teacherNames.includes(matchedTeacher.id)) {
        teacherNames.push(matchedTeacher.id);
        continue;
      }

      if (val.match(/^(?:gđ|p\.|phòng|k|b)?\s*(\d{3}|[a-z]\d+)/i) || val.toLowerCase().includes('bệnh viện') || val.toLowerCase().includes('bv')) {
        room = cleanLectureHallCode(val);
        continue;
      }

      const periodMatch = val.match(/^(\d)\s*(?:tiết|t)?$/i);
      if (periodMatch) {
        const p = parseInt(periodMatch[1], 10);
        if (p >= 1 && p <= 4) periodsCount = p;
      }

      if (val.toUpperCase() === 'LT' || val.toLowerCase().includes('lý thuyết')) periodType = 'LT';
      else if (val.toUpperCase() === 'TH' || val.toLowerCase().includes('thực hành')) periodType = 'TH';
      else if (val.toUpperCase() === 'LS' || val.toLowerCase().includes('lâm sàng')) periodType = 'LS';

      if (val.includes('Tổ 1') || val.includes('1/2')) practiceType = 'group1';
      else if (val.includes('Tổ 2') || val.includes('2/2')) practiceType = 'group2';
    }

    if (!targetClass) {
      parseErrors.push(`Dòng ${i + 1}: Không nhận diện được Lớp học ("${cols.join(' | ')}")`);
      continue;
    }

    if (!targetSubject) {
      targetSubject = db.subjects[0];
    }

    const key = `${weekNum}_${targetClass.id}_${dayOfWeek}_${session}`;
    const periodDetail: PeriodDetail = {
      subjectId: targetSubject ? targetSubject.id : 'sub_default',
      periodType,
      practiceType,
      periodsCount,
      teacherIds: teacherNames,
      roomOrHospital: room,
      lessonTitle,
      notes: '',
    };

    if (sessionAccumulator.has(key)) {
      sessionAccumulator.get(key)!.periods.push(periodDetail);
    } else {
      sessionAccumulator.set(key, {
        id: `parsed_${weekNum}_${targetClass.id}_${dayOfWeek}_${session}_${Math.random().toString(36).substring(2, 6)}`,
        weekNumber: weekNum,
        academicYear: '2026-2027',
        classId: targetClass.id,
        dayOfWeek,
        session,
        periods: [periodDetail],
        updatedAt: new Date().toISOString(),
      });
    }
  }

  sessions.push(...Array.from(sessionAccumulator.values()));
  return { sessions, parseErrors };
}

/**
 * Semantic comparison helper to check if two PeriodDetail objects are equivalent
 */
function comparePeriodDetails(
  pOld: PeriodDetail,
  pNew: PeriodDetail,
  subjectMap: Map<string, Subject>,
  teacherMap: Map<string, Teacher>
): { isMatch: boolean; diffMessages: string[]; mergedPeriod: PeriodDetail } {
  const diffs: string[] = [];
  
  const subOld = subjectMap.get(pOld.subjectId);
  const subNew = subjectMap.get(pNew.subjectId);

  // 1. Compare Subject (either same ID or exact same name/shortName)
  const isSubjectSame = pOld.subjectId === pNew.subjectId ||
    (subOld && subNew && normalizeStr(subOld.name) === normalizeStr(subNew.name));

  if (!isSubjectSame) {
    const oldName = subOld?.name || pOld.subjectId;
    const newName = subNew?.name || pNew.subjectId;
    diffs.push(`Môn học đổi từ "${oldName}" sang "${newName}"`);
  }

  // 2. Compare Period Type (LT / TH / LS)
  if (pOld.periodType !== pNew.periodType) {
    diffs.push(`Hình thức học đổi từ ${pOld.periodType} sang ${pNew.periodType}`);
  }

  // 3. Compare Practice Type (group1 vs group2) if TH
  if (pOld.periodType === 'TH' && pNew.periodType === 'TH') {
    const ptOld = pOld.practiceType || 'full';
    const ptNew = pNew.practiceType || 'full';
    if (ptOld !== ptNew) {
      diffs.push(`Tổ thực hành đổi từ ${ptOld} sang ${ptNew}`);
    }
  }

  // 4. Compare Period Count (only if explicitly changed)
  if (pNew.periodsCount && pOld.periodsCount !== pNew.periodsCount) {
    diffs.push(`Số tiết học đổi từ ${pOld.periodsCount} sang ${pNew.periodsCount} tiết`);
  }

  // 5. Compare Teachers (Order-independent set comparison)
  const oldTeachers = [...(pOld.teacherIds || [])].sort();
  const newTeachers = [...(pNew.teacherIds || [])].sort();
  
  // If Excel omitted teachers (hideTeacherName option), preserve old teachers if subject matched
  let finalTeacherIds = pNew.teacherIds && pNew.teacherIds.length > 0 ? pNew.teacherIds : pOld.teacherIds;

  if (pNew.teacherIds && pNew.teacherIds.length > 0) {
    const areTeachersEqual = oldTeachers.length === newTeachers.length &&
      oldTeachers.every((tId, idx) => tId === newTeachers[idx]);

    if (!areTeachersEqual) {
      const oldTNames = oldTeachers.map(tId => teacherMap.get(tId)?.name || tId).join(', ') || 'Chưa phân công';
      const newTNames = newTeachers.map(tId => teacherMap.get(tId)?.name || tId).join(', ') || 'Chưa phân công';
      diffs.push(`Giảng viên đổi từ "${oldTNames}" sang "${newTNames}"`);
    }
  }

  // 6. Compare Room / Lecture Hall
  const cleanRoomOld = cleanLectureHallCode(pOld.roomOrHospital);
  const cleanRoomNew = cleanLectureHallCode(pNew.roomOrHospital);

  // In the school standard export, TH and LS cells omit the room/hospital text.
  // If new room is empty and it's TH/LS, preserve the old room.
  let finalRoom = cleanRoomNew;
  if (!cleanRoomNew && (pNew.periodType === 'TH' || pNew.periodType === 'LS')) {
    finalRoom = pOld.roomOrHospital;
  } else if (pNew.periodType === 'LT') {
    if (cleanRoomNew && cleanRoomOld !== cleanRoomNew) {
      diffs.push(`Giảng đường đổi từ "${cleanRoomOld || 'Chưa xếp'}" sang "${cleanRoomNew}"`);
    } else if (!cleanRoomNew && cleanRoomOld) {
      finalRoom = pOld.roomOrHospital;
    }
  }

  // 7. Compare Lesson Title
  let finalLessonTitle = pNew.lessonTitle;
  if (!pNew.lessonTitle && pOld.lessonTitle) {
    finalLessonTitle = pOld.lessonTitle;
  } else if (pNew.lessonTitle && pOld.lessonTitle && pNew.lessonTitle.trim() !== pOld.lessonTitle.trim()) {
    diffs.push(`Tên bài học đổi từ "${pOld.lessonTitle}" sang "${pNew.lessonTitle}"`);
  }

  const mergedPeriod: PeriodDetail = {
    subjectId: pNew.subjectId,
    periodType: pNew.periodType,
    practiceType: pNew.practiceType || pOld.practiceType,
    periodsCount: pNew.periodsCount || pOld.periodsCount,
    teacherIds: finalTeacherIds,
    roomOrHospital: finalRoom || pOld.roomOrHospital,
    lessonTitle: finalLessonTitle || pOld.lessonTitle,
    notes: pNew.notes || pOld.notes || '',
  };

  return {
    isMatch: diffs.length === 0,
    diffMessages: diffs,
    mergedPeriod,
  };
}

/**
 * Compare an uploaded schedule set with the current Master Schedule in the database.
 */
export function analyzeScheduleDiff(
  db: AppDatabase,
  uploadedSchedules: SessionSchedule[],
  targetWeek?: number
): DiffAnalysisResult {
  const classMap = new Map<string, StudentClass>();
  db.classes.forEach(c => classMap.set(c.id, c));

  const subjectMap = new Map<string, Subject>();
  db.subjects.forEach(s => subjectMap.set(s.id, s));

  const teacherMap = new Map<string, Teacher>();
  db.teachers.forEach(t => teacherMap.set(t.id, t));

  // Determine current master schedules to compare against
  const originalSchedules = targetWeek !== undefined
    ? db.schedules.filter(s => s.weekNumber === targetWeek)
    : db.schedules;

  const relevantUploadedSchedules = targetWeek !== undefined
    ? uploadedSchedules.filter(s => s.weekNumber === targetWeek)
    : uploadedSchedules;

  const originalKeyMap = new Map<string, SessionSchedule>();
  originalSchedules.forEach(s => {
    const key = `${s.weekNumber}_${s.classId}_${s.dayOfWeek}_${s.session}`;
    originalKeyMap.set(key, s);
  });

  const uploadedKeyMap = new Map<string, SessionSchedule>();
  relevantUploadedSchedules.forEach(s => {
    const key = `${s.weekNumber}_${s.classId}_${s.dayOfWeek}_${s.session}`;
    uploadedKeyMap.set(key, s);
  });

  const added: ScheduleDiffRecord[] = [];
  const modified: ScheduleDiffRecord[] = [];
  const removed: ScheduleDiffRecord[] = [];
  const unchanged: ScheduleDiffRecord[] = [];

  const formatPeriodSummary = (periods: PeriodDetail[]): string => {
    return periods.map(p => {
      const sub = subjectMap.get(p.subjectId)?.name || subjectMap.get(p.subjectId)?.shortName || 'Môn học';
      const gv = p.teacherIds.map(tId => teacherMap.get(tId)?.name || tId).join(', ') || 'Chưa phân công';
      const rm = p.roomOrHospital ? ` tại ${cleanLectureHallCode(p.roomOrHospital)}` : '';
      const grp = p.practiceType === 'group1' ? ' [Tổ 1]' : p.practiceType === 'group2' ? ' [Tổ 2]' : '';
      return `${sub}${grp} (${p.periodsCount} tiết ${p.periodType}, GV: ${gv}${rm})`;
    }).join(' + ');
  };

  // 1. Scan uploaded schedules for Added, Modified, Unchanged
  uploadedKeyMap.forEach((newSch, key) => {
    const cls = classMap.get(newSch.classId);
    const className = cls?.name || newSch.classId;
    const oldSch = originalKeyMap.get(key);

    if (!oldSch) {
      // ADDED
      const summaryText = formatPeriodSummary(newSch.periods);
      added.push({
        id: `diff_add_${key}`,
        type: 'added',
        weekNumber: newSch.weekNumber,
        dayOfWeek: newSch.dayOfWeek,
        session: newSch.session,
        classId: newSch.classId,
        className,
        newSession: newSch,
        differences: [
          {
            field: 'Thêm mới buổi học',
            oldValue: 'Trống lịch',
            newValue: summaryText,
          }
        ],
        explanation: `Thêm mới lịch học cho lớp ${className} vào ${formatDayOfWeek(newSch.dayOfWeek)} ${formatSessionName(newSch.session)} (Tuần ${newSch.weekNumber}): ${summaryText}`,
      });
    } else {
      // SEMANTIC COMPARISON
      const diffs: { field: string; oldValue: string; newValue: string }[] = [];
      const mergedPeriods: PeriodDetail[] = [];

      // Check number of periods in session
      if (oldSch.periods.length !== newSch.periods.length) {
        diffs.push({
          field: 'Số lượng môn học trong ca',
          oldValue: `${oldSch.periods.length} môn`,
          newValue: `${newSch.periods.length} môn`,
        });
      } else {
        // Compare period by period
        for (let i = 0; i < oldSch.periods.length; i++) {
          const comp = comparePeriodDetails(oldSch.periods[i], newSch.periods[i], subjectMap, teacherMap);
          if (!comp.isMatch) {
            comp.diffMessages.forEach(msg => {
              diffs.push({
                field: `Tiết ${i + 1}`,
                oldValue: formatPeriodSummary([oldSch.periods[i]]),
                newValue: formatPeriodSummary([newSch.periods[i]]),
              });
            });
          }
          mergedPeriods.push(comp.mergedPeriod);
        }
      }

      // Check combined classes
      const oldComb = oldSch.combinedClassIds ? [...oldSch.combinedClassIds].sort().join(',') : '';
      const newComb = newSch.combinedClassIds ? [...newSch.combinedClassIds].sort().join(',') : '';
      if (oldComb && newComb && oldComb !== newComb) {
        diffs.push({
          field: 'Nhóm lớp ghép',
          oldValue: oldSch.combinedGroupId || 'Lớp ghép',
          newValue: newSch.combinedGroupId || 'Lớp ghép',
        });
      }

      if (diffs.length > 0) {
        // MODIFIED
        const oldSummary = formatPeriodSummary(oldSch.periods);
        const newSummary = formatPeriodSummary(newSch.periods);
        const mergedSession: SessionSchedule = {
          ...oldSch,
          periods: mergedPeriods.length === newSch.periods.length ? mergedPeriods : newSch.periods,
          combinedGroupId: newSch.combinedGroupId || oldSch.combinedGroupId,
          combinedClassIds: newSch.combinedClassIds || oldSch.combinedClassIds,
          updatedAt: new Date().toISOString(),
        };

        modified.push({
          id: `diff_mod_${key}`,
          type: 'modified',
          weekNumber: newSch.weekNumber,
          dayOfWeek: newSch.dayOfWeek,
          session: newSch.session,
          classId: newSch.classId,
          className,
          oldSession: oldSch,
          newSession: mergedSession,
          differences: diffs,
          explanation: `Cập nhật thay đổi lịch học lớp ${className} vào ${formatDayOfWeek(newSch.dayOfWeek)} ${formatSessionName(newSch.session)}: Đổi từ "${oldSummary}" sang "${newSummary}"`,
        });
      } else {
        // UNCHANGED - Preserve original clean object
        unchanged.push({
          id: `diff_unc_${key}`,
          type: 'unchanged',
          weekNumber: newSch.weekNumber,
          dayOfWeek: newSch.dayOfWeek,
          session: newSch.session,
          classId: newSch.classId,
          className,
          oldSession: oldSch,
          newSession: oldSch, // Keep original
          differences: [],
          explanation: `Lịch học lớp ${className} giữ nguyên không đổi.`,
        });
      }
    }
  });

  // 2. Scan original schedules for REMOVED items
  originalKeyMap.forEach((oldSch, key) => {
    if (!uploadedKeyMap.has(key)) {
      const cls = classMap.get(oldSch.classId);
      const className = cls?.name || oldSch.classId;
      const oldSummary = formatPeriodSummary(oldSch.periods);
      removed.push({
        id: `diff_rem_${key}`,
        type: 'removed',
        weekNumber: oldSch.weekNumber,
        dayOfWeek: oldSch.dayOfWeek,
        session: oldSch.session,
        classId: oldSch.classId,
        className,
        oldSession: oldSch,
        differences: [
          {
            field: 'Xóa buổi học',
            oldValue: oldSummary,
            newValue: 'Đã xóa (Trống lịch)',
          }
        ],
        explanation: `Đã xóa buổi học của lớp ${className} vào ${formatDayOfWeek(oldSch.dayOfWeek)} ${formatSessionName(oldSch.session)} (Trước đó: ${oldSummary})`,
      });
    }
  });

  // 3. Construct the proposed final master schedule state
  // Unchanged records keep exact old master objects
  const proposedWeekSchedules: SessionSchedule[] = [];
  unchanged.forEach(u => proposedWeekSchedules.push(u.oldSession!));
  modified.forEach(m => proposedWeekSchedules.push(m.newSession!));
  added.forEach(a => proposedWeekSchedules.push(a.newSession!));

  let finalMasterSchedules: SessionSchedule[] = [];
  if (targetWeek !== undefined) {
    finalMasterSchedules = [
      ...db.schedules.filter(s => s.weekNumber !== targetWeek),
      ...proposedWeekSchedules,
    ];
  } else {
    finalMasterSchedules = proposedWeekSchedules;
  }

  // 4. Run full validation & conflict detection
  const simulatedDb: AppDatabase = {
    ...db,
    schedules: finalMasterSchedules,
  };
  const conflicts = detectConflicts(simulatedDb, targetWeek);

  // 5. Generate Natural Language Summary
  let naturalLanguageSummary = '';
  const totalChanges = added.length + modified.length + removed.length;

  if (totalChanges === 0) {
    naturalLanguageSummary = '✅ **Không có thay đổi nào được phát hiện!** Toàn bộ dữ liệu thời khóa biểu trong tệp tải lên hoàn toàn trùng khớp chuẩn xác với Bản Chuẩn (Master Schedule) hiện hành.';
  } else {
    const parts: string[] = [];
    parts.push(`Hệ thống đã phân tích và đối chiếu thành công: Phát hiện tổng cộng **${totalChanges} thay đổi** (${added.length} Thêm mới, ${modified.length} Sửa đổi, ${removed.length} Đã xóa).`);

    if (added.length > 0) {
      parts.push(`\n**➕ Mục Thêm Mới (${added.length} buổi):**`);
      added.slice(0, 8).forEach((item, idx) => {
        parts.push(`${idx + 1}. ${item.explanation}`);
      });
      if (added.length > 8) parts.push(`... và thêm ${added.length - 8} mục khác.`);
    }

    if (modified.length > 0) {
      parts.push(`\n**✏️ Mục Bị Sửa Đổi (${modified.length} buổi):**`);
      modified.slice(0, 8).forEach((item, idx) => {
        parts.push(`${idx + 1}. ${item.explanation}`);
      });
      if (modified.length > 8) parts.push(`... và ${modified.length - 8} điều chỉnh khác.`);
    }

    if (removed.length > 0) {
      parts.push(`\n**🗑️ Mục Đã Xóa (${removed.length} buổi):**`);
      removed.slice(0, 8).forEach((item, idx) => {
        parts.push(`${idx + 1}. ${item.explanation}`);
      });
      if (removed.length > 8) parts.push(`... và ${removed.length - 8} mục khác.`);
    }

    naturalLanguageSummary = parts.join('\n');
  }

  // 6. Generate Conflict Report
  let conflictReport = '';
  if (conflicts.length === 0) {
    conflictReport = '✅ **Không phát hiện xung đột nào!** Dữ liệu hoàn toàn hợp lệ, không bị trùng lịch giảng viên, không trùng phòng giảng đường và đảm bảo định mức tiết học.';
  } else {
    const errorList = conflicts.filter(c => c.severity === 'error');
    const warnList = conflicts.filter(c => c.severity === 'warning');
    const lines: string[] = [
      `⚠️ **Phát hiện ${conflicts.length} xung đột/cảnh báo lịch trình (${errorList.length} lỗi nghiêm trọng, ${warnList.length} cảnh báo):**\n`
    ];

    conflicts.forEach((cf, idx) => {
      const typeLabel = cf.type === 'TEACHER_CONFLICT' ? 'Trùng lịch Giảng viên'
        : cf.type === 'LECTURE_HALL_CONFLICT' ? 'Trùng Giảng đường / Phòng học'
        : cf.type === 'CLASS_OVERLOAD' ? 'Quá tải số tiết học'
        : cf.type === 'PRACTICE_ROOM_OVERLOAD' ? 'Quá tải phòng thực hành bộ môn'
        : 'Xung đột';

      lines.push(`${idx + 1}. **[${typeLabel}]**: ${cf.message}`);
    });

    conflictReport = lines.join('\n');
  }

  // 7. Generate Structured JSON
  const structuredJson = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    metadata: {
      targetWeek,
      totalChanges,
      hasConflicts: conflicts.length > 0,
    },
    summary: {
      addedCount: added.length,
      modifiedCount: modified.length,
      removedCount: removed.length,
      unchangedCount: unchanged.length,
      conflictCount: conflicts.length,
    },
    records: {
      added: added.map(a => ({
        id: a.id,
        weekNumber: a.weekNumber,
        dayOfWeek: a.dayOfWeek,
        session: a.session,
        classId: a.classId,
        className: a.className,
        sessionData: a.newSession,
      })),
      modified: modified.map(m => ({
        id: m.id,
        weekNumber: m.weekNumber,
        dayOfWeek: m.dayOfWeek,
        session: m.session,
        classId: m.classId,
        className: m.className,
        changes: m.differences,
        oldSessionData: m.oldSession,
        newSessionData: m.newSession,
      })),
      removed: removed.map(r => ({
        id: r.id,
        weekNumber: r.weekNumber,
        dayOfWeek: r.dayOfWeek,
        session: r.session,
        classId: r.classId,
        className: r.className,
      })),
    },
    conflicts: conflicts.map(c => ({
      id: c.id,
      type: c.type,
      severity: c.severity,
      message: c.message,
      weekNumber: c.weekNumber,
      dayOfWeek: c.dayOfWeek,
      session: c.session,
      details: c.details,
    })),
    syncPayload: finalMasterSchedules,
  };

  return {
    summary: {
      totalOriginal: originalSchedules.length,
      totalUploaded: relevantUploadedSchedules.length,
      addedCount: added.length,
      modifiedCount: modified.length,
      removedCount: removed.length,
      unchangedCount: unchanged.length,
      conflictCount: conflicts.length,
    },
    changes: {
      added,
      modified,
      removed,
      unchanged,
    },
    conflicts,
    naturalLanguageSummary,
    conflictReport,
    structuredJson,
    finalMasterSchedules,
  };
}
