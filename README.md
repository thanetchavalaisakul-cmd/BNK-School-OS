# BNK School OS — Frontend V10.7

Static Frontend (HTML/CSS/JavaScript) เชื่อมกับ Supabase โปรเจกต์ **BNK School OS** โดยตรง

## ฟังก์ชันหลัก

### Auth / User Management
- Sign Up / Sign In
- Pending Approval
- Bootstrap Super Admin คนแรก
- Admin Approve / Reject / Suspend / Reactivate
- Assign Role และ Department
- Dashboard ตาม Role
- Notification Center + Realtime refresh

### ระบบส่งแผนการสอน
- Teacher สร้างและแก้ไขแผน
- บันทึก Draft
- แนบ PDF หลายไฟล์ (ไฟล์ละไม่เกิน 20 MB)
- Private Storage + RLS
- ส่งแผนเข้าสู่ Workflow
- Backend บังคับว่าต้องมี PDF อย่างน้อย 1 ไฟล์ก่อน Submit
- Teacher ดูรายการ/สถานะ/Timeline/ไฟล์แนบ
- Head of Department ตรวจ Approve / Send back / Reject
- Director / Super Admin อนุมัติขั้นสุดท้าย
- Signature Manager: Upload PNG/JPG/WebP, ตั้ง Default, Preview, Delete ถ้ายังไม่ถูกใช้งาน
- Backend บังคับ Signature ก่อน Final Approve
- ลายเซ็นที่ถูกใช้ในเอกสารอนุมัติแล้วถูกป้องกันไม่ให้ลบ
- Workflow Timeline จาก `workflow_actions`
- Notification คลิกเพื่อเปิดแผนที่เกี่ยวข้อง
- Realtime สำหรับ `notifications`, `profiles`, `lesson_plans`, `workflow_actions`

## ไฟล์
- `index.html`
- `styles.css`
- `config.js`
- `app.js`
- `supabase-v10.2.sql` — migration reference for V10.2
- `supabase-v10.3.sql` — migration reference for V10.3
- `supabase-v10.4.sql` — migration reference for V10.4
- `supabase-v10.6.sql` — migration reference for V10.6
- `supabase-v10.5.sql` — previous migration reference

## วิธีเปิดใน VS Code

ใช้ Live Server หรือ HTTP server เช่น:

```bash
python -m http.server 5500
```

แล้วเปิด:

```text
http://localhost:5500
```

> ไม่แนะนำให้เปิด `index.html` แบบ `file://` เพราะ ES Modules ต้องใช้ HTTP server

## Deploy บน Vercel

โปรเจกต์นี้เป็น Static Site:
1. Push โฟลเดอร์ขึ้น GitHub
2. Import เข้า Vercel
3. Framework Preset: Other
4. Build Command: เว้นว่าง
5. Output Directory: `.`

## Supabase Auth URL Configuration

ก่อนใช้งาน Production ให้ตั้งใน Supabase Dashboard:

Authentication → URL Configuration

- Site URL = โดเมนจริง
- Redirect URLs = localhost + Vercel preview/production + โดเมนโรงเรียน

## Security

Frontend ใช้เฉพาะ Supabase Publishable Key ซึ่งสามารถอยู่ใน Browser ได้เมื่อข้อมูลถูกคุมด้วย RLS

ห้ามใส่ใน Frontend:
- Secret Key
- Service Role Key
- Database Password

## Workflow

```text
Teacher Draft
   ↓ PDF required
Teacher Submit
   ↓
pending_head
   ↓
Head: Approve / Revision / Reject
   ↓ Approve
pending_director
   ↓
Director: Approve + Signature / Revision / Reject
   ↓
approved
   ↓
Teacher Notification + Timeline
```

## หมายเหตุ Production

Supabase Security Advisor ยังเตือนว่า Leaked Password Protection ของ Auth ยังปิดอยู่ ซึ่งควรเปิดก่อนใช้งานจริงในวงกว้าง

## V2.1 — RLS draft insert fix

- Frontend ไม่ส่ง `teacher_id`, `department_id`, `status` ตอนสร้างแผนอีกต่อไป
- Database trigger จะกำหนดค่าความปลอดภัยเหล่านี้จากผู้ล็อกอินเอง
- SELECT policy ของ `lesson_plans` ถูกแก้ให้รองรับ `INSERT ... RETURNING` จาก Supabase JS
- ลดโอกาสเกิด `new row violates row-level security policy` จากค่าฝั่ง client ไม่ตรงกับ policy

## V2.2 — PDF Storage key fix

- แก้ `Invalid key` สำหรับชื่อ PDF ภาษาไทย
- Storage ใช้ object key แบบ UUID ASCII เท่านั้น เช่น `user/plan/<uuid>.pdf`
- ชื่อไฟล์ภาษาไทยจริงยังเก็บใน `lesson_plan_files.file_name` และแสดงใน UI ตามเดิม
- เพิ่มการตรวจ PDF ก่อน Submit เพื่อไม่แสดง error ดิบจาก Backend
- Draft เดิมที่ไม่มีไฟล์สามารถเปิดแก้ไข แนบ PDF แล้วส่งใหม่ได้

## V2.3 — Draft Delete + PDF Visibility + Head/Director Signatures

### Teacher
- Draft สามารถลบทิ้งได้เฉพาะเจ้าของแผนและเฉพาะสถานะ `draft`
- เมื่อลบ Draft ระบบลบ PDF ใน Supabase Storage ก่อน แล้วลบแถวแผน
- ตารางรายการแผนแสดงจำนวน PDF ของแต่ละแผน
- หน้าแก้ไขแผนแสดง:
  - PDF ที่บันทึกอยู่แล้ว
  - จำนวนไฟล์
  - ชื่อไฟล์จริง
  - ขนาดไฟล์
  - PDF ใหม่ที่เพิ่งเลือกก่อนกดบันทึก

### Academic Department Head
- มี Signature Center ของตัวเอง
- สร้างลายเซ็นได้ 2 แบบ:
  - เซ็นสดบน Canvas ด้วยเมาส์ / นิ้ว / ปากกา
  - อัปโหลด PNG / JPG / WebP
- เลือกลายเซ็นเริ่มต้นได้
- Approve แผนไม่ได้ถ้ายังไม่เลือกลายเซ็น
- Backend บังคับ signature ด้วย ไม่ได้ตรวจเฉพาะ UI
- ลายเซ็นถูกบันทึกใน Workflow Timeline

### Director
- ใช้ Signature Center แบบเดียวกับหัวหน้ากลุ่มงาน
- รองรับเซ็นสดและอัปโหลดรูปภาพ
- Final Approve ต้องมีลายเซ็นตาม Backend rule เดิม

### Security
- Signature files อยู่ใน private bucket
- Draft delete ถูกควบคุมด้วย RLS
- Signatures ที่ถูกใช้ใน workflow สามารถอ่านได้เฉพาะผู้ที่มีสิทธิ์ดูแผนนั้น

## V2.4 — A4 Preview + TH Sarabun PSK + Print / Save PDF

### A4 document
- เพิ่มปุ่ม `ดูเอกสาร A4` ในหน้ารายละเอียดแผน
- ใช้ฟอนต์เอกสารตามลำดับ:
  1. TH Sarabun PSK
  2. TH Sarabun New
  3. Sarabun (fallback)
- หน้า Dashboard/UI หลักยังใช้ Noto Sans Thai ตามเดิม
- กระดาษ A4 และกำหนด print CSS ด้วย `@page size: A4`
- แสดง:
  - ครูผู้สอน
  - ปีการศึกษา / ภาคเรียน
  - รายวิชา / รหัสวิชา
  - ชั้น / หน่วย / เรื่อง / วันที่สอน
  - จุดประสงค์
  - เนื้อหา
  - กิจกรรม
  - การวัดและประเมินผล
  - รายการ PDF ที่แนบ
  - สถานะเอกสาร

### Approval signatures
- แสดงลายเซ็นหัวหน้ากลุ่มงานบริหารวิชาการบนเอกสารเมื่ออนุมัติแล้ว
- แสดงลายเซ็นผู้บริหารบนเอกสารเมื่ออนุมัติแล้ว
- แสดงชื่อผู้ลงนามและวันที่/เวลาลงนาม
- Workflow เก็บ `actor_name` snapshot เพื่อให้เอกสารย้อนหลังยังคงชื่อผู้อนุมัติเดิม
- ถ้ายังไม่ถึงขั้นอนุมัติ จะแสดง `รอลงนาม`

### PDF
- ปุ่ม `พิมพ์ / บันทึก PDF` เปิดหน้า Print ของเบราว์เซอร์
- ผู้ใช้สามารถเลือก `Save as PDF` ได้โดยตรง
- ลายเซ็นจาก private Supabase Storage ถูกโหลดเข้าหน้าเอกสารก่อนพิมพ์

หมายเหตุ: ถ้าเครื่องมี TH Sarabun PSK ติดตั้งอยู่ จะใช้ TH Sarabun PSK จริงทันที
ถ้าเครื่องไม่มี จะ fallback เป็น TH Sarabun New หรือ Sarabun เพื่อป้องกันข้อความไทยเพี้ยน

## V2.5 — School Logo on A4 / PDF

- เพิ่มโลโก้โรงเรียนไว้กึ่งกลางด้านบนสุดของเอกสาร A4
- ใช้ไฟล์ `school-logo.png` แบบโปร่งใส
- โลโก้แสดงทั้งใน A4 Preview และ Print / Save as PDF
- ระบบโหลดโลโก้เป็น Data URL ก่อนพิมพ์ เพื่อป้องกันภาพหายตอน Save PDF
- รอให้ภาพโลโก้และลายเซ็นโหลดครบก่อนเรียก Print Dialog
- ขนาดโลโก้บนเอกสารประมาณ 31 mm เพื่อคงความชัดและไม่กินพื้นที่เนื้อหามากเกินไป

## V2.6 — Official School Header

ปรับหัวเอกสาร A4 / PDF:
- โรงเรียนบ้านหนองเขียว — 18 pt ตัวหนา
- ตำบลเมืองนะ อำเภอเชียงดาว จังหวัดเชียงใหม่ — 16 pt ตัวปกติ
- สำนักงานเขตพื้นที่การศึกษาประถมศึกษาเชียงใหม่ เขต 3 — 16 pt ตัวปกติ
- ชื่อระบบ BNK School OS ใน Dashboard ยังคงเดิม

## V2.7 — Automatic Permanent Approved PDF

เมื่อผู้บริหารกดอนุมัติขั้นสุดท้าย:
1. Workflow เปลี่ยนเป็น `approved`
2. Frontend โหลด Timeline และลายเซ็น Head / Director ที่ใช้จริง
3. Render เอกสาร A4 พร้อมโลโก้โรงเรียนและหัวกระดาษ
4. สร้าง PDF แบบ snapshot ด้วย html2canvas + jsPDF
5. อัปโหลดเข้า Private bucket `approved-lesson-plans`
6. บันทึก metadata ลง `approved_lesson_plan_documents`
7. Teacher / Head / Director ที่มีสิทธิ์ดูแผนสามารถดาวน์โหลดไฟล์เดิมภายหลังได้

### ความคงทนของเอกสาร
- 1 แผนมี Approved PDF ถาวร 1 ฉบับ
- ไม่มี UPDATE/DELETE grant บน metadata สำหรับผู้ใช้ทั่วไป
- PDF เก็บใน Private Storage
- ดาวน์โหลดต้องผ่าน RLS ของแผน
- ถ้าการสร้าง PDF หลังอนุมัติสะดุด ผู้บริหาร/Super Admin จะเห็นปุ่ม `สร้าง Approved PDF` เพื่อ Retry
- Storage object ใช้ UUID ASCII เท่านั้น

### ฟอนต์
Approved PDF เป็น visual snapshot ของ A4 ที่ Browser render ณ เวลาสร้าง
จึงเก็บหน้าตา โลโก้ และลายเซ็นไว้ใน PDF ไม่ขึ้นกับฟอนต์ของเครื่องผู้ดาวน์โหลดภายหลัง
เครื่องที่สร้างเอกสารจะใช้ TH Sarabun PSK ก่อน และ fallback ตามระบบ V2.4

## V2.8 — Weekly / Semester Lesson Plan Choice

เมื่อเข้าระบบส่งแผนการสอน จะมีหน้าประเภทแผนให้เลือกก่อน:
- `แผนรายสัปดาห์` — ใช้ฟอร์มและ Workflow เดิมทั้งหมด
- `แผนรายภาคเรียน` — กรอกเฉพาะ:
  - ปีการศึกษา
  - ภาคเรียน
  - รหัสวิชา
  - ชื่อวิชา
  - ระดับชั้น
  - PDF แผนการสอน

แผนรายภาคเรียนไม่ต้องกรอก:
- สัปดาห์ที่
- วันที่ใช้สอน
- หน่วยการเรียนรู้
- เรื่อง
- จุดประสงค์
- สาระ/เนื้อหา
- กิจกรรม
- การวัดและประเมินผล

ทั้งสองประเภทใช้ระบบเดียวกันสำหรับ:
Teacher Submit → Head Review/Signature → Director Review/Signature → Timeline → Approved PDF

A4 Preview และ Approved PDF จะเปลี่ยนหัวเอกสาร/ข้อมูลโดยอัตโนมัติตามประเภทแผน

## V2.9 — PDF / Google Drive Hybrid Attachments

ครูเลือกวิธีแนบเอกสารในฟอร์มได้ 2 แบบ:
- `อัปโหลด PDF` — เก็บใน Supabase Private Storage เหมือนเดิม
- `Google Drive Link` — เก็บเฉพาะ URL + ชื่อเอกสารใน Database ไม่ใช้พื้นที่ File Storage

### Google Drive
- รับเฉพาะ HTTPS จาก `drive.google.com` หรือ `docs.google.com`
- มีคำเตือนให้ตั้ง Share Permission ให้ Head / Director เปิดได้
- Head / Director กด `เปิด Drive` จากหน้ารายละเอียดได้
- ลิงก์ Drive สามารถลบได้ตอนแผนยังแก้ไขได้
- Draft สามารถไม่มีเอกสารแนบได้ แต่ตอน Submit ต้องมี PDF หรือ Drive อย่างน้อย 1 รายการ

### Workflow
ทั้ง PDF และ Google Drive ถือเป็น attachment ที่ถูกต้องสำหรับ:
Teacher Submit → Head Review → Director Approval → Approved PDF

Approved PDF จะบันทึกรายการเอกสารแนบและ URL ของ Google Drive เป็น snapshot ในเอกสาร A4 ด้วย

## V2.10 — Teacher Tracking for Academic Head / Director

เพิ่มเมนูในรายการแผนทั้ง 2 ประเภทสำหรับ:
- หัวหน้ากลุ่มงานบริหารวิชาการ
- ผู้บริหาร
- Super Admin

เมนู:
- `รายการทั้งหมด`
- `ดูตามครู`

หน้า `ดูตามครู`:
- แสดงครู Active ทุกคนในขอบเขตสิทธิ์ รวมถึงคนที่ยังไม่มีแผน
- สรุปต่อครู: ทั้งหมด / อนุมัติแล้ว / ส่งกลับแก้ไข / รายการค้าง
- คลิกครูเพื่อ Drill down ดูเฉพาะแผนของคนนั้น
- แสดงสรุป: ทั้งหมด / รอตรวจหรืออนุมัติ / ส่งกลับแก้ไข / อนุมัติแล้ว
- เปิดรายละเอียดแผนและดำเนิน Workflow ได้เหมือนรายการรวม

