# QA v5.9.0 — PA2 Export + PA3

## Static / code
- `node --check app.js`: PASS
- Build/cache version: `5.9.0`
- Export event bindings: รายกรรมการ / 3 กรรมการ / ทั้งโรงเรียน / PA3 รายครู / PA3 ทั้งโรงเรียน
- Dashboard PA3: Master–Detail, ไม่เลือกครูคนแรกอัตโนมัติ

## PA2 export rules
- รายกรรมการ Export ได้เฉพาะ assessment ที่ `status = submitted`
- ครู 1 คนแบบ 3 กรรมการ Export ได้เมื่อ submitted ครบ 3 ราย
- ทั้งโรงเรียนใช้เฉพาะครูที่ครบ 3/3 และแจ้งผู้ใช้เมื่อมีรายที่ยังไม่ครบ
- ใช้ evaluator name/position/organization/signature snapshot จาก assessment
- รูปแบบ 3 A4 pages ต่อกรรมการ พร้อม runtime overflow guard

## PA3 rules
- ไม่มี manual score entry
- PA3 ดึง section1_total / section2_total / total_score จาก PA2 โดยตรง
- ต้องมี PA2 submitted ครบ 3/3
- ผ่านเมื่อผลของกรรมการทั้ง 3 คนผ่านตามข้อมูล PA2; ภาระงานแสดงแยกในแบบสรุป
- ลายเซ็นดึงจาก evaluator signature snapshot ของ assessment
- PA3 = 1 A4 page ต่อครู; ทั้งโรงเรียนรวมหลายหน้าในไฟล์เดียว
- ช่องอัตราเงินเดือนไม่ถูกเดาหรือสร้างข้อมูล เนื่องจากฐาน Personnel ปัจจุบันไม่มี salary field

## Production read-only verification
- กรรมการกลาง: 3 คน
- โปรไฟล์กรรมการพร้อมลายเซ็น: 3/3
- submitted PA2 ณ เวลา QA: 3 ราย
- submitted PA2 ที่ไม่มี signature snapshot: 0
- ผู้รับการประเมินที่ PA2 ครบ 3/3 ณ เวลา QA: 1 ราย
- Supabase security advisor ที่เกี่ยวกับ Personnel PA: ไม่พบรายการใหม่

## PDF layout verification
- Fixed A4 page geometry and overflow guard are implemented in the browser export pipeline.
- A representative layout was also converted/rendered with an independent PDF renderer to check page geometry; Chromium headless is unavailable/reliably hangs in this container, so the authoritative runtime guard remains the in-app browser measurement before PDF creation.
