# QA — v5.0.15 Procurement Shared Workspace

## Static / source verification
- `node --check app.js` ผ่าน
- Frontend access helper ของ Documents ใช้ module permission โดยตรง ไม่ตรวจ `role`, `created_by`, director หรือหัวหน้าแผนฯ เพื่อให้ผู้ได้รับอนุญาตทำงานกลางร่วมกันได้
- Frontend access helper ของ Control Settings ใช้สิทธิ์โมดูล Control โดยตรง
- Permission tab ยังคง render เฉพาะ `isSuperAdminUser()`
- Query รายการจัดซื้อจัดจ้างไม่มี filter ตาม `created_by`; RLS ฝั่งฐานข้อมูลเป็นตัวกำหนดการเข้าถึง
- Migration v5.0.15 เปลี่ยน `procurement_document_cases_select` ให้ผู้มีสิทธิ์ Documents เห็นรายการกลางทั้งหมด
- Migration v5.0.15 เปลี่ยน master-data write policies ให้ผู้มีสิทธิ์ Documents ใช้งานได้เต็มโมดูล
- Migration v5.0.15 เปลี่ยน `private.can_manage_procurement_documents()` และ `private.can_manage_procurement_control_settings()` ให้สะท้อนสิทธิ์โมดูลโดยตรง
- Safe cancel/delete RPC ของรายการจัดซื้อไม่ตรวจ ownership อีกต่อไป แต่ยังต้องผ่านสิทธิ์ Documents
- Safe Delete ยังคงเก็บ row และ FK เลขคุมเพื่อไม่คืนเลขคุมกลับมาใช้ซ้ำ
- Permission administration RLS ยังคงอนุญาต write เฉพาะ Super Admin

## Runtime / database note
- ไม่ได้รัน migration v5.0.15 บน Production ในขั้นตอนสร้างแพ็กเกจนี้
- Production ที่ตรวจล่าสุดมี v5.0.13 access helpers แล้ว แต่ยังไม่มีคอลัมน์ `deleted_at/deleted_by` ของ v5.0.14 ดังนั้น migration v5.0.15 จึงรวมส่วนนี้ไว้ให้ด้วย
- หลังผู้ใช้รัน SQL ควรทดสอบด้วย 2 บัญชี: Super Admin สร้างงาน 1 รายการ จากนั้นบัญชีที่ได้รับสิทธิ์ Documents ต้องเห็นและแก้ไขรายการเดียวกันได้; บัญชีที่ได้รับสิทธิ์ Control ต้องใช้งาน Registry/Settings ได้ครบ
