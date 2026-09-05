import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { AppDatabase, ExportExcelOptions, PeriodDetail, SessionSchedule, StudentClass, Subject, Teacher, LectureHall, Department } from '../types';
import { formatSubjectDisplayName, cleanLectureHallCode } from './schedulerService';
import { generateSubjectShortName, INITIAL_LECTURE_HALLS, getClassShortName, getCombinedClassShortName, getLectureHallExcelName } from './storage';

/**
 * Sanitize a string to be a valid Excel worksheet name:
 * - Forbidden characters in Excel: \ / ? * : [ ]
 * - Max length: 31 characters
 * - Cannot be empty
 * - Leading/trailing single quotes removed
 */
export function sanitizeWorksheetName(name: string, fallback = 'Sheet'): string {
  if (!name || !name.trim()) return fallback;
  // Replace invalid characters with hyphen: \ / ? * : [ ]
  let clean = name.replace(/[\\/?*:[\]]/g, '-').trim();
  // Clean double hyphens and extra spaces
  clean = clean.replace(/[-_]{2,}/g, '-').replace(/\s{2,}/g, ' ');
  // Excel does not permit starting or ending with single quote
  clean = clean.replace(/^'+|'+$/g, '').trim();
  if (!clean) clean = fallback;
  // Excel limits worksheet names to 31 characters
  if (clean.length > 31) {
    clean = clean.substring(0, 31).trim();
  }
  return clean;
}

export function getUniqueWorksheetName(name: string, usedNames: Set<string>): string {
  let baseName = sanitizeWorksheetName(name);
  let finalName = baseName;
  let counter = 1;

  while (usedNames.has(finalName.toLowerCase())) {
    const suffix = ` (${counter})`;
    const maxBaseLen = 31 - suffix.length;
    finalName = `${baseName.substring(0, maxBaseLen)}${suffix}`;
    counter++;
  }

  usedNames.add(finalName.toLowerCase());
  return finalName;
}

function hexToArgb(hex: string): string {
  const clean = hex.replace('#', '').toUpperCase();
  if (clean.length === 6) {
    return 'FF' + clean;
  }
  return 'FFFFFFFF';
}

function safeMergeCells(worksheet: ExcelJS.Worksheet, range: string): void {
  try {
    const parts = range.split(':');
    if (parts.length === 2 && parts[0] === parts[1]) {
      return; // Same cell, no merge needed
    }
    worksheet.mergeCells(range);
  } catch (err) {
    console.warn(`[ExcelService] safeMergeCells skipped for range ${range}:`, err);
  }
}

function formatPeriodDataForExcel(
  p: PeriodDetail,
  subjectMap: Map<string, Subject>,
  teacherMap: Map<string, Teacher>,
  opt: ExportExcelOptions
): { text: string; bgArgb: string; textArgb: string } {
  const sub = subjectMap.get(p.subjectId);
  const bgArgb = sub?.colorBg ? hexToArgb(sub.colorBg) : 'FFFFFFFF';
  const textArgb = sub?.colorText ? hexToArgb(sub.colorText) : 'FF000000';

  // Standardized format:
  // - Clinical (LS): "LS <tên viết tắt môn học>" (e.g. LS Nội, LS Ngoại)
  // - Practical (TH): "TT <tên viết tắt môn học> 1/2" (or "TT <tên viết tắt môn học> Tổ 1/2")
  // - Theory (LT): "<tên viết tắt môn học>" (e.g. Dược lý, ĐDCS, Giải phẫu)
  const formattedName = formatSubjectDisplayName(sub, p.periodType, p.practiceType);
  const lines: string[] = [formattedName];

  // Lesson title
  if (!opt.hideLessonTitle && p.lessonTitle) {
    lines.push(`• ${p.lessonTitle}`);
  }

  // Room & Period display:
  if (p.periodType === 'LT') {
    // Only show the lecture hall number/code, e.g. (101), (B6P1)
    const cleanRoom = cleanLectureHallCode(p.roomOrHospital);
    const roomStr = cleanRoom ? `(${cleanRoom})` : '';
    if (!opt.hidePeriodCount) {
      lines.push(`[${p.periodsCount} tiết] ${roomStr}`.trim());
    } else if (roomStr) {
      lines.push(roomStr);
    }
  } else if (p.periodType === 'TH') {
    // TH: DO NOT show room name! Just "TT <Môn> 1/2" and optional period count
    if (!opt.hidePeriodCount) {
      lines.push(`[${p.periodsCount} tiết]`);
    }
  } else if (p.periodType === 'LS') {
    // LS: Clinical sessions just display "LS <tên viết tắt môn học>"
    // Optional period count if enabled
    if (!opt.hidePeriodCount) {
      lines.push(`[${p.periodsCount} tiết]`);
    }
  }

  // Teacher Name (Option 1: hideTeacherName)
  if (!opt.hideTeacherName && p.teacherIds && p.teacherIds.length > 0) {
    const tNames = p.teacherIds
      .map(tId => teacherMap.get(tId)?.name || tId)
      .join(', ');
    lines.push(`GV: ${tNames}`);
  }

  return {
    text: lines.join('\n'),
    bgArgb,
    textArgb,
  };
}

/**
 * Export the official Timetable Excel with multiple sheets (CĐ3, CĐ2, CĐ1, GĐ, TC...)
 * styled with exact pastel colors for subjects, clean borders, and customizable options.
 * When a session has 2 subjects, it splits into 2 distinct sub-cells with a sharp dividing boundary.
 */