RLS:
- ผู้บริหารใช้สิทธิ์อ่าน active profiles เดิม
- หัวหน้าวิชาการได้รับ SELECT เพิ่มเฉพาะ active teacher profiles เพื่อใช้ Teacher Tracking
- หัวหน้ากลุ่มงานอื่นไม่ได้รับสิทธิ์อ่าน roster ครูเพิ่ม

## V2.11 — User Administration / Signup Profile / System Settings

### Signup
ผู้สมัครต้องเลือกข้อมูลเพิ่ม:
- กลุ่มงานที่สังกัด: วิชาการ / บุคคล / บริหารทั่วไป / แผนและงบประมาณ
- กลุ่มสาระ / ระดับการศึกษา:
  - การศึกษาปฐมวัย
  - ภาษาไทย
  - คณิตศาสตร์
  - วิทยาศาสตร์และเทคโนโลยี
  - สังคมศึกษา ศาสนา และวัฒนธรรม
  - สุขศึกษาและพลศึกษา
  - ศิลปะ
  - การงานอาชีพ
  - ภาษาต่างประเทศ

ค่ากลุ่มงานที่ผู้สมัครเลือกเป็นข้อมูลบุคลากรสำหรับ Super Admin เท่านั้น ไม่ให้สิทธิ์ Head อัตโนมัติ

### First Super Admin bootstrap
- `system_settings.bootstrap_complete` ถูกตั้งเป็น true หลังสร้าง Super Admin คนแรก
- ถ้ามี Super Admin แล้ว บัญชีใหม่ที่ status=pending จะเห็นเฉพาะหน้ารออนุมัติ
- ปุ่ม `ตั้งค่าบัญชีนี้เป็น Super Admin คนแรก` จะแสดงเฉพาะเมื่อ bootstrap_complete=false เท่านั้น

### User deletion
- เพิ่ม Edge Function `admin-delete-user`
- ตรวจ caller ต้องเป็น active Super Admin
- ห้ามลบตัวเอง และห้ามลบ Super Admin จากหน้าจอนี้
- พยายาม Auth soft-delete ก่อน
- ถ้าติด Storage ownership จะ fallback เป็น deleted profile + long Auth ban
- ประวัติ Lesson Plan / Workflow / Audit ไม่ถูกลบ
- ผู้ใช้ status=deleted ถูกซ่อนจากหน้าจัดการผู้ใช้ปกติ

### System settings
Super Admin มีเมนู `ตั้งค่าระบบ` สำหรับแก้:
- ชื่อระบบ
- ชื่อย่อ Branding
- ชื่อโรงเรียน
- ที่อยู่โรงเรียน
- หน่วยงานต้นสังกัด

ค่าเหล่านี้ใช้กับ Login, Sidebar และหัว A4 / Approved PDF โดย `system_settings` เปิดอ่านแบบ public เฉพาะข้อมูล Branding แต่ UPDATE ได้เฉพาะ Super Admin ผ่าน RLS

## V3.0 — Personnel Information System

ระบบย่อยใหม่ใต้กลุ่มงานบริหารงานบุคคล: `ข้อมูลข้าราชการและบุคลากร`

### Onboarding
หลังบัญชีเปลี่ยนเป็น Active ระบบจะสร้าง notification ให้บันทึกข้อมูลบุคลากร
และ Dashboard จะแสดง banner จนกว่าจะบันทึกแฟ้มครั้งแรก

### ข้อมูลบุคลากร
- ประเภท: ผู้บริหาร / ข้าราชการครู / บุคลากรทางการศึกษา
- ประเภทการจ้าง: ข้าราชการครูฯ / พนักงานราชการ / ลูกจ้าง / ครูอัตราจ้าง / อื่น ๆ
- รูปถ่าย Private Storage
- ชื่อ นามสกุล เลขบัตรประชาชน วันเกิด โทรศัพท์ อีเมล ที่อยู่
- ตำแหน่ง เลขที่ตำแหน่ง วันที่บรรจุ วันที่เริ่มที่โรงเรียน
- วิทยฐานะปัจจุบัน + วันที่มีผล
- วุฒิ สาขา สถาบัน ปีจบ ใบอนุญาตประกอบวิชาชีพ

### Service & Career Timeline
- คำนวณอายุราชการ/อายุงานเป็น ปี เดือน วัน
- ครูผู้ช่วย → คศ.1 ค่าเริ่มต้น 2 ปี
- คศ.1 ขึ้นไป ค่าเริ่มต้นปกติ 4 ปี
- โรงเรียนพื้นที่พิเศษ ค่าเริ่มต้น 3 ปี
- แสดง Progress และ Countdown ไป milestone ถัดไป
- ค่าระยะเวลาปรับได้ใน System Settings
- Timeline เป็นเครื่องมือติดตาม ไม่ใช่การรับรองสิทธิ์ตามกฎหมาย/หลักเกณฑ์ ก.ค.ศ.

### Access
- บุคลากรแต่ละคนดู/แก้ไขแฟ้มตัวเอง
- หัวหน้ากลุ่มงานบุคคล / Director / Super Admin ดูแฟ้มทุกคน
- เลขบัตรประชาชนไม่แสดงใน Directory รวม
- รูปถ่ายอยู่ใน Private bucket `personnel-photos`

### A4 / PDF
แฟ้มบุคลากรมี A4 Preview และ Print / Save PDF
ใช้โลโก้ ชื่อโรงเรียน ที่อยู่ หน่วยงานต้นสังกัด และ TH Sarabun document font stack แบบเดียวกับระบบแผนการสอน

## V3.1 — Department Head Capability Model

ปรับหลักสิทธิ์หัวหน้ากลุ่มงานให้เป็น `Base Capability + Department Capability`

### Base Capability
ผู้ใช้ role `department_head` ทุกฝ่ายยังทำงานในฐานะครูผู้สอนได้:
- สร้างแผนรายสัปดาห์ / รายภาคเรียน
- แนบ PDF / Google Drive
- แก้ไข Draft / Revision
- ส่งแผน
- ดู Timeline และ Approved PDF ของตนเอง

### Department Capability
สิทธิ์หัวหน้าใช้ได้เฉพาะ Module ของกลุ่มงานตัวเอง:
- หัวหน้าวิชาการ: ตรวจ/เซ็นแผนของผู้อื่น + Teacher Tracking
- หัวหน้าบุคคล: ไม่มีสิทธิ์ตรวจ/เซ็น/ดูแผนผู้อื่น
- หัวหน้าทั่วไป: ไม่มีสิทธิ์ตรวจ/เซ็น/ดูแผนผู้อื่น
- หัวหน้าแผนและงบประมาณ: ไม่มีสิทธิ์ตรวจ/เซ็น/ดูแผนผู้อื่น

### Academic Head Self-Submission
เมื่อหัวหน้าวิชาการส่งแผนของตนเอง:
- ระบบบันทึกการส่งใน capacity `teacher`
- ข้ามขั้นตอน Head Review เพื่อป้องกัน self-approval
- ส่งตรง `pending_director`
- A4 / Approved PDF แสดงเหตุผลว่าข้าม Head signature

RLS/RPC ฝั่งฐานข้อมูลบังคับหลักนี้ ไม่ใช่แค่ซ่อนปุ่มใน Frontend

## V3.1.1 — Blank Screen Hotfix

แก้ปัญหาหน้าจอว่างหลังเปิดเว็บใน V3.1:
- ลบการประกาศ `academicDepartmentId()` ที่ซ้ำกัน
- ตรวจ JavaScript ด้วย ES Module parser โดยตรง
- Smoke test startup แบบไม่มี session และยืนยันว่า Login render ได้
- ไม่มีการเปลี่ยน schema / RLS / Workflow จาก V3.1

## V3.2 — Leave Management

ระบบวันลาใต้กลุ่มงานบริหารงานบุคคล

### ผู้ยื่น
Teacher / Department Head / Director / Super Admin ที่ Active สามารถยื่นใบลาของตนเองได้

### Workflow
ผู้ลา → หัวหน้ากลุ่มงานบริหารงานบุคคล → ผู้บริหาร → Approved

- หัวหน้าบุคคลไม่ใช้ลายเซ็นดิจิทัล
- ผู้บริหารไม่ใช้ลายเซ็นดิจิทัล
- PDF เว้นช่องลายเซ็นเพื่อเซ็นสด
- Notification ทุกขั้น
- หัวหน้าบุคคลยื่นของตัวเอง → ข้าม Personnel Review ส่งตรงผู้บริหาร
- Director / approver ไม่สามารถอนุมัติคำขอของตัวเอง

### Leave Types
Seed เริ่มต้น:
ลาป่วย, ลากิจส่วนตัว, ลาคลอด, ช่วยเหลือภริยาคลอดบุตร,
อุปสมบท/ฮัจย์, ตรวจเลือก/เตรียมพล, ศึกษา/ฝึกอบรม/ดูงาน, อื่น ๆ

### Quota Tracking
System Settings:
- จำนวนครั้งสูงสุด / ปี ค่าเริ่มต้น 6
- จำนวนวันสูงสุด / ปี ค่าเริ่มต้น 22
- ลาป่วย + ลากิจ นับเข้า quota โดยค่าเริ่มต้น
- Dashboard แสดง donut % ใช้ไป / คงเหลือ แยกครั้งและวัน
- หัก usage เมื่ออนุมัติขั้นสุดท้าย
- Backend บล็อก workflow หากเกิน limit ที่ตั้งไว้

### Future Academic Integration
`affects_teaching_schedule` เก็บตั้งแต่คำขอลา
เพื่อให้ระบบจัดสอนแทน/ตารางสอนของกลุ่มงานวิชาการในอนาคต query Approved Leave ตามช่วงวันที่ได้โดยตรง

### A4 / PDF
หัวเอกสารโรงเรียนเหมือน Lesson Plan / Personnel Record
แสดงข้อมูลผู้ลา, วันลา, สถิติ quota, reviewer names และเวลาที่ดำเนินการในระบบ
ช่องลายเซ็นของผู้ลา / หัวหน้าบุคคล / ผู้บริหารเป็นช่องว่างสำหรับเซ็นสดหลังพิมพ์

## V3.3 — Leave Overview Reports

ขยายเมนู `ภาพรวมวันลา` สำหรับหัวหน้าบุคคล / Director / Super Admin:

- ตัวกรองปีการศึกษา + ภาคเรียน
- กราฟเปอร์เซ็นต์บุคลากรที่มีการลา
- Pie chart สัดส่วนจำนวนวันลาแยกตามประเภท
- ตารางบุคลากร Active ทั้งโรงเรียน เรียงตามชื่อ
- คนที่ไม่ลาแสดง 0 ครั้ง / 0 วัน
- Export PDF ภาพรวมโรงเรียนแบบ Landscape
- PDF มีตารางทุกคน + ประเภทลา + รวมครั้ง/วัน
- ช่องลายเซ็นสดของหัวหน้าบุคคลและผู้บริหาร

### รายบุคคล
- เลือกบุคลากรด้วย Dropdown
- ดูสถิติแยกประเภท + ประวัติรายการ
- Export PDF รายบุคคล
- ช่องลายเซ็นสดหัวหน้าบุคคลและผู้บริหาร

### Academic Period
เพิ่ม `academic_year` และ `semester` ใน leave request
แยกจาก `leave_year` ที่ยังใช้สำหรับ quota ปีปฏิทิน

### ใบลา PDF
- เปลี่ยน `ปีที่นับโควตา` เป็น `ปีการศึกษา / ภาคเรียนที่`
- สถิติการลาแสดงเป็นตารางแยกประเภท
- quota ปีปฏิทินยังแสดงเป็นข้อมูลประกอบ

## V3.3.1 — Leave Report Signer Names

- รายงานภาพรวมวันลาทั้งโรงเรียนใส่ชื่อหัวหน้ากลุ่มงานบริหารงานบุคคลและผู้บริหารอัตโนมัติ
- รายงานวันลารายบุคคลใช้ชื่อผู้ลงนามอัตโนมัติเช่นเดียวกัน
- ชื่อมาจากบัญชี Active ใน `profiles` ตาม role + department
- หน้า Report แสดงชื่อผู้ลงนามก่อนกด Export เพื่อให้ตรวจสอบได้
- ยังเว้นเส้นลายเซ็นไว้สำหรับเซ็นสดหลังพิมพ์

## V3.3.2 — Compact Horizontal Leave Form Table

ปรับ PDF `แบบคำขอลา` เพื่อให้จัดหน้า A4 หน้าเดียวได้ง่ายขึ้น:
- ตารางสถิติการลาเปลี่ยนจากแนวตั้งเป็นแนวนอน
- คอลัมน์ = ประเภทการลาแต่ละประเภท + รวม
- แถว = จำนวนครั้ง / จำนวนวัน
- ใช้ชื่อประเภทแบบย่อเฉพาะตอนพิมพ์เพื่อไม่ให้ตารางกว้างเกิน
- ลด spacing บางส่วนในใบลา แต่ยังคงข้อมูลและช่องเซ็นสดครบ

## V3.3.3 — Leave Quota per Semester

เปลี่ยนโควตาติดตามวันลาจากรายปีเป็นรายภาคเรียน

- ภาคเรียนที่ 1 และภาคเรียนที่ 2 ตั้งจำนวนครั้ง/จำนวนวันแยกกันได้
- ค่าเริ่มต้นทั้งสองภาคเรียน = 6 ครั้ง / 22 วัน
- Backend ตรวจ quota ด้วย `academic_year + semester`
- Dashboard ของผู้ใช้แสดง quota ของภาคเรียนปัจจุบัน
- ใบลาและ PDF แสดง quota ของภาคเรียนเดียวกับคำขอนั้น
- รายการที่นับ quota เช่น ลาป่วย/ลากิจ จะรีเซ็ตเมื่อเปลี่ยนภาคเรียน
- `leave_year` เดิมยังเก็บไว้เพื่อ compatibility แต่ไม่ใช้เป็นขอบเขต quota อีกต่อไป

## V3.3.4 — Personnel Head Self-Approval Name

กรณีหัวหน้ากลุ่มงานบริหารงานบุคคลเป็นผู้ยื่นใบลาเอง:
- Timeline แสดงชื่อหัวหน้าบุคคลที่เป็นผู้ยื่น
- หน้า Detail แสดงชื่อ + สถานะ “ข้ามขั้นตอน”
- PDF แสดงชื่อหัวหน้าบุคคลใต้ช่องของหัวหน้าบุคคล พร้อมหมายเหตุว่าข้ามขั้นตอนเพราะเป็นผู้ยื่นเอง
- Workflow ยังคงส่งตรงผู้บริหารเพื่อป้องกัน self-approval

## V4.0 — Academic Timetable Management

ระบบย่อยใหม่ในกลุ่มงานบริหารงานวิชาการ: `ระบบจัดตารางสอน`

### Academic Head
- สร้างปี/ภาคเรียน + ชั้น/ห้อง
- กำหนดช่วงชั้น
- กำหนดวันเรียน
- กำหนดจำนวนคาบ เวลาแต่ละคาบ และพักกลางวัน
- สร้าง Master รายวิชา
- จับคู่ วิชา + ชั้น/ห้อง + ครู + จำนวนคาบต่อสัปดาห์
- Drag & Drop วิชาลงตาราง
- Backend ป้องกันครูสอนชนเวลา แม้คนละห้องและ period number ไม่ตรงกัน
- Backend ป้องกันจัดเกินจำนวนคาบต่อสัปดาห์
- Draft / Published
- Publish ได้เมื่อทุก assignment ถูกจัดครบตามจำนวนคาบ

