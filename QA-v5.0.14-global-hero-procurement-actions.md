# QA v5.0.14 — Global Hero + Procurement Actions

## ผ่าน
- `node --check app.js`
- `APP_BUILD`, app.js cache และ styles.css cache เป็น `5.0.14`
- CSS parse ผ่านด้วย `tinycss2` (ไม่พบ parse error)
- Static HTTP: `index.html`, `app.js`, `styles.css`, `config.js` ตอบ 200
- Procurement document registry ยังครบ 33 codes และไม่ซ้ำ
- Registry 33 เอกสารและ template block PDF หลักเหมือน v5.0.13 แบบ byte-for-byte
- มี action แยก `ยกเลิก` / `ลบ` ทั้งหน้า card และหน้ารายละเอียด
- สถานะ `deleted` ถูกซ่อนจากมุมมอง “ทุกสถานะ” และมีตัวกรอง “ลบแล้ว” สำหรับ audit
- ลบแบบ safe soft-delete: ไม่ตัด FK เลขคุมออกจากรายการ
- CSS มาตรฐาน hero ครอบคลุมโมดูลหลักเดิมและโมดูลใหม่ รวม Procurement / Procurement Control

## ไม่ได้ทำ
- ไม่ Deploy Vercel / GitHub
- ไม่รัน SQL v5.0.14 บน Production
- ไม่อ้างว่าได้ทดสอบ E2E หลัง login ใน browser จริงจาก environment นี้