export async function exportTimetableToExcel(
  db: AppDatabase,
  targetWeek: number,
  options?: Partial<ExportExcelOptions>
): Promise<void> {
  const opt: ExportExcelOptions = {
    ...db.exportOptions,
    ...options,
  };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Trường Cao đẳng Y tế Thanh Hóa';
  workbook.lastModifiedBy = 'Phòng Quản lý Đào tạo';
  workbook.created = new Date();
  workbook.modified = new Date();

  const weekConfig = db.weeks.find(w => w.weekNumber === targetWeek);
  const weekRangeStr = weekConfig
    ? `Từ ngày ${formatDateVN(weekConfig.startDate)} đến ngày ${formatDateVN(weekConfig.endDate)}`
    : `Tuần ${targetWeek}`;

  const subjectMap = new Map<string, Subject>();
  db.subjects.forEach(s => subjectMap.set(s.id, s));

  const teacherMap = new Map<string, Teacher>();
  db.teachers.forEach(t => teacherMap.set(t.id, t));

  // Determine which cohorts to export
  const sortedCohorts = [...db.cohorts].sort((a, b) => a.order - b.order);
  const selectedCohorts = opt.selectedCohortIds && opt.selectedCohortIds.length > 0
    ? sortedCohorts.filter(c => opt.selectedCohortIds!.includes(c.id))
    : sortedCohorts;

  const targetCohorts = selectedCohorts.length > 0 ? selectedCohorts : sortedCohorts;

  // Days: Thứ 2 -> Thứ 7 (2..7)
  const days = [2, 3, 4, 5, 6, 7];
  const dayNames: { [key: number]: string } = {
    2: 'Thứ 2',
    3: 'Thứ 3',
    4: 'Thứ 4',
    5: 'Thứ 5',
    6: 'Thứ 6',
    7: 'Thứ 7',
    8: 'Chủ nhật',
  };

  const sessions: Array<{ key: 'morning' | 'afternoon'; label: string }> = [
    { key: 'morning', label: 'Sáng' },
    { key: 'afternoon', label: 'Chiều' },
  ];

  const usedSheetNames = new Set<string>();

  targetCohorts.forEach(cohort => {
    // Sanitize cohort name to be Excel-safe (no slashes, colons, brackets, etc.)
    const sheetName = getUniqueWorksheetName(cohort.name || 'Khối', usedSheetNames);

    // Get classes in this cohort (respecting custom order and hidden list)
    const rawCohortClasses = db.classes.filter(c => c.cohortId === cohort.id);
    if (rawCohortClasses.length === 0) {
      // create empty sheet if no classes
      const ws = workbook.addWorksheet(sheetName);
      ws.addRow([`Không có lớp thuộc khối ${cohort.name}`]);
      return;
    }

    const timetableStyles = db.timetableStyles || {};
    const customOrder = timetableStyles.classOrder?.[cohort.id] || [];
    const hiddenClassIds = new Set(timetableStyles.hiddenClassIds || []);

    const sortedClasses = [...rawCohortClasses].sort((a, b) => {
      const idxA = customOrder.indexOf(a.id);
      const idxB = customOrder.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    const cohortClasses = sortedClasses.filter(c => !hiddenClassIds.has(c.id));
    if (cohortClasses.length === 0) {
      const ws = workbook.addWorksheet(sheetName);
      ws.addRow([`Tất cả các lớp thuộc khối ${cohort.name} đang bị ẩn.`]);
      return;
    }

    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    });

    // 1. School Header Rows
    worksheet.mergeCells('A1', 'C1');
    worksheet.getCell('A1').value = 'UBND TỈNH THANH HÓA';
    worksheet.getCell('A1').font = { name: 'Times New Roman', size: 10, bold: false };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('A2', 'C2');
    worksheet.getCell('A2').value = opt.schoolName || 'TRƯỜNG CAO ĐẲNG Y TẾ THANH HÓA';
    worksheet.getCell('A2').font = { name: 'Times New Roman', size: 10, bold: true };
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

    const totalCols = 2 + cohortClasses.length; // Col A: THỨ, Col B: BUỔI, Col C..: Lớp
    const endColLetter = getColLetter(totalCols);

    const rightHeaderCol = totalCols >= 4 ? 'D' : 'C';
    worksheet.mergeCells(`${rightHeaderCol}1:${endColLetter}1`);
    worksheet.getCell(`${rightHeaderCol}1`).value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    worksheet.getCell(`${rightHeaderCol}1`).font = { name: 'Times New Roman', size: 10, bold: true };
    worksheet.getCell(`${rightHeaderCol}1`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`${rightHeaderCol}2:${endColLetter}2`);
    worksheet.getCell(`${rightHeaderCol}2`).value = 'Độc lập - Tự do - Hạnh phúc';
    worksheet.getCell(`${rightHeaderCol}2`).font = { name: 'Times New Roman', size: 10, italic: true, bold: true };
    worksheet.getCell(`${rightHeaderCol}2`).alignment = { horizontal: 'center', vertical: 'middle' };

    // Title Row
    worksheet.mergeCells(`A4:${endColLetter}4`);
    worksheet.getCell('A4').value = `${opt.headerTitle || 'THỜI KHÓA BIỂU GIẢNG DẠY VÀ HỌC TẬP'} - KHỐI ${cohort.name.toUpperCase()}`;
    worksheet.getCell('A4').font = { name: 'Times New Roman', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
    worksheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

    // Subtitle Row
    worksheet.mergeCells(`A5:${endColLetter}5`);
    worksheet.getCell('A5').value = `Tuần ${targetWeek} (${weekRangeStr}) - Năm học ${db.academicYear}`;
    worksheet.getCell('A5').font = { name: 'Times New Roman', size: 11, italic: true, bold: true };
    worksheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 7: Table Header
    const headerRowIdx = 7;
    const headerRow = worksheet.getRow(headerRowIdx);
    headerRow.height = 32;

    // Header Col A: THỨ
    const cornerCellA = worksheet.getCell(`A${headerRowIdx}`);
    cornerCellA.value = 'THỨ';
    const cornerBg = timetableStyles.headerCornerBg ? hexToArgb(timetableStyles.headerCornerBg) : 'FF0F172A';
    cornerCellA.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: cornerBg },
    };
    cornerCellA.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cornerCellA.alignment = { horizontal: 'center', vertical: 'middle' };
    setCellBorder(cornerCellA);
    worksheet.getColumn(1).width = 12; // Column Thứ

    // Header Col B: BUỔI
    const cornerCellB = worksheet.getCell(`B${headerRowIdx}`);
    cornerCellB.value = 'BUỔI';
    cornerCellB.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: cornerBg },
    };
    cornerCellB.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cornerCellB.alignment = { horizontal: 'center', vertical: 'middle' };
    setCellBorder(cornerCellB);
    worksheet.getColumn(2).width = 12; // Column Buổi

    // Class Column Headers (Starting from Col C = 3)
    cohortClasses.forEach((cls, idx) => {
      const colLetter = getColLetter(3 + idx);
      const cell = worksheet.getCell(`${colLetter}${headerRowIdx}`);
      cell.value = `Lớp: ${cls.name}`;
      
      let classBg = 'FF1E293B';
      if (timetableStyles.classColors?.[cls.id]) {
        classBg = hexToArgb(timetableStyles.classColors[cls.id]);
      } else if (timetableStyles.headerClassRowBg) {
        classBg = hexToArgb(timetableStyles.headerClassRowBg);
      }

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: classBg },
      };
      cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      setCellBorder(cell);
      worksheet.getColumn(3 + idx).width = 30; // Class column width
    });

    // Helper to check if 2 schedules are the same combined group
    const isSameCombined = (s1?: SessionSchedule, s2?: SessionSchedule): boolean => {
      if (!s1 || !s2) return false;
      if (!s1.periods || !s2.periods || s1.periods.length === 0 || s2.periods.length === 0) return false;
      if (s1.combinedGroupId && s2.combinedGroupId && s1.combinedGroupId === s2.combinedGroupId) return true;
      if (s1.combinedClassIds && s2.combinedClassIds && s1.combinedClassIds.includes(s2.classId) && s2.combinedClassIds.includes(s1.classId)) return true;
      return false;
    };

    // Fill Timetable Data Row by Row
    let currentRowIdx = headerRowIdx + 1;

    days.forEach(day => {
      const dayLabel = dayNames[day] || `Thứ ${day}`;
      const customDayBg = timetableStyles.dayColors?.[day];
      const dayStartRow = currentRowIdx;

      sessions.forEach(sess => {
        const row1Idx = currentRowIdx;
        const row2Idx = currentRowIdx + 1;

        const row1 = worksheet.getRow(row1Idx);
        const row2 = worksheet.getRow(row2Idx);
        row1.height = 34;
        row2.height = 34;

        // Col B: BUỔI ("Sáng" or "Chiều") merged across its 2 sub-rows
        worksheet.mergeCells(`B${row1Idx}:B${row2Idx}`);
        const sessCell = worksheet.getCell(`B${row1Idx}`);
        sessCell.value = sess.label;
        sessCell.font = { name: 'Times New Roman', size: 10.5, bold: true };
        sessCell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        let cellSessBg = sess.key === 'morning' ? 'FFE0F2FE' : 'FFFEF3C7';
        sessCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: cellSessBg },
        };
        setCellBorder(worksheet.getCell(`B${row1Idx}`));
        setCellBorder(worksheet.getCell(`B${row2Idx}`));

        // Fill each class column, handling horizontal merged classes
        let cIdx = 0;
        while (cIdx < cohortClasses.length) {
          const cls = cohortClasses[cIdx];
          const sch = db.schedules.find(
            s => s.weekNumber === targetWeek && s.dayOfWeek === day && s.session === sess.key && s.classId === cls.id
          );

          // Check if combined with adjacent classes
          let span = 1;
          const isCombined = sch && ((sch.combinedClassIds && sch.combinedClassIds.length > 1) || !!sch.combinedGroupId);
          if (isCombined) {
            while (cIdx + span < cohortClasses.length) {
              const nextCls = cohortClasses[cIdx + span];
              const nextSch = db.schedules.find(
                s => s.weekNumber === targetWeek && s.dayOfWeek === day && s.session === sess.key && s.classId === nextCls.id
              );
              if (isSameCombined(sch, nextSch)) {
                span++;
              } else {
                break;
              }
            }
          }

          const startColLetter = getColLetter(3 + cIdx);
          const endMergedColLetter = getColLetter(3 + cIdx + span - 1);

          if (sch && sch.periods && sch.periods.length >= 2) {
            // TWO SUBJECTS IN ONE SESSION -> 2 DISTINCT CELLS WITH SOLID DIVIDING LINE!
            const p1 = sch.periods[0];
            const p2 = sch.periods[1];

            const p1Data = formatPeriodDataForExcel(p1, subjectMap, teacherMap, opt);
            const p2Data = formatPeriodDataForExcel(p2, subjectMap, teacherMap, opt);

            if (span > 1) {
              safeMergeCells(worksheet, `${startColLetter}${row1Idx}:${endMergedColLetter}${row1Idx}`);
              safeMergeCells(worksheet, `${startColLetter}${row2Idx}:${endMergedColLetter}${row2Idx}`);
            }

            const cell1 = worksheet.getCell(`${startColLetter}${row1Idx}`);
            cell1.value = p1Data.text;
            cell1.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: p1Data.bgArgb },
            };
            cell1.font = { name: 'Times New Roman', size: 9, bold: false, color: { argb: p1Data.textArgb } };
            cell1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            const cell2 = worksheet.getCell(`${startColLetter}${row2Idx}`);
            cell2.value = p2Data.text;
            cell2.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: p2Data.bgArgb },
            };
            cell2.font = { name: 'Times New Roman', size: 9, bold: false, color: { argb: p2Data.textArgb } };
            cell2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            for (let k = 0; k < span; k++) {
              setCellBorder(worksheet.getCell(`${getColLetter(3 + cIdx + k)}${row1Idx}`));
              setCellBorder(worksheet.getCell(`${getColLetter(3 + cIdx + k)}${row2Idx}`));
            }
          } else if (sch && sch.periods && sch.periods.length === 1) {
            // ONE SUBJECT -> MERGE SUB-ROWS & SPAN COLUMNS IF COMBINED
            safeMergeCells(worksheet, `${startColLetter}${row1Idx}:${endMergedColLetter}${row2Idx}`);
            const cell = worksheet.getCell(`${startColLetter}${row1Idx}`);
            const pData = formatPeriodDataForExcel(sch.periods[0], subjectMap, teacherMap, opt);

            cell.value = pData.text;
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: pData.bgArgb },
            };
            cell.font = { name: 'Times New Roman', size: 9.5, bold: false, color: { argb: pData.textArgb } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            for (let k = 0; k < span; k++) {
              setCellBorder(worksheet.getCell(`${getColLetter(3 + cIdx + k)}${row1Idx}`));
              setCellBorder(worksheet.getCell(`${getColLetter(3 + cIdx + k)}${row2Idx}`));
            }
          } else {
            // EMPTY SESSION -> MERGE SUB-ROWS
            safeMergeCells(worksheet, `${startColLetter}${row1Idx}:${startColLetter}${row2Idx}`);
            const cell = worksheet.getCell(`${startColLetter}${row1Idx}`);
            cell.value = '';
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFFFF' },
            };
            setCellBorder(worksheet.getCell(`${startColLetter}${row1Idx}`));
            setCellBorder(worksheet.getCell(`${startColLetter}${row2Idx}`));
          }

          cIdx += span;
        }

        currentRowIdx += 2;
      });

      // Merge Col A (THỨ) for the entire day (4 rows: 2 morning + 2 afternoon)
      const dayEndRow = currentRowIdx - 1;
      safeMergeCells(worksheet, `A${dayStartRow}:A${dayEndRow}`);
      const dayCell = worksheet.getCell(`A${dayStartRow}`);
      dayCell.value = dayLabel;
      dayCell.font = { name: 'Times New Roman', size: 11, bold: true };
      dayCell.alignment = { horizontal: 'center', vertical: 'middle' };

      let cellDayBg = customDayBg ? hexToArgb(customDayBg) : 'FFF1F5F9';
      dayCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: cellDayBg },
      };

      for (let r = dayStartRow; r <= dayEndRow; r++) {
        setCellBorder(worksheet.getCell(`A${r}`));
      }
    });

    // Footer Signatures
    const signStartRow = currentRowIdx + 2;
    worksheet.mergeCells(`A${signStartRow}:B${signStartRow}`);
    worksheet.getCell(`A${signStartRow}`).value = 'NGƯỜI LẬP BIỂU';
    worksheet.getCell(`A${signStartRow}`).font = { name: 'Times New Roman', size: 10, bold: true };
    worksheet.getCell(`A${signStartRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

    const rightSignCol = totalCols >= 3 ? getColLetter(Math.max(2, totalCols - 1)) : 'B';
    worksheet.mergeCells(`${rightSignCol}${signStartRow}:${endColLetter}${signStartRow}`);
    worksheet.getCell(`${rightSignCol}${signStartRow}`).value = 'TRƯỞNG PHÒNG QUẢN LÝ ĐÀO TẠO';
    worksheet.getCell(`${rightSignCol}${signStartRow}`).font = { name: 'Times New Roman', size: 10, bold: true };
    worksheet.getCell(`${rightSignCol}${signStartRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Append Lecture Hall Sheet if enabled
  if (opt.includeLectureHallSheet !== false) {
    appendLectureHallWorksheet(workbook, db, targetWeek, opt, usedSheetNames);
  }

  // Write and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safeYear = (db.academicYear || '').replace(/[\\/?*:[\]]/g, '-');
  const filename = `TKB tuần ${targetWeek} ${safeYear}.xlsx`;
  saveAs(blob, filename);
}

/**
 * Generates the "Lịch Giảng Đường" (GĐ) sheet containing only theory subjects and theory lecture halls.
 * Lecture halls are displayed across horizontal column headers (GĐ 101, GĐ 102...).
 * Days (Thứ 2..Thứ 7) and Sessions (Sáng, Chiều) are along vertical rows.
 * Supports custom color styling for rows, columns, individual cells, and automatic subject pastel coloring.
 */
export function appendLectureHallWorksheet(
  workbook: ExcelJS.Workbook,
  db: AppDatabase,
  targetWeek: number,
  opt: ExportExcelOptions,
  usedSheetNames: Set<string>
) {
  const sheetName = getUniqueWorksheetName('Lịch Giảng Đường', usedSheetNames);

  // Active Lecture halls in horizontal columns
  const rawHalls = Array.isArray(db.lectureHalls) ? db.lectureHalls : INITIAL_LECTURE_HALLS;
  const customHallOrder = db.lectureHallStyles?.hallOrder || [];
  const hiddenHallIds = new Set(db.lectureHallStyles?.hiddenHallIds || []);

  const sortedHalls = [...rawHalls].sort((a, b) => {
    const idxA = customHallOrder.indexOf(a.id) !== -1 ? customHallOrder.indexOf(a.id) : customHallOrder.indexOf(a.code);
    const idxB = customHallOrder.indexOf(b.id) !== -1 ? customHallOrder.indexOf(b.id) : customHallOrder.indexOf(b.code);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;

    const orderA = a.order !== undefined ? a.order : 999;
    const orderB = b.order !== undefined ? b.order : 999;
    if (orderA !== orderB) return orderA - orderB;

    return a.code.localeCompare(b.code, 'vi');
  });

  const activeHalls = sortedHalls.filter(h => h.isActive !== false && !hiddenHallIds.has(h.id));

  if (activeHalls.length === 0) return;

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const weekConfig = db.weeks.find(w => w.weekNumber === targetWeek);
  const weekRangeStr = weekConfig ? `Từ ngày ${formatDateVN(weekConfig.startDate)} đến ngày ${formatDateVN(weekConfig.endDate)}` : '';

  const totalCols = 2 + activeHalls.length;
  const endColLetter = getColLetter(totalCols);

  // 1. School Header Rows
  worksheet.mergeCells('A1:B1');
  worksheet.getCell('A1').value = 'UBND TỈNH THANH HÓA';
  worksheet.getCell('A1').font = { name: 'Times New Roman', size: 10, bold: false };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A2:B2');
  worksheet.getCell('A2').value = opt.schoolName || 'TRƯỜNG CAO ĐẲNG Y TẾ THANH HÓA';
  worksheet.getCell('A2').font = { name: 'Times New Roman', size: 10, bold: true };
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  const startRightCol = totalCols >= 4 ? 'C' : 'B';
  worksheet.mergeCells(`${startRightCol}1:${endColLetter}1`);
  worksheet.getCell(`${startRightCol}1`).value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  worksheet.getCell(`${startRightCol}1`).font = { name: 'Times New Roman', size: 10, bold: true };
  worksheet.getCell(`${startRightCol}1`).alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(`${startRightCol}2:${endColLetter}2`);
  worksheet.getCell(`${startRightCol}2`).value = 'Độc lập - Tự do - Hạnh phúc';
  worksheet.getCell(`${startRightCol}2`).font = { name: 'Times New Roman', size: 10, italic: true, bold: true };
  worksheet.getCell(`${startRightCol}2`).alignment = { horizontal: 'center', vertical: 'middle' };

  // Title Row
  worksheet.mergeCells(`A4:${endColLetter}4`);
  worksheet.getCell('A4').value = `LỊCH SỬ DỤNG GIẢNG ĐƯỜNG LÝ THUYẾT - TUẦN ${targetWeek}`;
  worksheet.getCell('A4').font = { name: 'Times New Roman', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
  worksheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

  // Subtitle Row
  worksheet.mergeCells(`A5:${endColLetter}5`);
  worksheet.getCell('A5').value = `${weekRangeStr ? `(${weekRangeStr}) - ` : ''}Năm học ${db.academicYear}`;
  worksheet.getCell('A5').font = { name: 'Times New Roman', size: 11, italic: true, bold: true };
  worksheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 7: Table Header
  const headerRowIdx = 7;
  const headerRow = worksheet.getRow(headerRowIdx);
  headerRow.height = 32;

  // Merge A7:B7 -> Giảng đường
  worksheet.mergeCells(`A${headerRowIdx}:B${headerRowIdx}`);
  const cornerCell = worksheet.getCell(`A${headerRowIdx}`);
  cornerCell.value = 'Giảng đường';
  cornerCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };
  cornerCell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  cornerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  setCellBorder(cornerCell);
  setCellBorder(worksheet.getCell(`B${headerRowIdx}`));

  worksheet.getColumn(1).width = 10;
  worksheet.getColumn(2).width = 9;

  // Hall Columns Header (Uses customizable Excel display name)
  activeHalls.forEach((hall, idx) => {
    const colIdx = 3 + idx;
    const colLetter = getColLetter(colIdx);
    const cell = worksheet.getCell(`${colLetter}${headerRowIdx}`);
    const hallName = getLectureHallExcelName(hall);
    cell.value = hallName;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // Deep Blue
    };
    cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    setCellBorder(cell);
    worksheet.getColumn(colIdx).width = 15;
  });

  // Week schedules
  const weekSchedules = db.schedules.filter(s => s.weekNumber === targetWeek);

  const days = [2, 3, 4, 5, 6, 7];
  const dayNames: { [key: number]: string } = {
    2: 'Thứ 2',
    3: 'Thứ 3',
    4: 'Thứ 4',
    5: 'Thứ 5',
    6: 'Thứ 6',
    7: 'Thứ 7',
    8: 'Chủ nhật',
  };
  const sessions: Array<{ key: 'morning' | 'afternoon'; label: string }> = [
    { key: 'morning', label: 'Sáng' },
    { key: 'afternoon', label: 'Chiều' },
  ];

  let currentRowIdx = headerRowIdx + 1;

  const styleConfig = db.lectureHallStyles || {};
  const colorMode = opt.lectureHallColorMode || styleConfig.colorMode || 'subject';

  days.forEach(day => {
    const dayStartRow = currentRowIdx;

    sessions.forEach(sess => {
      const r1 = currentRowIdx;
      const r2 = currentRowIdx + 1;

      const row1 = worksheet.getRow(r1);
      const row2 = worksheet.getRow(r2);
      row1.height = 24;
      row2.height = 24;

      // Session cell in Col B (Merged across the 2 sub-rows)
      safeMergeCells(worksheet, `B${r1}:B${r2}`);
      const sessCell = worksheet.getCell(`B${r1}`);
      sessCell.value = sess.label;
      sessCell.font = { name: 'Times New Roman', size: 10, bold: true };
      sessCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sessCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: sess.key === 'morning' ? 'FFE0F2FE' : 'FFFEF3C7' },
      };
      setCellBorder(worksheet.getCell(`B${r1}`));
      setCellBorder(worksheet.getCell(`B${r2}`));

      // Find schedules for this slot
      const slotSchedules = weekSchedules.filter(s => s.dayOfWeek === day && s.session === sess.key);

      // Row key for custom color: e.g. "2_morning"
      const rowKey = `${day}_${sess.key}`;
      const customRowBg = styleConfig.rowColors?.[rowKey];

      activeHalls.forEach((hall, hIdx) => {
        const colIdx = 3 + hIdx;
        const colLetter = getColLetter(colIdx);
        const cell1 = worksheet.getCell(`${colLetter}${r1}`);
        const cell2 = worksheet.getCell(`${colLetter}${r2}`);
        
        const hallCodeClean = cleanLectureHallCode(hall.code).toLowerCase();
        const colKey = hallCodeClean;
        const cellKey = `${targetWeek}_${day}_${sess.key}_${hallCodeClean}`;

        // Custom colors
        const customCell = styleConfig.cellColors?.[cellKey];
        const customColBg = styleConfig.colColors?.[colKey];

        // Group events taking place in this hall slot
        interface HallSlotEvent {
          classIds: string[];
          subject?: Subject;
          periodsCount: number;
        }

        const eventsMap = new Map<string, HallSlotEvent>();

        slotSchedules.forEach(sch => {
          sch.periods.forEach(p => {
            if (p.periodType === 'LT') {
              const pRoomClean = cleanLectureHallCode(p.roomOrHospital).toLowerCase();
              if (pRoomClean === hallCodeClean || pRoomClean === hall.code.toLowerCase()) {
                const sub = db.subjects.find(s => s.id === p.subjectId);

                // Grouping key: if combined, combine them into one event
                const groupKey = sch.combinedGroupId
                  ? `grp_${sch.combinedGroupId}`
                  : (sch.combinedClassIds && sch.combinedClassIds.length > 1)
                    ? `comb_${[...sch.combinedClassIds].sort().join('_')}`
                    : `single_${sch.classId}_${p.subjectId || ''}`;

                if (eventsMap.has(groupKey)) {
                  const existing = eventsMap.get(groupKey)!;
                  if (!existing.classIds.includes(sch.classId)) {
                    existing.classIds.push(sch.classId);
                  }
                  if (sch.combinedClassIds) {
                    sch.combinedClassIds.forEach(cId => {
                      if (!existing.classIds.includes(cId)) existing.classIds.push(cId);
                    });
                  }
                } else {
                  const cIds = sch.combinedClassIds && sch.combinedClassIds.length > 0
                    ? [...sch.combinedClassIds]
                    : [sch.classId];
                  eventsMap.set(groupKey, {
                    classIds: cIds,
                    subject: sub,
                    periodsCount: p.periodsCount,
                  });
                }
              }
            }
          });
        });

        const events = Array.from(eventsMap.values());

        const getFillColor = (sub?: Subject) => {
          let bgHex = 'FFFFFFFF';
          let textHex = 'FF000000';

          if (customCell?.bgHex) {
            bgHex = hexToArgb(customCell.bgHex);
            if (customCell.textHex) textHex = hexToArgb(customCell.textHex);
          } else if (customRowBg) {
            bgHex = hexToArgb(customRowBg);
          } else if (customColBg) {
            bgHex = hexToArgb(customColBg);
          } else if (colorMode === 'session') {
            bgHex = sess.key === 'morning' ? 'FFE0F2FE' : 'FFFEF3C7';
            textHex = sess.key === 'morning' ? 'FF0369A1' : 'FF9A3412';
          } else {
            // Default: color by subject
            if (sub?.colorBg) bgHex = hexToArgb(sub.colorBg);
            if (sub?.colorText) textHex = hexToArgb(sub.colorText);
          }
          return { bgHex, textHex };
        };

        if (events.length === 0) {
          // Empty slot: merge r1:r2
          safeMergeCells(worksheet, `${colLetter}${r1}:${colLetter}${r2}`);
          // Empty lecture halls default to clean white background
          let emptyBg = 'FFFFFFFF';
          let emptyText = 'FF64748B';

          if (customCell?.bgHex) {
            emptyBg = hexToArgb(customCell.bgHex);
            if (customCell.textHex) emptyText = hexToArgb(customCell.textHex);
          }

          cell1.value = customCell?.customNote || '';
          cell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: emptyBg } };
          cell1.font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: emptyText } };
          cell1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          setCellBorder(cell1);
          setCellBorder(cell2);
        } else if (events.length === 1) {
          // 1 class event (single or combined): merge r1:r2
          safeMergeCells(worksheet, `${colLetter}${r1}:${colLetter}${r2}`);
          const ev = events[0];
          const classAbbr = ev.classIds.length > 1
            ? getCombinedClassShortName(ev.classIds, db)
            : getClassShortName(ev.classIds[0], db);

          const { bgHex, textHex } = getFillColor(ev.subject);

          cell1.value = classAbbr + (customCell?.customNote ? `\n(${customCell.customNote})` : '');
          cell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgHex } };
          cell1.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: textHex } };
          cell1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          setCellBorder(cell1);
          setCellBorder(cell2);
        } else {
          // 2 distinct classes in one session: Split into 2 sub-rows with solid clear dividing border line!
          const ev1 = events[0];
          const ev2 = events[1];

          const abbr1 = ev1.classIds.length > 1
            ? getCombinedClassShortName(ev1.classIds, db)
            : getClassShortName(ev1.classIds[0], db);

          const abbr2 = ev2.classIds.length > 1
            ? getCombinedClassShortName(ev2.classIds, db)
            : getClassShortName(ev2.classIds[0], db);

          const c1 = getFillColor(ev1.subject);
          const c2 = getFillColor(ev2.subject);

          // Sub-row 1
          cell1.value = abbr1;
          cell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c1.bgHex } };
          cell1.font = { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: c1.textHex } };
          cell1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          setCellBorder(cell1);

          // Sub-row 2
          cell2.value = abbr2;
          cell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c2.bgHex } };
          cell2.font = { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: c2.textHex } };
          cell2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          setCellBorder(cell2);
        }
      });

      currentRowIdx += 2;
    });

    // Merge Day in Col A
    const dayEndRow = currentRowIdx - 1;
    safeMergeCells(worksheet, `A${dayStartRow}:A${dayEndRow}`);
    const dayCell = worksheet.getCell(`A${dayStartRow}`);
    dayCell.value = dayNames[day] || `Thứ ${day}`;
    dayCell.font = { name: 'Times New Roman', size: 11, bold: true };
    dayCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dayCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    for (let r = dayStartRow; r <= dayEndRow; r++) {
      setCellBorder(worksheet.getCell(`A${r}`));
    }
  });

  // Signatures
  const signStartRow = currentRowIdx + 2;
  worksheet.mergeCells(`A${signStartRow}:B${signStartRow}`);
  worksheet.getCell(`A${signStartRow}`).value = 'NGƯỜI LẬP BIỂU';
  worksheet.getCell(`A${signStartRow}`).font = { name: 'Times New Roman', size: 10, bold: true };
  worksheet.getCell(`A${signStartRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  const rightSignCol = totalCols >= 4 ? getColLetter(Math.max(3, totalCols - 3)) : 'C';
  worksheet.mergeCells(`${rightSignCol}${signStartRow}:${endColLetter}${signStartRow}`);
  worksheet.getCell(`${rightSignCol}${signStartRow}`).value = 'TRƯỞNG PHÒNG QUẢN LÝ ĐÀO TẠO';
  worksheet.getCell(`${rightSignCol}${signStartRow}`).font = { name: 'Times New Roman', size: 10, bold: true };
  worksheet.getCell(`${rightSignCol}${signStartRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
}

/**
 * Dedicated export for Lecture Hall Schedule only
 */
export async function exportLectureHallScheduleToExcel(
  db: AppDatabase,
  targetWeek: number,
  opt: Partial<ExportExcelOptions> = {}
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ Thống Xếp TKB Y Tế Thanh Hóa';
  workbook.lastModifiedBy = 'Admin';
  workbook.created = new Date();
  workbook.modified = new Date();

  const mergedOptions: ExportExcelOptions = {
    ...db.exportOptions,
    ...opt,
    includeLectureHallSheet: true,
  };

  const usedSheetNames = new Set<string>();
  appendLectureHallWorksheet(workbook, db, targetWeek, mergedOptions, usedSheetNames);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safeYear = (db.academicYear || '').replace(/[\\/?*:[\]]/g, '-');
  const filename = `Lich_Giang_Duong_Tuan_${targetWeek}_${safeYear}.xlsx`;
  saveAs(blob, filename);
}

function setCellBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    left: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
    right: { style: 'thin', color: { argb: 'FF94A3B8' } },
  };
}

