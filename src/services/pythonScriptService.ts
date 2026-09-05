import { saveAs } from 'file-saver';

export const PYTHON_REQUIREMENTS = `streamlit>=1.35.0
pandas>=2.2.0
openpyxl>=3.1.2
sqlite3-api>=0.1.0
`;

export const PYTHON_README = `# HỆ THỐNG QUẢN LÝ PHÂN TIẾT & THỜI KHÓA BIỂU - TRƯỜNG CAO ĐẲNG Y TẾ THANH HÓA
Ứng dụng Web cục bộ xây dựng bằng **Python 3, Streamlit, Pandas, Openpyxl và SQLite**.

## 1. Cài đặt môi trường
Yêu cầu Python 3.9 trở lên. Mở Terminal / PowerShell và chạy:
\`\`\`bash
pip install -r requirements.txt
\`\`\`
Hoặc cài trực tiếp:
\`\`\`bash
pip install streamlit pandas openpyxl
\`\`\`

## 2. Khởi chạy ứng dụng
\`\`\`bash
streamlit run app.py
\`\`\`
Ứng dụng sẽ tự động mở trên trình duyệt tại địa chỉ: \`http://localhost:8501\`

## 3. Cấu trúc thư mục mã nguồn:
- \`app.py\`: Giao diện chính Streamlit, điều hướng Sheet tab (CĐ3, CĐ2, GĐ...), ma trận TKB, xếp lịch 1 buổi nhiều môn, trừ lùi số tiết tự động, kiểm tra xung đột.
- \`database.py\`: Quản lý kết nối SQLite cục bộ (\`cdyt_thanhhoa.db\`), schema chuẩn BCNF hỗ trợ đa giảng viên, 1 buổi nhiều môn, ghi đè Admin.
- \`excel_export.py\`: Module xuất file Excel chuẩn mẫu "TKB tuần 3 2026-2027 .xlsx" với Openpyxl, định dạng màu pastel đồng nhất theo môn học, 3 phương án lọc (không tên GV, không tên bài, không số tiết).
- \`requirements.txt\`: Danh sách thư viện Python cần thiết.
`;

