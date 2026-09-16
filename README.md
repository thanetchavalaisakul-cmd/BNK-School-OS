# BNK School OS — Frontend V2

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

## V5.1 — Immediate Substitute Arrangement

- Notification Center เพิ่ม `ล้างการแจ้งเตือนทั้งหมด` แบบ soft-clear ด้วย `dismissed_at`
- หลัง Submit ใบลา ระบบสร้างคาบสอนแทนทันทีจาก Published Timetable โดยไม่รออนุมัติ
- ผู้ยื่นใบลาเป็นผู้จัดสอนแทนของตัวเองได้ทันที
- Academic Head และ Stage Head ยังช่วยจัดได้ตามขอบเขตเดิม
- Personnel Head / Director / Super Admin เห็นสถานะ `จัดแล้ว x/y` เพื่อประกอบ Workflow
- ครูที่มีใบลาสถานะ pending_personnel / pending_director / approved จะไม่ถูกเสนอเป็นครูสอนแทน
- ถ้าใบลาถูก Reject งานสอนแทนถูก Cancel และแจ้งผู้ที่เคยได้รับมอบหมาย
- หน้าจัดสอนแทนแยกตามใบลา + Dropdown วันที่
- เมื่อเปิดวันหนึ่ง แสดงทุกคาบในหน้าเดียว พร้อม Dropdown เลือกครูรายคาบ
- แสดงคาบที่ครูว่าง, คาบที่ไม่ว่าง และจำนวนภาระสอนของวันนั้น
- บันทึกทุกคาบจากหน้าเดียว
- Export PDF A4 Landscape 1 หน้า เมื่อจัดครบ
- PDF มี Logo, ชื่อโรงเรียน, ที่อยู่, สังกัด, ตารางคาบ, ช่องลายมือชื่อครูสอนแทน และลายเซ็นสด 4 ช่อง: ผู้ยื่นใบลา / หัวหน้าวิชาการ / หัวหน้าช่วงชั้น / ผู้อำนวยการโรงเรียน