### Teacher / Department Head
หัวหน้ากลุ่มงานทุกฝ่ายยังมีฐานะครู:
- ดูตารางสอนของตัวเอง
- Export ตารางสอนของตัวเอง
- ถ้าเป็นครูประจำชั้น สามารถ Export ตารางเรียนของห้องที่รับผิดชอบ

### Super Admin Academic Capabilities
หน้า `จัดการผู้ใช้งาน` มี `☆ ตั้งค่าครู`
- กำหนดหัวหน้าช่วงชั้น: ปฐมวัย / ช่วงชั้น 1 / 2 / 3
- กำหนดครูประจำชั้นจากห้องที่ Academic Head สร้าง
- ครูหลายคนสามารถประจำชั้นเดียวกันได้
- capability ไม่เปลี่ยน Role หลักของผู้ใช้

### PDF
A4 Landscape ตามตัวอย่างตารางโรงเรียน:
- Logo
- `ตารางจัดการเรียนรู้ โรงเรียน...`
- ปีการศึกษา + ภาคเรียน
- ชื่อครู หรือชื่อชั้น/ห้อง
- วัน × คาบ + ช่วงเวลา
- พักกลางวันแบบคอลัมน์
- ช่องเซ็นสด: ครู/ครูประจำชั้น, หัวหน้าวิชาการ, ผู้บริหาร
- ไม่แสดงที่อยู่และสังกัด

### Future Substitute Teaching Integration
โครงสร้าง `timetable_entries` เชื่อม teacher + class + subject + weekday + exact time
เพื่อให้ระบบสอนแทนใน Module ถัดไปจับคู่กับ Approved Leave ได้โดยตรง

## V4.1 — Separate Period Settings

แยก `ตั้งค่าคาบเรียน` ออกจากหน้าจัดตารางเป็นเมนูเฉพาะของหัวหน้าวิชาการ

### 2 รูปแบบ
1. `ใช้เหมือนกันทั้งโรงเรียน`
   - 1 Master period template ต่อปีการศึกษา + ภาคเรียน
   - กำหนดวันเรียน จำนวนคาบ เวลา และพักกลางวันครั้งเดียว
   - ปุ่ม `ใช้กับทุกห้อง`
   - ห้องที่เลือก Shared จะใช้ snapshot จาก Master เดียวกัน

2. `กำหนดเฉพาะห้อง`
   - ห้องที่เวลาไม่เหมือนส่วนกลางเปลี่ยนเป็น Custom
   - แก้วันเรียน/เวลา/พักกลางวันเฉพาะห้องนั้น
   - การเปลี่ยนเป็น Custom ไม่ลบคาบเดิม จึงใช้ค่าจาก Shared เป็นจุดเริ่มต้นได้

### Safety
- Published timetable ต้องกลับเป็น Draft ก่อนเปลี่ยน mode
- ถ้าจะเปลี่ยน Custom → Shared ต้องล้าง timetable entries ของห้องก่อน เพราะ period ids จะถูกสร้างใหม่
- ไม่อนุญาตแก้ School Master หากมีห้อง Shared ที่จัดคาบสอนแล้ว เพื่อป้องกันเวลาในตารางคลาดเคลื่อน

## V4.2 — Stage Head Timetable Management + Director PDF Title

### หัวหน้าช่วงชั้น
Super Admin ยังคงเป็นผู้กำหนดหัวหน้าช่วงชั้นจาก `stage_heads`

เมื่อได้รับมอบหมายแล้ว หัวหน้าช่วงชั้นมีสิทธิ์จัดตารางสอนในขอบเขต:
- ปีการศึกษาที่ได้รับมอบหมาย
- ช่วงชั้นที่ได้รับมอบหมายเท่านั้น
- สร้างชั้น/ห้องในช่วงชั้นตนเอง
- กำหนด วิชา + ครู + จำนวนคาบ
- ใช้ School Period Master ที่หัวหน้าวิชาการสร้าง
- เปลี่ยนห้องเป็น Custom Period และแก้เวลาเฉพาะห้อง
- Drag & Drop / ย้าย / ลบคาบ
- Draft / Publish ตารางในช่วงชั้นตนเอง
- Export ตารางเรียนของช่วงชั้นตนเอง
- ตารางสอนของตนเองยังใช้งานเหมือนครูทั่วไป

สิ่งที่ยังเป็น School-wide Master และสงวนให้หัวหน้าวิชาการ:
- สร้าง/แก้คาบกลางทั้งโรงเรียน
- สร้าง/ลบ Master รายวิชา

RLS / Trigger / RPC บังคับขอบเขตช่วงชั้นที่ฐานข้อมูล ไม่ใช่เพียงซ่อนปุ่มหน้าเว็บ

### PDF Director Title
ตำแหน่งผู้ลงนามฝ่ายบริหารในเอกสาร PDF เปลี่ยนจาก:
`ผู้บริหาร`
เป็น:
`ผู้อำนวยการโรงเรียน`

ใช้กับ:
- ใบลา
- รายงานวันลา
- ตารางสอน / ตารางเรียน
- Approved Lesson Plan A4/PDF

ชื่อบุคคลยังดึงจากบัญชี Director ที่ Active เหมือนเดิม

## V4.3 — Lunch Is a Numbered Period

ปรับโครงคาบเรียนให้ `พักรับประทานอาหารกลางวัน` นับเป็นหนึ่งในเลขคาบจริง

ตัวอย่าง:
- คาบ 1
- คาบ 2
- คาบ 3
- คาบ 4
- คาบ 5 = พักรับประทานอาหารกลางวัน
- คาบ 6
- คาบ 7
- คาบ 8
- คาบ 9

### ตั้งค่าคาบเรียน
- `จำนวนคาบทั้งหมดต่อวัน` รวมพักกลางวันแล้ว
- เลือก `พักรับประทานอาหารเป็นคาบที่` จาก Dropdown
- เลขคาบหลังพักต่อเนื่องอัตโนมัติ
- รองรับทั้ง School Period Master และ Custom Period รายห้อง

### Timetable / PDF
- คอลัมน์พักกลางวันมีเลขคาบเหมือนคอลัมน์อื่น
- ใน PDF เลขคาบอยู่ด้านบน และเวลาอยู่แถวถัดไป
- ช่องเนื้อหาพักกลางวันยังแสดงแนวตั้งเพื่อให้ประหยัดพื้นที่และคล้ายแบบตารางโรงเรียน

### Existing Data
Migration แปลงข้อมูลเดิมโดยใช้ `sort_order` เป็นเลขคาบใหม่
จึงเปลี่ยนจาก 1,2,3,4,พัก,5,6,7 เป็น 1,2,3,4,พัก=5,6,7,8 โดยไม่เปลี่ยนเวลาเดิม

## V5.0 — Substitute Teaching

ระบบย่อยใหม่ใต้กลุ่มงานบริหารงานวิชาการ: `ระบบจัดการสอนแทน`

### Automatic Integration
เมื่อใบลา:
- status = `approved`
- `affects_teaching_schedule = true`

ระบบจะเทียบ:
`วันที่ลา → วันในสัปดาห์ → Published Timetable → Teaching Assignment → Class / Subject / Period`
แล้วสร้าง `substitute_lessons` อัตโนมัติ

ถ้าใบลาได้รับอนุมัติก่อนตาราง Published:
เมื่อ Publish ตารางภายหลัง ระบบจะ sync approved leave ที่เกี่ยวข้องให้อัตโนมัติอีกครั้ง
Academic Head มีปุ่ม Manual Sync แบบ idempotent สำหรับ fallback

### Rights
- Academic Head: จัดครูสอนแทนได้ทั้งโรงเรียน
- Stage Head: จัดได้เฉพาะ academic year + stage ที่ Super Admin มอบหมาย
- Director / Super Admin: ดูภาพรวม
- Teacher / Department Head ฝ่ายอื่น: ดูงานสอนแทนที่มอบหมายให้ตนเอง + คาบของตนที่มีคนมาสอนแทน

### Candidate Availability
ก่อนมอบหมาย ระบบตรวจ Backend:
- ครูเป้าหมายต้อง Active และเป็น Teacher / Department Head
- ต้องไม่ใช่ครูผู้ลา
- ต้องไม่อยู่ระหว่าง Approved Leave ในวันนั้น
- ต้องไม่มีคาบสอนประจำเวลาเหลื่อมกัน
- ต้องไม่มีงานสอนแทนอื่นเวลาเหลื่อมกัน
- Candidate list แสดงภาระคาบของวันนั้น เพื่อช่วยเลือกคนที่ว่างกว่า

### Notifications
- มีใบลาที่ก่อให้เกิดคาบสอนแทน → แจ้ง Academic Head + Stage Head ที่เกี่ยวข้อง
- มอบหมายสอนแทน → แจ้งครูสอนแทน
- ครูผู้ลาได้รับแจ้งว่าแต่ละคาบมีใครมาสอนแทน
- เปลี่ยน/ยกเลิกผู้สอนแทน → แจ้งผู้ได้รับผลกระทบ

### Audit
`substitute_actions` เก็บ timeline ของ assign / reassign / unassign
และ Realtime อัปเดตหน้า Module โดยไม่ต้อง reload ทั้งแอป


## V6.0 — Project & Budget Management

- ครูสร้างโครงการของตนเอง: เลขโครงการ ชื่อ งบ ฝ่าย/แผนงาน ปี/ภาคเรียน
- ผู้สร้างเป็นผู้รับผิดชอบหลักอัตโนมัติ
- กิจกรรมย่อยผูกด้วย project_id จริง และเลขต้องขึ้นต้นด้วยเลขโครงการ เช่น วช.1.1
- งบกิจกรรมรวมเกินงบโครงการไม่ได้
- แสดง Allocated / Unallocated / Committed / Paid แบบ Realtime
- ภาพรวมแยก Academic / Personnel / General / Plan & Budget / Other
- ขอเบิกจากกิจกรรมหรือจากงบโครงการส่วนที่ยังไม่จัดสรร
- Running ครั้งที่อัตโนมัติ และแจ้งหัวหน้าฝ่าย/แผนงานฯ เมื่อจัดทำเอกสาร
- ไม่มี Online Approval; ใช้เอกสารเซ็นสด
- ก่อน Export ใบเบิกมี Blank Signer Form ให้กรอกชื่อและตำแหน่งเอง
- PDF โครงการ/กิจกรรม A4 Portrait มี Logo, School, Address, Education Office
- PDF ขอเบิกมีผู้ขอเบิก, หัวหน้าฝ่าย, แผนงานและงบประมาณ, ผู้อำนวยการ และกรรมการตรวจรับ 3 คน
- Only Plan & Budget Head / Super Admin can mark paid ที่ Database Trigger


## V6.1 — Activity-owned Disbursement Rights

- การขอเบิกจากกิจกรรมย่อยเป็นสิทธิ์ของ `activity.owner_id` เท่านั้น
- เจ้าของโครงการหลักไม่มีสิทธิ์ขอเบิกกิจกรรมที่มอบหมายให้ครูคนอื่น แม้กิจกรรมนั้นอยู่ใต้โครงการของตนเอง
- เจ้าของโครงการยังดูรายละเอียดและประวัติการเบิกของกิจกรรมย่อยเพื่อกำกับภาพรวมได้
- Backend บังคับสิทธิ์ทั้ง helper/trigger และ INSERT RLS policy ไม่พึ่งการซ่อนปุ่มใน UI
- PDF ใบขอเบิกเพิ่มหัวข้อ `คณะกรรมการตรวจรับ` ก่อนช่องลายเซ็นกรรมการตรวจรับทั้ง 3 คน


## V6.2 — Itemized Budget Disbursement

### รายการใช้เงินแบบหลายบรรทัด
หน้า `ขอเบิกงบประมาณ` เปลี่ยนจาก textarea + จำนวนเงินรวม เป็นรายการค่าใช้จ่าย:
- ซื้อ/ใช้จ่ายอะไร
- กี่บาท
- เริ่ม 1 รายการ
- `＋ เพิ่มรายการ` เพิ่มได้ไม่จำกัด
- ลบรายการได้โดยคงอย่างน้อย 1 แถว
- สรุปรายการและยอดรวมแบบ Live
- แสดงวงเงินคงเหลือหลังขอเบิก และเตือนทันทีเมื่อเกินวงเงิน

Database เก็บ `line_items` เป็น JSONB array และ Trigger คำนวณ `amount` จากผลรวมรายการเอง จึงไม่เชื่อยอดรวมที่ Browser ส่งมาเพียงอย่างเดียว
`description` ถูกสร้างเป็น Summary อัตโนมัติเพื่อรองรับข้อมูล/Frontend รุ่นเก่า

### Ownership Rule
- ขอเบิกจาก Project หลัก: เฉพาะ Project Owner
- ขอเบิก Activity: เฉพาะ Activity Owner เท่านั้น
- Project Owner ไม่มีสิทธิ์เบิก Activity ของครูคนอื่น แม้อยู่ใต้ Project ของตน
- ไม่มี Super Admin bypass สำหรับการ “เป็นผู้ขอเบิก”; ผู้ขอเบิกต้องเป็น Owner จริง
- สิทธิ์ถูกตรวจทั้ง UI + RLS + Trigger

### Budget PDF
ใบขอเบิกแสดงตาราง `ลำดับ | รายการใช้เงิน | จำนวนเงิน` และแถวรวมทั้งสิ้น
ส่วนลายเซ็นยังมีหัวข้อ `คณะกรรมการตรวจรับ` ก่อนช่องลายเซ็นกรรมการทั้ง 3 คน


## V7.0 — Home Visit Management + Batch Timetable PDF

### ระบบเยี่ยมบ้านนักเรียน
- Module อยู่ในบริหารทั่วไป: `home_visit_management`
- Step Form ตามแบบ นร./กสศ.01: ข้อมูลนักเรียน, สมาชิกครัวเรือน, สถานะครัวเรือน/บ้าน, การเดินทาง/ที่อยู่/ภาพถ่าย, การรับรอง/ลายเซ็น, ตรวจสอบ/Export
- ครูประจำชั้นดึงจาก homeroom_teachers; ผู้บันทึกดึงจากบัญชีผู้กรอก
- Private Storage `home-visits` สำหรับรูปนักเรียน, ภายนอกบ้าน, ภายในบ้าน และลายเซ็น
- Signature methods: เว้นเซ็นกระดาษ, เซ็นสดบนจอ, อัปโหลดรูป, ใช้ stored signature
- PDF A4 Landscape มี Logo, School, Address, Education Office
- Export รายบุคคล และ Export ทั้งห้องเป็น PDF เดียว (นักเรียนต่อเนื่องหลายหน้า)

### Timetable Batch Export
- ผู้มีสิทธิ์จัดตารางสามารถ Export ตารางเรียนทุกห้องที่อยู่ใน Scope เป็น PDF เดียว
- แต่ละห้องยัง Export แยกได้เหมือนเดิม
- สามารถ Export ตารางสอนครูทั้งหมดเป็น PDF เดียว โดย 1 ครูต่อ 1 หน้า
- ตารางครูรายบุคคลยัง Export แยกได้เหมือนเดิม


## V7.1 — Home Visit PDF Header + Photo Persistence Fix

