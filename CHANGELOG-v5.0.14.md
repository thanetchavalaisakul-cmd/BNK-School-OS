# BNK School OS v5.0.14

## Unified main-system header
- Standardized the main header/hero of BNK School OS modules to the green→gold gradient (`--hero-grad`).
- Added the same translucent circular decoration pattern used by the Project & Budget system.
- Extended the standard to older and newer modules, including Procurement and Procurement Control.

## Procurement case actions
- Added **ยกเลิกรายการ** and **ลบรายการ** actions on procurement cards and detail view.
- Cancel keeps the record visible with status `cancelled`.
- Delete uses status `deleted` (safe soft-delete) so previously linked control numbers stay reserved and are never silently reused.
- Deleted records are hidden from the normal `ทุกสถานะ` view, but remain available under the `ลบแล้ว` filter for audit/history.
- A cancelled record can be deleted afterwards.
- Owners may cancel their own records; owners may delete their own draft/cancelled records. Procurement managers retain broader management rights.

## Database
Run after v5.0.13:
`supabase-v5.0.14-procurement-case-actions.sql`