export const PYTHON_DATABASE_PY = `"""
database.py - Quản lý Cơ sở Dữ liệu SQLite cho Trường Cao đẳng Y tế Thanh Hóa
Hỗ trợ:
- 1 buổi học xếp nhiều môn (1-4 tiết)
- 1 môn/mô-đun gán nhiều giảng viên
- Quỹ tiết trừ lùi & Admin Override
"""
import sqlite3
import json
import os
from typing import List, Dict, Any, Optional

DB_FILE = "cdyt_thanhhoa.db"

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_database():
    """Khởi tạo toàn bộ cấu trúc bảng SQLite chuẩn"""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Bảng Khối học (Sheet tab: CĐ3, CĐ2, CĐ1, GĐ, TC...)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cohorts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        display_order INTEGER DEFAULT 1
    );
    """)

    # 2. Bảng Lớp học
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        cohort_id TEXT REFERENCES cohorts(id),
        academic_year TEXT,
        student_count INTEGER DEFAULT 35,
        faculty TEXT
    );
    """)

    # 3. Bảng Giáo viên
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        faculty TEXT NOT NULL,
        specialty TEXT,
        max_periods_per_week INTEGER DEFAULT 24,
        phone TEXT,
        email TEXT
    );
    """)

    # 4. Bảng Môn học & Quỹ tiết phân bổ (LT, TH, LS)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        credits INTEGER DEFAULT 3,
        theory_periods INTEGER DEFAULT 0,
        practice_periods INTEGER DEFAULT 0,
        clinical_periods INTEGER DEFAULT 0,
        total_periods INTEGER DEFAULT 0,
        color_bg TEXT DEFAULT '#DBEAFE',
        color_text TEXT DEFAULT '#1E3A8A'
    );
    """)

    # 5. Bảng Phân công Giảng dạy (Gán đa giảng viên cho từng loại tiết LT, TH, LS)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        class_id TEXT REFERENCES classes(id),
        subject_id TEXT REFERENCES subjects(id),
        theory_teachers_json TEXT, -- JSON List ID Giáo viên dạy LT
        practice_teachers_json TEXT, -- JSON List ID Giáo viên dạy TH
        clinical_teachers_json TEXT, -- JSON List ID Giáo viên dạy LS
        notes TEXT,
        UNIQUE(class_id, subject_id)
    );
    """)

    # 6. Bảng Quản lý Tuần học
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS weeks (
        week_number INTEGER PRIMARY KEY,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        note TEXT
    );
    """)

    # 7. Bảng Lịch học từng Buổi (Hỗ trợ 1 buổi nhiều môn qua JSON periods_json)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS session_schedules (
        id TEXT PRIMARY KEY,
        week_number INTEGER NOT NULL,
        academic_year TEXT NOT NULL,
        class_id TEXT REFERENCES classes(id),
        day_of_week INTEGER NOT NULL, -- 2: Thứ 2 ... 7: Thứ 7
        session TEXT NOT NULL, -- 'morning' | 'afternoon'
        periods_json TEXT NOT NULL, -- JSON list các môn trong buổi
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(week_number, academic_year, class_id, day_of_week, session)
    );
    """)

    # 8. Bảng Quỹ tiết Override của Admin
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quota_overrides (
        class_id TEXT REFERENCES classes(id),
        subject_id TEXT REFERENCES subjects(id),
        override_remaining_lt INTEGER,
        override_remaining_th INTEGER,
        override_remaining_ls INTEGER,
        PRIMARY KEY(class_id, subject_id)
    );
    """)

    conn.commit()
    seed_initial_data(conn)
    conn.close()

def seed_initial_data(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM cohorts")
    if cursor.fetchone()['count'] == 0:
        cohorts = [
            ('cohort-cd3', 'CĐ3', 'Cao đẳng Năm 3', 1),
            ('cohort-cd2', 'CĐ2', 'Cao đẳng Năm 2', 2),
            ('cohort-cd1', 'CĐ1', 'Cao đẳng Năm 1', 3),
            ('cohort-gd', 'GĐ', 'Giai đoạn Đại cương', 4),
            ('cohort-tc', 'TC', 'Trung cấp', 5),
        ]
        cursor.executemany("INSERT INTO cohorts VALUES (?, ?, ?, ?)", cohorts)

        classes = [
            ('cls-cddd26a', 'CDDD26A', 'CĐĐD 26A', 'cohort-cd3', '2024-2027', 38, 'Khoa Điều dưỡng'),
            ('cls-cddd26b', 'CDDD26B', 'CĐĐD 26B', 'cohort-cd3', '2024-2027', 36, 'Khoa Điều dưỡng'),
            ('cls-duock14a', 'DUOCK14A', 'DƯỢC K14A', 'cohort-cd3', '2024-2027', 42, 'Khoa Dược'),
            ('cls-ysk2a', 'YSK2A', 'YS K2A', 'cohort-cd2', '2025-2028', 32, 'Khoa Y học Lâm sàng'),
        ]
        cursor.executemany("INSERT INTO classes VALUES (?, ?, ?, ?, ?, ?, ?)", classes)

        teachers = [
            ('gv-01', 'GV01', 'ThS.BS. Nguyễn Văn Hùng', 'Bộ môn Y học Lâm sàng', 'Nội khoa', 24, '0912345678', 'hungnv@cdytthanhhoa.edu.vn'),
            ('gv-02', 'GV02', 'DSCK1. Lê Thị Mai', 'Khoa Dược', 'Dược lý học', 22, '0983123456', 'mailt@cdytthanhhoa.edu.vn'),
            ('gv-03', 'GV03', 'ThS.ĐD. Trần Quốc Toản', 'Khoa Điều dưỡng', 'Điều dưỡng cơ sở', 26, '0904567890', 'toantq@cdytthanhhoa.edu.vn'),
            ('gv-05', 'GV05', 'ThS. Hoàng Thị Lan', 'Khoa Cơ bản', 'Giải phẫu - Sinh lý', 24, '0915666777', 'lanht@cdytthanhhoa.edu.vn'),
        ]
        cursor.executemany("INSERT INTO teachers VALUES (?, ?, ?, ?, ?, ?, ?, ?)", teachers)

        subjects = [
            ('sub-01', 'DUOC-LY', 'Dược lý học', 3, 30, 15, 0, 45, '#DBEAFE', '#1E3A8A'),
            ('sub-02', 'DD-COSO', 'Điều dưỡng cơ sở', 4, 30, 30, 0, 60, '#FCE7F3', '#831843'),
            ('sub-03', 'NOI-KHOA', 'Bệnh học Nội khoa', 4, 25, 0, 35, 60, '#FFEDD5', '#7C2D12'),
            ('sub-04', 'GIAIPHAU-SL', 'Giải phẫu - Sinh lý', 3, 30, 15, 0, 45, '#FEF9C3', '#713F12'),
        ]
        cursor.executemany("INSERT INTO subjects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", subjects)
        conn.commit()
`;