### PDF header
- ตราโรงเรียนอยู่บนสุดกึ่งกลางกระดาษ
- ชื่อโรงเรียน / ที่อยู่ / สังกัด / ชื่อแบบ / ปีการศึกษา / ข้อมูลครู ใช้ขนาด 16 pt ในส่วนหัว
- รูปนักเรียนใน PDF ปรับเป็นกรอบแนวตั้งประมาณ 28 x 36 mm (ใกล้เคียง 1–1.5 นิ้ว) ไม่กินพื้นที่ใหญ่

### Photo upload fix
- เลือกรูปแล้ว Preview ทันทีในหน้าเว็บ
- ไม่จำเป็นต้องกดปุ่ม Upload แยก: กด `บันทึกขั้นตอนนี้` แล้วระบบจะอัปโหลดรูปที่เลือกทั้งหมดให้อัตโนมัติ
- ยังมีปุ่ม `อัปโหลด / เปลี่ยนรูปทันที` สำหรับผู้ที่ต้องการบันทึกรูปก่อน
- รูปที่บันทึกแล้วถูกโหลดกลับมาแสดงจริงจาก Private Storage ผ่าน Signed URL
- เปลี่ยนรูปโดยอัปโหลดไฟล์ใหม่ → อัปเดต metadata ก่อน → ลบไฟล์เก่าหลังสำเร็จ เพื่อไม่ให้รูปหายกลางทาง
- แก้ `homeVisitRecordAssets()` ให้คืนค่ารูปภาพได้แม้ยังไม่มีลายเซ็น และโหลดรูปครบก่อนสร้าง PDF

## V8.0 — Standard PDF Font + Budget Control Register + Flexible Signatures + Public Staff Directory

### Standard PDF font across devices
- PDF/Print styles in every module now use the same `Sarabun` web font instead of device-local `TH Sarabun` detection.
- Print windows wait for `document.fonts.ready` before opening the print dialog.
- This applies to lesson plans, personnel, leave, leave reports, timetables, substitute teaching, project/budget documents, and home-visit PDFs.
- The app does not ship font files; the web font is loaded from the configured web-font provider.

### Budget control numbers
- New `budget_control_settings` table stores current control year/start/last number per department.
- New requests receive a database-generated `control_number`, e.g. `5/2569`, atomically and separately per department.
- Super Admin can set the control year and starting number from `ทะเบียนคุมการเบิกจ่าย`.
- Once numbers have been issued in the same year, the database prevents rewinding/changing the starting number.
- Budget request detail, lists, registry, notifications and PDF show the control number.
- Registry filters by Academic / Personnel / General / Plan & Budget and shows which project/activity used each number.

### Flexible budget signatures
- New `budget_disbursement_signers` table normalizes requester, department head, plan-budget head, director and three acceptance-committee slots.
- Requester/Super Admin selects staff using dropdowns.
- Acceptance committee members must be three different staff members in the same department as the requester.
- Selected committee members receive a Notification linking to the budget request.
- Each selected signer independently chooses one method: paper signature, draw in the system, upload signature image, or use their stored signature.
- Digital copies are stored in private bucket `budget-signatures` and rendered into the PDF; paper mode leaves the PDF signature area blank while printing the selected name/role.

### Public personnel directory
- New sanitized `personnel_public_directory` contains only approved internal-directory fields: photo, name, position, academic rank, birth date, phone, role/department.
- All active staff can open `ข้อมูลบุคลากรอื่น` and select a colleague to view these fields.
- Citizen ID, address, education/license records, position number and other private personnel-file fields are not included in this public table at all.
- Personnel Head/Director/Super Admin keep the existing privileged full personnel-file view separately.


## V8.1 — TH SarabunPSK + Budget Balance on Disbursement PDF

### PDF font standard
PDF/print preview ทุกระบบเปลี่ยนมาใช้ `TH SarabunPSK` เป็น Web Font เดียวกัน
โดยโหลดไฟล์ Regular / Bold / Italic / BoldItalic จากชุด TH-Sarabun-PSK เดียวกัน
และรอ `document.fonts.ready` ก่อนสั่ง Print เพื่อไม่ให้แต่ละอุปกรณ์เลือกฟอนต์ระบบของตัวเอง

### ใบขอเบิกใช้งบประมาณโครงการ / กิจกรรม
เพิ่มสรุปวงเงินต่อจากข้อมูลปีการศึกษา/ภาคเรียน:
- งบประมาณกิจกรรมทั้งหมด
- คงเหลือจากครั้งที่แล้ว
- ใช้ครั้งนี้
- คงเหลือปัจจุบัน

กรณีเป็นการเบิกจากกิจกรรม จะอ้างอิง `project_activities.budget_amount`
และรวมเฉพาะคำขอก่อนหน้าที่มีสถานะ `document_ready`, `printed`, `paid`
เพื่อให้ยอดคงเหลือสอดคล้องกับการกันวงเงินของระบบ


## V8.2 — Secure Delete Workflow

เพิ่มระบบลบข้อมูลระดับ Record แบบยืนยันตัวตน:
- ผู้ใช้งานทั่วไปต้องกรอกรหัสผ่านของบัญชีตนเองก่อนลบทุกครั้ง
- ใช้ Supabase Auth `signInWithPassword()` ผ่าน client ชั่วคราวที่ไม่บันทึก Session เพื่อยืนยันรหัสผ่าน โดยไม่เก็บรหัสผ่านในแอป
- Backend RLS ตรวจว่ามี Password Authentication สดใหม่ภายใน 90 วินาที ก่อนอนุญาต DELETE
- Super Admin ข้ามการกรอกรหัสผ่านได้ แต่ยังต้องติ๊กยืนยันการลบ
- ทุกการลบระดับ Record ถูกบันทึกใน `deletion_audit_log` พร้อมผู้ลบ เวลา และ snapshot ก่อนลบ

ขอบเขตการลบ:
- คำขอลา: เจ้าของลบเฉพาะ Draft / Super Admin ลบได้ตามสิทธิ์ Admin
- แผนการสอน: เจ้าของลบ Draft หรือ Revision Requested / Super Admin ลบได้
- คำขอเบิก: เจ้าของลบเฉพาะ Draft / Super Admin ลบได้; เลขทะเบียนคุมที่ถูกออกแล้วจะไม่ถูกนำกลับมาใช้ซ้ำ
- โครงการ / กิจกรรม: เจ้าของลบได้เมื่อไม่มีเอกสารขอเบิกอ้างอิง
- เยี่ยมบ้าน: ผู้มีสิทธิ์แก้ไขลบ Draft ได้ / Super Admin ลบได้ พร้อมลบรูปและลายเซ็นใน Storage
- รายการสอนแทน: เป็น System-generated record จึงให้ Hard Delete เฉพาะ Super Admin
- ระบบตารางสอนไม่เพิ่มปุ่ม Hard Delete กลาง เพราะมี Workflow แก้ไขตารางเฉพาะของระบบอยู่แล้ว


## V8.3 — Flexible Delete After Submission

ปรับกติกาการลบให้ใช้ได้จริงเมื่อผู้ใช้ส่งข้อมูลผิดหรือเปลี่ยนใจภายหลัง:
- ผู้ใช้ทั่วไปยังต้องยืนยันรหัสผ่านทุกครั้งก่อน Hard Delete; Super Admin ไม่ต้องกรอกรหัสผ่าน
- แผนการสอน: เจ้าของแผนลบได้แม้ส่งตรวจ/อนุมัติแล้ว; หัวหน้าวิชาการ/ผู้บริหารตามสิทธิ์สามารถลบได้
- ใบลา: เจ้าของคำขอลบได้ทุกสถานะ; หัวหน้าบุคคลและผู้บริหารลบได้ตามสิทธิ์; การลบใบลาที่อนุมัติแล้วทำให้รายการนั้นไม่ถูกนับในโควตาวันลาอีก และ Substitute ที่ FK ผูกกับใบลาถูกลบตาม
- เยี่ยมบ้าน: ผู้บันทึก/ครูประจำชั้น/ผู้ดูแลบริหารทั่วไปลบได้ทั้ง Draft และ Complete เพื่อทำใหม่ทั้งชุด
- ขอเบิกงบประมาณ: ผู้ขอเบิกและหัวหน้าแผนงาน/งบประมาณลบได้ตราบใดที่ยังไม่ Paid; Paid ลบได้เฉพาะ Super Admin เพื่อรักษาความน่าเชื่อถือของประวัติการเงิน
- เลขทะเบียนคุมที่เคยออกแล้วไม่ย้อนกลับมาใช้ซ้ำ แม้เอกสารถูกลบ
- โครงการ/กิจกรรมยังลบได้เมื่อไม่มีเอกสารเบิกอ้างอิง เพื่อป้องกัน FK/ประวัติงบเสียหาย
- Notification ที่อ้างถึง Record ซึ่งถูกลบจะถูก Cleanup โดย Backend Trigger
- Audit Log ยังคงเก็บผู้ลบ เวลา Role และ snapshot ก่อนลบ


## V9.0 — ระบบบัญชีรายชื่อนักเรียน

เพิ่มระบบบริหารวิชาการ `ระบบบัญชีรายชื่อนักเรียน` เชื่อมกับ Supabase Student Registry:
- ข้อมูลนักเรียนแยกปีการศึกษา/ภาคเรียน/ช่วงชั้น/ระดับชั้น/ห้อง
- Import Excel แบบ Preview ก่อนบันทึก และรองรับไฟล์โรงเรียนเดิมที่หัวคอลัมน์ซ้ำ
- มีไฟล์ seed จากรายชื่อโรงเรียน 624 คน ปี 2569 ภาคเรียน 1 สำหรับนำเข้าครั้งแรกด้วยปุ่มเดียว
- ดาวน์โหลดแบบฟอร์ม Excel เปล่าสำหรับปีถัดไป
- Export ข้อมูลเป็น PDF และ `.xlsx`
- ใบรายชื่อนักเรียน: เลขที่ / เลขประจำตัว / ชื่อ-สกุล + ช่องว่าง 10 ช่อง พร้อม PDF/XLSX
- บัญชีเลื่อนชั้น: อ.3 → ป.1 เลือกห้องปลายทางได้รายคน และรองรับไม่เลื่อนชั้น / ย้ายออก / จบการศึกษา
- จัดการจำนวนห้องแยกตามปีการศึกษา
- อัปโหลดรูปนักเรียน 1 นิ้วเข้าสู่ private bucket `student-photos` เพื่อเตรียมใช้ระบบบัตรนักเรียน
- ระบบเยี่ยมบ้านดึงนักเรียนจากบัญชีรายชื่อ ไม่ต้องพิมพ์ชื่อซ้ำ
- Super Admin เปิด/ปิดช่วงเยี่ยมบ้านรายปีการศึกษา/ภาคเรียน พร้อมวันเริ่ม/สิ้นสุดและข้อความก่อน/หลัง/ปิดระบบได้

## V10.0 — Student ID Card System

เพิ่มระบบย่อยใหม่ใต้กลุ่มงานบริหารวิชาการ: `ระบบบัตรนักเรียน`

### Smart Card
- ขนาดบัตรจริง 85.60 × 53.98 มม. (แนวนอน)
- ใช้โทนสีเขียว–ทองและตราโรงเรียน
- ใช้ฟอนต์ `TH SarabunPSK` แบบเดียวกับเอกสารของระบบ
- รูปนักเรียนแสดงในกรอบกว้าง 25.4 มม. (1 นิ้ว) อัตราส่วนแนวตั้งประมาณ 3:4
- ข้อมูลบนบัตร:
  - ชื่อ–นามสกุล
  - เลขบัตรนักเรียน (เลขบัตรออกใหม่อัตโนมัติ)
  - เลขประจำตัวประชาชน / G
  - เลขประจำตัวนักเรียน
  - วันเดือนปีเกิด
  - วันออกบัตร
  - วันหมดอายุ
- อายุบัตร 3 ปีนับจากวันออกบัตร

### Card number / lifecycle
- เลขบัตรรูปแบบ `BNK-<ปี พ.ศ.>-<running 5 หลัก>` เช่น `BNK-2569-00001`
- Running แยกตามปีที่ออกบัตรและเพิ่มเลขแบบ atomic ที่ Database
- การออกบัตรใหม่จะยกเลิกบัตรเดิมที่ยัง Active อัตโนมัติ
- บัตรสามารถถูกยกเลิกพร้อมเหตุผล เช่น บัตรหาย/ชำรุด
- ข้อมูลหลักของบัตรที่ออกแล้วถูกล็อกไม่ให้แก้ย้อนหลัง

### Rights / RLS
- Academic Head และ Super Admin ออกบัตร/ออกใหม่/ยกเลิกบัตร
- ผู้ที่มีสิทธิ์ดูนักเรียนตาม `private.can_view_student()` สามารถเห็นข้อมูลบัตรในขอบเขตของตน
- Delete บัตรจากฐานข้อมูลสงวนให้ Super Admin; การใช้งานปกติใช้สถานะ Revoked เพื่อรักษาประวัติ
- Database บังคับว่าต้องมีรูปนักเรียนใน Private Storage ก่อนออกบัตร
- รูปนักเรียนยังอยู่ใน Private bucket `student-photos` และใช้ RLS เดิม

### Print / PDF
- พิมพ์หรือ Save PDF รายใบด้วย page size 85.60 × 53.98 มม.
- Export แบบ A4 ได้ 10 ใบต่อหน้า (2 คอลัมน์ × 5 แถว) โดยคงขนาดจริงของ Smart Card
- รอ `document.fonts.ready` ก่อนเปิด Print Dialog เพื่อให้ TH SarabunPSK พร้อมใช้งาน

### Integration
- ดึงชื่อ, เลขประจำตัวนักเรียน, เลขประชาชน/G, วันเกิด และรูปจาก Student Registry V9.0 โดยตรง
- ไม่เก็บข้อมูลนักเรียนซ้ำในตารางบัตร ยกเว้น metadata ของการออกบัตร
- Student Registry และ Home Visit Window จาก V9.0 ยังคงทำงานเดิม


## V10.1 — Student Registry UI Polish

ปรับหน้าตา `ระบบบัญชีรายชื่อนักเรียน` โดยไม่เปลี่ยนโครงสร้างฐานข้อมูลหรือระบบ Import:
- Hero ใหม่สีเขียว–ทอง พร้อมสรุปนักเรียน ห้องเรียน ชาย และหญิง
- Navigation Tabs แบบการ์ดแทนปุ่ม HTML ดิบ พร้อมคำอธิบายแต่ละเมนู
- Filter panel ใหม่สำหรับปี/ภาคเรียน/ช่วงชั้น/ระดับชั้น/ห้อง/ค้นหา และปุ่มล้างตัวกรอง
- ตารางข้อมูลนักเรียนใหม่ แสดงชื่อ เลขประจำตัว เลขประชาชน/G วันเกิด ชั้น และสถานะอย่างอ่านง่าย
- ปรับหน้าใบรายชื่อ บัญชีเลื่อนชั้น ระดับชั้น/ห้องเรียน และ Import/Export ให้ใช้ visual language เดียวกัน
- เพิ่ม Empty State และ CTA ที่ชัดเจน
- ปรับ Responsive สำหรับจอ Desktop / Tablet / Mobile
- ไม่แก้ Student Registry schema, Import RPC, RLS หรือข้อมูลที่นำเข้าแล้ว


## V10.2 — Student Registry Print / Academic Year / Enrollment History

