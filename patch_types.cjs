const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

const oldProgress = `export interface ClassProgress {
  classId: string;
  curriculumId: string;
  completedTheory: Record<string, number>; // subjectId -> number
  completedPractice: Record<string, number>; // subjectId -> number
  completedClinical: Record<string, number>; // subjectId -> number
  plannedSemester: number; // Học kỳ hiện tại đang lên lịch
}`;

const newProgress = `export interface ProgressLog {
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
}`;

code = code.replace(oldProgress, newProgress);
fs.writeFileSync('src/types/index.ts', code);