function getColLetter(colIdx: number): string {
  let temp = '';
  let num = colIdx;
  while (num > 0) {
    const mod = (num - 1) % 26;
    temp = String.fromCharCode(65 + mod) + temp;
    num = Math.floor((num - mod) / 26);
  }
  return temp;
}

function formatDateVN(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Download Standard Import Templates (.xlsx) including Lecture Halls and Departments
 */
export function downloadExcelTemplate(type: 'classes' | 'teachers' | 'subjects' | 'assignments' | 'rooms' | 'departments' | 'all'): void {
  const wb = XLSX.utils.book_new();

  if (type === 'classes' || type === 'all') {
    const wsData = [
      ['Mã Lớp (*)', 'Tên Lớp (*)', 'Tên Khối (CĐ3, CĐ2, CĐ1, GĐ, TC) (*)', 'Khóa học', 'Sĩ số', 'Khoa/Bộ môn'],
      ['CDDD26A', 'CĐĐD 26A', 'CĐ3', '2024-2027', 38, 'Khoa Điều dưỡng'],
      ['CDDD26B', 'CĐĐD 26B', 'CĐ3', '2024-2027', 36, 'Khoa Điều dưỡng'],
      ['DUOCK14A', 'DƯỢC K14A', 'CĐ3', '2024-2027', 42, 'Khoa Dược'],
      ['YSK2A', 'YS K2A', 'CĐ2', '2025-2028', 32, 'Khoa Y học Lâm sàng'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Muc_Lop');
  }

  if (type === 'teachers' || type === 'all') {
    const wsData = [
      ['Mã GV (*)', 'Họ và Tên (*)', 'Khoa / Bộ môn (*)', 'Chuyên môn Giảng dạy', 'Số tiết Tối đa/Tuần', 'Điện thoại', 'Email'],
      ['GV01', 'ThS.BS. Nguyễn Văn Hùng', 'Bộ môn Y học Lâm sàng', 'Nội khoa & Cấp cứu', 24, '0912345678', 'hungnv@cdytthanhhoa.edu.vn'],
      ['GV02', 'DSCK1. Lê Thị Mai', 'Khoa Dược', 'Dược lý & Dược lâm sàng', 22, '0983123456', 'mailt@cdytthanhhoa.edu.vn'],
      ['GV03', 'ThS.ĐD. Trần Quốc Toản', 'Khoa Điều dưỡng', 'Điều dưỡng cơ sở', 26, '0904567890', 'toantq@cdytthanhhoa.edu.vn'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Muc_Giao_Vien');
  }

  if (type === 'subjects' || type === 'all') {
    const wsData = [
      ['Mã Môn (*)', 'Tên Môn Học (*)', 'Tên Viết Tắt (Dùng trên TKB)', 'Số Tín Chỉ', 'Tiết Lý Thuyết (LT) (*)', 'Tiết Thực Hành (TH) (*)', 'Tiết Lâm Sàng (LS) (*)', 'Mã Bộ Môn Phòng TH (VD: BM-DUOC, BM-DD)', 'Mã Màu Hex (#DBEAFE)'],
      ['DUOC-LY', 'Dược lý học', 'Dược lý', 3, 30, 15, 0, 'BM-DUOC', '#DBEAFE'],
      ['DD-COSO', 'Điều dưỡng cơ sở', 'ĐDCS', 4, 30, 30, 0, 'BM-DD', '#FCE7F3'],
      ['NOI-KHOA', 'Bệnh học Nội khoa & Lâm sàng', 'Nội', 4, 25, 0, 35, 'BM-LS', '#FFEDD5'],
      ['GIAIPHAU-SL', 'Giải phẫu - Sinh lý', 'Giải phẫu', 3, 30, 15, 0, 'BM-YCS', '#FEF9C3'],
      ['NGOAI-KHOA', 'Bệnh học Ngoại khoa & Lâm sàng', 'Ngoại', 3, 20, 0, 25, 'BM-LS', '#DCFCE7'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Muc_Mon_Hoc');
  }

  if (type === 'assignments' || type === 'all') {
    const wsData = [
      ['Mã Lớp (*)', 'Mã Môn (*)', 'Mã GV Lý Thuyết (cách nhau dấu phẩy)', 'Mã GV Thực Hành', 'Mã GV Lâm Sàng', 'Ghi chú'],
      ['CDDD26A', 'DD-COSO', 'GV03', 'GV03', '', 'Phân công chính kỳ 1'],
      ['CDDD26A', 'NOI-KHOA', 'GV01', '', 'GV01, GV08', 'Thực tập BV Đa khoa Tỉnh'],
      ['DUOCK14A', 'DUOC-LY', 'GV02', 'GV02', '', 'Lab Dược lý'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Phan_Cong_Giang_Day');
  }

  if (type === 'rooms' || type === 'all') {
    const wsData = [
      ['Mã Giảng Đường (*)', 'Tên Giảng Đường (*)', 'Khu/Tòa Nhà', 'Sức Chứa (SV)', 'Ghi Chú'],
      ['101', '101', 'Khu Nhà A', 80, 'Giảng đường lý thuyết tầng 1'],
      ['102', '102', 'Khu Nhà A', 80, 'Giảng đường lý thuyết tầng 1'],
      ['201', '201', 'Khu Nhà A', 90, 'Giảng đường lý thuyết tầng 2'],
      ['202', '202', 'Khu Nhà A', 90, 'Giảng đường lý thuyết tầng 2'],
      ['301', '301', 'Khu Nhà B', 90, 'Giảng đường lý thuyết tầng 3'],
      ['B6P1', 'B6P1', 'Khu Nhà B6', 60, 'Phòng học lý thuyết dãy B6'],
      ['B9P1', 'B9P1', 'Khu Nhà B9', 60, 'Phòng học lý thuyết dãy B9'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Muc_Giang_Duong');
  }

  if (type === 'departments' || type === 'all') {
    const wsData = [
      ['Mã Bộ Môn (*)', 'Tên Bộ Môn (*)', 'Số Phòng Thực Hành Cố Định (*)', 'Ghi Chú'],
      ['BM-DD', 'Bộ môn Điều dưỡng', 4, 'Tối đa 4 phòng thực hành cùng lúc'],
      ['BM-DUOC', 'Khoa/Bộ môn Dược', 3, 'Tối đa 3 phòng thực hành cùng lúc'],
      ['BM-YCS', 'Bộ môn Y học cơ sở & Xét nghiệm', 3, 'Tối đa 3 phòng thực hành'],
      ['BM-LS', 'Bộ môn Y học Lâm sàng', 2, 'Tối đa 2 phòng tiền lâm sàng'],
      ['BM-CNTT', 'Bộ môn Tin học & Ngoại ngữ', 2, 'Tối đa 2 phòng máy tính'],
      ['BM-PHCN', 'Bộ môn Phục hồi chức năng - YHCT', 2, 'Tối đa 2 phòng thực hành'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Phong_Thuc_Hanh_Bo_Mon');
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Mau_Nhap_${type.toUpperCase()}_CDYT_ThanhHoa.xlsx`);
}

/**
 * Import classes from Excel
 */
export async function importClassesFromExcel(file: File, db: AppDatabase): Promise<{ count: number; errors: string[] }> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  let count = 0;
  const errors: string[] = [];

  rows.forEach((r, idx) => {
    const code = r['Mã Lớp (*)'] || r['Mã Lớp'] || r['MaLop'] || r['code'];
    const name = r['Tên Lớp (*)'] || r['Tên Lớp'] || r['TenLop'] || r['name'];
    const cohortName = r['Tên Khối (CĐ3, CĐ2, CĐ1, GĐ, TC) (*)'] || r['Khối'] || r['cohort'] || 'CĐ3';

    if (!code || !name) {
      errors.push(`Dòng ${idx + 2}: Thiếu Mã lớp hoặc Tên lớp.`);
      return;
    }

    let cohort = db.cohorts.find(c => c.name.toLowerCase() === String(cohortName).toLowerCase());
    if (!cohort) {
      cohort = {
        id: `cohort-${cohortName.toLowerCase().replace(/\s+/g, '')}`,
        name: String(cohortName).trim(),
        order: db.cohorts.length + 1,
      };
      db.cohorts.push(cohort);
    }

    const existingIdx = db.classes.findIndex(c => c.code.toLowerCase() === String(code).toLowerCase());
    const newClass: StudentClass = {
      id: existingIdx >= 0 ? db.classes[existingIdx].id : `cls_${Math.random().toString(36).substring(2, 9)}`,
      code: String(code).trim(),
      name: String(name).trim(),
      cohortId: cohort.id,
      academicYear: r['Khóa học'] || '2024-2027',
      studentCount: Number(r['Sĩ số']) || 35,
      faculty: r['Khoa/Bộ môn'] || 'Khoa Y',
    };

    if (existingIdx >= 0) {
      db.classes[existingIdx] = newClass;
    } else {
      db.classes.push(newClass);
    }
    count++;
  });

  return { count, errors };
}

/**
 * Import Teachers from Excel
 */
export async function importTeachersFromExcel(file: File, db: AppDatabase): Promise<{ count: number; errors: string[] }> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  let count = 0;
  const errors: string[] = [];

  rows.forEach((r, idx) => {
    const code = r['Mã GV (*)'] || r['Mã GV'] || r['MaGV'] || r['code'];
    const name = r['Họ và Tên (*)'] || r['Họ và Tên'] || r['TenGV'] || r['name'];
    const faculty = r['Khoa / Bộ môn (*)'] || r['Khoa/Bộ môn'] || r['Bộ môn'] || 'Khoa Y';

    if (!code || !name) {
      errors.push(`Dòng ${idx + 2}: Thiếu Mã GV hoặc Họ tên.`);
      return;
    }

    const existingIdx = db.teachers.findIndex(t => t.code.toLowerCase() === String(code).toLowerCase());
    const newTeacher: Teacher = {
      id: existingIdx >= 0 ? db.teachers[existingIdx].id : `gv_${Math.random().toString(36).substring(2, 9)}`,
      code: String(code).trim(),
      name: String(name).trim(),
      faculty: String(faculty).trim(),
      specialty: r['Chuyên môn Giảng dạy'] || r['Chuyên môn'] || '',
      maxPeriodsPerWeek: Number(r['Số tiết Tối đa/Tuần']) || 24,
      phone: r['Điện thoại'] || '',
      email: r['Email'] || '',
    };

    if (existingIdx >= 0) {
      db.teachers[existingIdx] = newTeacher;
    } else {
      db.teachers.push(newTeacher);
    }
    count++;
  });

  return { count, errors };
}

/**
 * Import Subjects from Excel
 */
export async function importSubjectsFromExcel(file: File, db: AppDatabase): Promise<{ count: number; errors: string[] }> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  let count = 0;
  const errors: string[] = [];

  rows.forEach((r, idx) => {
    const code = r['Mã Môn (*)'] || r['Mã Môn'] || r['MaMon'] || r['code'];
    const name = r['Tên Môn Học (*)'] || r['Tên Môn Học'] || r['TenMon'] || r['name'];
    const shortName = r['Tên Viết Tắt (Dùng trên TKB)'] || r['Tên Viết Tắt'] || r['Tên viết tắt'] || r['shortName'] || generateSubjectShortName(String(name || ''));
    const lt = Number(r['Tiết Lý Thuyết (LT) (*)'] || r['LT'] || 0);
    const th = Number(r['Tiết Thực Hành (TH) (*)'] || r['TH'] || 0);
    const ls = Number(r['Tiết Lâm Sàng (LS) (*)'] || r['LS'] || 0);
    const deptCode = r['Mã Bộ Môn Phòng TH (VD: BM-DUOC, BM-DD)'] || r['Mã Bộ Môn'] || r['departmentId'] || '';

    if (!code || !name) {
      errors.push(`Dòng ${idx + 2}: Thiếu Mã môn hoặc Tên môn.`);
      return;
    }

    const color = r['Mã Màu Hex (#DBEAFE)'] || '#DBEAFE';

    // Find dept if provided
    let departmentId: string | undefined;
    if (deptCode && db.departments) {
      const foundDept = db.departments.find(d => d.code.toLowerCase() === String(deptCode).toLowerCase() || d.id.toLowerCase() === String(deptCode).toLowerCase());
      if (foundDept) departmentId = foundDept.id;
    }

    const existingIdx = db.subjects.findIndex(s => s.code.toLowerCase() === String(code).toLowerCase());
    const newSubject: Subject = {
      id: existingIdx >= 0 ? db.subjects[existingIdx].id : `sub_${Math.random().toString(36).substring(2, 9)}`,
      code: String(code).trim(),
      name: String(name).trim(),
      shortName: String(shortName).trim() || generateSubjectShortName(String(name).trim()),
      credits: Number(r['Số Tín Chỉ']) || 3,
      theoryPeriods: lt,
      practicePeriods: th,
      clinicalPeriods: ls,
      totalPeriods: lt + th + ls,
      departmentId: departmentId || (existingIdx >= 0 ? db.subjects[existingIdx].departmentId : undefined),
      colorBg: color,
      colorText: '#1E3A8A',
      colorBorder: '#93C5FD',
    };

    if (existingIdx >= 0) {
      db.subjects[existingIdx] = newSubject;
    } else {
      db.subjects.push(newSubject);
    }
    count++;
  });

  return { count, errors };
}

/**
 * Import Lecture Halls (Giảng đường lý thuyết) from Excel
 */
export async function importLectureHallsFromExcel(file: File, db: AppDatabase): Promise<{ count: number; errors: string[] }> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  let count = 0;
  const errors: string[] = [];

  if (!db.lectureHalls) db.lectureHalls = [];

  rows.forEach((r, idx) => {
    const code = r['Mã Giảng Đường (*)'] || r['Mã Giảng Đường'] || r['Số Giảng Đường'] || r['code'] || r['Mã'];
    const name = r['Tên Giảng Đường (*)'] || r['Tên Giảng Đường'] || r['name'] || code;

    if (!code) {
      errors.push(`Dòng ${idx + 2}: Thiếu Mã/Số Giảng đường.`);
      return;
    }

    const cleanCode = cleanLectureHallCode(String(code));
    const cleanName = cleanLectureHallCode(String(name || code));

    const existingIdx = db.lectureHalls!.findIndex(h => h.code.toLowerCase() === cleanCode.toLowerCase());
    const newHall: LectureHall = {
      id: existingIdx >= 0 ? db.lectureHalls![existingIdx].id : `hall_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).substring(2, 6)}`,
      code: cleanCode,
      name: cleanName,
      building: r['Khu/Tòa Nhà'] || r['Tòa nhà'] || r['building'] || 'Khu Giảng đường',
      capacity: Number(r['Sức Chứa (SV)']) || 80,
      note: r['Ghi Chú'] || r['Ghi chú'] || '',
      isActive: true,
    };

    if (existingIdx >= 0) {
      db.lectureHalls![existingIdx] = newHall;
    } else {
      db.lectureHalls!.push(newHall);
    }
    count++;
  });

  return { count, errors };
}

/**
 * Import Departments & Practice Rooms from Excel
 */
export async function importDepartmentsFromExcel(file: File, db: AppDatabase): Promise<{ count: number; errors: string[] }> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  let count = 0;
  const errors: string[] = [];

  if (!db.departments) db.departments = [];

  rows.forEach((r, idx) => {
    const code = r['Mã Bộ Môn (*)'] || r['Mã Bộ Môn'] || r['code'] || r['Mã BM'];
    const name = r['Tên Bộ Môn (*)'] || r['Tên Bộ Môn'] || r['name'] || r['Tên BM'];
    const roomCount = Number(r['Số Phòng Thực Hành Cố Định (*)'] || r['Số Phòng TH'] || r['Số phòng TH'] || r['practiceRoomCount'] || 2);

    if (!code || !name) {
      errors.push(`Dòng ${idx + 2}: Thiếu Mã Bộ môn hoặc Tên Bộ môn.`);
      return;
    }

    const existingIdx = db.departments!.findIndex(d => d.code.toLowerCase() === String(code).toLowerCase());
    const newDept: Department = {
      id: existingIdx >= 0 ? db.departments![existingIdx].id : `bm_${String(code).toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      code: String(code).trim(),
      name: String(name).trim(),
      practiceRoomCount: Math.max(1, roomCount),
      note: r['Ghi Chú'] || r['Ghi chú'] || '',
    };

    if (existingIdx >= 0) {
      db.departments![existingIdx] = newDept;
    } else {
      db.departments!.push(newDept);
    }
    count++;
  });

  return { count, errors };
}
