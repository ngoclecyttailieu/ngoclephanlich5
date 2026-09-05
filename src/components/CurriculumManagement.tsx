import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, BookOpen, Layers, Check, X, Search, ChevronRight, FileUp, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ConfirmModal } from './ConfirmModal';
import { AppDatabase, Major, Curriculum, CurriculumItem, ClassProgress, Subject } from '../types';
import { calculateAllQuotas } from '../services/schedulerService';

interface CurriculumManagementProps {
  db: AppDatabase;
  onUpdateDb: (updater: (prev: AppDatabase) => AppDatabase) => void;
}

export const CurriculumManagement: React.FC<CurriculumManagementProps> = ({ db, onUpdateDb }) => {
  const [activeTab, setActiveTab] = useState<'majors' | 'curriculums' | 'progress'>('majors');
  
  // Majors State
  const [editingMajor, setEditingMajor] = useState<Major | null>(null);
  const [majorCode, setMajorCode] = useState('');
  const [majorName, setMajorName] = useState('');
  const [deleteMajorTarget, setDeleteMajorTarget] = useState<Major | null>(null);
  const [deleteCurriculumTarget, setDeleteCurriculumTarget] = useState<Curriculum | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<string | null>(null);
  
  // Progress Manual Edit State
  const [editingRemainingId, setEditingRemainingId] = useState<string | null>(null);
  const [editingRemainingValue, setEditingRemainingValue] = useState<number | ''>('');
  const [confirmOverrideTarget, setConfirmOverrideTarget] = useState<{subjectId: string, subjectName: string, oldValue: number, newValue: number, note: string} | null>(null);
  const [showLogsTarget, setShowLogsTarget] = useState<{subjectId: string, subjectName: string} | null>(null);
  
  // Curriculum State
  const [selectedMajorId, setSelectedMajorId] = useState<string>('');
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [currName, setCurrName] = useState('');
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>('');
  
  // Curriculum Item State
  const [editingItem, setEditingItem] = useState<CurriculumItem | null>(null);
  const [itemSubjectId, setItemSubjectId] = useState('');
  const [itemTheory, setItemTheory] = useState<number>(0);
  const [itemPractice, setItemPractice] = useState<number>(0);
  const [itemClinical, setItemClinical] = useState<number>(0);
  const [itemTest, setItemTest] = useState<number>(0);
  
  // Progress State
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [progressFilter, setProgressFilter] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all');

  const majors = db.majors || [];
  const curriculums = db.curriculums || [];
  const subjects = db.subjects || [];
  const quotas = useMemo(() => calculateAllQuotas(db), [db]);

  // Handlers for Majors
  const handleSaveMajor = () => {
    if (!majorCode.trim() || !majorName.trim()) return;
    onUpdateDb(prev => {
      const prevMajors = prev.majors || [];
      if (editingMajor) {
        return { ...prev, majors: prevMajors.map(m => m.id === editingMajor.id ? { ...m, code: majorCode, name: majorName } : m) };
      }
      return { ...prev, majors: [...prevMajors, { id: `major-${Date.now()}`, code: majorCode, name: majorName, order: prevMajors.length + 1 }] };
    });
    setEditingMajor(null); setMajorCode(''); setMajorName('');
  };
  
  const handleDeleteMajor = (id: string) => {
    const major = majors.find(m => m.id === id);
    if (major) setDeleteMajorTarget(major);
  };
  const confirmDeleteMajor = () => {
    if (!deleteMajorTarget) return;
    onUpdateDb(prev => ({ ...prev, majors: (prev.majors || []).filter(m => m.id !== deleteMajorTarget.id) }));
    setDeleteMajorTarget(null);
  };

    const confirmOverrideRemaining = () => {
    if (!confirmOverrideTarget || !selectedClassId || !activeCurriculum) return;
    
    onUpdateDb(prev => {
      const progresses = prev.classProgresses || [];
      const existingIdx = progresses.findIndex(p => p.classId === selectedClassId);
      
      const newLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        subjectId: confirmOverrideTarget.subjectId,
        oldValue: confirmOverrideTarget.oldValue,
        newValue: confirmOverrideTarget.newValue,
        note: confirmOverrideTarget.note
      };
      
      let curProg = existingIdx >= 0 ? { ...progresses[existingIdx] } : {
        classId: selectedClassId, curriculumId: activeCurriculum.id, completedTheory: {}, completedPractice: {}, completedClinical: {}, plannedSemester: 1, remainingOverrides: {}, progressLogs: []
      };
      
      curProg.remainingOverrides = { ...curProg.remainingOverrides, [confirmOverrideTarget.subjectId]: confirmOverrideTarget.newValue };
      curProg.progressLogs = [...(curProg.progressLogs || []), newLog];
      
      const newProgresses = [...progresses];
      if (existingIdx >= 0) newProgresses[existingIdx] = curProg;
      else newProgresses.push(curProg);
      
      return { ...prev, classProgresses: newProgresses };
    });
    
    setConfirmOverrideTarget(null);
    setEditingRemainingId(null);
  };

  // Handlers for Curriculums
  const handleSaveCurriculum = () => {
    if (!currName.trim() || !selectedMajorId) return;
    onUpdateDb(prev => {
      const prevCurrs = prev.curriculums || [];
      if (editingCurriculum) {
        return { ...prev, curriculums: prevCurrs.map(c => c.id === editingCurriculum.id ? { ...c, name: currName } : c) };
      }
      return { ...prev, curriculums: [...prevCurrs, { id: `curr-${Date.now()}`, majorId: selectedMajorId, name: currName, items: [] }] };
    });
    setEditingCurriculum(null); setCurrName('');
  };
  
  const handleDeleteCurriculum = (id: string) => {
    const curr = curriculums.find(c => c.id === id);
    if (curr) setDeleteCurriculumTarget(curr);
  };
  const confirmDeleteCurriculum = () => {
    if (!deleteCurriculumTarget) return;
    onUpdateDb(prev => ({ ...prev, curriculums: (prev.curriculums || []).filter(c => c.id !== deleteCurriculumTarget.id) }));
    if (selectedCurriculumId === deleteCurriculumTarget.id) setSelectedCurriculumId('');
    setDeleteCurriculumTarget(null);
  };

  // Handlers for Curriculum Items
  const handleSubjectSelect = (subId: string) => {
    setItemSubjectId(subId);
    const sub = subjects.find(s => s.id === subId);
    if (sub) {
      setItemTheory(sub.theoryPeriods);
      setItemPractice(sub.practicePeriods);
      setItemClinical(sub.clinicalPeriods);
      setItemTest(sub.testPeriods || 0);
    }
  };

  const handleSaveItem = () => {
    if (!selectedCurriculumId || !itemSubjectId) return;
    onUpdateDb(prev => {
      const prevCurrs = prev.curriculums || [];
      return {
        ...prev,
        curriculums: prevCurrs.map(c => {
          if (c.id === selectedCurriculumId) {
            if (editingItem) {
              return {
                ...c,
                items: c.items.map(i => i.id === editingItem.id ? { ...i, subjectId: itemSubjectId, theoryPeriods: itemTheory, practicePeriods: itemPractice, clinicalPeriods: itemClinical, testPeriods: itemTest } : i)
              };
            }
            return {
              ...c,
              items: [...c.items, { id: `item-${Date.now()}`, subjectId: itemSubjectId, theoryPeriods: itemTheory, practicePeriods: itemPractice, clinicalPeriods: itemClinical, testPeriods: itemTest }]
            };
          }
          return c;
        })
      };
    });
    setEditingItem(null); setItemSubjectId(''); setItemTheory(0); setItemPractice(0); setItemClinical(0); setItemTest(0);
  };
  
  const handleDeleteItem = (itemId: string) => {
    setDeleteItemTarget(itemId);
  };
  const confirmDeleteItem = () => {
    if (!deleteItemTarget) return;
    onUpdateDb(prev => ({
      ...prev,
      curriculums: (prev.curriculums || []).map(c => c.id === selectedCurriculumId ? { ...c, items: c.items.filter(i => i.id !== deleteItemTarget) } : c)
    }));
    setDeleteItemTarget(null);
  };

  
  
  
  
  const handleExportWord = () => {
    if (!selectedCurriculumId) return;
    const activeCurr = curriculums.find(c => c.id === selectedCurriculumId);
    if (!activeCurr) return;

    let html = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>CTDT</title></head><body>";
    html += "<h2 style='text-align: center;'>CHƯƠNG TRÌNH ĐÀO TẠO: " + activeCurr.name + "</h2>";
    html += "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    html += "<tr><th>Mã môn học (MĐ)</th><th>Tên môn học</th><th>TC</th><th>Tổng số tiết</th><th>Lý thuyết</th><th>Thực hành</th><th>Lâm sàng</th><th>Kiểm tra</th></tr>";

    activeCurr.items.forEach(item => {
      const sub = subjects.find(s => s.id === item.subjectId);
      const total = item.theoryPeriods + item.practicePeriods + item.clinicalPeriods + (item.testPeriods || 0);
      html += "<tr>" +
        "<td>" + (sub?.code || '') + "</td>" +
        "<td>" + (sub?.name || '') + "</td>" +
        "<td style='text-align: center;'>" + (sub?.credits || 0) + "</td>" +
        "<td style='text-align: center;'>" + total + "</td>" +
        "<td style='text-align: center;'>" + item.theoryPeriods + "</td>" +
        "<td style='text-align: center;'>" + item.practicePeriods + "</td>" +
        "<td style='text-align: center;'>" + item.clinicalPeriods + "</td>" +
        "<td style='text-align: center;'>" + (item.testPeriods || 0) + "</td>" +
      "</tr>";
    });

    html += "</table></body></html>";

    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword'
    });
    const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    const link = document.createElement('a');
    link.href = url;
    link.download = "CTDT_" + activeCurr.name.replace(/\s+/g, '_') + ".doc";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (!selectedCurriculumId) return;
    const activeCurr = curriculums.find(c => c.id === selectedCurriculumId);
    if (!activeCurr) return;

    let exportData = activeCurr.items.map(item => {
      const sub = subjects.find(s => s.id === item.subjectId);
      return {
        'Mã môn học (MĐ)': sub?.code || '',
        'Tên môn học': sub?.name || '',
        'TC': sub?.credits || 0,
        'Tổng số tiết': item.theoryPeriods + item.practicePeriods + item.clinicalPeriods + (item.testPeriods || 0),
        'Lý thuyết': item.theoryPeriods,
        'Thực hành': item.practicePeriods,
        'Lâm sàng': item.clinicalPeriods,
        'Kiểm tra': item.testPeriods || 0,
      };
    });

    if (exportData.length === 0) {
      exportData = [{
        'Mã môn học (MĐ)': 'MĐ 01',
        'Tên môn học': 'Giáo dục chính trị',
        'TC': 2,
        'Tổng số tiết': 30,
        'Lý thuyết': 15,
        'Thực hành': 15,
        'Lâm sàng': 0,
        'Kiểm tra': 0,
      }];
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CTDT');
    XLSX.writeFile(workbook, `CTDT_${activeCurr.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCurriculumId) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        onUpdateDb(prev => {
          const prevSubjects = [...(prev.subjects || [])];
          const newItems: CurriculumItem[] = [];

          data.forEach(row => {
            const code = row['Mã môn học (MĐ)']?.toString().trim() || row['Mã môn học']?.toString().trim();
            const name = row['Tên môn học']?.toString().trim();
            const credits = Number(row['TC']) || 0;
            const theory = Number(row['Lý thuyết']) || 0;
            const practice = Number(row['Thực hành']) || 0;
            const clinical = Number(row['Lâm sàng']) || 0;
            const test = Number(row['Kiểm tra']) || 0;

            if (!code || !name) return;

            let sub = prevSubjects.find(s => s.code === code);
            if (!sub) {
              sub = {
                id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                code,
                name,
                credits,
                theoryPeriods: theory,
                practicePeriods: practice,
                clinicalPeriods: clinical,
                testPeriods: test,
                totalPeriods: theory + practice + clinical + test,
                colorBg: '#f3f4f6',
                colorText: '#1f2937',
                colorBorder: '#d1d5db'
              };
              prevSubjects.push(sub);
            }

            newItems.push({
              id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              subjectId: sub.id,
              theoryPeriods: theory,
              practicePeriods: practice,
              clinicalPeriods: clinical,
              testPeriods: test
            });
          });

          const prevCurrs = prev.curriculums || [];
          return {
            ...prev,
            subjects: prevSubjects,
            curriculums: prevCurrs.map(c => 
              c.id === selectedCurriculumId 
                ? { ...c, items: [...c.items, ...newItems] } 
                : c
            )
          };
        });
        
        alert('Nhập dữ liệu thành công!');
      } catch (error) {
        console.error(error);
        alert('Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.');
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };

  // Progress Handlers
  const selectedClass = db.classes.find(c => c.id === selectedClassId);
  const activeCurriculum = curriculums.find(c => c.id === selectedClass?.curriculumId);
  const classProgress = (db.classProgresses || []).find(p => p.classId === selectedClassId);

  const handleUpdateProgress = (subjectId: string, type: 'LT' | 'TH' | 'LS', value: number) => {
    if (!selectedClassId || !activeCurriculum) return;
    onUpdateDb(prev => {
      const progresses = prev.classProgresses || [];
      const existingIdx = progresses.findIndex(p => p.classId === selectedClassId);
      const curProg = existingIdx >= 0 ? progresses[existingIdx] : {
        classId: selectedClassId, curriculumId: activeCurriculum.id, completedTheory: {}, completedPractice: {}, completedClinical: {}, plannedSemester: 1
      };
      
      if (type === 'LT') curProg.completedTheory[subjectId] = value;
      if (type === 'TH') curProg.completedPractice[subjectId] = value;
      if (type === 'LS') curProg.completedClinical[subjectId] = value;
      
      const newProgresses = [...progresses];
      if (existingIdx >= 0) newProgresses[existingIdx] = curProg;
      else newProgresses.push(curProg);
      
      return { ...prev, classProgresses: newProgresses };
    });
  };

  
  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              Chương trình đào tạo
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Thiết lập Ngành đào tạo, CTĐT và theo dõi tiến độ của từng lớp.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button onClick={() => setActiveTab('majors')} className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === 'majors' ? 'text-indigo-700 bg-white border-b-2 border-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>1. Ngành Đào tạo</button>
            <button onClick={() => setActiveTab('curriculums')} className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === 'curriculums' ? 'text-indigo-700 bg-white border-b-2 border-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>2. Chương trình (CTĐT)</button>
            <button onClick={() => setActiveTab('progress')} className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === 'progress' ? 'text-indigo-700 bg-white border-b-2 border-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>3. Tiến độ Lớp học</button>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'majors' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-end gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-40">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mã Ngành</label>
                    <input type="text" value={majorCode} onChange={e => setMajorCode(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="VD: DD" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên Ngành</label>
                    <input type="text" value={majorName} onChange={e => setMajorName(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="VD: Điều dưỡng" />
                  </div>
                  <button onClick={handleSaveMajor} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm">
                    {editingMajor ? 'Cập Nhật' : 'Thêm Ngành'}
                  </button>
                  {editingMajor && (
                    <button onClick={() => { setEditingMajor(null); setMajorCode(''); setMajorName(''); }} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-lg shadow-sm">
                      Hủy
                    </button>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="p-3 border-b border-slate-200 font-bold">Mã Ngành</th>
                        <th className="p-3 border-b border-slate-200 font-bold">Tên Ngành</th>
                        <th className="p-3 border-b border-slate-200 font-bold w-32 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {majors.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 text-sm font-semibold text-slate-700">{m.code}</td>
                          <td className="p-3 text-sm font-bold text-slate-900">{m.name}</td>
                          <td className="p-3 flex justify-center gap-2">
                            <button onClick={() => { setEditingMajor(m); setMajorCode(m.code); setMajorName(m.name); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteMajor(m.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                      {majors.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-500">Chưa có ngành đào tạo nào.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {activeTab === 'curriculums' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4 lg:border-r border-slate-200 lg:pr-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Chọn Ngành đào tạo</label>
                    <select value={selectedMajorId} onChange={e => { setSelectedMajorId(e.target.value); setSelectedCurriculumId(''); }} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">-- Chọn ngành --</option>
                      {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  
                  {selectedMajorId && (
                    <>
                      <div className="flex gap-2">
                        <input type="text" value={currName} onChange={e => setCurrName(e.target.value)} placeholder="Tên CTĐT mới..." className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={handleSaveCurriculum} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm">
                          {editingCurriculum ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                        {editingCurriculum && (
                          <button onClick={() => { setEditingCurriculum(null); setCurrName(''); }} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        {curriculums.filter(c => c.majorId === selectedMajorId).map(c => (
                          <div key={c.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${selectedCurriculumId === c.id ? 'bg-indigo-50 border-indigo-300 text-indigo-900' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`} onClick={() => setSelectedCurriculumId(c.id)}>
                            <span className="font-semibold text-sm">{c.name}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); setEditingCurriculum(c); setCurrName(c.name); }} className="p-1 text-slate-500 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteCurriculum(c.id); }} className="p-1 text-slate-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                
                <div className="lg:col-span-2">
                  {selectedCurriculumId ? (() => {
                    const activeCurr = curriculums.find(c => c.id === selectedCurriculumId);
                    if (!activeCurr) return null;
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-800 text-lg">Danh sách môn học: {activeCurr.name}</h3>
                          <div className="flex gap-2">
                            <button onClick={handleExportWord} className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition">
                              <FileDown className="w-4 h-4" /> Xuất Word
                            </button>
                            <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition">
                              <FileDown className="w-4 h-4" /> Xuất Excel
                            </button>
                            <label className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition cursor-pointer" title="Hỗ trợ file Excel (.xlsx, .xls)">
                              <FileUp className="w-4 h-4" /> Nhập Excel
                              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
                            </label>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-end gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex-[2] min-w-[200px]">
                            <label className="block text-xs font-bold text-slate-700 mb-1">Môn học</label>
                            <select value={itemSubjectId} onChange={e => handleSubjectSelect(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                              <option value="">-- Chọn môn học --</option>
                              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                            </select>
                          </div>
                          <div className="w-16 sm:w-20">
                            <label className="block text-xs font-bold text-slate-700 mb-1">LT</label>
                            <input type="number" min={0} value={itemTheory} onChange={e => setItemTheory(Number(e.target.value))} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" />
                          </div>
                          <div className="w-16 sm:w-20">
                            <label className="block text-xs font-bold text-slate-700 mb-1">TH</label>
                            <input type="number" min={0} value={itemPractice} onChange={e => setItemPractice(Number(e.target.value))} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" />
                          </div>
                          <div className="w-16 sm:w-20">
                            <label className="block text-xs font-bold text-slate-700 mb-1">LS</label>
                            <input type="number" min={0} value={itemClinical} onChange={e => setItemClinical(Number(e.target.value))} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" />
                          </div>
                          <div className="w-16 sm:w-20">
                            <label className="block text-xs font-bold text-slate-700 mb-1">KT</label>
                            <input type="number" min={0} value={itemTest} onChange={e => setItemTest(Number(e.target.value))} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" />
                          </div>
                          <button onClick={handleSaveItem} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg w-full sm:w-auto mt-2 sm:mt-0">
                            {editingItem ? 'Lưu' : 'Thêm'}
                          </button>
                        </div>
                        
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                <th className="p-3 border-b border-slate-200 font-bold w-24">Mã (MĐ)</th>
                                <th className="p-3 border-b border-slate-200 font-bold">Môn học</th>
                                <th className="p-3 border-b border-slate-200 font-bold text-center w-16">TC</th>
                                <th className="p-3 border-b border-slate-200 font-bold text-center">Lý thuyết</th>
                                <th className="p-3 border-b border-slate-200 font-bold text-center">Thực hành</th>
                                <th className="p-3 border-b border-slate-200 font-bold text-center">Lâm sàng</th>
                                <th className="p-3 border-b border-slate-200 font-bold text-center">Kiểm tra</th>
                                <th className="p-3 border-b border-slate-200 font-bold text-center">Tổng</th>
                                <th className="p-3 border-b border-slate-200 font-bold text-center">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {activeCurr.items.map(item => {
                                const sub = subjects.find(s => s.id === item.subjectId);
                                return (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-3 text-sm text-slate-600 font-medium">{sub?.code || '---'}</td>
                                    <td className="p-3 text-sm font-semibold text-slate-700">{sub?.name || '---'}</td>
                                    <td className="p-3 text-sm text-center font-bold text-slate-700">{sub?.credits || 0}</td>
                                    <td className="p-3 text-sm text-center text-slate-600">{item.theoryPeriods}</td>
                                    <td className="p-3 text-sm text-center text-slate-600">{item.practicePeriods}</td>
                                    <td className="p-3 text-sm text-center text-slate-600">{item.clinicalPeriods}</td>
                                    <td className="p-3 text-sm text-center text-slate-600">{item.testPeriods || 0}</td>
                                    <td className="p-3 text-sm text-center font-bold text-indigo-700">{item.theoryPeriods + item.practicePeriods + item.clinicalPeriods + (item.testPeriods || 0)}</td>
                                    <td className="p-3 flex justify-center gap-2">
                                      <button onClick={() => { setEditingItem(item); setItemSubjectId(item.subjectId); setItemTheory(item.theoryPeriods); setItemPractice(item.practicePeriods); setItemClinical(item.clinicalPeriods); setItemTest(item.testPeriods || 0); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"><Edit2 className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {activeCurr.items.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-500">Chưa có môn học nào trong CTĐT này.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 border-dashed min-h-[300px]">
                      <p className="mb-4">Chọn một chương trình đào tạo để quản lý môn học</p>
                      <button onClick={() => {
                        const templateData = [{
                          'Mã môn học (MĐ)': 'MĐ 01',
                          'Tên môn học': 'Giáo dục chính trị',
                          'TC': 2,
                          'Tổng số tiết': 30,
                          'Lý thuyết': 15,
                          'Thực hành': 15,
                          'Lâm sàng': 0,
                          'Kiểm tra': 0,
                        }];
                        const worksheet = XLSX.utils.json_to_sheet(templateData);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, 'CTDT');
                        XLSX.writeFile(workbook, 'CTDT_Mau.xlsx');
                      }} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold shadow-sm transition">
                        <FileDown className="w-4 h-4 text-emerald-600" />
                        Tải file mẫu Excel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'progress' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-4 lg:border-r border-slate-200 lg:pr-4">
                  <div className="sticky top-0 bg-white z-10 pb-2 border-b border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Chọn Lớp học</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input type="text" placeholder="Tìm lớp..." className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 mb-2" />
                    </div>
                  </div>
                  <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                    {db.classes.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => setSelectedClassId(c.id)}
                        className={`w-full text-left p-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-between ${selectedClassId === c.id ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-slate-100 text-slate-700'}`}
                      >
                        {c.name}
                        {selectedClassId === c.id && <ChevronRight className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="lg:col-span-3">
                  {selectedClassId && selectedClass ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{selectedClass.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded">Sĩ số: {selectedClass.studentCount}</span>
                            <select 
                              value={selectedClass.curriculumId || ''} 
                              onChange={e => {
                                onUpdateDb(prev => ({
                                  ...prev, classes: prev.classes.map(c => c.id === selectedClass.id ? { ...c, curriculumId: e.target.value } : c)
                                }));
                              }}
                              className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-800 rounded px-2 py-1 font-semibold outline-none"
                            >
                              <option value="">-- Gán CTĐT --</option>
                              {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                      
                      {!activeCurriculum ? (
                        <div className="p-8 text-center text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                          Vui lòng gán Chương trình đào tạo cho lớp {selectedClass.name} để theo dõi tiến độ.
                        </div>
                      ) : (
                        <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-slate-800">Tiến độ các môn học</h4>
                          <select 
                            value={progressFilter} 
                            onChange={e => setProgressFilter(e.target.value as any)}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 outline-none"
                          >
                            <option value="all">Tất cả môn học</option>
                            <option value="completed">Đã hoàn thành</option>
                            <option value="in_progress">Đang học</option>
                            <option value="not_started">Chưa học</option>
                          </select>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                                <th className="p-3 border-b border-slate-200 font-bold sticky left-0 bg-slate-50 z-10 w-48 shadow-[1px_0_0_0_#e2e8f0]" rowSpan={2}>Môn học</th>
                                <th className="p-2 border-b border-slate-200 font-bold text-center bg-blue-50/50 border-l" colSpan={4}>Kế hoạch (CTĐT)</th>
                                <th className="p-2 border-b border-slate-200 font-bold text-center bg-emerald-50/50 border-l" colSpan={4}>Đã xếp (Thực tế)</th>
                                <th className="p-2 border-b border-slate-200 font-bold text-center bg-amber-50/50 border-l" rowSpan={2}>Còn lại</th>
                                <th className="p-2 border-b border-slate-200 font-bold text-center bg-purple-50/50 border-l w-32" rowSpan={2}>Tiến độ</th>
                                <th className="p-2 border-b border-slate-200 font-bold text-center bg-slate-50 border-l" rowSpan={2}>Trạng thái</th>
                              </tr>
                              <tr className="bg-slate-100 text-[10px] text-slate-500 font-semibold text-center uppercase tracking-wider">
                                <th className="p-1 border-b border-l border-slate-200 bg-blue-50">LT</th>
                                <th className="p-1 border-b border-slate-200 bg-blue-50">TH</th>
                                <th className="p-1 border-b border-slate-200 bg-blue-50">LS</th>
                                <th className="p-1 border-b border-slate-200 bg-blue-50 font-bold text-blue-700">Tổng</th>
                                <th className="p-1 border-b border-l border-slate-200 bg-emerald-50">LT</th>
                                <th className="p-1 border-b border-slate-200 bg-emerald-50">TH</th>
                                <th className="p-1 border-b border-slate-200 bg-emerald-50">LS</th>
                                <th className="p-1 border-b border-slate-200 bg-emerald-50 font-bold text-emerald-700">Tổng</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">

                              {activeCurriculum.items.map(item => {
                                const sub = subjects.find(s => s.id === item.subjectId);
                                const q = quotas.find(q => q.classId === selectedClassId && q.subjectId === item.subjectId);
                                
                                const totalPlan = q ? q.totalInitial : (item.theoryPeriods + item.practicePeriods + item.clinicalPeriods + (item.testPeriods || 0));
                                const actualLT = q?.usedTheory || 0;
                                const actualTH = q?.usedPractice || 0;
                                const actualLS = q?.usedClinical || 0;
                                const totalActual = actualLT + actualTH + actualLS;
                                
                                const remaining = q ? q.totalRemaining : totalPlan;
                                const isOverridden = q?.hasOverride || false;
                                
                                const percent = q ? q.percentageCompleted : 0;
                                
                                let status = 'not_started';
                                if (q?.isFullyFinished) status = 'completed';
                                else if (totalActual > 0) status = 'in_progress';

                                if (progressFilter !== 'all' && progressFilter !== status) return null;

                                return (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-sm font-semibold text-slate-800 sticky left-0 bg-white shadow-[1px_0_0_0_#e2e8f0] truncate" title={sub?.name}>{sub?.name || '---'}</td>
                                    
                                    <td className="p-2 text-sm text-center border-l border-slate-100 text-blue-900 bg-blue-50/20">{q ? q.initialTheory : item.theoryPeriods}</td>
                                    <td className="p-2 text-sm text-center text-blue-900 bg-blue-50/20">{q ? q.initialPractice : item.practicePeriods}</td>
                                    <td className="p-2 text-sm text-center text-blue-900 bg-blue-50/20">{q ? q.initialClinical : item.clinicalPeriods}</td>
                                    <td className="p-2 text-sm text-center font-bold text-blue-700 bg-blue-100/40">{totalPlan}</td>
                                    
                                    <td className="p-2 text-sm text-center border-l border-slate-100 text-emerald-700 bg-emerald-50/20">{actualLT}</td>
                                    <td className="p-2 text-sm text-center text-emerald-700 bg-emerald-50/20">{actualTH}</td>
                                    <td className="p-2 text-sm text-center text-emerald-700 bg-emerald-50/20">{actualLS}</td>
                                    <td className="p-2 text-sm text-center font-bold text-emerald-700 bg-emerald-100/40">{totalActual}</td>
                                    
                                    <td className="p-2 text-sm text-center border-l border-slate-100 font-bold text-amber-600 bg-amber-50/20 relative group">
                                        <div className="flex flex-col items-center">
                                          <span>{remaining}t</span>
                                          {isOverridden && <span className="text-[9px] text-amber-700">(Đã can thiệp)</span>}
                                        </div>
                                    </td>
                                    
                                    <td className="p-2 text-sm border-l border-slate-100 min-w-[120px]">
                                      <div className="flex items-center justify-between text-[10px] font-semibold mb-1 text-slate-600">
                                        <span>{percent}%</span>
                                      </div>
                                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full transition-all ${status === 'completed' ? 'bg-emerald-500' : percent > 60 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                                          style={{ width: `${percent}%` }}
                                        />
                                      </div>
                                    </td>
                                    
                                    <td className="p-2 text-sm text-center border-l border-slate-100">
                                      {status === 'completed' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                          <Check className="w-3 h-3" /> Hoàn thành
                                        </span>
                                      ) : status === 'in_progress' ? (
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 whitespace-nowrap">
                                          Đang học
                                        </span>
                                      ) : (
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 whitespace-nowrap">
                                          Chưa học
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}

                              {activeCurriculum.items.length === 0 && <tr><td colSpan={12} className="p-6 text-center text-slate-500">Chương trình này chưa có môn học nào.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full min-h-[300px] flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                      Chọn một lớp học để xem và cập nhật tiến độ
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      <ConfirmModal
        isOpen={!!deleteMajorTarget}
        title="Xóa Ngành Đào Tạo"
        message={
          <>
            Bạn có CHẮC CHẮN muốn xóa ngành <strong>{deleteMajorTarget?.name}</strong> không? 
            <br/><br/>
            Tất cả các Chương trình đào tạo thuộc ngành này cũng có thể bị ảnh hưởng.
          </>
        }
        icon="alert"
        confirmVariant="danger"
        confirmText="Xóa Ngành"
        onConfirm={confirmDeleteMajor}
        onClose={() => setDeleteMajorTarget(null)}
      />
      <ConfirmModal
        isOpen={!!deleteCurriculumTarget}
        title="Xóa Chương Trình Đào Tạo"
        message={<>Xóa chương trình đào tạo <strong>{deleteCurriculumTarget?.name}</strong>?</>}
        icon="trash"
        confirmVariant="danger"
        confirmText="Xóa CTĐT"
        onConfirm={confirmDeleteCurriculum}
        onClose={() => setDeleteCurriculumTarget(null)}
      />
      <ConfirmModal
        isOpen={!!deleteItemTarget}
        title="Xóa Môn Học"
        message="Bạn có chắc chắn muốn xóa môn học này khỏi CTĐT?"
        icon="trash"
        confirmVariant="danger"
        confirmText="Xóa Môn Học"
        onConfirm={confirmDeleteItem}
        onClose={() => setDeleteItemTarget(null)}
      />
    </div>
  );
};