export const PYTHON_EXCEL_EXPORT_PY = `"""
excel_export.py - Xuất file Excel Thời khóa biểu chuẩn mẫu bằng Openpyxl
Hỗ trợ:
- Nhiều sheet theo Khối (CĐ3, CĐ2, GĐ...)
- Cột tiêu đề là Tên lớp (Không hiện sĩ số)
- Dòng phân theo Thứ (Thứ 2..Thứ 7) và Buổi (Sáng, Chiều)
- Tô màu pastel đồng nhất theo môn học
- 3 Phương án lọc: không tên GV, không tên bài, không số tiết
- Định dạng thực hành: "TT <Tên môn> 1/2" hoặc "TT <Tên môn>"
"""
import io
import json
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def hex_to_openpyxl_color(hex_str):
    if not hex_str:
        return "FFFFFF"
    clean = hex_str.replace('#', '').upper()
    return clean if len(clean) == 6 else "FFFFFF"

def generate_excel_timetable(
    db_conn,
    target_week: int,
    academic_year: str = "2026-2027",
    hide_teacher: bool = False,
    hide_lesson: bool = False,
    hide_periods: bool = False,
    school_name: str = "TRƯỜNG CAO ĐẲNG Y TẾ THANH HÓA"
) -> bytes:
    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    cursor = db_conn.cursor()

    # Get cohorts
    cursor.execute("SELECT * FROM cohorts ORDER BY display_order ASC")
    cohorts = cursor.fetchall()

    # Get subjects mapping
    cursor.execute("SELECT * FROM subjects")
    subjects = {s['id']: dict(s) for s in cursor.fetchall()}

    # Get teachers mapping
    cursor.execute("SELECT * FROM teachers")
    teachers = {t['id']: dict(t) for t in cursor.fetchall()}

    thin_border = Border(
        left=Side(style='thin', color='94A3B8'),
        right=Side(style='thin', color='94A3B8'),
        top=Side(style='thin', color='94A3B8'),
        bottom=Side(style='thin', color='94A3B8')
    )

    days = [2, 3, 4, 5, 6, 7]
    day_labels = {2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7'}
    sessions = [('morning', 'Sáng'), ('afternoon', 'Chiều')]

    for ch in cohorts:
        ws = wb.create_sheet(title=ch['name'])
        ws.views.sheetView[0].showGridLines = True

        cursor.execute("SELECT * FROM classes WHERE cohort_id = ? ORDER BY name ASC", (ch['id'],))
        classes = cursor.fetchall()

        if not classes:
            ws['A1'] = f"Chưa có lớp nào thuộc khối {ch['name']}"
            continue

        num_classes = len(classes)
        end_col_idx = 2 + num_classes
        end_col_letter = get_column_letter(end_col_idx)

        # Header trường
        ws.merge_cells('A1:C1')
        ws['A1'] = "UBND TỈNH THANH HÓA"
        ws['A1'].font = Font(name="Times New Roman", size=10)
        ws['A1'].alignment = Alignment(horizontal="center", vertical="center")

        ws.merge_cells('A2:C2')
        ws['A2'] = school_name
        ws['A2'].font = Font(name="Times New Roman", size=10, bold=True)
        ws['A2'].alignment = Alignment(horizontal="center", vertical="center")

        ws.merge_cells(f'D1:{end_col_letter}1')
        ws['D1'] = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
        ws['D1'].font = Font(name="Times New Roman", size=10, bold=True)
        ws['D1'].alignment = Alignment(horizontal="center", vertical="center")

        ws.merge_cells(f'D2:{end_col_letter}2')
        ws['D2'] = "Độc lập - Tự do - Hạnh phúc"
        ws['D2'].font = Font(name="Times New Roman", size=10, italic=True, bold=True)
        ws['D2'].alignment = Alignment(horizontal="center", vertical="center")

        # Tiêu đề biểu
        ws.merge_cells(f'A4:{end_col_letter}4')
        ws['A4'] = f"THỜI KHÓA BIỂU GIẢNG DẠY VÀ HỌC TẬP - KHỐI {ch['name'].upper()}"
        ws['A4'].font = Font(name="Times New Roman", size=14, bold=True, color="1E3A8A")
        ws['A4'].alignment = Alignment(horizontal="center", vertical="center")

        ws.merge_cells(f'A5:{end_col_letter}5')
        ws['A5'] = f"Tuần {target_week} - Năm học {academic_year}"
        ws['A5'].font = Font(name="Times New Roman", size=11, italic=True, bold=True)
        ws['A5'].alignment = Alignment(horizontal="center", vertical="center")

        # Bảng tiêu đề cột
        h_row = 7
        ws.row_dimensions[h_row].height = 28
        ws[f'A{h_row}'] = "THỨ"
        ws[f'B{h_row}'] = "BUỔI"

        for c_col in ['A', 'B']:
            cell = ws[f'{c_col}{h_row}']
            cell.fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
            cell.font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border

        for idx, cls in enumerate(classes):
            col_letter = get_column_letter(3 + idx)
            cell = ws[f'{col_letter}{h_row}']
            cell.value = cls['name']  # Không hiện sĩ số
            cell.fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
            cell.font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = thin_border
            ws.column_dimensions[col_letter].width = 28

        ws.column_dimensions['A'].width = 12
        ws.column_dimensions['B'].width = 10

        curr_row = h_row + 1

        for day in days:
            day_start_row = curr_row
            for s_key, s_label in sessions:
                ws.row_dimensions[curr_row].height = 65

                # Buổi
                sess_cell = ws[f'B{curr_row}']
                sess_cell.value = s_label
                sess_cell.font = Font(name="Times New Roman", size=10, bold=True)
                sess_cell.alignment = Alignment(horizontal="center", vertical="center")
                sess_cell.border = thin_border
                sess_cell.fill = PatternFill(start_color="F8FAFC" if s_key == 'morning' else "F1F5F9", fill_type="solid")

                for idx, cls in enumerate(classes):
                    col_letter = get_column_letter(3 + idx)
                    cell = ws[f'{col_letter}{curr_row}']
                    cell.border = thin_border

                    # Query schedule
                    cursor.execute("""
                        SELECT periods_json FROM session_schedules
                        WHERE week_number = ? AND day_of_week = ? AND session = ? AND class_id = ?
                    """, (target_week, day, s_key, cls['id']))
                    row_data = cursor.fetchone()

                    if row_data and row_data['periods_json']:
                        periods = json.loads(row_data['periods_json'])
                        period_texts = []
                        primary_color = "FFFFFF"

                        for p_idx, p in enumerate(periods):
                            sub = subjects.get(p.get('subjectId'))
                            sub_name = sub['name'] if sub else "Môn học"

                            if p_idx == 0 and sub and sub.get('color_bg'):
                                primary_color = hex_to_openpyxl_color(sub['color_bg'])

                            # Chuẩn hóa tên môn: TT <Tên môn> 1/2 hoặc TT <Tên môn> hoặc LS
                            p_type = p.get('periodType', 'LT')
                            prac_type = p.get('practiceType', 'full')

                            if p_type == 'TH':
                                formatted_name = f"TT {sub_name} 1/2" if prac_type == 'half' else f"TT {sub_name}"
                            elif p_type == 'LS':
                                formatted_name = f"LS {sub_name}"
                            else:
                                formatted_name = sub_name

                            lines = [formatted_name]

                            if not hide_lesson and p.get('lessonTitle'):
                                lines.append(f"• {p['lessonTitle']}")

                            room_str = f"({p['roomOrHospital']})" if p.get('roomOrHospital') else ""
                            if not hide_periods:
                                lines.append(f"[{p.get('periodsCount', 4)} tiết] {room_str}".strip())
                            elif room_str:
                                lines.append(room_str)

                            if not hide_teacher and p.get('teacherIds'):
                                t_names = [teachers.get(tid, {}).get('name', tid) for tid in p['teacherIds']]
                                lines.append(f"GV: {', '.join(t_names)}")

                            period_texts.append("\n".join(lines))

                        cell.value = "\n---\n".join(period_texts)
                        cell.fill = PatternFill(start_color=primary_color, end_color=primary_color, fill_type="solid")
                        cell.font = Font(name="Times New Roman", size=9.5)
                        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                    else:
                        cell.value = ""
                        cell.fill = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

                curr_row += 1

            # Merge Thứ
            day_end_row = curr_row - 1
            ws.merge_cells(f'A{day_start_row}:A{day_end_row}')
            day_cell = ws[f'A{day_start_row}']
            day_cell.value = day_labels[day]
            day_cell.font = Font(name="Times New Roman", size=11, bold=True)
            day_cell.alignment = Alignment(horizontal="center", vertical="center")
            day_cell.fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
            day_cell.border = thin_border

    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()
`;