- PDF ระบบบัญชีรายชื่อนักเรียนและใบรายชื่อแสดงตราโรงเรียน พร้อมชื่อโรงเรียน ที่อยู่ และหน่วยงานต้นสังกัด
- ใบรายชื่อนักเรียนเปลี่ยนเป็น A4 แนวตั้ง และยังคงช่องว่าง 10 ช่อง
- ใบรายชื่อดึงชื่อครูประจำชั้นจาก `homeroom_teachers` และแสดงเฉพาะบัญชีครูที่ Active
- รายชื่อในแต่ละห้องเรียงตามเลขประจำตัวนักเรียนจากน้อยไปมาก และเลขที่แสดงคำนวณใหม่ตามลำดับนี้
- เพิ่ม Super Admin workflow สำหรับสร้างปีการศึกษาใหม่ พร้อมภาคเรียน 1/2 และเลือกคัดลอกโครงสร้างห้องจากปีเดิมโดยไม่คัดลอกนักเรียน
- เพิ่มการตั้งปีการศึกษา/ภาคเรียนปัจจุบันผ่าน `academic_terms.is_current`; ระบบอื่น fallback ไปใช้การคำนวณตามวันที่หากยังไม่กำหนด
- เก็บปี/ภาคเรียนเก่าไว้เลือกดูย้อนหลัง ไม่ลบข้อมูลเดิมเมื่อขึ้นปีใหม่
- เพิ่มการนำรายชื่อนักเรียนออกจากภาคเรียนแบบเก็บประวัติ (ย้ายออก / ไม่เรียนต่อ / ลาออก / เสียชีวิต / อื่น ๆ) แทน Hard Delete
- นักเรียนที่นำออกจากรายชื่อยังคงอยู่ในประวัติ แต่ไม่ถูกใช้ในใบรายชื่อปัจจุบัน บัตรนักเรียน และระบบเยี่ยมบ้านของ enrollment นั้น
- แก้ Export XLSX ของ Student Registry ให้มีฟังก์ชันสร้างข้อมูลจริงและรวมสถานะ enrollment


## V10.3 — Student Registry ordering / semester copy / current term

- รายชื่อนักเรียนเรียงภายในแต่ละห้องแบบ: นักเรียนชายก่อน → เลขประจำตัวนักเรียนจากน้อยไปมาก → นักเรียนหญิง → เลขประจำตัวนักเรียนจากน้อยไปมาก
- ลำดับเดียวกันถูกใช้กับหน้าข้อมูลนักเรียน, ใบรายชื่อ, PDF และ Excel
- ใบรายชื่อ PDF เป็น A4 แนวตั้ง 1 หน้า โดยใช้หัวเอกสารแบบกระชับ (โลโก้ + ชื่อโรงเรียน) และเพิ่มขนาดตัวอักษรในตาราง
- เพิ่มปุ่มคัดลอกโครงสร้างห้องและนักเรียนที่กำลังเรียนจากภาคเรียน 1 ไปภาคเรียน 2 ของปีเดียวกัน โดยไม่ลบหรือแก้ประวัติภาคเรียนเดิม และไม่สร้างนักเรียนซ้ำถ้ามีข้อมูลปลายทางแล้ว
- Super Admin สามารถกำหนดปีการศึกษา/ภาคเรียนปัจจุบันได้จากหน้า “ตั้งค่าระบบ”
- Dashboard/Topbar ของผู้ใช้ทุกสิทธิ์แสดงปีการศึกษาและภาคเรียนปัจจุบันของระบบ
- ปรับขนาดตัวอักษรใน Student Registry ให้ใกล้เคียงระบบย่อยอื่น ๆ และอ่านง่ายขึ้น


## V10.4 — Student Registry role-based access

ปรับสิทธิ์ระบบบัญชีรายชื่อนักเรียนตามบทบาทและครูประจำชั้น:

- **ใบรายชื่อ**: ผู้ใช้ที่ Active ทุกสิทธิ์สามารถเลือกชั้น/ห้องใดก็ได้และดาวน์โหลด PDF/XLSX ได้
  - ใช้ RPC `get_student_class_roster()` ซึ่งเปิดเผยเฉพาะข้อมูลที่จำเป็นต่อใบรายชื่อ ได้แก่ เลขประจำตัว ชื่อ-สกุล เพศ ชั้น/ห้อง และชื่อครูประจำชั้น
  - ไม่เปิดข้อมูลละเอียด เช่น เลขประชาชน ที่อยู่ ผู้ปกครอง หรือข้อมูลสุขภาพให้ครูทั่วไปผ่านใบรายชื่อ
- **ข้อมูลนักเรียน**:
  - Super Admin / หัวหน้าฝ่ายวิชาการ / ผู้บริหาร ดูได้ทุกห้องพร้อมตัวกรอง
  - ครูและหัวหน้ากลุ่มงานอื่นเห็นเฉพาะห้องที่ถูกกำหนดเป็นครูประจำชั้น และไม่แสดงตัวกรองข้ามห้อง
- **บัญชีเลื่อนชั้น**:
  - Super Admin / หัวหน้าฝ่ายวิชาการ เห็นและจัดการทุกห้อง
  - ครูประจำชั้นเห็นและจัดการเฉพาะห้องของตน
  - ผู้บริหารไม่เห็นเมนูบัญชีเลื่อนชั้น
- **ระดับชั้น / ห้องเรียน**: แสดงเฉพาะ Super Admin / หัวหน้าฝ่ายวิชาการ / ผู้บริหาร
- **Import / Export สำรองข้อมูล Excel**: แสดงและใช้งานได้เฉพาะ Super Admin / หัวหน้าฝ่ายวิชาการ
- จำกัด RLS ของ `student_promotion_batches` และ `student_promotion_items` ให้ผู้บริหารไม่สามารถอ่านบัญชีเลื่อนชั้นผ่าน API ได้
- เมนู Student Registry ปรับจำนวนแท็บอัตโนมัติตามสิทธิ์ เพื่อไม่เหลือช่องว่างบนหน้าจอ

## V10.5 — Student Card homeroom scope + collapsed sidebar

- **ระบบบัตรนักเรียน** ใช้ขอบเขตสิทธิ์แบบเดียวกับข้อมูลนักเรียน:
  - Super Admin / หัวหน้าฝ่ายวิชาการ / ผู้บริหาร ดูทุกชั้นทุกห้องและใช้ตัวกรองได้
  - ครูและหัวหน้ากลุ่มงานอื่นที่เป็นครูประจำชั้น เห็นเฉพาะห้องที่ตนรับผิดชอบ โดยระบบเลือกห้องให้อัตโนมัติและไม่แสดงตัวกรองข้ามชั้น
- ครูประจำชั้นสามารถเพิ่มหรือเปลี่ยนรูป 1 นิ้วของนักเรียนในห้องที่ตนรับผิดชอบได้ โดย Backend ตรวจสิทธิ์จาก `homeroom_teachers`, enrollment ที่กำลังเรียน และภาคเรียนปัจจุบัน
- การบันทึก `students.photo_path` ใช้ RPC `set_student_photo()` เพื่อไม่เปิดสิทธิ์ UPDATE ข้อมูลนักเรียนทั้งแถวให้ครูประจำชั้น
- Storage bucket `student-photos` ยังคงเป็น Private และ INSERT/UPDATE/DELETE รูปถูกจำกัดด้วย `private.can_manage_student_photo()`
- เลขที่ในหน้าระบบบัตรนักเรียนคำนวณใหม่จาก Student Registry โดยใช้ลำดับเดียวกัน: ชายก่อน → เลขประจำตัวนักเรียนน้อยไปมาก → หญิง → เลขประจำตัวนักเรียนน้อยไปมาก จึงไม่ใช้ `student_number` เก่าที่นำเข้าจาก Excel มาแสดงเป็นเลขที่
- Sidebar กลุ่มงานเริ่มต้นแบบ **พับทั้งหมด** แสดงเฉพาะชื่อกลุ่มงาน เมื่อคลิกจึงค่อยเปิดรายการระบบย่อย และจำสถานะกลุ่มที่ผู้ใช้เปิดไว้ระหว่างการใช้งานเพื่อคงความลื่นไหล
- หมายเหตุ: สิทธิ์การออกบัตรจาก V10.5 ถูกขยายเพิ่มเติมใน V10.6 ให้ครูประจำชั้นออกบัตรของห้องตนเองได้



## V10.6 — Import verification + automatic roster numbering + Homeroom card issue

### Import / Excel
- Import ยังคงจำกัดเฉพาะ Super Admin และหัวหน้าฝ่ายวิชาการ
- หลังเลือก Excel ระบบจะแสดง Preview ก่อนบันทึกจริง
- ตรวจข้อมูลบังคับ เลขประจำตัวซ้ำ เลขประชาชน/G ซ้ำ เพศ และห้องเรียนในปี/ภาคเรียนที่เลือก
- ช่อง `เลขที่` จาก Excel ไม่ถูกใช้เป็นเลขที่จริง
- ระบบคำนวณเลขที่ใหม่อัตโนมัติแยกตามห้อง: นักเรียนชายก่อนทั้งหมด → รหัสนักเรียนน้อยไปมาก → นักเรียนหญิง → รหัสนักเรียนน้อยไปมาก
- Preview แสดงเลขที่ใหม่ก่อนกดยืนยัน
- Backend `import_student_registry` คำนวณเลขที่ซ้ำอีกครั้งหลังบันทึก เพื่อไม่ให้ client ข้ามกติกาได้
- แก้ปุ่ม `ดาวน์โหลดแบบฟอร์ม Excel` และ `Export รายชื่อปัจจุบัน` ที่ไม่ทำงาน เนื่องจาก helper ดาวน์โหลดไฟล์หายไป

### Student Card
- ครูประจำชั้นสามารถออกบัตร/ออกบัตรใหม่ให้นักเรียนในห้องของตัวเองในภาคเรียนปัจจุบันได้
- Super Admin และหัวหน้าฝ่ายวิชาการยังออกบัตรได้ทุกห้อง
- ผู้บริหารยังเป็นสิทธิ์ดู ไม่ได้รับสิทธิ์ออกบัตรจาก V10.6
- Backend ตรวจสิทธิ์ห้องเรียนก่อนสร้างบัตร ไม่ได้พึ่งการซ่อนปุ่มใน UI เท่านั้น

### Database integrity
- เลขที่ซ้ำถูกห้ามเฉพาะ enrollment ที่สถานะ `active` ภายในห้องเดียวกัน
- enrollment เก่าที่ inactive/transferred out สามารถเก็บเลขที่เดิมเพื่อประวัติย้อนหลังโดยไม่ขวางเลขที่ปัจจุบัน


## V10.7 — ระบบปฏิทินวิชาการ / ปฏิทิน 100 วัน

- เพิ่ม `ระบบปฏิทินวิชาการ` เป็นระบบแรกของกลุ่มงานบริหารวิชาการ อยู่ก่อนระบบส่งแผนการสอน
- เตรียม 3 หมวดย่อย: ปฏิทิน 100 วัน, ปฏิทินนิเทศการศึกษา, ปฏิทิน PLC โดย V10.7 พัฒนาปฏิทิน 100 วันก่อน
- เชื่อมปีการศึกษาและภาคเรียนปัจจุบันจาก `academic_terms` และยังเลือกดูข้อมูลย้อนหลังได้
- ผู้รับผิดชอบกำหนดวันเปิดเรียนวันแรกและเดือนที่ต้องการแสดงเอง ระบบคำนวณวันเรียน 1–100 อัตโนมัติ
- วันเสาร์แสดง `ส` สีม่วง, วันอาทิตย์แสดง `อา` สีแดง, วันหยุดแสดง `ย` สีเหลือง และไม่ถูกนับใน 100 วัน
- รองรับ `เปิดเรียนกรณีพิเศษ` และ `เปิดเรียนชดเชย` พร้อมช่องบังคับให้ระบุว่าชดเชยแทนวันที่ใด
- เพิ่ม/แก้ไข/ลบ วันหยุด, วันเปิดเรียนกรณีพิเศษ และกิจกรรมได้ โดยระบบคำนวณปฏิทินใหม่อัตโนมัติ
- หน้าเอกสารจำลองรูปแบบตัวอย่างโรงเรียน: ตรา/หัวเรื่อง, ตารางวันที่ 1–31, แถวเดือน, รวมวันรายเดือน, รวม 100 วัน, คำอธิบายสี, กิจกรรม และวันหยุด
- Export ปฏิทินเดียวกันเป็น PDF A4 แนวนอน และ PNG คุณภาพสูง
- สิทธิ์แก้ไข: Super Admin, หัวหน้าวิชาการ และผู้รับผิดชอบเพิ่มเติม 1 คนที่ Super Admin แต่งตั้งใน `ตั้งค่าระบบ`
- ผู้ใช้งาน Active คนอื่นดูและ Export ได้เฉพาะปฏิทินที่ `ประกาศใช้แล้ว`
- RLS บังคับสิทธิ์ที่ฐานข้อมูล ไม่ได้พึ่งการซ่อนปุ่มหน้าเว็บ
- Migration อ้างอิง: `supabase-v10.7.sql`


## V10.7.1 hotfix
- แก้ permission denied สำหรับ `private.can_manage_academic_calendar()` และ `private.can_view_academic_calendar(uuid)` ที่ถูกเรียกจาก RLS ของระบบปฏิทินวิชาการ
- อนุญาต `authenticated` ให้ EXECUTE helper ทั้งสอง โดยยังคงปิด `anon` และ `public`

## V10.7.2
- ปฏิทินวิชาการ: กำหนดเอกสาร Export ทั้ง PDF และ PNG ให้ใช้ฟอนต์ **TH Sarabun PSK** ทั้งหมด
- รอให้ฟอนต์ Regular/Bold โหลดเสร็จก่อนจับภาพเอกสาร เพื่อให้ PDF และ PNG ใช้ฟอนต์เดียวกัน
- ไม่มีการเปลี่ยนแปลงฐานข้อมูลในเวอร์ชันนี้

## V10.7.3
- ปฏิทิน 100 วัน: ถ้าวันหยุดราชการ/วันหยุดกรณีพิเศษตรงกับวันเสาร์ ให้ช่องปฏิทินแสดง **ส** สีม่วง
- ถ้าตรงกับวันอาทิตย์ ให้แสดง **อา** สีแดง
- รายละเอียดวันหยุดยังคงแสดงในส่วน “วันหยุดราชการ / วันหยุดพิเศษ” ตามเดิม
- วันดังกล่าวยังคงไม่นับเป็นวันเรียน 1–100 เว้นแต่ถูกกำหนดเป็น “เปิดเรียนกรณีพิเศษ”
- ไม่มีการเปลี่ยนแปลงฐานข้อมูล

## V10.7.4
- เพิ่มปุ่ม **บันทึกแบบร่าง** ในหน้าปฏิทิน 100 วัน
- ปุ่มในหน้าต่างสร้าง/แก้ไขปฏิทินเปลี่ยนเป็น **บันทึกแบบร่าง**
- การบันทึกแบบร่างเก็บวันเปิดเรียน เดือนที่เลือก วันหยุด วันเปิดเรียนกรณีพิเศษ และกิจกรรมที่บันทึกไว้ในฐานข้อมูล
- ถ้าปฏิทินเคยประกาศใช้แล้ว การกดบันทึกแบบร่างจะเปลี่ยนสถานะกลับเป็น `draft` เพื่อแก้ไขต่อโดยไม่แสดงฉบับกำลังแก้ให้ผู้ใช้ทั่วไป
- ปุ่ม **ประกาศใช้** ใช้สำหรับเผยแพร่ฉบับร่างเท่านั้น
- ไม่มีการเปลี่ยนแปลงฐานข้อมูล