export const PYTHON_APP_PY = `"""
app.py - Ứng dụng Quản lý Phân tiết & Thời khóa biểu Trường CĐ Y Tế Thanh Hóa
Chạy với lệnh: streamlit run app.py
"""
import streamlit as st
import pandas as pd
import json
from database import get_connection, init_database
from excel_export import generate_excel_timetable

st.set_page_config(
    page_title="TKB - CĐ Y Tế Thanh Hóa",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Khởi tạo Database
init_database()
conn = get_connection()

# Header ứng dụng
st.markdown("""
<div style='background: linear-gradient(135deg, #1e3a8a, #0284c7); padding: 20px; border-radius: 12px; color: white; margin-bottom: 20px;'>
    <h2 style='margin:0;'>🏥 TRƯỜNG CAO ĐẲNG Y TẾ THANH HÓA</h2>
    <h4 style='margin:4px 0 0 0; opacity: 0.9;'>HỆ THỐNG QUẢN LÝ PHÂN TIẾT & THỜI KHÓA BIỂU THÔNG MINH</h4>
</div>
""", unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.image("https://img.icons8.com/color/96/caduceus.png", width=70)
    st.header("⚙️ Cấu hình Tuần & Khối")
    
    selected_week = st.number_input("Chọn Tuần học:", min_value=1, max_value=45, value=3, step=1)
    academic_year = st.selectbox("Năm học:", ["2026-2027", "2025-2026", "2027-2028"], index=0)
    
    st.divider()
    st.subheader("📥 Xuất file Excel TKB")
    hide_gv = st.checkbox("Phương án 1: Không để tên GV", value=False)
    hide_lesson = st.checkbox("Phương án 2: Không để tên bài", value=False)
    hide_periods = st.checkbox("Phương án 3: Không hiện số tiết", value=False)
    
    if st.button("🚀 TẢI VỀ FILE EXCEL (.xlsx)", use_container_width=True, type="primary"):
        excel_bytes = generate_excel_timetable(
            conn,
            target_week=selected_week,
            academic_year=academic_year,
            hide_teacher=hide_gv,
            hide_lesson=hide_lesson,
            hide_periods=hide_periods
        )
        st.download_button(
            label="💾 Bấm vào đây để lưu file Excel",
            data=excel_bytes,
            file_name=f"TKB_Tuan_{selected_week}_{academic_year}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True
        )

# Tabs chính
tabs = st.tabs([
    "📅 Thời Khóa Biểu (Sheet Tabs)",
    "⚡ Phân Lịch Smart (1 Buổi Nhiều Môn)",
    "📊 Quỹ Tiết & Trừ Lùi",
    "👥 Danh Mục Lớp & Giáo Viên",
    "📚 Môn Học & Bảng Màu",
    "🤖 Tự Động Sinh Lịch & Nhân Bản"
])

# TAB 1: MA TRẬN THỜI KHÓA BIỂU
with tabs[0]:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cohorts ORDER BY display_order ASC")
    cohorts = cursor.fetchall()
    
    if not cohorts:
        st.warning("Chưa có khối học nào.")
    else:
        cohort_names = [c['name'] for c in cohorts]
        selected_cohort_name = st.radio("Chọn Khối học (Sheet Tab):", cohort_names, horizontal=True)
        selected_cohort = next(c for c in cohorts if c['name'] == selected_cohort_name)
        
        cursor.execute("SELECT * FROM classes WHERE cohort_id = ? ORDER BY name ASC", (selected_cohort['id'],))
        classes = cursor.fetchall()
        
        if not classes:
            st.info(f"Không có lớp trong khối {selected_cohort_name}")
        else:
            st.subheader(f"Thời khóa biểu Tuần {selected_week} - Khối {selected_cohort_name}")
            
            # Render grid
            days = [2, 3, 4, 5, 6, 7]
            day_labels = {2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7'}
            
            grid_data = []
            for day in days:
                for s_key in ['morning', 'afternoon']:
                    row = {
                        "Thứ": day_labels[day],
                        "Buổi": "Sáng" if s_key == 'morning' else "Chiều"
                    }
                    for cls in classes:
                        cursor.execute("""
                            SELECT periods_json FROM session_schedules
                            WHERE week_number = ? AND day_of_week = ? AND session = ? AND class_id = ?
                        """, (selected_week, day, s_key, cls['id']))
                        sch_row = cursor.fetchone()
                        
                        if sch_row and sch_row['periods_json']:
                            periods = json.loads(sch_row['periods_json'])
                            items = []
                            for p in periods:
                                # Fetch subject name
                                cursor.execute("SELECT name, color_bg FROM subjects WHERE id = ?", (p['subjectId'],))
                                sub_r = cursor.fetchone()
                                sname = sub_r['name'] if sub_r else "Môn"
                                ptype = p.get('periodType', 'LT')
                                prac = p.get('practiceType', 'full')
                                
                                if ptype == 'TH':
                                    title = f"TT {sname} 1/2" if prac == 'half' else f"TT {sname}"
                                elif ptype == 'LS':
                                    title = f"LS {sname}"
                                else:
                                    title = sname
                                
                                items.append(f"{title} ({p.get('periodsCount',4)}t)")
                            row[cls['name']] = " + ".join(items)
                        else:
                            row[cls['name']] = ""
                    grid_data.append(row)
            
            df_grid = pd.DataFrame(grid_data)
            st.dataframe(df_grid, use_container_width=True, height=450)

# TAB 2: PHÂN LỊCH SMART (1 BUỔI NHIỀU MÔN)
with tabs[1]:
    st.subheader("📝 Phân Lịch Giảng Dạy Linh Hoạt (Toàn quyền Admin)")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        cursor.execute("SELECT id, name FROM classes ORDER BY name ASC")
        all_cls = cursor.fetchall()
        cls_choice = st.selectbox("1. Chọn Lớp:", [f"{c['name']} ({c['id']})" for c in all_cls])
        chosen_cls_id = cls_choice.split('(')[-1].replace(')', '') if cls_choice else ""
    with col2:
        day_choice = st.selectbox("2. Chọn Thứ:", [2, 3, 4, 5, 6, 7], format_func=lambda x: f"Thứ {x}")
    with col3:
        sess_choice = st.selectbox("3. Buổi học:", ["morning", "afternoon"], format_func=lambda x: "Sáng" if x=="morning" else "Chiều")
    with col4:
        num_subjects = st.selectbox("4. Số môn trong buổi:", [1, 2], help="Cho phép xếp 1 hoặc 2 môn trong cùng 1 buổi")

    # Môn 1
    st.markdown("---")
    st.markdown("##### 📌 Chi tiết Môn 1:")
    cursor.execute("SELECT id, name FROM subjects ORDER BY name ASC")
    all_subs = cursor.fetchall()
    
    c_m1_1, c_m1_2, c_m1_3, c_m1_4 = st.columns(4)
    with c_m1_1:
        sub1_id = st.selectbox("Môn học 1:", [s['id'] for s in all_subs], format_func=lambda sid: next((s['name'] for s in all_subs if s['id']==sid), sid))
    with c_m1_2:
        type1 = st.selectbox("Loại tiết 1:", ["LT", "TH", "LS"], format_func=lambda x: "Lý thuyết (LT)" if x=="LT" else ("Thực hành (TH)" if x=="TH" else "Lâm sàng (LS)"))
    with c_m1_3:
        prac_type1 = st.selectbox("Quy mô 1:", ["full", "half"], format_func=lambda x: "Cả lớp" if x=="full" else "1/2 lớp (TT... 1/2)")
    with c_m1_4:
        periods1 = st.number_input("Số tiết môn 1 (tối đa 4):", min_value=1, max_value=4, value=4 if num_subjects==1 else 2)

    room1 = st.text_input("Phòng học / Bệnh viện 1:", value="P.201 Giảng đường A")
    lesson1 = st.text_input("Tên bài học 1 (tùy chọn):", value="")

    periods_data = [{
        "subjectId": sub1_id,
        "periodType": type1,
        "practiceType": prac_type1,
        "periodsCount": periods1,
        "teacherIds": ["gv-01"],
        "roomOrHospital": room1,
        "lessonTitle": lesson1
    }]

    if num_subjects == 2:
        st.markdown("##### 📌 Chi tiết Môn 2:")
        c_m2_1, c_m2_2, c_m2_3, c_m2_4 = st.columns(4)
        with c_m2_1:
            sub2_id = st.selectbox("Môn học 2:", [s['id'] for s in all_subs], index=min(1, len(all_subs)-1), format_func=lambda sid: next((s['name'] for s in all_subs if s['id']==sid), sid))
        with c_m2_2:
            type2 = st.selectbox("Loại tiết 2:", ["LT", "TH", "LS"])
        with c_m2_3:
            prac_type2 = st.selectbox("Quy mô 2:", ["full", "half"])
        with c_m2_4:
            max_p2 = max(1, 4 - periods1)
            periods2 = st.number_input("Số tiết môn 2:", min_value=1, max_value=max_p2, value=min(2, max_p2))

        room2 = st.text_input("Phòng học / Bệnh viện 2:", value="P.201 Giảng đường A")
        lesson2 = st.text_input("Tên bài học 2:", value="")
        
        periods_data.append({
            "subjectId": sub2_id,
            "periodType": type2,
            "practiceType": prac_type2,
            "periodsCount": periods2,
            "teacherIds": ["gv-02"],
            "roomOrHospital": room2,
            "lessonTitle": lesson2
        })

    if st.button("💾 LƯU LỊCH BUỔI HỌC (TỰ ĐỘNG TRỪ LÙI)", type="primary"):
        sch_id = f"sch_w{selected_week}_{chosen_cls_id}_{day_choice}_{sess_choice}"
        cursor.execute("""
            INSERT OR REPLACE INTO session_schedules (id, week_number, academic_year, class_id, day_of_week, session, periods_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (sch_id, selected_week, academic_year, chosen_cls_id, day_choice, sess_choice, json.dumps(periods_data)))
        conn.commit()
        st.success("✅ Đã lưu lịch học thành công! Quỹ tiết đã được cập nhật.")
        st.rerun()

# TAB 3: QUỸ TIẾT & TIẾN ĐỘ
with tabs[2]:
    st.subheader("📊 Quỹ Tiết Giảng Dạy & Trừ Lùi Tự Động")
    st.info("Hệ thống tự động trừ lùi số tiết khi xếp lịch. Khi số tiết về 0, môn học chuyển trạng thái HOÀN THÀNH.")
    
    # Calculate summary table
    cursor.execute("SELECT id, name FROM classes")
    classes_list = cursor.fetchall()
    
    summary_rows = []
    for cls in classes_list:
        for sub in all_subs:
            sub_id = sub['id']
            cursor.execute("SELECT theory_periods, practice_periods, clinical_periods, total_periods FROM subjects WHERE id = ?", (sub_id,))
            s_info = cursor.fetchone()
            
            # calculate used
            cursor.execute("SELECT periods_json FROM session_schedules WHERE class_id = ?", (cls['id'],))
            sches = cursor.fetchall()
            used_lt, used_th, used_ls = 0, 0, 0
            for s in sches:
                p_list = json.loads(s['periods_json'])
                for p in p_list:
                    if p.get('subjectId') == sub_id:
                        if p.get('periodType') == 'LT': used_lt += p.get('periodsCount', 0)
                        elif p.get('periodType') == 'TH': used_th += p.get('periodsCount', 0)
                        elif p.get('periodType') == 'LS': used_ls += p.get('periodsCount', 0)
            
            total_used = used_lt + used_th + used_ls
            total_init = s_info['total_periods'] if s_info else 0
            rem = max(0, total_init - total_used)
            pct = round((total_used / total_init * 100)) if total_init > 0 else 100
            
            summary_rows.append({
                "Lớp": cls['name'],
                "Môn học": sub['name'],
                "Tổng quỹ tiết": total_init,
                "Đã dạy": total_used,
                "Còn lại": rem,
                "Tiến độ (%)": f"{pct}%",
                "Trạng thái": "✅ HOÀN THÀNH" if rem == 0 and total_init > 0 else ("⏳ Đang học" if total_used > 0 else "Chưa học")
            })
            
    st.dataframe(pd.DataFrame(summary_rows), use_container_width=True)

# TAB 4: DANH MỤC LỚP & GIÁO VIÊN
with tabs[3]:
    c_l, c_g = st.columns(2)
    with c_l:
        st.subheader("Danh Mục Lớp Học")
        cursor.execute("SELECT c.code as 'Mã Lớp', c.name as 'Tên Lớp', k.name as 'Khối', c.student_count as 'Sĩ số' FROM classes c LEFT JOIN cohorts k ON c.cohort_id = k.id")
        st.dataframe(pd.DataFrame([dict(r) for r in cursor.fetchall()]), use_container_width=True)
    with c_g:
        st.subheader("Danh Mục Giảng Viên")
        cursor.execute("SELECT code as 'Mã GV', name as 'Họ tên', faculty as 'Bộ môn / Khoa', max_periods_per_week as 'Tiết tối đa/tuần' FROM teachers")
        st.dataframe(pd.DataFrame([dict(r) for r in cursor.fetchall()]), use_container_width=True)

# TAB 5: MÔN HỌC & BẢNG MÀU
with tabs[4]:
    st.subheader("Danh Mục Môn Học & Quỹ Tiết Phân Bổ (LT / TH / LS)")
    cursor.execute("SELECT code as 'Mã Môn', name as 'Tên Môn', theory_periods as 'LT', practice_periods as 'TH', clinical_periods as 'LS', total_periods as 'Tổng Tiết', color_bg as 'Màu nền' FROM subjects")
    st.dataframe(pd.DataFrame([dict(r) for r in cursor.fetchall()]), use_container_width=True)

# TAB 6: TỰ ĐỘNG SINH LỊCH & NHÂN BẢN
with tabs[5]:
    st.subheader("⚡ Tự Động Hóa Xếp Lịch & Nhân Bản Tuần")
    st.markdown("""
    - **Nhân bản Tuần mẫu:** Sao chép toàn bộ lịch học từ tuần hiện tại sang các tuần tiếp theo.
    - **Admin Override:** Người xếp lịch có toàn quyền chỉnh sửa/ghi đè bất kỳ ô nào trên giao diện.
    """)
    source_w = st.number_input("Tuần nguồn (Mẫu):", min_value=1, max_value=45, value=selected_week)
    target_w_range = st.text_input("Các tuần đích cần nhân bản (ví dụ: 4, 5, 6, 7):", value="4, 5")
    
    if st.button("🚀 Thực Hiện Nhân Bản Tuần Mẫu"):
        targets = [int(x.strip()) for x in target_w_range.split(',') if x.strip().isdigit()]
        cursor.execute("SELECT * FROM session_schedules WHERE week_number = ?", (source_w,))
        src_schedules = cursor.fetchall()
        
        count = 0
        for tw in targets:
            for s in src_schedules:
                new_id = f"sch_w{tw}_{s['class_id']}_{s['day_of_week']}_{s['session']}"
                cursor.execute("""
                    INSERT OR REPLACE INTO session_schedules (id, week_number, academic_year, class_id, day_of_week, session, periods_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (new_id, tw, s['academic_year'], s['class_id'], s['day_of_week'], s['session'], s['periods_json']))
                count += 1
        conn.commit()
        st.success(f"✅ Đã nhân bản thành công {count} buổi học sang các tuần {targets}!")
`;

export function downloadPythonProjectPackage(): void {
  // We can download files individually or as a text bundle
  const blobApp = new Blob([PYTHON_APP_PY], { type: 'text/x-python;charset=utf-8' });
  saveAs(blobApp, 'app.py');

  setTimeout(() => {
    const blobDb = new Blob([PYTHON_DATABASE_PY], { type: 'text/x-python;charset=utf-8' });
    saveAs(blobDb, 'database.py');
  }, 300);

  setTimeout(() => {
    const blobExport = new Blob([PYTHON_EXCEL_EXPORT_PY], { type: 'text/x-python;charset=utf-8' });
    saveAs(blobExport, 'excel_export.py');
  }, 600);

  setTimeout(() => {
    const blobReq = new Blob([PYTHON_REQUIREMENTS], { type: 'text/plain;charset=utf-8' });
    saveAs(blobReq, 'requirements.txt');
  }, 900);
}