## V10.7.5
- แก้ข้อผิดพลาด `duplicate key value violates unique constraint "academic_calendars_academic_year_semester_key"`
- ก่อนสร้างปฏิทิน ระบบจะตรวจว่าปีการศึกษา + ภาคเรียนนั้นมีปฏิทินอยู่แล้วหรือไม่
- ถ้ามีอยู่แล้ว จะบันทึกต่อในปฏิทินเดิมและเปลี่ยนเป็นฉบับร่าง แทนการสร้างรายการซ้ำ
- ข้อมูลวันหยุด วันเปิดเรียนกรณีพิเศษ และกิจกรรมที่ผูกกับปฏิทินเดิมยังคงอยู่
- ไม่มีการเปลี่ยนแปลงฐานข้อมูล

## V10.7.6
- ขยายฟอนต์ในตารางปฏิทิน 100 วัน โดยเฉพาะเลขวันเรียน 1–100 ให้มองเห็นชัดขึ้น
- ขยายชื่อเดือน จำนวนวันรวม หัวตาราง และความสูงของแถว
- ขยายฟอนต์ส่วนกิจกรรม วันหยุด คำอธิบายสี และข้อมูลใต้ตาราง
- ขยายหัวเอกสารให้สมดุลกับตาราง
- การ Export PDF/PNG ใช้ขนาดใหม่นี้ด้วย และยังคงเป็น TH Sarabun PSK
- ไม่มีการเปลี่ยนแปลงฐานข้อมูล

## V10.7.7
- เพิ่มปุ่ม **ดึงแบบร่าง** ในระบบปฏิทิน 100 วันสำหรับผู้มีสิทธิ์จัดการ
- ปุ่มจะแสดงรายการปฏิทินที่มีสถานะ `draft` ทุกปีการศึกษา/ภาคเรียนที่ผู้ใช้มีสิทธิ์เห็น
- แสดงวันเปิดเรียนและเวลาแก้ไขล่าสุด เพื่อช่วยเลือกแบบร่างได้ถูกชุด
- เมื่อกดดึง ระบบจะสลับไปยังปีการศึกษา/ภาคเรียนนั้นและโหลดข้อมูลจากฐานข้อมูลกลับมาแก้ไขต่อทันที
- ข้อมูลวันหยุด วันเปิดเรียนกรณีพิเศษ และกิจกรรมของแบบร่างถูกโหลดกลับมาด้วย
- ไม่มีการเปลี่ยนแปลงฐานข้อมูล

## V10.8.0
- แก้แท็บระบบปฏิทินวิชาการให้ **ปฏิทิน 100 วัน / ปฏิทินนิเทศการศึกษา / ปฏิทิน PLC** คงอยู่พร้อมกันทุกหน้า
- เพิ่มปฏิทินนิเทศ: กำหนดสัปดาห์ตามช่วงชั้น → ดึงครูจากครูประจำชั้น/ตารางสอน → ล็อกคาบสอนจริงจากตารางสอน Published → แจ้งเตือนครู
- สิทธิ์ปฏิทินนิเทศ: Super Admin + รองผู้อำนวยการฝ่ายวิชาการที่ Super Admin กำหนด + ผู้รับผิดชอบนิเทศเพิ่มเติม 1 คน
- เพิ่มหน้า Settings สำหรับ Super Admin เพื่อแต่งตั้งสิทธิ์นิเทศ 2 ตำแหน่ง
- เพิ่มปฏิทิน PLC: เลือกช่วงชั้น, คาบ, แบบรายสัปดาห์หรือกำหนดวันที่เอง
- PLC อนุญาตกำหนดคาบโดยไม่ตรวจว่าครูว่างหรือมีสอน และครูจะเห็นตามช่วงชั้นของตน
- สิทธิ์จัด PLC: Super Admin + หัวหน้าวิชาการ
- ทั้งสองระบบผูกช่วงวันกับปฏิทิน 100 วัน และใช้ข้อมูลคาบจากระบบจัดตารางสอน

- ปรับให้กำหนดสัปดาห์นิเทศได้แม้ยังไม่ได้สร้างชั้น/ตารางสอนของภาคเรียนนั้น; ขั้นล็อกครู/คาบจะพร้อมเมื่อมีข้อมูลตารางสอน

## V10.8.1
- ครูทั่วไปไม่เห็นกล่อง “หลักการทำงาน” ในหน้าปฏิทินนิเทศแล้ว
- ปฏิทินนิเทศรายสัปดาห์ของครูแสดงเฉพาะช่วงชั้นที่ครูสังกัด; ผู้จัดการนิเทศยังเห็นทุกช่วงชั้น
- ตอนล็อกคาบนิเทศ ต้องเลือก **ผู้ทำหน้าที่นิเทศ 1 คน** จากผู้ใช้งาน Active ทุกตำแหน่ง โดยผู้นิเทศไม่จำเป็นต้องอยู่ช่วงชั้นเดียวกัน
- เก็บชื่อ/รหัสผู้นิเทศกับคาบนิเทศ และแสดงใน “การนิเทศของฉัน”, รายสัปดาห์ และหน้าจัดคาบ
- แจ้งเตือนไปทั้งครูผู้รับการนิเทศและผู้ที่ได้รับมอบหมายเป็นผู้นิเทศ
- ปฏิทิน 100 วัน: วันที่มี “กิจกรรม” จะแสดง **กรอบสีเขียว** รอบช่องวัน โดยไม่เปลี่ยนการนับวันเรียน/วันหยุด
- กรอบกิจกรรมแสดงทั้งหน้าระบบและ Export เพราะใช้เอกสารชุดเดียวกัน

## V10.8.2
- ปรับธีมหน้าระบบให้พื้นหลังหลักเป็นสีขาวมากขึ้นทั้งระบบ
- ปรับส่วนหัวของแต่ละระบบให้ใช้แพตเทิร์นเดียวกัน: เขียวไล่เฉดทอง พร้อมวงกลมตกแต่งแบบเดียวกับตัวอย่าง
- ปรับปุ่มหลักและองค์ประกอบเน้นให้ใช้โทนเขียว-ทอง แต่คงตัวอักษรหลักในหน้าระบบเป็นสีดำ
- ปรับ Sidebar/Topbar/Card ให้กลืนกับธีมสีขาวใหม่ โดยไม่แตะเงื่อนไขการส่งออกไฟล์ PDF / รูปภาพ / เอกสาร
- ไม่แก้ logic และไม่เปลี่ยนหน้าตาการ Export เอกสาร/รายงานที่มีอยู่

## V10.8.3
- ปรับตัวหนังสือของปุ่มเขียวไล่ทองเป็นสีเขียวดำเข้ม `#0F1F18` และเพิ่มน้ำหนักตัวอักษร เพื่ออ่านชัดทั้งฝั่งสีเขียวและสีทอง
- เปลี่ยน Sidebar จากสีขาวเป็น **เขียวเข้มไล่เฉดไปทองบริเวณด้านล่าง**
- เมนู Sidebar ใช้ตัวอักษรสีขาว, ชื่อหมวดสีทองอ่อน, เมนู Active ใช้พื้นโปร่งพร้อมเส้นเน้นสีทอง
- การ์ดผู้ใช้งานท้าย Sidebar เปลี่ยนเป็นโปร่งบนพื้นเขียวทองเพื่อคงความอ่านง่าย
- พื้นที่ทำงานหลักยังคงเป็นสีขาว
- ไม่แก้ไข logic ระบบ และไม่แตะเงื่อนไข/รูปแบบการ Export PDF, รูปภาพ หรือไฟล์เอกสารต่าง ๆ

## V10.8.4
- เพิ่มเอฟเฟกต์ hover / focus ให้ปุ่มหรือแท็บพื้นขาว/เรียบ เช่น `btn-ghost`, แท็บปฏิทินวิชาการ, และแท็บระบบบัญชีรายชื่อ
- เมื่อเอาเมาส์ไปวางหรือโฟกัส จะเปลี่ยนเป็นพื้นเขียวอ่อน พร้อมกรอบเขียวแบบตัวอย่าง เพื่อให้รู้สึกว่าคลิกได้ชัดขึ้น
- รักษาสถานะ active ให้เด่นกว่าสถานะ hover
- ไม่แก้ logic ระบบ และไม่แตะเงื่อนไขการ Export เอกสาร

## V10.8.5
- เปลี่ยนสัญลักษณ์ `BNK` มุมบนของ Sidebar เป็นโลโก้โรงเรียนจาก `school-logo.png`
- เพิ่มกรอบพื้นขาวบาง ๆ เพื่อให้ตราโรงเรียนอ่านชัดบน Sidebar เขียวไล่ทอง
- ไม่เปลี่ยนชื่อระบบ การตั้งค่าแบรนด์ส่วนอื่น หรือเงื่อนไขการ Export เอกสาร

## V10.8.6
- ปรับพื้นหลังโลโก้ด้านบน Sidebar เป็นกรอบสี่เหลี่ยมมุมมนโทนครีม-ทองตามภาพตัวอย่าง
- ใช้ไล่เฉดครีมอ่อน → ทองอ่อน พร้อมขอบขาวบางและเงานุ่ม
- โลโก้โรงเรียนเดิมยังคงใช้ไฟล์ `school-logo.png`
- ไม่กระทบ logic ระบบหรือการ Export เอกสาร

## V10.8.7
- ปรับ Hero หน้าเข้าสู่ระบบจาก “ระบบโรงเรียนที่ไหลลื่นในที่เดียว” เป็น **BNK School OS / โรงเรียนบ้านหนองเขียว**
- เปลี่ยนการ์ดแนวคิดเป็น:
  - **B = Build** — สร้างสรรค์ / สร้างรากฐาน
  - **N = Nurture** — ฟูมฟัก / ดูแลใส่ใจ
  - **K = Knowledge** — คลังความรู้ / ภูมิปัญญา
- เปลี่ยนตรา `BNK` ด้านบน Hero เป็นโลโก้โรงเรียนเดียวกับที่ใช้ในระบบ และใช้กรอบครีม-ทองแบบเดียวกับ Sidebar
- ไม่แก้ logic ระบบหรือเงื่อนไขการ Export เอกสาร

## V10.8.8
- ปรับป้าย “ปีการศึกษา / ภาคเรียน” ให้ใช้พื้นหลังแบบเดียวกับกรอบโลโก้: ครีมอ่อน → ทองอ่อน
- ใช้ตัวอักษรสีเขียวเข้มเพื่อให้อ่านง่ายบนพื้นครีม-ทอง
- ครอบคลุมทั้ง chip ใน Hero และป้ายช่วงปี/ภาคเรียนบน Topbar / Dashboard
- ไม่แก้ logic ระบบ และไม่กระทบการ Export เอกสาร

## V10.9.0 — ระบบงานทะเบียนวิชาการ / คำร้องใบย้ายนักเรียน
- เพิ่มโมดูล **ระบบงานทะเบียนวิชาการ (Academic Registration)** ในกลุ่มงานบริหารวิชาการ พร้อม Dropdown 4 ระบบย่อย: คำร้องใบย้ายนักเรียน, คำร้องใบรับรองนักเรียน, คำร้องขอวุฒิการศึกษา และตรวจสอบวุฒิการศึกษา โดย V10.9.0 เปิดใช้งานคำร้องใบย้ายนักเรียนก่อน
- ฟอร์มคำร้องใบย้ายเก็บข้อมูลตามแบบโรงเรียนที่ได้รับ: ผู้ปกครอง, นักเรียน, ชั้น/ปีการศึกษา/เลขประจำตัว, วันเกิด, เลขประชาชน, บิดา/มารดา, โทรศัพท์, เหตุผลการย้าย, สถานศึกษาปลายทาง/เหตุผลอื่น, วันที่ย้าย, รายการหลักฐาน และส่วนตรวจสอบภายใน
- ข้อมูลนักเรียนดึงจาก **ระบบบัญชีรายชื่อนักเรียน** ตามสิทธิ์ของผู้ใช้ เพื่อลดการกรอกซ้ำ และใช้ลำดับนักเรียนตามกฎ BNK School OS เดิม
- รองรับ **บันทึกแบบร่าง**, แก้ไข, ลบแบบร่าง, ยื่นคำร้อง และแนบหลักฐานเป็น PDF หลายไฟล์
- Export **ใบคำร้อง 1 หน้า** โดยใช้ไฟล์ต้นฉบับจริงเป็นพื้นหลัง A4 แล้วเติมข้อมูลลงตำแหน่งของแบบฟอร์ม จึงคงเส้น ตาราง โลโก้ และโครงหน้าเดิม
- Export **PDF รวมหลักฐาน** โดยหน้าแรกเป็นใบคำร้องที่สร้างจากระบบ แล้วผนวกทุกหน้าของ PDF หลักฐานตามลำดับเป็นไฟล์เดียว
- เอกสารในโมดูลทะเบียนวิชาการใช้ font stack แบบ **TH SarabunIT๙ เป็นลำดับแรก** และระบบแปลงเลขอารบิกเป็นเลขไทยก่อนสร้างเอกสาร เพื่อคงรูปแบบตัวเลขไทยแม้เครื่องผู้ใช้ไม่มีฟอนต์ IT๙ ติดตั้ง; fallback ใช้ TH Sarabun PSK เฉพาะกรณีจำเป็น
- เพิ่ม private Storage bucket `academic-registration` รับเฉพาะ PDF (สูงสุด 25 MB ต่อไฟล์) พร้อม RLS ตามสิทธิ์คำร้อง
- เพิ่มตารางคำร้อง, metadata หลักฐาน, เลขคำร้องรายปี, RLS และ RPC สำหรับดึงรายชื่อนักเรียน/ยื่นคำร้อง
- ระบบย่อยอีก 3 รายการเป็นโครงหน้าเตรียมไว้ก่อน และยังไม่เปิดฟอร์มจริงในเวอร์ชันนี้

## V10.9.1
- แก้ error `new row violates row-level security policy for table "academic_transfer_requests"` โดยย้ายการบันทึกแบบร่างไปใช้ RPC ที่ตรวจสิทธิ์นักเรียนก่อนบันทึก
- ทดสอบการสร้างคำร้องด้วยบัญชีครูประจำชั้นใน transaction แล้วผ่าน
- เพิ่ม Settings สำหรับ Super Admin: ครูทะเบียน / ครูวัดและประเมินผล / ผู้บริหารสถานศึกษา
- ส่วนเจ้าหน้าที่ภายในย้ายมาเป็นการ์ดแยก และแต่ละคนเลือกวิธีลงนามได้ 3 แบบ: เซ็นบนกระดาษ / เซ็นสดในระบบ / อัปโหลดรูปลายเซ็น
- ส่วนการชำระเงินเป็นข้อมูลเสริม ไม่บังคับ และเปลี่ยนความรับผิดชอบใน UI/PDF เป็น “ครูทะเบียน / ตรวจสอบการชำระเงิน”
- เพิ่มสถานะไฟล์ทันทีเมื่อเลือก Add File: แสดงชื่อไฟล์ ขนาด และสถานะกำลังอัปโหลด/แนบแล้ว
- PDF ใบคำร้องยังคงใช้แม่แบบเดิม 1 หน้า และ PDF หลักฐานยังผนวกต่อท้ายเหมือนเดิม

## V10.9.2
- ฝั่ง Super Admin / ผู้ดูแลงานทะเบียน: ตอนสร้างคำร้องต้องเลือก **ชั้น/ห้อง → นักเรียน** ทำให้ค้นหารายชื่อ 624 คนได้ง่ายขึ้น
- ฝั่งครูประจำชั้น: ยังเห็นช่องเลือก “นักเรียน” อย่างเดียว และ Backend จำกัดให้เห็นเฉพาะนักเรียนห้องประจำชั้นของตนในปี/ภาคเรียนที่เลือก
- ทดสอบ Backend: ครูประจำชั้นตัวอย่างเห็น 28 คนใน 1 ห้อง; Super Admin เห็น 624 คนใน 23 ห้อง
- แก้การแสดงชื่อเป็น **คำนำหน้า+ชื่อ เว้นวรรค นามสกุล** เช่น `เด็กชายสมชาย ใจดี`
- เพิ่มบทบาท “ครูทะเบียนหลัก” และ “นายทะเบียน” โดยมีสิทธิ์งานทะเบียนเท่ากัน
- Super Admin ตั้งครูทะเบียนหลัก/นายทะเบียน/วัดผล/ผู้บริหารจาก Settings; ครูทะเบียนหลักหรือนายทะเบียนสามารถเปิด “ตั้งค่าสิทธิ์ทะเบียน” เพื่อเปลี่ยนนายทะเบียนได้
- ไม่เปลี่ยนเงื่อนไข PDF, ลายเซ็น, Add File หรือการผนวกหลักฐาน

## V10.9.3
- ลบแนวคิด “ครูทะเบียนหลัก” ออกจากระบบ เหลือ **ครูทะเบียน 1 คน** เท่านั้น
- Super Admin ตั้งครูทะเบียนได้ และครูทะเบียนคนปัจจุบันสามารถส่งต่อสิทธิ์ครูทะเบียนให้คนใหม่ได้
- เพิ่มปุ่ม **เปิดไฟล์** สำหรับหลักฐาน PDF โดยเปิดผ่าน Signed URL ของ Storage; ถ้าเปิด Signed URL ไม่สำเร็จจะ fallback เป็น Blob URL
- ปุ่ม “ดาวน์โหลด” ยังอยู่แยกจาก “เปิดไฟล์”
- แก้การอัปเดตหน้าจอหลังบันทึกแบบร่าง/แนบไฟล์/ลบไฟล์/ยื่นคำร้อง/ลงนาม ให้โหลดข้อมูลใหม่และอัปเดตทันทีโดยไม่ต้อง Refresh หน้าเว็บ
- ตอนอัปโหลด Add File ระบบอัปเดต state ทันทีและแสดงสถานะไฟล์ก่อนโหลดข้อมูลกลับจากฐานข้อมูล
- ไม่เปลี่ยนรูปแบบ PDF, การรวมเอกสารหลักฐาน หรือฟอนต์งานทะเบียน

## V10.9.4
- แก้ปุ่ม **เปิด** ในตารางคำร้องให้เปิดรายละเอียดแล้วเลื่อนหน้าจอไปยังรายละเอียดทันที พร้อมกรอบไฮไลต์ชั่วคราว จึงเห็นผลการคลิกชัดเจน
- หลังบันทึกแบบร่าง ระบบบังคับกลับมาที่ปี/ภาคเรียนของคำร้องนั้น เลือกคำร้องล่าสุด และแสดงรายละเอียดทันที
- หลัง Add File / ลบไฟล์ / ยื่นคำร้อง / ลงนาม ระบบคงคำร้องเดิมไว้และแสดงข้อมูลใหม่ทันที
- เปิด Realtime publication ใน Supabase ให้ 3 ตารางงานทะเบียน: คำร้อง / ไฟล์หลักฐาน / ลายเซ็น
- เพิ่ม Realtime listener ของลายเซ็น และเปลี่ยน listener งานทะเบียนให้โหลดข้อมูลใหม่จริง ไม่ใช่แค่ redraw state เก่า
- ไม่เปลี่ยน PDF, ลำดับหลักฐาน, ฟอนต์ หรือสิทธิ์งานทะเบียน

## V10.9.5
- แก้ต้นเหตุที่เวอร์ชันใหม่อาจไม่ถูกโหลดใน Browser/Hosting โดยใส่ cache-busting ให้ `app.js`, `styles.css`, `config.js` และ no-cache meta
- แสดง `Build 10.9.5` ในหัวระบบงานทะเบียน เพื่อเช็กได้ทันทีว่าเครื่องผู้ใช้โหลดไฟล์เวอร์ชันใหม่จริง
- ปุ่ม “เปิด” แสดงรายละเอียดคำร้องไว้ **เหนือรายการตาราง** ทันที ไม่ต้องเลื่อนหาใต้ตาราง
- คลิกได้ทั้งปุ่ม “เปิด” และพื้นที่แถวคำร้อง
- การ Refresh งานทะเบียนโหลดข้อมูลจาก Supabase ก่อน แล้วค่อย Render เพียงรอบเดียว ลดปัญหา async render ซ้อนกัน
- บันทึกแบบร่าง / Add File / ลบไฟล์ / ยื่นคำร้อง / ลงนาม ยังคงดึงข้อมูลใหม่และแสดงคำร้องเดิมทันที
- ไม่เปลี่ยนรูปแบบ PDF / ฟอนต์ / การผนวกหลักฐาน

## V10.9.6
- ยกเลิก Add File หลักฐานในคำร้องใบย้าย: ผู้ปกครองนำหลักฐานฉบับกระดาษมายื่นกับโรงเรียน
- ลบคอลัมน์จำนวนไฟล์และปุ่ม Export รวมหลักฐาน เหลือ Export PDF ใบคำร้อง 1 หน้า
- ปุ่ม **เปิด** เปลี่ยนเป็นเปิดรายละเอียดแบบ Modal โดยใช้ global event delegation ไม่พึ่ง event binding หลัง render
- หลังบันทึกแบบร่าง ระบบอัปเดต state, render รายการใหม่ และเปิดรายละเอียดคำร้องที่เพิ่งบันทึกทันที
- เพิ่มคอลัมน์ **เลขที่** ในรายการคำร้องเพื่อให้ตรวจสอบกับบัญชีรายชื่อนักเรียนได้
- แก้เลขที่นักเรียนทั้งฐานข้อมูลตามกฎ BNK: ชายก่อน → หญิง → รหัสนักเรียนจากน้อยไปมาก → เลขที่ 1..N
- เพิ่ม trigger ให้เลขที่จัดใหม่อัตโนมัติเมื่อย้ายห้อง/เข้าออกห้อง/แก้เพศ/แก้รหัสนักเรียน
- อัปเดตเลขที่ในคำร้องเดิมแล้ว เช่น รหัส 3881 = เลขที่ 1 และ 3886 = เลขที่ 2 ใน อ.2/3
- ตรวจฐานข้อมูลหลังซ่อม: active enrollment mismatch = 0

## V10.9.7
- เปลี่ยนปุ่ม “เปิด” เป็นลิงก์ HTML แบบ native `:target` ไม่ต้องพึ่ง JavaScript event จึงเปิดรายละเอียดได้แม้ event binding มีปัญหา
- รายละเอียดคำร้องแสดงเป็น overlay จาก CSS โดยตรง และปิดด้วยปุ่ม ×
- Export PDF เปิดแท็บใหม่ทันทีเมื่อคลิก แล้วค่อยสร้าง PDF ใส่ในแท็บนั้น ลดปัญหา Browser บล็อก download หลัง async
- หลังบันทึกแบบร่าง อัปเดตแถวและรายละเอียดใน DOM โดยตรง ไม่ต้องรอ reload/realtime ก่อนเห็นข้อมูล
- เพิ่มปุ่ม **ลบคำร้อง**: Super Admin/ครูทะเบียนลบได้ทุกสถานะ; ผู้สร้างทั่วไปลบได้เฉพาะแบบร่างตามสิทธิ์เดิม
- ก่อนลบ ระบบพยายามล้างไฟล์/ลายเซ็น legacy ที่เคยแนบไว้ด้วย
- ไม่เปลี่ยนแบบ PDF, ฟอนต์, หรือกฎเลขที่นักเรียน

## V10.9.8
- งานทะเบียนแสดงวันที่เป็น **วัน เดือน ปีเท่านั้น** ไม่แสดงเวลาอีกแล้ว เช่น `18 ก.ย. 2569`
- ใช้ date-only formatter เฉพาะระบบทะเบียน จึงไม่กระทบระบบอื่นที่ยังต้องใช้เวลา
- ตารางคำร้องเปลี่ยนปุ่ม `เปิด` เป็น **รายละเอียด**
- เพิ่มปุ่ม **แก้ไขคำร้อง** ในแต่ละแถว สำหรับรายการที่ผู้ใช้มีสิทธิ์แก้ไข
- ในหน้ารายละเอียด เปลี่ยนชื่อปุ่ม `แก้ไขข้อมูล` เป็น **แก้ไขคำร้อง** เพื่อให้ตรงกันทั้งระบบ
- วันเกิด / วันที่เขียนคำร้อง / วันที่ขอย้าย / วันที่อัปเดตในงานทะเบียน แสดงเฉพาะวันที่
- ไม่เปลี่ยนรูปแบบ PDF, สิทธิ์, เลขที่นักเรียน หรือข้อมูลฐานข้อมูล

## V10.9.9
- ยกเลิกการเอา PDF ฟอร์มต้นฉบับมาวางข้อมูลทับทั้งหมด
- ระบบสร้าง **ใบคำร้อง A4 1 หน้าเอง** ด้วย HTML/CSS แล้วแปลงเป็น PDF ทำให้ไม่มีช่องสีขาวบังข้อความและไม่ต้องพึ่งพิกัด overlay
- ใช้ `school-logo.png` โลโก้เดียวกับที่แสดงใน BNK School OS
- ชื่อครูทะเบียน / ครูวัดและประเมินผล / ผู้บริหาร ดึงจากการกำหนดสิทธิ์ใน `academic_registration_settings` ทุกครั้งที่ Export
- ถ้ามีการลงลายเซ็นดิจิทัล ระบบใช้ชื่อผู้ลงนามจริงจากรายการลายเซ็น และวางรูปลายเซ็นในกรอบของผู้รับผิดชอบนั้นโดยตรง
- ถ้าเลือกเซ็นบนกระดาษ ระบบเว้นพื้นที่ลายเซ็นไว้ ไม่วาดรูปลง PDF
- โครงเอกสารยังใกล้เคียงฟอร์มเดิม: หัวเอกสาร, ข้อมูลนักเรียน, เหตุผล, หลักฐาน, ผู้ยื่นคำร้อง และตารางเจ้าหน้าที่ 2x2
- เอกสารใช้ TH SarabunIT๙ เป็นฟอนต์ลำดับแรกและแปลงข้อมูลตัวเลขเป็นเลขไทย
- ลบ `transfer-request-template.pdf` ออกจาก package เพื่อไม่ให้ระบบย้อนกลับไปใช้วิธี overlay เดิม

### ตรวจสอบ V10.9.9
- ทดสอบจำลองเอกสาร A4 แล้วจัดอยู่ใน 1 หน้า
- ตรวจตำแหน่งตารางเจ้าหน้าที่และพื้นที่ลายเซ็นแล้ว โดยลายเซ็นอยู่ภายในช่องของผู้รับผิดชอบ ไม่ใช้พิกัด absolute ของ PDF ต้นฉบับ
- โลโก้ใน PDF อ้างอิง `school-logo.png` เดียวกับระบบ

## V10.9.10
- ขยายฟอนต์เอกสารคำร้องทั้งหน้าให้อ่านง่ายขึ้น โดยยังคง TH SarabunIT๙ เป็นฟอนต์หลัก
- ปรับเอกสารให้ใช้พื้นที่ A4 เต็มขึ้นทั้งแนวตั้งและแนวนอน โดยเพิ่มขนาดหัวเรื่อง ข้อมูลนักเรียน รายการหลักฐาน และส่วนลงนาม
- กำหนดขอบกระดาษ A4 ตามมาตรฐานเอกสารราชการ: บน 1.5 ซม. / ซ้าย 3 ซม. / ขวา 2 ซม. / ล่าง 2 ซม.
- ขยายพื้นที่ลายเซ็นและกล่องเจ้าหน้าที่ให้สมดุลกับหน้ากระดาษ
- ไม่เปลี่ยนข้อมูล แบบฟอร์มเชิงตรรกะ สิทธิ์ หรือฐานข้อมูล

## V10.9.11
- คืนส่วน **ครูการเงิน / เจ้าหน้าที่การเงิน** เข้าระบบคำร้องใบย้าย
- ผู้กำหนดครูการเงินได้: **Super Admin / ครูทะเบียน / หัวหน้าวิชาการ**
- ครูการเงินที่ได้รับมอบหมายสามารถเปิดคำร้อง, ตรวจสถานะการชำระเงิน, ระบุยอดที่ต้องชำระ, อนุมัติ/ไม่อนุมัติ และลงลายเซ็นได้
- วิธีลงลายเซ็นของครูการเงินเหมือนเจ้าหน้าที่ส่วนอื่น: เซ็นบนกระดาษ / เซ็นสดในระบบ / อัปโหลดรูปลายเซ็น
- PDF กลับมาเป็นตารางเจ้าหน้าที่ 2x2: ครูการเงิน / ครูทะเบียน / ครูวัดและประเมินผล / ผู้บริหาร
- ชื่อครูการเงินใน PDF ดึงจากสิทธิ์ที่ตั้งไว้ในระบบทุกครั้งที่ Export
- ย้ายข้อมูลการชำระเงินออกจากครูทะเบียนให้เป็นความรับผิดชอบของครูการเงินโดยตรง

## V10.9.12
- ปรับใบคำร้องให้ทุกส่วนอยู่ภายใน **A4 หน้าเดียว** แม้มีส่วนครูการเงินครบ 4 ช่อง
- คงขอบกระดาษมาตรฐานเดิม: บน 1.5 ซม. / ซ้าย 3 ซม. / ขวา 2 ซม. / ล่าง 2 ซม.
- ลดระยะห่างแนวตั้งบางจุดและปรับขนาดตัวอักษรเล็กน้อย แต่ยังคงอ่านง่ายกว่ารุ่นเริ่มต้น
- เพิ่มระบบ Auto-fit ก่อนสร้าง PDF: ถ้าชื่อ/เหตุผล/ข้อมูลยาว ระบบจะย่อเฉพาะ “เนื้อหาภายในขอบกระดาษ” อัตโนมัติ โดยไม่ย่อหรือเปลี่ยนระยะขอบ A4
- กำหนด safety allowance เพื่อไม่ให้เส้นตาราง/หมายเหตุหลุดขอบล่าง
- ไม่แก้สิทธิ์ ฐานข้อมูล ลายเซ็น หรือโครงสร้างข้อมูล

## V10.9.13
- แก้ PDF ค้างที่หน้า “กำลังสร้าง PDF…” จนต้องสลับกลับมาหน้าระบบ
- สาเหตุคือขั้นตอน Export รอ `requestAnimationFrame()` หลังเปิดแท็บ Preview ทำให้ Browser ระงับ callback เมื่อหน้า BNK School OS กลายเป็น Background
- เปลี่ยนเป็นบังคับคำนวณ Layout ทันที และส่งเข้า `html2canvas` โดยไม่รอ animation frame
- เปิด Preview ไว้ก่อนเพื่อไม่ให้ Browser บล็อก Popup แต่พยายามคืน Focus ให้หน้าระบบระหว่างสร้าง PDF และค่อย Focus PDF เมื่อพร้อม
- จำกัดเวลารอ Webfont สูงสุด 1.8 วินาที และรูปภาพสูงสุด 1.2 วินาที เพื่อไม่ให้ Export ค้างเพราะ CDN หรือการโหลดรูป
- ไม่เปลี่ยนหน้าตาเอกสาร ขอบ A4 ข้อมูล ลายเซ็น หรือสิทธิ์ระบบ

## V10.9.14
- เพิ่ม Workflow ขั้นที่ 2 หลังคำร้อง: **ผลจากการกรอกใบย้ายสถานศึกษา**
- นายทะเบียน / หัวหน้าวิชาการ / Super Admin มีปุ่ม **อนุมัติทุกส่วน** หลังคำร้องถูกยื่นแล้ว
- ปุ่มนี้ตั้งผลของครูการเงิน ครูทะเบียน ครูวัดผล และผู้บริหารเป็นอนุมัติ พร้อมเปลี่ยนคำร้องเป็นสถานะ Approved
- หลังอนุมัติครบ จะมีปุ่ม **Export หนังสือราชการ**
- หนังสือราชการสร้างใหม่โดยระบบตามโครงไฟล์ตัวอย่างที่ผู้ใช้แนบ: ตราครุฑ, ที่อยู่โรงเรียน, วันที่, เรื่อง, เรียน, เนื้อหา, ลงท้าย, ผู้ลงนาม, กลุ่มงานทะเบียน, โทรศัพท์ และหมายเหตุ
- ช่อง **ที่ ศธ.** เว้นเป็นจุดไข่ปลาเพื่อเขียนเลขด้วยมือในระยะนี้
- หนังสือราชการเว้นพื้นที่ลายเซ็นผู้บริหารไว้สำหรับเซ็นสด และดึงชื่อผู้บริหารจากสิทธิ์ระบบ
- ข้อความตำแหน่งผู้บริหาร / ที่อยู่โรงเรียน / ชื่อกลุ่มงาน / เบอร์โทร ปรับได้จาก Settings เพื่อรองรับการเปลี่ยนในอนาคต
- เพิ่มฟิลด์ในคำร้อง: ที่อยู่ผู้ปกครอง, สถานที่พักอาศัยหลังย้าย, หมายเหตุท้ายหนังสือราชการ
- ที่อยู่ผู้ปกครองจะ prefill จากข้อมูลที่อยู่ใน Student Master เมื่อมีข้อมูล
- ไฟล์ Garuda ใช้ภาพตราครุฑที่สกัดจาก PDF ตัวอย่างที่ผู้ใช้แนบ

## V10.9.15
- ปรับที่อยู่โรงเรียนใน PDF “ผลจากการกรอกใบย้ายสถานศึกษา” ให้เรียง 2 บรรทัดตามรูปแบบที่กำหนด:
  - `โรงเรียนบ้านหนองเขียว หมู่ที่ 12 ตำบลเมืองนะ`
  - `อำเภอเชียงดาว จังหวัดเชียงใหม่ 50170`
- ระบบรองรับทั้งค่าที่อยู่เดิมแบบบรรทัดเดียว และค่าที่ผู้ใช้ใส่ขึ้นบรรทัดใหม่เองใน Settings
- ไม่เปลี่ยนข้อมูลหรือ Workflow อื่น

## V10.10.0 — ระบบย่อยคำร้องใบรับรองนักเรียน
- เปิดใช้งานระบบย่อย **คำร้องใบรับรองนักเรียน** เป็นระบบที่ 2 ในระบบงานทะเบียนวิชาการ
- เชื่อม Student Registry: ชื่อ รหัสนักเรียน เลขประชาชน วันเกิด บิดา มารดา ที่อยู่ ชั้น เลขที่ และรูปนักเรียน
- รองรับแบบคำร้อง: นักเรียนปัจจุบัน / เคยเป็นนักเรียน, วัตถุประสงค์ 4 แบบ และ checklist หลักฐานตามไฟล์ต้นฉบับ
- ครูประจำชั้นสร้างคำร้องนักเรียนในห้องตนเองได้; งานทะเบียน/หัวหน้าวิชาการ/Super Admin จัดทำได้ในขอบเขตกว้าง
- Workflow: แบบร่าง → ยื่นคำร้อง → ผู้จัดทำเอกสาร / นายทะเบียน / ผู้บริหาร ตรวจและลงนาม → อนุมัติ → Export ปพ.7
- นายทะเบียน / หัวหน้าวิชาการ / Super Admin ใช้ **อนุมัติทุกส่วน** ได้เหมือนระบบใบย้าย
- ลงนามได้ 3 วิธี: เซ็นบนกระดาษ / เซ็นสดในระบบ / อัปโหลดรูป
- Export คำร้องเป็น PDF 2 หน้า: หน้า 1 แบบคำร้อง และหน้า 2 รายการหลักฐานแบบช่องซ้ำตามต้นฉบับ
- Export ผลเป็น **ปพ.7 ใบรับรองการเป็นนักเรียน** พร้อมตราครุฑ, รูปนักเรียน 2 นิ้ว, ผู้บริหาร, นายทะเบียน และอายุใบรับรอง 120 วัน
- ถ้า Student Registry ไม่มีรูป ระบบคงกรอบ “รูปถ่ายนักเรียน ขนาด 2 นิ้ว”
- ผู้จัดทำเอกสารใบรับรองและอายุใบรับรองกำหนดได้จาก Settings งานทะเบียน
- ฟอร์มผล ปพ.7 ที่ผู้ใช้แนบรองรับ “นักเรียนปัจจุบัน”; คำร้องประเภท “เคยเป็นนักเรียน” ถูกเก็บได้ แต่ระบบจะยังไม่สร้างผล ปพ.7 เพื่อไม่เปลี่ยนความหมายของฟอร์มต้นฉบับ

## V10.10.1
- ปรับ PDF หน้า “แบบคำร้องเพื่อขอหนังสือรับรองนักเรียน” ให้เนื้อหาจัดกึ่งกลางในพื้นที่เอกสารและใช้พื้นที่ A4 เต็มหน้ามากขึ้น
- ขยายตัวอักษร ระยะห่าง และเส้นข้อมูลด้านบนให้ยาวเต็มพื้นที่อ่าน โดยไม่กองอยู่เฉพาะครึ่งบนของหน้า
- คงขอบกระดาษมาตรฐานเดิม: บน 1.5 ซม. / ซ้าย 3 ซม. / ขวา 2 ซม. / ล่าง 2 ซม.
- ปรับกรอบส่วนอนุมัติด้านล่างให้กินพื้นที่สมดุลกับหน้า A4
- ปพ.7 เปลี่ยนกรอบรูปนักเรียนเป็นขนาด 1.5 นิ้ว (กว้าง 38.1 มม. สูงประมาณ 50.8 มม.)
- ปรับข้อความในกรอบรูปเป็น “ขนาด ๑.๕ นิ้ว”
- เพิ่ม `.........../..........` สำหรับเขียนเลขเอกสารด้วยมือที่มุมซ้ายบน ระดับเดียวกับคำว่า `ปพ. ๗` ด้านขวา
- ไม่เปลี่ยน Workflow, สิทธิ์, RLS หรือข้อมูลฐานข้อมูล

## V10.10.2
- แบบคำร้องใบรับรองปรับใหม่ให้ข้อมูลนักเรียนด้านบนเป็นช่องข้อมูลแบบ Grid มีแนวเส้นประและระยะห่างสม่ำเสมอ
- ลดช่องว่างระหว่างรายการ checkbox ให้กระชับ และตัดหน้ารายการหลักฐานซ้ำออกจาก Export: คำร้องออกเป็น A4 **1 หน้าเดียว**
- เพิ่ม Auto-fit เฉพาะเนื้อหาเพื่อกันข้อมูลยาวล้น A4 โดยไม่เปลี่ยนขอบมาตรฐาน
- ปพ.7 เอากรอบรูปออก เหลือข้อความ “ติดรูปถ่ายนักเรียน ขนาด 1.5 นิ้ว” พร้อมข้อความประทับตราโรงเรียน
- ย้ายช่องลายเซ็น/ชื่อนายทะเบียนไว้ใต้พื้นที่ติดรูปฝั่งซ้าย และผู้บริหารอยู่ฝั่งขวาแบบเยื้องกัน
- ปพ.7 ใช้รูปถ่ายจริงแบบติดกระดาษ จึงไม่ดึงรูป Student Registry ลง PDF อัตโนมัติในเวอร์ชันนี้
- แยก Settings ของคำร้องใบรับรองออกจากใบย้ายโดยสมบูรณ์: ผู้จัดทำเอกสาร / นายทะเบียน / ผู้บริหาร / อายุใบรับรอง อยู่ใน `academic_certificate_settings`
- สิทธิ์ตั้งค่าใบรับรอง: Super Admin ตั้งได้ทุกตำแหน่ง; นายทะเบียนใบรับรองกำหนดผู้จัดทำและส่งต่อสิทธิ์นายทะเบียน; หัวหน้าวิชาการกำหนดผู้จัดทำได้
- นายทะเบียนใบรับรอง / หัวหน้าวิชาการ / Super Admin ยังมีสิทธิ์ “อนุมัติทุกส่วน”

## V10.10.3
- แบบคำร้องใบรับรองนักเรียนใช้ตัวอักษรพื้นฐานประมาณ **16 pt** และลดช่องว่างที่ไม่จำเป็นเพื่อคง A4 หน้าเดียว
- จัดข้อมูลส่วนตัวใหม่เป็นแถวชัดเจน: ชื่อเต็ม / วันเกิด+เลขนักเรียน / ชั้น+บิดา / มารดา / ที่อยู่
- บรรทัด “เคยเป็นนักเรียนชั้น / ปีการศึกษา / ผลการเรียนเฉลี่ย” ใช้ช่องเส้นจุดไข่ปลาไว้รองรับข้อมูลและเกรดเฉลี่ย
- ย้ายลายเซ็นผู้ยื่นคำร้องลงมาอยู่ใต้ข้อความ “จึงเรียนมาเพื่อโปรดพิจารณา...” ตามลำดับการอ่าน
- ช่องอนุมัติด้านล่างเพิ่มขนาดข้อความ ชื่อ และตำแหน่ง พร้อมจัดชื่อ/ตำแหน่งกึ่งกลาง
- เพิ่มเส้น “ลงชื่อ …” จริงในแต่ละช่อง และขยับลงมาใกล้ชื่อ/ตำแหน่งมากขึ้น
- ปพ.7 จัดก้อนข้อความรับรองให้อยู่กึ่งกลางหน้ากระดาษ แต่ต้นบรรทัดทุกบรรทัดตรงกัน
- นายทะเบียนอยู่ใต้พื้นที่ติดรูป 1.5 นิ้วทันที ส่วนผู้บริหารอยู่ฝั่งขวาแบบเยื้องระดับ
- สิทธิ์คำร้องใบรับรองนักเรียนใช้ academic_certificate_settings แยกจากระบบใบย้ายโดยสมบูรณ์

## V10.10.4
- แก้กรอบส่วนอนุมัติของคำร้องใบรับรอง: ผู้จัดทำเอกสาร / นายทะเบียน / ผู้บริหาร อยู่ภายในกรอบ 3 ช่องเต็มความกว้าง ไม่ดันออกนอกกรอบ
- เปลี่ยนเส้น `ลงชื่อ ..........` จากข้อความจุดยาว ๆ เป็นเส้น dotted แบบยืดหยุ่น จึงไม่ล้นหรือทำให้ข้อความถูกตัด
- บังคับชื่อและตำแหน่งผู้ลงนามให้อยู่กึ่งกลางและตัดบรรทัดภายในช่องได้อย่างปลอดภัย
- ปพ.7 ลดพื้นที่ติดรูปเป็นพื้นที่ 1.5 นิ้วจริง (38.1 × 38.1 มม. สำหรับตำแหน่งวาง) และย้ายนายทะเบียนขึ้นมาเริ่มทันทีใต้พื้นที่ติดรูป
- ลดช่องว่างก่อนเส้นลงชื่อนายทะเบียน เหลือเฉพาะพื้นที่ที่จำเป็นต่อการเซ็น

## V10.10.5
- แบบคำร้องใบรับรองนักเรียน: ย้ายโลโก้โรงเรียนไปกึ่งกลางด้านบนของกระดาษ
- เลขที่/วันที่ยังคงมุมขวาบน และหัวเรื่องวางใต้โลโก้
- ปพ.7: ขยับก้อน “พื้นที่ติดรูป 1.5 นิ้ว + นายทะเบียน” ลงต่ำกว่าเดิม
- ลายเซ็นผู้บริหารอยู่สูงกว่าก้อนรูป/นายทะเบียน เพื่อให้สองฝั่งเยื้องกันตามรูปแบบที่ต้องการ
- ไม่เปลี่ยนข้อมูล สิทธิ์ Workflow หรือฐานข้อมูล

## V10.10.6
- แบบคำร้องใบรับรอง: แก้หัวเอกสารให้โลโก้และชื่อแบบคำร้องอยู่ “กึ่งกลางกระดาษ A4 จริง” ไม่ใช่กึ่งกลางเฉพาะพื้นที่ข้อความ เพราะขอบซ้าย/ขวาของเอกสารราชการไม่เท่ากัน
- ปพ.7 ลบข้อความ “ติดรูปถ่ายนักเรียน / ขนาด 1.5 นิ้ว / ประทับตรา...” ออกจากเอกสารทั้งหมด เหลือพื้นที่ว่างสะอาดเหนือส่วนลงชื่อนายทะเบียน
- เพิ่มเลขที่หนังสือ ปพ.7 แบบรันอัตโนมัติ เริ่มต้นที่ `1/2569`
- ผู้จัดทำเอกสาร / นายทะเบียน / หัวหน้าวิชาการ / Super Admin สามารถกำหนด “เลขถัดไป” และ “ปีของเลขหนังสือ” ได้จาก Settings ของระบบใบรับรอง
- เมื่อกดอนุมัติทุกส่วน ระบบจะล็อกเลขให้เอกสารทันที เช่น 1/2569 และเลื่อนเลขถัดไปเป็น 2/2569
- เลขที่ล็อกแล้วจะเก็บกับคำร้องถาวร ไม่เปลี่ยนตามค่า Settings ภายหลัง
- PDF ปพ.7 แสดงเลขจริงที่มุมซ้ายบนแทน `.........../..........`

## V10.10.7
- แก้หัว “แบบคำร้องเพื่อขอหนังสือรับรองนักเรียน” ให้โลโก้และชื่อแบบฟอร์มอยู่กึ่งกลาง “หน้ากระดาษ A4 จริง”
- สาเหตุเดิมคือพื้นที่เนื้อหาใช้ขอบซ้าย 3 ซม. / ขวา 2 ซม. ทำให้การ center ภายใน content box ดูเยื้องซ้าย
- รุ่นนี้สร้าง header band ชดเชย 10 มม. ทางซ้าย แล้วจัด logo/title ด้วย flex center บนแกนกึ่งกลางของกระดาษจริง
- เลขที่และวันที่ยังอยู่มุมขวาบนตามเดิม
- ไม่เปลี่ยนข้อมูล PDF, สิทธิ์, Workflow หรือฐานข้อมูล
