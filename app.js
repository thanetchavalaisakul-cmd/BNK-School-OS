import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import html2canvas from "https://esm.sh/html2canvas@1.4.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, APP_NAME } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const app = document.querySelector("#app");
const toastRoot = document.querySelector("#toast-root");

const state = {
  session: null,
  user: null,
  profile: null,
  departments: [],
  modules: [],
  notifications: [],
  pendingUsers: [],
  lessonPlans: [],
  selectedLessonPlanId: null,
  lessonDetail: null,
  signatures: [],
  lessonFileCounts: {},
  lessonPlanMode: null,
  lessonTeacherRoster: [],
  lessonTeacherView: "all",
  lessonTeacherId: null,
  subjectGroups: [],
  systemSettings: null,
  personnelOwnRecord: null,
  personnelRecords: [],
  personnelRoster: [],
  personnelPhotoUrls: {},
  publicPersonnelDirectory: [],
  publicPersonnelPhotoUrls: {},
  personnelView: "own",
  selectedPersonnelUserId: null,
  selectedPersonnelPublicUserId: null,
  leaveTypes: [],
  leaveRequests: [],
  leaveActions: [],
  leaveRoster: [],
  leavePersonnelRecords: [],
  leaveSubstituteLessons: [],
  selectedLeaveRequestId: null,
  leaveView: "mine",
  leaveReportAcademicYear: null,
  leaveReportSemester: "all",
  leaveReportPersonId: null,
  timetableClasses: [],
  timetableProfiles: [],
  timetablePeriods: [],
  timetablePeriodTemplates: [],
  timetablePeriodTemplateItems: [],
  timetableSubjects: [],
  timetableAssignments: [],
  timetableEntries: [],
  timetableHomerooms: [],
  timetableStageHeads: [],
  timetableTeachers: [],
  timetableSelectedClassId: null,
  timetableView: "planner",
  timetableAcademicYear: null,
  timetableSemester: null,
  timetableExportClassId: null,
  timetableExportTeacherId: null,
  substituteLessons: [],
  substituteActions: [],
  substituteView: "manage",
  selectedSubstituteLessonId: null,
  selectedSubstituteLeaveId: null,
  selectedSubstituteDate: null,
  substituteCandidateMap: {},
  substituteAcademicYear: null,
  substituteSemester: null,
  schoolProjects: [],
  projectActivities: [],
  budgetDisbursements: [],
  budgetControlSettings: [],
  budgetSignerAssignments: [],
  budgetRegistryDepartmentFilter: "academic",
  projectView: "mine",
  projectDepartmentFilter: "academic",
  projectAcademicYear: null,
  selectedProjectId: null,
  selectedProjectActivityId: null,
  selectedDisbursementId: null,
  homeVisitRecords: [],
  homeVisitMembers: [],
  homeVisitPhotos: [],
  homeVisitSignatures: [],
  homeVisitClasses: [],
  homeVisitHomerooms: [],
  homeVisitView: "records",
  homeVisitAcademicYear: null,
  homeVisitSemester: null,
  homeVisitClassId: null,
  selectedHomeVisitId: null,
  homeVisitStep: 1,
  currentView: "dashboard",
  sidebarOpen: false,
};

const ROLE_LABEL = {
  super_admin: "Super Admin",
  director: "ผู้บริหาร",
  department_head: "หัวหน้ากลุ่มงาน",
  teacher: "ครูผู้สอน",
};

const STATUS_LABEL = {
  pending: "รออนุมัติ",
  active: "ใช้งานได้",
  rejected: "ไม่อนุมัติ",
  suspended: "ระงับ",
  deleted: "ลบออกจากระบบ",
};

function appName() {
  return state.systemSettings?.system_name || APP_NAME;
}

function brandShort() {
  return state.systemSettings?.brand_short || "BNK";
}

function schoolName() {
  return state.systemSettings?.school_name_th || "โรงเรียนบ้านหนองเขียว";
}

function schoolAddress() {
  return state.systemSettings?.school_address_th || "ตำบลเมืองนะ อำเภอเชียงดาว จังหวัดเชียงใหม่";
}

function educationOffice() {
  return state.systemSettings?.education_office_th || "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาเชียงใหม่ เขต 3";
}

const PROJECT_DEPARTMENT_LABEL={academic:"กลุ่มงานบริหารงานวิชาการ",personnel:"กลุ่มงานบริหารงานบุคคล",general:"กลุ่มงานบริหารทั่วไป",plan_budget:"กลุ่มงานบริหารแผนงานและงบประมาณ",other:"อื่น ๆ"};
const BUDGET_STATUS_LABEL={draft:"ฉบับร่าง",document_ready:"จัดทำเอกสารแล้ว",printed:"พิมพ์เอกสารแล้ว",paid:"บันทึกเบิกจ่ายแล้ว",cancelled:"ยกเลิก"};
function isPlanBudgetHead(){if(state.profile?.role!=="department_head")return false;return state.departments.find(d=>d.id===state.profile.department_id)?.code==="plan_budget";}
function canActAsProjectTeacher(){return ["teacher","department_head","super_admin"].includes(state.profile?.role);}
function money(v){return new Intl.NumberFormat("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0));}

async function loadPublicData() {
  const [departmentsRes, subjectGroupsRes, settingsRes] = await Promise.all([
    supabase.from("departments").select("id,code,name_th,name_en,sort_order,is_active").eq("is_active", true).order("sort_order"),
    supabase.from("subject_groups").select("id,code,name_th,name_en,sort_order,is_active").eq("is_active", true).order("sort_order"),
    supabase.from("system_settings").select("id,system_name,brand_short,school_name_th,school_address_th,education_office_th,bootstrap_complete,special_area_school,assistant_teacher_years,qualification_standard_years,qualification_special_years,leave_quota_times,leave_quota_days,leave_quota_term1_times,leave_quota_term1_days,leave_quota_term2_times,leave_quota_term2_days,updated_at").eq("id", 1).maybeSingle(),
  ]);

  if (!departmentsRes.error) state.departments = departmentsRes.data || [];
  if (!subjectGroupsRes.error) state.subjectGroups = subjectGroupsRes.data || [];
  if (!settingsRes.error && settingsRes.data) state.systemSettings = settingsRes.data;
  document.title = appName();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(title, message = "", type = "default") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<div>●</div><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></div>`;
  toastRoot.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}


function isSuperAdminUser(){
  return state.profile?.role === "super_admin";
}

async function secureDeletionClient(password){
  if(isSuperAdminUser()) return supabase;
  const email=state.user?.email;
  if(!email) throw new Error("บัญชีนี้ไม่มีอีเมลสำหรับยืนยันรหัสผ่าน");
  const verifyClient=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  const {data,error}=await verifyClient.auth.signInWithPassword({email,password});
  if(error) throw new Error("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
  if(!data?.user?.id || data.user.id!==state.user.id) throw new Error("ไม่สามารถยืนยันบัญชีผู้ใช้งานปัจจุบันได้");
  return verifyClient;
}

function secureDeleteModal({
  title="ลบข้อมูล",
  description="",
  warning="ข้อมูลที่ลบแล้วไม่สามารถกู้คืนจากหน้าระบบได้",
  confirmLabel="ลบข้อมูลถาวร",
  action,
  afterDelete=null
}={}){
  if(typeof action!=="function") return;
  const admin=isSuperAdminUser(),m=document.createElement("div");
  m.className="modal-backdrop";
  m.innerHTML=`<div class="modal secure-delete-modal">
    <div class="modal-head"><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div><button class="modal-close">×</button></div>
    <div class="secure-delete-warning"><strong>⚠ ยืนยันการลบ</strong><span>${escapeHtml(warning)}</span></div>
    ${admin
      ? `<div class="secure-delete-admin"><strong>Super Admin</strong><span>บัญชี Super Admin ไม่ต้องกรอกรหัสผ่าน แต่การลบจะถูกบันทึกในประวัติ Audit</span></div>`
      : `<div class="field"><label>รหัสผ่านของคุณ</label><input class="input" id="secure-delete-password" type="password" autocomplete="current-password" placeholder="กรอกรหัสผ่านเพื่อยืนยันการลบ" required><small class="helper">ระบบใช้รหัสผ่านเพื่อยืนยันตัวตนครั้งนี้เท่านั้น และไม่บันทึกรหัสผ่านไว้</small></div>`
    }
    <label class="secure-delete-check"><input type="checkbox" id="secure-delete-ack"> ฉันเข้าใจว่าการลบรายการนี้เป็นการลบถาวร</label>
    <div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-danger" id="secure-delete-confirm" disabled>${escapeHtml(confirmLabel)}</button></div>
  </div>`;
  document.body.appendChild(m);
  const close=()=>m.remove(),ack=m.querySelector("#secure-delete-ack"),confirm=m.querySelector("#secure-delete-confirm"),password=m.querySelector("#secure-delete-password");
  m.querySelector(".modal-close").onclick=close;
  m.querySelector(".modal-cancel").onclick=close;
  ack.onchange=()=>{confirm.disabled=!ack.checked;};
  password?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!confirm.disabled)confirm.click();});
  confirm.onclick=async()=>{
    if(!ack.checked)return;
    if(!admin&&!password?.value)return toast("กรุณากรอกรหัสผ่าน","","error");
    buttonLoading(confirm,true,"กำลังลบ...");
    try{
      const client=await secureDeletionClient(password?.value||"");
      await action(client);
      close();
      if(typeof afterDelete==="function") await afterDelete();
    }catch(err){
      toast("ลบข้อมูลไม่สำเร็จ",err?.message||String(err),"error");
      buttonLoading(confirm,false);
    }
  };
}

function buttonLoading(button, loading, label = "กำลังดำเนินการ...") {
  if (!button) return;
  if (loading) {
    button.dataset.oldText = button.innerHTML;
    button.disabled = true;
    button.textContent = label;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.oldText || button.innerHTML;
  }
}

function initials(name = "U") {
  const clean = name.trim();
  return (clean[0] || "U").toUpperCase();
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function roleDescription(role) {
  return {
    super_admin: "ควบคุมระบบ ผู้ใช้งาน สิทธิ์ และภาพรวมทั้งหมด",
    director: "ดูภาพรวมและอนุมัติงานขั้นสุดท้าย",
    department_head: "ตรวจสอบและอนุมัติงานของกลุ่มงานที่รับผิดชอบ",
    teacher: "ใช้งานระบบย่อย ส่งงาน และติดตามสถานะของตนเอง",
  }[role] || "";
}

function authLayout(inner) {
  return `
    <main class="center-page">
      <section class="auth-layout">
        <div class="hero-panel">
          <div class="brand">
            <div class="brand-mark">${escapeHtml(brandShort())}</div>
            <div class="brand-copy"><strong>${escapeHtml(appName())}</strong><span>School Management Platform</span></div>
          </div>
          <div class="hero-copy">
            <span class="eyebrow">● Powered by Supabase</span>
            <h1>ระบบโรงเรียน<br>ที่ไหลลื่นในที่เดียว</h1>
            <p>จัดการงานวิชาการ บุคคล บริหารทั่วไป และแผนงบประมาณด้วยสิทธิ์ที่ชัดเจน Workflow ที่ตรวจสอบย้อนหลังได้ และการแจ้งเตือนแบบเรียลไทม์</p>
          </div>
          <div class="hero-features">
            <div class="hero-feature"><strong>Role-based</strong><span>สิทธิ์แยกตามหน้าที่</span></div>
            <div class="hero-feature"><strong>Approval Flow</strong><span>อนุมัติเป็นขั้นตอน</span></div>
            <div class="hero-feature"><strong>Realtime</strong><span>แจ้งเตือนทันที</span></div>
          </div>
        </div>
        ${inner}
      </section>
    </main>`;
}

function renderAuth(mode = "signin") {
  app.innerHTML = authLayout(`
    <div class="auth-card">
      <div class="auth-head">
        <h2>${mode === "signin" ? "ยินดีต้อนรับกลับ" : `สมัครใช้งาน ${escapeHtml(appName())}`}</h2>
        <p>${mode === "signin" ? "เข้าสู่ระบบด้วยบัญชีที่ได้รับการอนุมัติจากผู้ดูแลระบบ" : "สร้างบัญชีใหม่ จากนั้นรอ Super Admin ตรวจสอบและกำหนดสิทธิ์"}</p>
      </div>
      <div class="tabs">
        <button class="tab ${mode === "signin" ? "active" : ""}" data-auth-tab="signin">เข้าสู่ระบบ</button>
        <button class="tab ${mode === "signup" ? "active" : ""}" data-auth-tab="signup">สมัครสมาชิก</button>
      </div>
      ${mode === "signin" ? signinForm() : signupForm()}
      <div class="auth-footer">
        ระบบใช้ Supabase Authentication และ Row Level Security (RLS) เพื่อควบคุมการเข้าถึงข้อมูลตามสิทธิ์ของแต่ละบัญชี
      </div>
    </div>
  `);
  bindAuthEvents();
}

function signinForm() {
  return `
    <form id="signin-form" class="form-grid">
      <div class="field">
        <label for="signin-email">อีเมล</label>
        <input class="input" id="signin-email" type="email" autocomplete="email" required placeholder="name@school.ac.th">
      </div>
      <div class="field">
        <label for="signin-password">รหัสผ่าน</label>
        <input class="input" id="signin-password" type="password" autocomplete="current-password" required minlength="6" placeholder="••••••••">
      </div>
      <div id="signin-error" class="error-text hidden"></div>
      <button class="btn btn-primary" type="submit">เข้าสู่ระบบ</button>
    </form>`;
}

function signupForm() {
  return `
    <form id="signup-form" class="form-grid">
      <div class="field">
        <label for="signup-name">ชื่อ-นามสกุล</label>
        <input class="input" id="signup-name" required maxlength="120" placeholder="ชื่อ นามสกุล">
      </div>
      <div class="form-row">
        <div class="field">
          <label for="signup-employee">รหัสบุคลากร <span class="helper">(ถ้ามี)</span></label>
          <input class="input" id="signup-employee" maxlength="40" placeholder="เช่น T001">
        </div>
        <div class="field">
          <label for="signup-phone">เบอร์โทร <span class="helper">(ถ้ามี)</span></label>
          <input class="input" id="signup-phone" maxlength="30" placeholder="08x-xxx-xxxx">
        </div>
      </div>
      <div class="field">
        <label for="signup-department">กลุ่มงานที่สังกัด</label>
        <select class="select" id="signup-department" required>
          <option value="">เลือกกลุ่มงาน</option>
          ${state.departments.map(d => `<option value="${escapeHtml(d.code)}">${escapeHtml(d.name_th)}</option>`).join("")}
        </select>
        <span class="helper">ใช้เป็นข้อมูลประกอบให้ Super Admin ตรวจสอบ ไม่ได้กำหนดสิทธิ์ Head อัตโนมัติ</span>
      </div>
      <div class="field">
        <label for="signup-subject-group">กลุ่มสาระ / ระดับการศึกษา</label>
        <select class="select" id="signup-subject-group" required>
          <option value="">เลือกกลุ่มสาระ</option>
          ${state.subjectGroups.map(s => `<option value="${escapeHtml(s.code)}">${escapeHtml(s.name_th)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="signup-email">อีเมล</label>
        <input class="input" id="signup-email" type="email" autocomplete="email" required placeholder="name@school.ac.th">
      </div>
      <div class="field">
        <label for="signup-password">รหัสผ่าน</label>
        <input class="input" id="signup-password" type="password" autocomplete="new-password" minlength="8" required placeholder="อย่างน้อย 8 ตัวอักษร">
        <span class="helper">หลังสมัคร บัญชีจะอยู่สถานะ “รออนุมัติ” จนกว่า Super Admin จะกำหนดสิทธิ์</span>
      </div>
      <div id="signup-error" class="error-text hidden"></div>
      <button class="btn btn-primary" type="submit">สร้างบัญชีและส่งคำขอ</button>
    </form>`;
}

function bindAuthEvents() {
  document.querySelectorAll("[data-auth-tab]").forEach(btn => {
    btn.addEventListener("click", () => renderAuth(btn.dataset.authTab));
  });

  document.querySelector("#signin-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button[type="submit"]');
    const errorEl = document.querySelector("#signin-error");
    errorEl.classList.add("hidden");
    buttonLoading(btn, true, "กำลังเข้าสู่ระบบ...");
    const email = document.querySelector("#signin-email").value.trim();
    const password = document.querySelector("#signin-password").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    buttonLoading(btn, false);
    if (error) {
      errorEl.textContent = "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมล รหัสผ่าน หรือยืนยันอีเมลก่อน";
      errorEl.classList.remove("hidden");
      return;
    }
    await bootstrapApp();
  });

  document.querySelector("#signup-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button[type="submit"]');
    const errorEl = document.querySelector("#signup-error");
    errorEl.classList.add("hidden");
    buttonLoading(btn, true, "กำลังสร้างบัญชี...");

    const email = document.querySelector("#signup-email").value.trim();
    const password = document.querySelector("#signup-password").value;
    const fullName = document.querySelector("#signup-name").value.trim();
    const employeeCode = document.querySelector("#signup-employee").value.trim();
    const phone = document.querySelector("#signup-phone").value.trim();
    const requestedDepartmentCode = document.querySelector("#signup-department").value;
    const subjectGroupCode = document.querySelector("#signup-subject-group").value;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          employee_code: employeeCode || null,
          phone: phone || null,
          requested_department_code: requestedDepartmentCode || null,
          subject_group_code: subjectGroupCode || null,
        },
      },
    });

    buttonLoading(btn, false);

    if (error) {
      errorEl.textContent = error.message || "สมัครใช้งานไม่สำเร็จ";
      errorEl.classList.remove("hidden");
      return;
    }

    if (!data.session) {
      renderEmailConfirmation(email);
      return;
    }
    await bootstrapApp();
  });
}

function renderEmailConfirmation(email) {
  app.innerHTML = `
    <main class="center-page">
      <section class="status-card">
        <div class="status-icon">✉</div>
        <h2>ตรวจสอบอีเมลของคุณ</h2>
        <p>เราได้ส่งลิงก์ยืนยันไปยัง <strong>${escapeHtml(email)}</strong> เมื่อยืนยันแล้วให้กลับมาเข้าสู่ระบบอีกครั้ง</p>
        <div class="status-actions">
          <button class="btn btn-primary" id="back-login">กลับไปหน้าเข้าสู่ระบบ</button>
        </div>
      </section>
    </main>`;
  document.querySelector("#back-login").addEventListener("click", () => renderAuth("signin"));
}

async function fetchOwnProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,employee_code,phone,role,department_id,requested_department_id,subject_group_id,account_status,approved_at,created_at,deleted_at")
    .eq("id", state.user.id)
    .single();
  if (error) throw error;
  return data;
}

async function bootstrapApp() {
  if (!state.systemSettings || !state.departments.length || !state.subjectGroups.length) await loadPublicData();
  const { data: { session } } = await supabase.auth.getSession();
  state.session = session;
  state.user = session?.user || null;
  if (!state.user) {
    state.profile = null;
    renderAuth("signin");
    return;
  }

  try {
    state.profile = await fetchOwnProfile();
  } catch (error) {
    console.error(error);
    renderSystemError("ไม่สามารถโหลดข้อมูลผู้ใช้", "โปรไฟล์ของบัญชีอาจยังสร้างไม่เสร็จ กรุณาลองใหม่");
    return;
  }

  if (state.profile.account_status !== "active") {
    renderPending();
    return;
  }

  await loadActiveUserData();
  renderDashboard();
}

function renderPending() {
  const status = state.profile.account_status;
  const bootstrapAvailable = status === "pending" && state.systemSettings?.bootstrap_complete === false;
  const icon = status === "pending" ? "⏳" : status === "rejected" ? "!" : status === "deleted" ? "×" : "⏸";
  const title = status === "pending" ? "บัญชีกำลังรอการอนุมัติ" : status === "rejected" ? "คำขอใช้งานไม่ได้รับการอนุมัติ" : status === "deleted" ? "บัญชีนี้ถูกลบออกจากระบบ" : "บัญชีถูกระงับชั่วคราว";
  const body = status === "pending"
    ? "Super Admin จะตรวจสอบข้อมูลและกำหนดสิทธิ์ให้คุณ หลังอนุมัติแล้วสามารถเข้า Dashboard ได้ทันที"
    : status === "deleted"
      ? "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน School OS แล้ว กรุณาติดต่อผู้ดูแลระบบหากคิดว่าเป็นความผิดพลาด"
      : "กรุณาติดต่อผู้ดูแลระบบของโรงเรียน หากต้องการข้อมูลเพิ่มเติมเกี่ยวกับสถานะบัญชี";

  app.innerHTML = `
    <main class="center-page">
      <section class="status-card">
        <div class="status-icon">${icon}</div>
        <h2>${title}</h2>
        <p>${body}</p>
        <div class="status-meta">
          <div class="status-meta-row"><span>ชื่อผู้ใช้</span><strong>${escapeHtml(state.profile.full_name || "—")}</strong></div>
          <div class="status-meta-row"><span>อีเมล</span><strong>${escapeHtml(state.profile.email || state.user.email || "—")}</strong></div>
          <div class="status-meta-row"><span>สถานะ</span><span class="pill ${status}">${STATUS_LABEL[status] || status}</span></div>
          <div class="status-meta-row"><span>สมัครเมื่อ</span><strong>${formatDate(state.profile.created_at)}</strong></div>
        </div>
        <div class="status-actions">
          ${bootstrapAvailable ? `<button class="btn btn-secondary" id="bootstrap-admin">ตั้งค่าบัญชีนี้เป็น Super Admin คนแรก</button>` : ""}
          <button class="btn btn-primary" id="refresh-profile">ตรวจสอบสถานะอีกครั้ง</button>
          <button class="btn btn-ghost" id="pending-signout">ออกจากระบบ</button>
        </div>
        ${bootstrapAvailable ? `<p class="helper" style="margin-top:18px">ใช้เฉพาะการติดตั้งระบบครั้งแรก เมื่อสร้าง Super Admin คนแรกแล้วปุ่มนี้จะไม่แสดงอีก</p>` : ""}
      </section>
    </main>`;

  document.querySelector("#refresh-profile")?.addEventListener("click", async (e) => {
    buttonLoading(e.currentTarget, true, "กำลังตรวจสอบ...");
    await bootstrapApp();
  });

  document.querySelector("#pending-signout")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    renderAuth("signin");
  });

  document.querySelector("#bootstrap-admin")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    buttonLoading(btn, true, "กำลังตั้งค่า...");
    const { error } = await supabase.rpc("bootstrap_super_admin");
    buttonLoading(btn, false);
    if (error) {
      toast("ไม่สามารถตั้งค่า Super Admin", error.message, "error");
      return;
    }
    toast("ตั้งค่าเรียบร้อย", "บัญชีนี้เป็น Super Admin แล้ว", "success");
    await loadPublicData();
    await bootstrapApp();
  });
}

async function loadActiveUserData() {
  await loadPublicData();
  const [departmentsRes, modulesRes, notificationsRes, personnelOwnRes] = await Promise.all([
    supabase.from("departments").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("modules").select("*, departments(code,name_th,name_en)").eq("is_active", true).order("sort_order"),
    supabase.from("notifications").select("*").is("dismissed_at", null).order("created_at", { ascending: false }).limit(20),
    supabase.from("personnel_records").select("*").eq("user_id", state.user.id).maybeSingle(),
  ]);

  state.departments = departmentsRes.data || [];
  state.modules = modulesRes.data || [];
  state.notifications = notificationsRes.data || [];
  state.personnelOwnRecord = personnelOwnRes.error ? null : (personnelOwnRes.data || null);

  if (state.profile.role === "super_admin") {
    const { data } = await supabase
      .from("profiles")
      .select("id,email,full_name,employee_code,phone,role,department_id,requested_department_id,subject_group_id,account_status,created_at,approved_at,deleted_at")
      .neq("account_status", "deleted")
      .order("created_at", { ascending: false });
    state.pendingUsers = data || [];
  } else {
    state.pendingUsers = [];
  }
}

async function dashboardMetrics() {
  const role = state.profile.role;
  const result = {
    notifications: state.notifications.filter(n => !n.read_at).length,
    pendingUsers: state.pendingUsers.filter(u => u.account_status === "pending").length,
    totalUsers: state.pendingUsers.length,
    plans: 0,
  };

  const { count } = await supabase
    .from("lesson_plans")
    .select("*", { count: "exact", head: true });
  result.plans = count || 0;
  return result;
}

function sidebarHtml() {
  const grouped = state.departments.map(dep => {
    const modules = state.modules.filter(m => m.department_id === dep.id);
    if (!modules.length) return "";
    return `
      <div class="nav-group open">
        <button class="nav-toggle">
          <span class="nav-icon">▦</span>
          <span class="nav-label">${escapeHtml(dep.name_th)}</span>
          <span class="chev">⌄</span>
        </button>
        <div class="nav-children"><div class="nav-children-inner">
          ${modules.map(m => `<button class="nav-item nav-child" data-view="module:${escapeHtml(m.code)}"><span class="nav-icon">•</span><span class="nav-label">${escapeHtml(m.name_th)}</span></button>`).join("")}
        </div></div>
      </div>`;
  }).join("");

  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">${escapeHtml(brandShort())}</div>
        <div class="brand-copy"><strong>${escapeHtml(appName())}</strong><span>Management Platform</span></div>
      </div>
      <div class="nav-section-title">ภาพรวม</div>
      <button class="nav-item ${state.currentView === "dashboard" ? "active" : ""}" data-view="dashboard"><span class="nav-icon">⌂</span><span class="nav-label">Dashboard</span></button>
      ${state.profile.role === "super_admin" ? `<button class="nav-item ${state.currentView === "users" ? "active" : ""}" data-view="users"><span class="nav-icon">♙</span><span class="nav-label">จัดการผู้ใช้งาน</span></button><button class="nav-item ${state.currentView === "settings" ? "active" : ""}" data-view="settings"><span class="nav-icon">⚙</span><span class="nav-label">ตั้งค่าระบบ</span></button>` : ""}
      <div class="nav-section-title">กลุ่มงาน</div>
      ${grouped || `<div class="empty" style="color:#94a3b8;border-color:#334155">ยังไม่มีระบบย่อยที่เปิดใช้งาน</div>`}
      <div class="sidebar-user">
        <div class="user-line">
          <div class="avatar">${escapeHtml(initials(state.profile.full_name || state.profile.email))}</div>
          <div class="user-text">
            <strong>${escapeHtml(state.profile.full_name || state.profile.email)}</strong>
            <span>${escapeHtml(ROLE_LABEL[state.profile.role] || state.profile.role)}</span>
          </div>
        </div>
        <button class="btn btn-ghost" id="signout-btn">ออกจากระบบ</button>
      </div>
    </aside>`;
}

async function renderDashboard() {
  if (state.currentView === "module:lesson_plans") {
    await loadLessonPlanWorkspace();
  }
  if (state.currentView === "module:personnel_records") {
    await loadPersonnelWorkspace();
  }
  if (state.currentView === "module:leave_management") {
    await loadLeaveWorkspace();
  }
  if (state.currentView === "module:timetable_management") {
    await loadTimetableWorkspace();
  }
  if (state.currentView === "module:substitute_teaching") {
    await loadSubstituteWorkspace();
  }
  if (state.currentView === "module:project_management") {
    await loadProjectWorkspace();
  }
  if (state.currentView === "module:home_visit_management") {
    await loadHomeVisitWorkspace();
  }
  const metrics = await dashboardMetrics();
  const unread = state.notifications.filter(n => !n.read_at).length;
  const content = state.currentView === "users" && state.profile.role === "super_admin"
    ? usersView()
    : state.currentView === "settings" && state.profile.role === "super_admin"
      ? settingsView()
    : state.currentView.startsWith("module:")
      ? moduleView(state.currentView.split(":")[1])
      : homeView(metrics);

  app.innerHTML = `
    <div class="dashboard ${state.sidebarOpen ? "sidebar-open" : ""}">
      ${sidebarHtml()}
      <main class="main">
        <header class="topbar">
          <div class="topbar-actions">
            <button class="icon-btn mobile-menu" id="mobile-menu">☰</button>
            <div class="topbar-left">
              <h1>${pageTitle()}</h1>
              <p>${roleDescription(state.profile.role)}</p>
            </div>
          </div>
          <div class="topbar-actions">
            <button class="icon-btn" id="notification-btn" title="การแจ้งเตือน">🔔${unread ? `<span class="badge">${unread}</span>` : ""}</button>
          </div>
        </header>
        <section class="content">${content}</section>
      </main>
    </div>`;

  bindDashboardEvents();
}

function pageTitle() {
  if (state.currentView === "users") return "จัดการผู้ใช้งาน";
  if (state.currentView === "settings") return "ตั้งค่าระบบ";
  if (state.currentView.startsWith("module:")) {
    const code = state.currentView.split(":")[1];
    return state.modules.find(m => m.code === code)?.name_th || "ระบบย่อย";
  }
  return "Dashboard";
}


const PERSON_CATEGORY_LABEL = {
  executive: "ผู้บริหาร",
  teacher: "ข้าราชการครู",
  education_personnel: "บุคลากรทางการศึกษา",
};

const EMPLOYMENT_TYPE_LABEL = {
  civil_service_teacher: "ข้าราชการครูและบุคลากรทางการศึกษา",
  government_employee: "พนักงานราชการ",
  permanent_employee: "ลูกจ้างประจำ",
  temporary_employee: "ลูกจ้างชั่วคราว",
  contract_teacher: "ครูอัตราจ้าง",
  education_personnel: "บุคลากรทางการศึกษา",
  other: "อื่น ๆ",
};

const ACADEMIC_RANK_LABEL = {
  assistant_teacher: "ครูผู้ช่วย",
  teacher_k1: "ครู (คศ.1)",
  teacher_k2: "ครูชำนาญการ (คศ.2)",
  teacher_k3: "ครูชำนาญการพิเศษ (คศ.3)",
  teacher_k4: "ครูเชี่ยวชาญ (คศ.4)",
  teacher_k5: "ครูเชี่ยวชาญพิเศษ (คศ.5)",
  not_applicable: "ไม่ใช้วิทยฐานะครู",
};

const ACADEMIC_RANK_ORDER = ["assistant_teacher","teacher_k1","teacher_k2","teacher_k3","teacher_k4","teacher_k5"];

function personnelDepartmentId() {
  return state.departments.find(d => d.code === "personnel")?.id || null;
}

function isPersonnelReviewer() {
  return state.profile?.role === "super_admin"
    || state.profile?.role === "director"
    || (state.profile?.role === "department_head" && state.profile?.department_id === personnelDepartmentId());
}

function dateOnly(value) {
  if (!value) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addCalendarYears(value, years) {
  const d = dateOnly(value);
  if (!d) return null;
  const out = new Date(d);
  out.setFullYear(out.getFullYear() + Number(years || 0));
  return out;
}

function calendarDuration(fromValue, toValue = new Date()) {
  const from = dateOnly(fromValue);
  const to = toValue instanceof Date ? new Date(toValue) : dateOnly(toValue);
  if (!from || !to) return null;
  if (to < from) return { years: 0, months: 0, days: Math.max(0, Math.ceil((from - to) / 86400000)), future: true };

  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();

  if (days < 0) {
    const prevMonthLast = new Date(to.getFullYear(), to.getMonth(), 0).getDate();
    days += prevMonthLast;
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }
  return { years, months, days, future: false };
}

function durationText(duration) {
  if (!duration) return "—";
  const parts = [];
  if (duration.years) parts.push(`${duration.years} ปี`);
  if (duration.months) parts.push(`${duration.months} เดือน`);
  if (duration.days || !parts.length) parts.push(`${duration.days} วัน`);
  return parts.join(" ");
}

function formatCitizenId(value) {
  const v = String(value || "").replace(/\D/g, "");
  if (v.length !== 13) return value || "—";
  return `${v[0]}-${v.slice(1,5)}-${v.slice(5,10)}-${v.slice(10,12)}-${v[12]}`;
}

function personnelDisplayName(record, profile = null) {
  const name = [record?.prefix, record?.first_name, record?.last_name].filter(Boolean).join(" ").trim();
  return name || profile?.full_name || profile?.email || "บุคลากร";
}

function personnelProgression(record) {
  if (!record || record.person_category !== "teacher" || record.employment_type !== "civil_service_teacher") return [];
  const currentRank = record.academic_rank;
  const currentIndex = ACADEMIC_RANK_ORDER.indexOf(currentRank);
  if (currentIndex < 0 || currentIndex >= ACADEMIC_RANK_ORDER.length - 1) return [];

  const settings = state.systemSettings || {};
  const assistantYears = Number(settings.assistant_teacher_years || 2);
  const intervalYears = Number(settings.special_area_school ? (settings.qualification_special_years || 3) : (settings.qualification_standard_years || 4));
  let stageStart = record.academic_rank_effective_date || (currentRank === "assistant_teacher" ? record.first_appointment_date : null);
  if (!stageStart) return [];

  const result = [];
  for (let i = currentIndex; i < ACADEMIC_RANK_ORDER.length - 1; i++) {
    const fromRank = ACADEMIC_RANK_ORDER[i];
    const toRank = ACADEMIC_RANK_ORDER[i + 1];
    const years = fromRank === "assistant_teacher" ? assistantYears : intervalYears;
    const target = addCalendarYears(stageStart, years);
    if (!target) break;
    result.push({ fromRank, toRank, stageStart: dateOnly(stageStart), target, years });
    stageStart = target;
  }
  return result;
}

function milestoneStatus(stage) {
  const now = new Date();
  const totalMs = stage.target - stage.stageStart;
  const elapsedMs = now - stage.stageStart;
  const progress = Math.max(0, Math.min(100, totalMs > 0 ? (elapsedMs / totalMs) * 100 : 100));
  if (now >= stage.target) {
    const overdueDays = Math.floor((now - stage.target) / 86400000);
    return { progress: 100, text: overdueDays > 0 ? `ครบกำหนดโดยประมาณแล้ว ${overdueDays} วัน` : "ครบกำหนดโดยประมาณวันนี้", due: true };
  }
  const left = calendarDuration(now, stage.target);
  return { progress, text: `เหลือประมาณ ${durationText(left)}`, due: false };
}

function personnelProfileReminderHtml() {
  if (state.personnelOwnRecord) return "";
  return `<section class="personnel-reminder">
    <div class="personnel-reminder-icon">ID</div>
    <div><strong>กรุณาบันทึกข้อมูลข้าราชการและบุคลากรทางการศึกษา</strong><span>บัญชีของคุณเปิดใช้งานแล้ว ขั้นตอนถัดไปคือสร้างแฟ้มประวัติบุคลากรของคุณ</span></div>
    <button class="btn btn-primary" data-view="module:personnel_records">บันทึกข้อมูลส่วนตัว</button>
  </section>`;
}

function homeView(metrics) {
  const role = state.profile.role;
  return `
    <section class="welcome">
      <h2>สวัสดี, ${escapeHtml(state.profile.full_name || "ผู้ใช้งาน")} 👋</h2>
      <p>คุณเข้าสู่ระบบในสิทธิ์ <strong>${escapeHtml(ROLE_LABEL[role] || role)}</strong> ข้อมูลและเมนูที่แสดงจะถูกกรองตามสิทธิ์ของคุณโดย RLS ที่ฐานข้อมูล</p>
    </section>
    ${personnelProfileReminderHtml()}

    <div class="metric-grid">
      <article class="metric-card"><div class="metric-label">งาน/แผนที่มองเห็น</div><div class="metric-value">${metrics.plans}</div><div class="metric-sub">กรองตามสิทธิ์ปัจจุบัน</div></article>
      <article class="metric-card"><div class="metric-label">แจ้งเตือนใหม่</div><div class="metric-value">${metrics.notifications}</div><div class="metric-sub">ยังไม่ได้อ่าน</div></article>
      <article class="metric-card"><div class="metric-label">${role === "super_admin" ? "ผู้ใช้ทั้งหมด" : "ระบบย่อย"}</div><div class="metric-value">${role === "super_admin" ? metrics.totalUsers : state.modules.length}</div><div class="metric-sub">${role === "super_admin" ? "ทุกสถานะ" : "ที่เปิดใช้งาน"}</div></article>
      <article class="metric-card"><div class="metric-label">${role === "super_admin" ? "รออนุมัติผู้ใช้" : "สิทธิ์ปัจจุบัน"}</div><div class="metric-value">${role === "super_admin" ? metrics.pendingUsers : "✓"}</div><div class="metric-sub">${role === "super_admin" ? "คำขอใหม่" : ROLE_LABEL[role]}</div></article>
    </div>

    <div class="grid-2">
      <section class="panel">
        <div class="panel-head">
          <div class="panel-title-wrap"><h3>ระบบที่เปิดใช้งาน</h3><p>เลือกจากกลุ่มงานเพื่อเข้าสู่ระบบย่อย</p></div>
        </div>
        <div class="module-grid">
          ${state.modules.length ? state.modules.map(m => `
            <button class="module-card" data-view="module:${escapeHtml(m.code)}">
              <strong>${escapeHtml(m.name_th)}</strong>
              <span>${escapeHtml(m.departments?.name_th || "")}</span>
            </button>`).join("") : `<div class="empty" style="grid-column:1/-1"><strong>ยังไม่มีระบบย่อย</strong><span>เมื่อ Admin เปิด Module แล้วจะแสดงที่นี่</span></div>`}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div class="panel-title-wrap"><h3>การแจ้งเตือนล่าสุด</h3><p>ข้อมูลจาก notification center</p></div>
        </div>
        ${notificationList(6)}
      </section>
    </div>`;
}

function notificationList(limit = 20) {
  const items = state.notifications.slice(0, limit);
  if (!items.length) return `<div class="empty"><strong>ไม่มีการแจ้งเตือน</strong><span>รายการใหม่จะแสดงตรงนี้</span></div>`;
  return `<div class="list">${items.map(n => `
    <div class="list-item ${["lesson_plan","personnel_profile","leave_request","substitute_batch","substitute_lesson","budget_disbursement"].includes(n.entity_type) ? "notification-clickable" : ""}"
      ${n.entity_type === "lesson_plan" && n.entity_id ? `data-notification-plan="${n.entity_id}"` : ""}
      ${n.entity_type === "personnel_profile" ? `data-notification-personnel="1"` : ""}
      ${n.entity_type === "leave_request" && n.entity_id ? `data-notification-leave="${n.entity_id}"` : ""}
      ${["substitute_batch","substitute_lesson"].includes(n.entity_type) ? `data-notification-substitute="${n.entity_id || ""}" data-substitute-entity="${n.entity_type}"` : ""}
      ${n.entity_type === "budget_disbursement" && n.entity_id ? `data-notification-budget="${n.entity_id}"` : ""}>
      <div class="list-icon">${n.read_at ? "✓" : "●"}</div>
      <div class="list-body"><strong>${escapeHtml(n.title)}</strong><p>${escapeHtml(n.message)}</p></div>
      <div class="list-time">${formatDate(n.created_at)}</div>
    </div>`).join("")}</div>`;
}

function usersView() {
  const users = state.pendingUsers;
  const depMap = Object.fromEntries(state.departments.map(d => [d.id, d.name_th]));
  const subjectMap = Object.fromEntries(state.subjectGroups.map(s => [s.id, s.name_th]));
  return `
    <section class="panel">
      <div class="panel-head">
        <div class="panel-title-wrap">
          <h3>ผู้ใช้งานและคำขอสมัคร</h3>
          <p>Super Admin สามารถอนุมัติ กำหนด Role ระงับ เปิดใช้งาน หรือลบบัญชีออกจากการเข้าใช้งานได้</p>
        </div>
        <span class="pill pending">${users.filter(u => u.account_status === "pending").length} รออนุมัติ</span>
      </div>
      ${users.length ? `
      <div class="table-wrap">
        <table class="table admin-user-table">
          <thead><tr><th>ผู้ใช้งาน</th><th>สถานะ</th><th>Role</th><th>กลุ่มงานที่แจ้ง</th><th>กลุ่มสาระ</th><th>สมัครเมื่อ</th><th>จัดการ</th></tr></thead>
          <tbody>
          ${users.map(u => `
            <tr>
              <td><strong>${escapeHtml(u.full_name || "ยังไม่ระบุชื่อ")}</strong><br><span style="color:#64748b">${escapeHtml(u.email || "")}</span></td>
              <td><span class="pill ${u.account_status}">${STATUS_LABEL[u.account_status] || u.account_status}</span></td>
              <td>${escapeHtml(ROLE_LABEL[u.role] || u.role)}</td>
              <td>${escapeHtml(depMap[u.requested_department_id] || depMap[u.department_id] || "—")}</td>
              <td>${escapeHtml(subjectMap[u.subject_group_id] || "—")}</td>
              <td>${formatDate(u.created_at)}</td>
              <td>
                ${u.role === "super_admin" ? `<span class="pill neutral">บัญชีหลัก</span>` : `
                <div class="admin-actions">
                  ${u.account_status === "pending" ? `<button class="btn btn-success" data-user-action="approve" data-user-id="${u.id}">อนุมัติ</button><button class="btn btn-danger" data-user-action="reject" data-user-id="${u.id}">ปฏิเสธ</button>` : ""}
                  ${u.account_status === "active" ? `<button class="btn btn-warning" data-user-action="suspend" data-user-id="${u.id}">ระงับ</button>` : ""}
                  ${["suspended","rejected"].includes(u.account_status) ? `<button class="btn btn-success" data-user-action="reactivate" data-user-id="${u.id}">เปิดใช้งาน</button>` : ""}
                  ${u.account_status === "active" && ["teacher","department_head"].includes(u.role) ? `<button class="btn btn-ghost" data-user-academic="${u.id}">☆ ตั้งค่าครู</button>` : ""}
                  <button class="btn btn-danger btn-delete-user" data-user-action="delete" data-user-id="${u.id}">ลบผู้ใช้</button>
                </div>`}
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>` : `<div class="empty"><strong>ยังไม่มีผู้สมัคร</strong><span>เมื่อมีการ Sign Up รายการจะปรากฏที่นี่</span></div>`}
    </section>`;
}

function settingsView() {
  const s = state.systemSettings || {};
  return `<section class="settings-layout">
    <section class="panel settings-panel">
      <div class="panel-head">
        <div class="panel-title-wrap"><h3>ตั้งค่าชื่อและข้อมูลโรงเรียน</h3><p>ใช้กับหน้า Login, Sidebar และหัวเอกสาร A4 / Approved PDF</p></div>
      </div>
      <form id="system-settings-form" class="form-grid">
        <div class="form-row">
          <div class="field"><label>ชื่อระบบ</label><input class="input" id="setting-system-name" required maxlength="100" value="${escapeHtml(s.system_name || APP_NAME)}"></div>
          <div class="field"><label>ชื่อย่อบนโลโก้ระบบ</label><input class="input" id="setting-brand-short" required maxlength="12" value="${escapeHtml(s.brand_short || "BNK")}"></div>
        </div>
        <div class="field"><label>ชื่อโรงเรียน</label><input class="input" id="setting-school-name" required maxlength="180" value="${escapeHtml(s.school_name_th || schoolName())}"></div>
        <div class="field"><label>ที่อยู่โรงเรียน</label><input class="input" id="setting-school-address" required maxlength="240" value="${escapeHtml(s.school_address_th || schoolAddress())}"></div>
        <div class="field"><label>หน่วยงานต้นสังกัด</label><input class="input" id="setting-education-office" required maxlength="240" value="${escapeHtml(s.education_office_th || educationOffice())}"></div>
        <div class="settings-rule-box">
          <div><strong>เกณฑ์ติดตามความก้าวหน้าวิทยฐานะ</strong><span>ใช้เป็นตัวช่วยแจ้งเตือนเท่านั้น ควรตรวจสอบหลักเกณฑ์ ก.ค.ศ. ก่อนยื่นจริง</span></div>
          <label class="settings-check"><input type="checkbox" id="setting-special-area" ${s.special_area_school !== false ? "checked" : ""}> โรงเรียนใช้เกณฑ์พื้นที่พิเศษ</label>
          <div class="form-row">
            <div class="field"><label>ครูผู้ช่วย → คศ.1 (ปี)</label><input class="input" id="setting-assistant-years" type="number" min="1" max="10" value="${Number(s.assistant_teacher_years || 2)}"></div>
            <div class="field"><label>ช่วงปกติ (ปี)</label><input class="input" id="setting-standard-years" type="number" min="1" max="10" value="${Number(s.qualification_standard_years || 4)}"></div>
            <div class="field"><label>พื้นที่พิเศษ (ปี)</label><input class="input" id="setting-special-years" type="number" min="1" max="10" value="${Number(s.qualification_special_years || 3)}"></div>
          </div>
        </div>
        <div class="settings-rule-box">
          <div><strong>โควตาติดตามวันลาแบบรายภาคเรียน</strong><span>ใช้กับประเภทลาที่ตั้งว่า “นับโควตา” เช่น ลาป่วยและลากิจ โดยระบบรีเซ็ตและตรวจแยกตามปีการศึกษา + ภาคเรียน</span></div>
          <div class="settings-rule-box" style="background:#fff">
            <div><strong>ภาคเรียนที่ 1</strong><span>กำหนดเพดานการลาสำหรับภาคเรียนที่ 1</span></div>
            <div class="form-row">
              <div class="field"><label>จำนวนครั้งสูงสุด / ภาคเรียน</label><input class="input" id="setting-leave-term1-times" type="number" min="0" max="100" value="${Number(s.leave_quota_term1_times ?? s.leave_quota_times ?? 6)}"></div>
              <div class="field"><label>จำนวนวันสูงสุด / ภาคเรียน</label><input class="input" id="setting-leave-term1-days" type="number" min="0" max="366" step="0.5" value="${Number(s.leave_quota_term1_days ?? s.leave_quota_days ?? 22)}"></div>
            </div>
          </div>
          <div class="settings-rule-box" style="background:#fff">
            <div><strong>ภาคเรียนที่ 2</strong><span>กำหนดเพดานการลาสำหรับภาคเรียนที่ 2 แยกจากภาคเรียนที่ 1</span></div>
            <div class="form-row">
              <div class="field"><label>จำนวนครั้งสูงสุด / ภาคเรียน</label><input class="input" id="setting-leave-term2-times" type="number" min="0" max="100" value="${Number(s.leave_quota_term2_times ?? s.leave_quota_times ?? 6)}"></div>
              <div class="field"><label>จำนวนวันสูงสุด / ภาคเรียน</label><input class="input" id="setting-leave-term2-days" type="number" min="0" max="366" step="0.5" value="${Number(s.leave_quota_term2_days ?? s.leave_quota_days ?? 22)}"></div>
            </div>
          </div>
        </div>
        <div class="settings-note"><strong>สถานะการติดตั้ง Super Admin</strong><span>${s.bootstrap_complete ? "ตั้งค่า Super Admin คนแรกแล้ว — ผู้สมัครใหม่จะไม่เห็นปุ่ม Bootstrap" : "ยังไม่มี Super Admin คนแรก"}</span></div>
        <div class="modal-actions settings-actions"><button class="btn btn-primary" type="submit">บันทึกการตั้งค่าระบบ</button></div>
      </form>
    </section>
    <section class="panel settings-preview">
      <div class="panel-head"><div class="panel-title-wrap"><h3>ตัวอย่าง Branding</h3><p>ตัวอย่างจากค่าที่บันทึกล่าสุด</p></div></div>
      <div class="settings-brand-preview"><div class="brand-mark large">${escapeHtml(brandShort())}</div><strong>${escapeHtml(appName())}</strong><span>${escapeHtml(schoolName())}</span><small>${escapeHtml(schoolAddress())}<br>${escapeHtml(educationOffice())}</small></div>
    </section>
  </section>`;
}

function lessonStatusLabel(status) {
  return {
    draft: "ฉบับร่าง",
    pending_head: "รอหัวหน้าตรวจ",
    revision_requested: "ส่งกลับแก้ไข",
    pending_director: "รอผู้บริหารอนุมัติ",
    approved: "อนุมัติแล้ว",
    rejected: "ไม่อนุมัติ",
  }[status] || status;
}

function lessonStatusClass(status) {
  if (status === "approved") return "active";
  if (["rejected"].includes(status)) return "rejected";
  if (["revision_requested"].includes(status)) return "suspended";
  if (["pending_head", "pending_director"].includes(status)) return "pending";
  return "neutral";
}

async function loadLessonPlanWorkspace() {
  const [plansRes, fileMetaRes] = await Promise.all([
    supabase.from("lesson_plans").select("*").order("updated_at", { ascending: false }),
    supabase.from("lesson_plan_files").select("id,lesson_plan_id,file_name,file_size,created_at"),
  ]);

  if (plansRes.error) {
    console.error(plansRes.error);
    state.lessonPlans = [];
  } else {
    state.lessonPlans = plansRes.data || [];
  }

  state.lessonFileCounts = {};
  for (const file of (fileMetaRes.data || [])) {
    state.lessonFileCounts[file.lesson_plan_id] = (state.lessonFileCounts[file.lesson_plan_id] || 0) + 1;
  }

  if (state.selectedLessonPlanId) {
    const plan = state.lessonPlans.find(p => p.id === state.selectedLessonPlanId);
    if (plan) await loadLessonPlanDetail(plan.id);
    else {
      state.selectedLessonPlanId = null;
      state.lessonDetail = null;
    }
  }

  if (canReviewLessonPlans()) {
    const [{ data: sigs }, { data: teachers, error: teacherError }] = await Promise.all([
      supabase
        .from("signatures")
        .select("*")
        .eq("user_id", state.user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id,full_name,email,role,department_id")
        .in("role", ["teacher", "department_head"])
        .eq("account_status", "active")
        .is("deleted_at", null)
        .order("full_name", { ascending: true }),
    ]);
    state.signatures = sigs || [];
    if (teacherError) {
      console.error("Teacher roster load failed", teacherError);
      state.lessonTeacherRoster = [];
    } else {
      state.lessonTeacherRoster = teachers || [];
    }
  } else {
    state.signatures = [];
    state.lessonTeacherRoster = [];
    state.lessonTeacherView = "all";
    state.lessonTeacherId = null;
  }
}

async function loadLessonPlanDetail(planId) {
  const [filesRes, timelineRes, approvedDocRes] = await Promise.all([
    supabase.from("lesson_plan_files").select("*").eq("lesson_plan_id", planId).order("created_at"),
    supabase.from("workflow_actions").select("*").eq("lesson_plan_id", planId).order("created_at"),
    supabase.from("approved_lesson_plan_documents").select("*").eq("lesson_plan_id", planId).maybeSingle(),
  ]);
  const timeline = timelineRes.data || [];
  const signatureIds = [...new Set(timeline.map(x => x.signature_id).filter(Boolean))];
  let signatures = [];
  if (signatureIds.length) {
    const { data } = await supabase.from("signatures").select("*").in("id", signatureIds);
    signatures = data || [];
  }
  state.lessonDetail = {
    plan: state.lessonPlans.find(p => p.id === planId),
    files: filesRes.data || [],
    timeline,
    signatures,
    approvedDocument: approvedDocRes.data || null,
  };
}

function lessonPlanTypeLabel(type) {
  return type === "semester" ? "แผนรายภาคเรียน" : "แผนรายสัปดาห์";
}

function academicDepartmentId() {
  return state.departments.find(d => d.code === "academic")?.id || null;
}

function isAcademicHead() {
  return state.profile?.role === "department_head"
    && state.profile?.department_id
    && state.profile.department_id === academicDepartmentId();
}

function canActAsLessonTeacher() {
  return ["teacher", "department_head"].includes(state.profile?.role);
}

function canReviewLessonPlans() {
  return isAcademicHead() || ["director", "super_admin"].includes(state.profile?.role);
}

function modeLessonPlans() {
  if (!state.lessonPlanMode) return state.lessonPlans;
  return state.lessonPlans.filter(p => (p.plan_type || "weekly") === state.lessonPlanMode);
}

function filteredLessonPlans() {
  let plans = modeLessonPlans();
  if (state.lessonTeacherView === "mine") plans = plans.filter(p => p.teacher_id === state.user.id);
  if (state.lessonTeacherId) plans = plans.filter(p => p.teacher_id === state.lessonTeacherId);
  return plans;
}

function canTrackLessonPlansByTeacher() {
  return canReviewLessonPlans();
}

function teacherDisplayName(teacher) {
  return teacher?.full_name || teacher?.email || "ครูผู้สอน";
}

function teacherLessonSummary(teacherId) {
  const plans = modeLessonPlans().filter(p => p.teacher_id === teacherId);
  return {
    plans,
    total: plans.length,
    pending: plans.filter(p => ["pending_head", "pending_director"].includes(p.status)).length,
    revision: plans.filter(p => p.status === "revision_requested").length,
    approved: plans.filter(p => p.status === "approved").length,
    draft: plans.filter(p => p.status === "draft").length,
    rejected: plans.filter(p => p.status === "rejected").length,
  };
}

function lessonTeacherViewTabs() {
  if (!canTrackLessonPlansByTeacher()) return "";
  return `<div class="lesson-view-tabs">
    ${isAcademicHead() ? `<button class="lesson-view-tab ${state.lessonTeacherView === "mine" ? "active" : ""}" data-lesson-view="mine">แผนของฉัน</button>` : ""}
    <button class="lesson-view-tab ${state.lessonTeacherView === "all" ? "active" : ""}" data-lesson-view="all">รายการทั้งหมด</button>
    <button class="lesson-view-tab ${state.lessonTeacherView === "teachers" ? "active" : ""}" data-lesson-view="teachers">👤 ดูตามครู</button>
  </div>`;
}

function lessonTeacherDirectoryHtml() {
  const roster = state.lessonTeacherRoster || [];
  const modeLabel = lessonPlanTypeLabel(state.lessonPlanMode);

  if (state.lessonTeacherId) {
    const teacher = roster.find(t => t.id === state.lessonTeacherId) || {
      id: state.lessonTeacherId,
      full_name: modeLessonPlans().find(p => p.teacher_id === state.lessonTeacherId)?.teacher_name || "ครูผู้สอน",
    };
    const summary = teacherLessonSummary(state.lessonTeacherId);
    return `<section class="teacher-drilldown">
      <div class="teacher-drilldown-head">
        <div>
          <button class="type-back-link" id="teacher-directory-back">← กลับไปรายชื่อครู</button>
          <span class="eyebrow dark">Teacher Tracking</span>
          <h3>${escapeHtml(teacherDisplayName(teacher))}</h3>
          <p>${escapeHtml(modeLabel)} · แสดงเฉพาะแผนของครูคนนี้</p>
        </div>
        <div class="teacher-status-summary">
          ${summary.total === 0 ? `<span class="teacher-zero-badge">ยังไม่มีแผนที่ส่งในประเภทนี้</span>` : ""}
        </div>
      </div>
      <div class="lesson-stat-grid teacher-stat-grid">
        <article class="metric-card"><div class="metric-label">ทั้งหมด</div><div class="metric-value">${summary.total}</div></article>
        <article class="metric-card"><div class="metric-label">รอตรวจ / อนุมัติ</div><div class="metric-value">${summary.pending}</div></article>
        <article class="metric-card"><div class="metric-label">ส่งกลับแก้ไข</div><div class="metric-value">${summary.revision}</div></article>
        <article class="metric-card"><div class="metric-label">อนุมัติแล้ว</div><div class="metric-value">${summary.approved}</div></article>
      </div>
      <section class="panel" style="margin-top:18px">
        <div class="panel-head">
          <div class="panel-title-wrap"><h3>แผนของ ${escapeHtml(teacherDisplayName(teacher))}</h3><p>ติดตามสถานะของครูรายบุคคล</p></div>
          <button class="btn btn-ghost" id="refresh-lessons">↻ รีเฟรช</button>
        </div>
        ${lessonPlanListHtml()}
      </section>
    </section>`;
  }

  if (!roster.length) {
    return `<section class="panel"><div class="empty"><strong>ยังไม่พบรายชื่อครู</strong><span>รายชื่อครู Active ที่อยู่ในขอบเขตสิทธิ์จะแสดงที่นี่</span></div></section>`;
  }

  return `<section class="teacher-directory">
    <div class="teacher-directory-head">
      <div><span class="eyebrow dark">Teacher Tracking</span><h3>เลือกครูที่ต้องการตรวจสอบ</h3><p>${escapeHtml(modeLabel)} · แสดงครู Active ทุกคน รวมถึงผู้ที่ยังไม่มีแผนในประเภทนี้</p></div>
      <div class="teacher-directory-count">${roster.length} คน</div>
    </div>
    <div class="teacher-card-grid">
      ${roster.map(teacher => {
        const s = teacherLessonSummary(teacher.id);
        const current = s.pending > 0
          ? `<span class="teacher-state pending">มี ${s.pending} รายการรอดำเนินการ</span>`
          : s.revision > 0
            ? `<span class="teacher-state revision">มี ${s.revision} รายการรอแก้ไข</span>`
            : s.total === 0
              ? `<span class="teacher-state empty-state">ยังไม่มีแผน</span>`
              : `<span class="teacher-state clear">ไม่มีรายการค้าง</span>`;
        return `<button class="teacher-card" data-teacher-id="${teacher.id}">
          <div class="teacher-avatar">${escapeHtml((teacherDisplayName(teacher).trim().charAt(0) || "ค").toUpperCase())}</div>
          <div class="teacher-card-main">
            <strong>${escapeHtml(teacherDisplayName(teacher))}</strong>
            ${teacher.email ? `<span>${escapeHtml(teacher.email)}</span>` : ""}
            ${current}
          </div>
          <div class="teacher-card-stats">
            <div><strong>${s.total}</strong><span>ทั้งหมด</span></div>
            <div><strong>${s.approved}</strong><span>อนุมัติ</span></div>
            <div><strong>${s.revision}</strong><span>แก้ไข</span></div>
          </div>
          <span class="teacher-card-arrow">→</span>
        </button>`;
      }).join("")}
    </div>
  </section>`;
}

function lessonPlanTypeChooser(module) {
  const weeklyCount = state.lessonPlans.filter(p => (p.plan_type || "weekly") === "weekly").length;
  const semesterCount = state.lessonPlans.filter(p => p.plan_type === "semester").length;
  const role = state.profile.role;
  const roleText = isAcademicHead()
    ? "เลือกประเภทแผนสำหรับส่งของคุณเอง หรือตรวจงานในฐานะหัวหน้าวิชาการ"
    : canActAsLessonTeacher()
      ? "เลือกประเภทแผนที่ต้องการส่งในฐานะครูผู้สอน"
      : "เลือกประเภทแผนที่ต้องการตรวจสอบ";

  return `<section class="lesson-type-landing">
    <div class="lesson-type-heading">
      <span class="eyebrow dark">Academic Workflow</span>
      <h2>${escapeHtml(module.name_th)}</h2>
      <p>${escapeHtml(roleText)} ระบบอนุมัติ ลายเซ็น Timeline และ Approved PDF ใช้ Workflow เดียวกันทั้งสองประเภท</p>
    </div>
    <div class="lesson-type-grid">
      <button class="lesson-type-card weekly" data-plan-mode="weekly">
        <div class="lesson-type-icon">W</div>
        <div>
          <span class="lesson-type-kicker">Weekly Lesson Plan</span>
          <h3>แผนรายสัปดาห์</h3>
          <p>รูปแบบเดิมทั้งหมด มีสัปดาห์ วันที่สอน หน่วย เรื่อง จุดประสงค์ เนื้อหา กิจกรรม และการวัดผล</p>
          <small>${weeklyCount} รายการที่มองเห็น</small>
        </div>
        <span class="lesson-type-arrow">→</span>
      </button>
      <button class="lesson-type-card semester" data-plan-mode="semester">
        <div class="lesson-type-icon">S</div>
        <div>
          <span class="lesson-type-kicker">Semester Lesson Plan</span>
          <h3>แผนรายภาคเรียน</h3>
          <p>กรอกเฉพาะปีการศึกษา ภาคเรียน รหัสวิชา ชื่อวิชา ระดับชั้น และแนบ PDF หรือ Google Drive แผนทั้งภาคเรียน</p>
          <small>${semesterCount} รายการที่มองเห็น</small>
        </div>
        <span class="lesson-type-arrow">→</span>
      </button>
    </div>
  </section>`;
}

function lessonPlanListHtml() {
  const plans = filteredLessonPlans();
  if (!plans.length) {
    return `<div class="empty"><strong>ยังไม่มี${lessonPlanTypeLabel(state.lessonPlanMode)}</strong><span>${canActAsLessonTeacher() ? "กด “สร้างแผนใหม่” เพื่อเริ่มต้น" : "เมื่อมีงานเข้าตามสิทธิ์ รายการจะแสดงที่นี่"}</span></div>`;
  }

  const semesterMode = state.lessonPlanMode === "semester";
  return `<div class="table-wrap"><table class="table lesson-table"><thead><tr><th>แผนการสอน</th><th>ครูผู้สอน</th><th>ปี/ภาคเรียน</th>${semesterMode ? "<th>ระดับชั้น</th>" : "<th>เอกสารแนบ</th><th>วันที่สอน</th>"}${semesterMode ? "<th>เอกสารแนบ</th>" : ""}<th>สถานะ</th><th></th></tr></thead><tbody>
    ${plans.map(p => {
      const type = p.plan_type || "weekly";
      const subtitle = type === "semester"
        ? `${escapeHtml(p.subject_code || "—")} · ${escapeHtml(p.class_level || "—")}`
        : escapeHtml(p.topic || "—");
      return `<tr>
        <td><strong>${escapeHtml(p.subject_name)}</strong><br><span class="table-muted">${subtitle}</span><br><span class="plan-type-mini">${lessonPlanTypeLabel(type)}</span></td>
        <td>${escapeHtml(p.teacher_name || (p.teacher_id === state.user.id ? state.profile.full_name : "ครูผู้สอน"))}</td>
        <td>${escapeHtml(p.academic_year)} / ${p.semester}</td>
        ${semesterMode ? `<td>${escapeHtml(p.class_level || "—")}</td>` : `<td><span class="file-count-badge ${state.lessonFileCounts[p.id] ? 'has-file' : ''}">${state.lessonFileCounts[p.id] || 0} รายการ</span></td><td>${p.teach_date ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(`${p.teach_date}T00:00:00`)) : "—"}</td>`}
        ${semesterMode ? `<td><span class="file-count-badge ${state.lessonFileCounts[p.id] ? 'has-file' : ''}">${state.lessonFileCounts[p.id] || 0} รายการ</span></td>` : ""}
        <td><span class="pill ${lessonStatusClass(p.status)}">${lessonStatusLabel(p.status)}</span></td>
        <td><button class="btn btn-ghost lesson-open" data-plan-id="${p.id}">รายละเอียด</button></td>
      </tr>`;
    }).join("")}
  </tbody></table></div>`;
}

function planField(label, value) {
  return `<div class="detail-field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "—")}</strong></div>`;
}

function timelineHtml(detail) {
  const actionLabel = {
    submit: "ครูส่งแผน",
    resubmit: "ครูส่งแผนอีกครั้ง",
    approve_head: "หัวหน้ากลุ่มงานตรวจผ่าน",
    request_revision: "ส่งกลับแก้ไข",
    approve_director: "ผู้บริหารอนุมัติ",
    reject: "ไม่อนุมัติ",
    sign: "ลงนามเอกสาร",
  };
  const roleLabel = { teacher: "ครูผู้สอน", department_head: "หัวหน้ากลุ่มงาน", director: "ผู้บริหาร", super_admin: "Super Admin" };
  if (!detail.timeline.length) return `<div class="empty"><strong>ยังไม่มีประวัติ Workflow</strong><span>เมื่อส่งแผน Timeline จะเริ่มบันทึกอัตโนมัติ</span></div>`;
  return `<div class="timeline">${detail.timeline.map(item => `<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-card"><div class="timeline-head"><strong>${escapeHtml(actionLabel[item.action] || item.action)}</strong><span>${formatDate(item.created_at)}</span></div><p>${escapeHtml(roleLabel[item.actor_role] || item.actor_role)}</p>${item.comment ? `<div class="timeline-comment">${escapeHtml(item.comment)}</div>` : ""}${item.signature_id ? `<div class="signature-stamp">✓ มีลายเซ็นแนบกับขั้นตอนนี้ <button class="timeline-signature-preview" data-sig-id="${item.signature_id}">ดู</button></div>` : ""}</div></div>`).join("")}</div>`;
}

function approvedDocumentHtml(detail) {
  const p = detail.plan;
  if (p.status !== "approved") return "";
  const doc = detail.approvedDocument;
  if (doc) {
    const size = doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : "PDF";
    return `<div class="approved-doc-card ready"><div class="approved-doc-icon">✓</div><div class="approved-doc-body"><strong>PDF ฉบับอนุมัติถาวรพร้อมใช้งาน</strong><span>${escapeHtml(doc.file_name)} · ${size} · สร้างเมื่อ ${formatDate(doc.created_at)}</span><small>ไฟล์นี้เก็บใน Private Storage และเปิดได้ตามสิทธิ์ของแผนเท่านั้น</small></div><button class="btn btn-success" id="download-approved-pdf">⬇ ดาวน์โหลด Approved PDF</button></div>`;
  }
  const canGenerate = ["director", "super_admin"].includes(state.profile.role);
  return `<div class="approved-doc-card pending"><div class="approved-doc-icon">PDF</div><div class="approved-doc-body"><strong>อนุมัติแล้ว แต่ยังไม่มี PDF ฉบับถาวร</strong><span>${canGenerate ? "สามารถสร้างซ้ำได้หากขั้นตอนอัตโนมัติถูกขัดจังหวะ" : "รอผู้บริหารสร้างเอกสารฉบับถาวร"}</span></div>${canGenerate ? `<button class="btn btn-primary" id="generate-approved-pdf">สร้าง Approved PDF</button>` : ""}</div>`;
}

function lessonDetailHtml() {
  const d = state.lessonDetail;
  if (!d?.plan) return "";
  const p = d.plan;
  const type = p.plan_type || "weekly";
  const semesterPlan = type === "semester";
  const editable = p.teacher_id === state.user.id && ["draft", "revision_requested"].includes(p.status) && canActAsLessonTeacher();
  const canHeadReview = isAcademicHead() && p.status === "pending_head" && p.teacher_id !== state.user.id;
  const canDirectorReview = ["director", "super_admin"].includes(state.profile.role) && p.status === "pending_director";
  const titleSuffix = semesterPlan ? "แผนรายภาคเรียน" : (p.topic || "แผนรายสัปดาห์");

  return `<section class="panel lesson-detail-panel">
    <div class="panel-head">
      <div class="panel-title-wrap"><button class="detail-back" id="lesson-detail-back">← กลับไปรายการ</button><h3>${escapeHtml(p.subject_name)} — ${escapeHtml(titleSuffix)}</h3><p>${escapeHtml(p.teacher_name || "ครูผู้สอน")} · ${escapeHtml(lessonPlanTypeLabel(type))} · อัปเดต ${formatDate(p.updated_at)}</p></div>
      <div class="detail-status-stack"><span class="plan-type-pill">${escapeHtml(lessonPlanTypeLabel(type))}</span><span class="pill ${lessonStatusClass(p.status)}">${lessonStatusLabel(p.status)}</span></div>
    </div>
    ${p.revision_note ? `<div class="revision-banner"><strong>หมายเหตุให้แก้ไข</strong><span>${escapeHtml(p.revision_note)}</span></div>` : ""}
    <div class="detail-grid">
      ${planField("ปีการศึกษา", p.academic_year)}${planField("ภาคเรียน", String(p.semester))}
      ${planField("รหัสวิชา", p.subject_code)}${planField("ชื่อวิชา", p.subject_name)}
      ${planField("ชั้น/ระดับ", p.class_level)}
      ${semesterPlan ? "" : `${planField("สัปดาห์ที่", p.week_number ? String(p.week_number) : "—")}${planField("วันที่สอน", p.teach_date || "—")}${planField("หน่วยการเรียนรู้", p.learning_unit)}${planField("เรื่อง", p.topic)}`}
    </div>
    ${semesterPlan ? "" : `<div class="long-detail"><h4>จุดประสงค์การเรียนรู้</h4><p>${escapeHtml(p.learning_objectives || "—")}</p></div>
    ${p.content_summary ? `<div class="long-detail"><h4>สาระ/เนื้อหาสำคัญ</h4><p>${escapeHtml(p.content_summary)}</p></div>` : ""}
    ${p.activities ? `<div class="long-detail"><h4>กิจกรรมการเรียนรู้</h4><p>${escapeHtml(p.activities)}</p></div>` : ""}
    ${p.assessment ? `<div class="long-detail"><h4>การวัดและประเมินผล</h4><p>${escapeHtml(p.assessment)}</p></div>` : ""}`}
    <div class="detail-actions">
      <button class="btn btn-secondary" id="preview-a4-plan">▤ ดูเอกสาร A4</button>
      ${editable ? `<button class="btn btn-secondary" id="edit-lesson-plan">แก้ไขแผน</button><button class="btn btn-primary" id="submit-lesson-plan">${p.status === "revision_requested" ? "ส่งแผนอีกครั้ง" : "ส่งให้หัวหน้าตรวจ"}</button><button class="btn btn-danger" id="delete-draft-plan">ลบแผน</button>` : ""}${isSuperAdminUser()&&!editable?`<button class="btn btn-danger" id="delete-draft-plan">ลบแผน</button>`:""}
      ${canHeadReview ? `<button class="btn btn-primary" data-review-role="head">ตรวจสอบแผน</button>` : ""}
      ${canDirectorReview ? `<button class="btn btn-primary" data-review-role="director">อนุมัติ / ลงนาม</button>` : ""}
    </div>
    ${approvedDocumentHtml(d)}
    <div class="detail-columns">
      <div><div class="section-label">เอกสารแนบ</div>${lessonFilesHtml(d.files, editable)}</div>
      <div><div class="section-label">Timeline การอนุมัติ</div>${timelineHtml(d)}</div>
    </div>
  </section>`;
}

function lessonFilesHtml(files, editable) {
  if (!files.length) return `<div class="empty"><strong>ไม่มีเอกสารแนบ</strong><span>แนบได้ทั้ง PDF หรือ Google Drive</span></div>`;
  return `<div class="file-list">${files.map(f => {
    const drive = f.attachment_type === "google_drive";
    const meta = drive ? "Google Drive Link" : (f.file_size ? `${(f.file_size/1024/1024).toFixed(2)} MB` : "PDF");
    return `<div class="file-row ${drive ? "drive-attachment" : ""}"><div class="file-icon">${drive ? "G" : "PDF"}</div><div class="file-info"><strong>${escapeHtml(f.file_name)}</strong><span>${escapeHtml(meta)}</span></div><button class="btn btn-ghost file-open" data-file-id="${f.id}">${drive ? "เปิด Drive" : "เปิด"}</button>${editable ? `<button class="btn btn-danger file-delete" data-file-id="${f.id}">ลบ</button>` : ""}</div>`;
  }).join("")}</div>`;
}

function lessonWorkspaceHtml(module) {
  const role = state.profile.role;
  if (state.selectedLessonPlanId && state.lessonDetail?.plan) return lessonDetailHtml();
  if (!state.lessonPlanMode) return lessonPlanTypeChooser(module);

  const plans = filteredLessonPlans();
  const academicHead = isAcademicHead();
  const teachingUser = canActAsLessonTeacher();

  const roleCopy = academicHead
    ? `ส่ง ${lessonPlanTypeLabel(state.lessonPlanMode)} ของคุณในฐานะครู และตรวจงานของครูคนอื่นในฐานะหัวหน้าวิชาการ`
    : teachingUser
      ? `สร้าง ${lessonPlanTypeLabel(state.lessonPlanMode)} แนบ PDF หรือ Google Drive และติดตามเฉพาะแผนของคุณ`
      : `ดู ${lessonPlanTypeLabel(state.lessonPlanMode)} ที่อยู่ในขอบเขตสิทธิ์และดำเนินการอนุมัติ`;

  const reviewerTools = canTrackLessonPlansByTeacher() ? lessonTeacherViewTabs() : "";

  const hero = `<section class="lesson-hero"><div><button class="type-back-link" id="change-plan-mode">← เปลี่ยนประเภทแผน</button><span class="eyebrow dark">Academic Workflow</span><h2>${escapeHtml(lessonPlanTypeLabel(state.lessonPlanMode))}</h2><p>${escapeHtml(roleCopy)}</p></div><div class="lesson-hero-actions">${teachingUser ? `<button class="btn btn-primary" id="new-lesson-plan">＋ สร้าง${lessonPlanTypeLabel(state.lessonPlanMode)}ใหม่</button>` : ""}${canReviewLessonPlans() ? `<button class="btn btn-secondary" id="manage-signatures">✍ ลายเซ็นของฉัน</button>` : ""}</div></section>`;

  if (canTrackLessonPlansByTeacher() && state.lessonTeacherView === "teachers") {
    return `${hero}${reviewerTools}${lessonTeacherDirectoryHtml()}`;
  }

  const pendingCount = academicHead
    ? plans.filter(p => p.status === "pending_head" && p.teacher_id !== state.user.id).length
    : ["director","super_admin"].includes(role)
      ? plans.filter(p => p.status === "pending_director").length
      : plans.filter(p => ["pending_head","pending_director"].includes(p.status)).length;

  return `${hero}${reviewerTools}
  <div class="lesson-stat-grid">
    <article class="metric-card"><div class="metric-label">ทั้งหมดที่มองเห็น</div><div class="metric-value">${plans.length}</div></article>
    <article class="metric-card"><div class="metric-label">${academicHead ? "รอฉันตรวจ" : teachingUser ? "อยู่ระหว่างตรวจ" : "รอดำเนินการ"}</div><div class="metric-value">${pendingCount}</div></article>
    <article class="metric-card"><div class="metric-label">อนุมัติแล้ว</div><div class="metric-value">${plans.filter(p => p.status === "approved").length}</div></article>
    <article class="metric-card"><div class="metric-label">ส่งกลับแก้ไข</div><div class="metric-value">${plans.filter(p => p.status === "revision_requested").length}</div></article>
  </div>
  <section class="panel" style="margin-top:18px"><div class="panel-head"><div class="panel-title-wrap"><h3>${state.lessonTeacherView === "mine" ? "แผนของฉัน" : `รายการ${escapeHtml(lessonPlanTypeLabel(state.lessonPlanMode))}`}</h3><p>${academicHead ? "สิทธิ์หัวหน้าวิชาการแยกจากสิทธิ์ครูผู้สอน" : "รายการถูกกรองตามสิทธิ์ที่ฐานข้อมูล"}</p></div><button class="btn btn-ghost" id="refresh-lessons">↻ รีเฟรช</button></div>${lessonPlanListHtml()}</section>`;
}


async function loadPersonnelWorkspace() {
  const reviewer = isPersonnelReviewer();
  const [recordsRes, rosterRes, publicRes] = await Promise.all([
    supabase.from("personnel_records").select("*").order("updated_at", { ascending: false }),
    reviewer
      ? supabase.from("profiles").select("id,email,full_name,employee_code,phone,role,department_id,requested_department_id,subject_group_id,account_status").eq("account_status","active").is("deleted_at", null).order("full_name")
      : Promise.resolve({ data: [state.profile], error: null }),
    supabase.from("personnel_public_directory").select("*").order("full_name"),
  ]);

  state.personnelRecords = recordsRes.error ? [] : (recordsRes.data || []);
  state.personnelRoster = rosterRes.error ? [state.profile] : (rosterRes.data || []);
  state.publicPersonnelDirectory = publicRes.error ? [] : (publicRes.data || []);
  state.personnelOwnRecord = state.personnelRecords.find(r => r.user_id === state.user.id) || state.personnelOwnRecord || null;

  const photoUrls = {};
  await Promise.all(state.personnelRecords.filter(r => r.photo_path).map(async r => {
    const { data, error } = await supabase.storage.from(r.photo_bucket || "personnel-photos").createSignedUrl(r.photo_path, 600);
    if (!error && data?.signedUrl) photoUrls[r.user_id] = data.signedUrl;
  }));
  state.personnelPhotoUrls = photoUrls;

  const publicPhotoUrls = {};
  await Promise.all(state.publicPersonnelDirectory.filter(r => r.photo_path).map(async r => {
    const { data, error } = await supabase.storage.from(r.photo_bucket || "personnel-photos").createSignedUrl(r.photo_path, 600);
    if (!error && data?.signedUrl) publicPhotoUrls[r.user_id] = data.signedUrl;
  }));
  state.publicPersonnelPhotoUrls = publicPhotoUrls;

  if (!state.personnelView) state.personnelView = reviewer ? "admin" : "own";
  if (!reviewer && state.personnelView === "admin") state.personnelView = "own";
  if (state.selectedPersonnelUserId && !state.personnelRoster.some(p => p.id === state.selectedPersonnelUserId)) state.selectedPersonnelUserId = null;
  if (state.selectedPersonnelPublicUserId && !state.publicPersonnelDirectory.some(p => p.user_id === state.selectedPersonnelPublicUserId)) state.selectedPersonnelPublicUserId = null;
}

function personnelRecordFor(userId) {
  return state.personnelRecords.find(r => r.user_id === userId) || null;
}

function personnelProfileFor(userId) {
  return state.personnelRoster.find(p => p.id === userId) || (userId === state.user.id ? state.profile : null);
}

function personnelDirectoryHtml() {
  const roster = state.personnelRoster;
  const completed = roster.filter(p => Boolean(personnelRecordFor(p.id)?.profile_completed_at)).length;
  const missing = roster.length - completed;
  return `<section class="personnel-hero">
      <div><span class="eyebrow dark">Personnel Administration</span><h2>ข้อมูลข้าราชการและบุคลากรทางการศึกษา</h2><p>แฟ้มข้อมูลบุคลากร อายุราชการ และระบบติดตามความก้าวหน้าวิทยฐานะ</p></div>
      <div class="lesson-hero-actions"><button class="btn btn-secondary" id="personnel-my-record">แฟ้มของฉัน</button></div>
    </section>
    <div class="lesson-stat-grid">
      <article class="metric-card"><div class="metric-label">บุคลากร Active</div><div class="metric-value">${roster.length}</div></article>
      <article class="metric-card"><div class="metric-label">บันทึกข้อมูลแล้ว</div><div class="metric-value">${completed}</div></article>
      <article class="metric-card"><div class="metric-label">ยังไม่บันทึก</div><div class="metric-value">${missing}</div></article>
      <article class="metric-card"><div class="metric-label">โรงเรียนพื้นที่พิเศษ</div><div class="metric-value">${state.systemSettings?.special_area_school !== false ? "✓" : "—"}</div></article>
    </div>
    <section class="panel" style="margin-top:18px">
      <div class="panel-head"><div class="panel-title-wrap"><h3>รายชื่อบุคลากร</h3><p>กดดูข้อมูลเพื่อเปิดแฟ้มรายบุคคล</p></div><button class="btn btn-ghost" id="refresh-personnel">↻ รีเฟรช</button></div>
      <div class="personnel-card-grid">
        ${roster.map(p => {
          const r = personnelRecordFor(p.id);
          const photo = state.personnelPhotoUrls[p.id];
          const service = r?.first_appointment_date ? durationText(calendarDuration(r.first_appointment_date)) : "—";
          return `<button class="personnel-card" data-personnel-user="${p.id}">
            <div class="personnel-card-photo">${photo ? `<img src="${photo}" alt="">` : escapeHtml(initials(p.full_name || p.email))}</div>
            <div class="personnel-card-main">
              <strong>${escapeHtml(personnelDisplayName(r,p))}</strong>
              <span>${escapeHtml(r ? (PERSON_CATEGORY_LABEL[r.person_category] || r.person_category) : "ยังไม่บันทึกแฟ้มบุคลากร")}</span>
              <small>${escapeHtml(r?.position_title || ROLE_LABEL[p.role] || p.role)}</small>
            </div>
            <div class="personnel-card-meta">
              <span class="pill ${r?.profile_completed_at ? "active" : "pending"}">${r?.profile_completed_at ? "ข้อมูลครบ" : "รอบันทึก"}</span>
              <small>อายุราชการ ${escapeHtml(service)}</small>
            </div>
            <span class="teacher-card-arrow">→</span>
          </button>`;
        }).join("")}
      </div>
    </section>`;
}

function personnelTimelineHtml(record) {
  const stages = personnelProgression(record);
  if (!stages.length) {
    return `<div class="empty"><strong>ไม่มี Timeline วิทยฐานะ</strong><span>Timeline จะแสดงสำหรับข้าราชการครูที่ระบุตำแหน่ง/วันที่มีผลครบถ้วน</span></div>`;
  }
  return `<div class="career-timeline">${stages.map((stage,index) => {
    const status = milestoneStatus(stage);
    return `<div class="career-stage ${status.due ? "due" : ""}">
      <div class="career-stage-dot">${index + 1}</div>
      <div class="career-stage-body">
        <div class="career-stage-head"><strong>${escapeHtml(ACADEMIC_RANK_LABEL[stage.fromRank])} → ${escapeHtml(ACADEMIC_RANK_LABEL[stage.toRank])}</strong><span>${thaiDateOnly(stage.target.toISOString().slice(0,10))}</span></div>
        <div class="career-progress"><i style="width:${status.progress.toFixed(1)}%"></i></div>
        <small>${escapeHtml(status.text)} · เกณฑ์ติดตาม ${stage.years} ปี</small>
      </div>
    </div>`;
  }).join("")}</div>`;
}

function personnelDetailHtml(userId) {
  const p = personnelProfileFor(userId);
  const r = personnelRecordFor(userId);
  const own = userId === state.user.id;
  if (!p) return `<div class="empty"><strong>ไม่พบข้อมูลบุคลากร</strong></div>`;

  if (!r) {
    return `<section class="personnel-empty-profile">
      ${isPersonnelReviewer() && !own ? `<button class="type-back-link" id="personnel-back">← กลับรายชื่อบุคลากร</button>` : ""}
      <div class="personnel-empty-icon">ID</div>
      <h2>${own ? "เริ่มสร้างแฟ้มข้อมูลบุคลากรของคุณ" : escapeHtml(p.full_name || p.email)}</h2>
      <p>${own ? "กรอกข้อมูลส่วนตัว ข้อมูลการบรรจุ ตำแหน่ง วุฒิการศึกษา และรูปถ่าย เพื่อเริ่มระบบคำนวณอายุราชการและ Timeline" : "บุคลากรรายนี้ยังไม่ได้บันทึกข้อมูลส่วนตัว"}</p>
      ${own ? `<button class="btn btn-primary" id="edit-personnel-record">เริ่มบันทึกข้อมูล</button>` : `<span class="pill pending">รอบันทึกข้อมูล</span>`}
    </section>`;
  }

  const photo = state.personnelPhotoUrls[userId];
  const service = r.first_appointment_date ? durationText(calendarDuration(r.first_appointment_date)) : "—";
  const age = r.birth_date ? durationText(calendarDuration(r.birth_date)) : "—";
  const nextStage = personnelProgression(r)[0];
  const nextStatus = nextStage ? milestoneStatus(nextStage) : null;

  return `<section class="personnel-detail">
    <div class="personnel-detail-top">
      <div>${isPersonnelReviewer() && !own ? `<button class="type-back-link" id="personnel-back">← กลับรายชื่อบุคลากร</button>` : ""}<span class="eyebrow dark">Personnel File</span></div>
      <div class="personnel-detail-actions">${own ? `<button class="btn btn-secondary" id="edit-personnel-record">แก้ไขข้อมูล</button>` : ""}<button class="btn btn-primary" id="personnel-a4">▤ พิมพ์ / PDF</button></div>
    </div>
    <section class="personnel-profile-hero">
      <div class="personnel-large-photo">${photo ? `<img src="${photo}" alt="รูปบุคลากร">` : `<span>${escapeHtml(initials(personnelDisplayName(r,p)))}</span>`}</div>
      <div class="personnel-identity">
        <span class="personnel-category">${escapeHtml(PERSON_CATEGORY_LABEL[r.person_category] || r.person_category)}</span>
        <h2>${escapeHtml(personnelDisplayName(r,p))}</h2>
        <p>${escapeHtml(r.position_title || "ยังไม่ระบุตำแหน่ง")} ${r.academic_rank && r.academic_rank !== "not_applicable" ? `· ${escapeHtml(ACADEMIC_RANK_LABEL[r.academic_rank] || r.academic_rank)}` : ""}</p>
        <div class="personnel-identity-tags"><span>${escapeHtml(EMPLOYMENT_TYPE_LABEL[r.employment_type] || r.employment_type)}</span>${r.position_number ? `<span>เลขที่ตำแหน่ง ${escapeHtml(r.position_number)}</span>` : ""}</div>
      </div>
      <div class="personnel-service-card"><small>อายุราชการ/อายุงาน</small><strong>${escapeHtml(service)}</strong><span>นับจาก ${thaiDateOnly(r.first_appointment_date)}</span></div>
    </section>

    <div class="personnel-summary-grid">
      <article class="metric-card"><div class="metric-label">อายุปัจจุบัน</div><div class="metric-value compact">${escapeHtml(age)}</div><div class="metric-sub">${thaiDateOnly(r.birth_date)}</div></article>
      <article class="metric-card"><div class="metric-label">วิทยฐานะปัจจุบัน</div><div class="metric-value compact">${escapeHtml(ACADEMIC_RANK_LABEL[r.academic_rank] || "—")}</div><div class="metric-sub">มีผล ${thaiDateOnly(r.academic_rank_effective_date)}</div></article>
      <article class="metric-card"><div class="metric-label">เป้าหมายถัดไป</div><div class="metric-value compact">${escapeHtml(nextStage ? ACADEMIC_RANK_LABEL[nextStage.toRank] : "—")}</div><div class="metric-sub">${nextStatus ? escapeHtml(nextStatus.text) : "ไม่มีรายการคำนวณ"}</div></article>
      <article class="metric-card"><div class="metric-label">พื้นที่พิเศษ</div><div class="metric-value compact">${state.systemSettings?.special_area_school !== false ? "ใช้เกณฑ์ 3 ปี" : "ใช้เกณฑ์ปกติ"}</div><div class="metric-sub">ตามค่าที่โรงเรียนตั้งไว้</div></article>
    </div>

    <div class="personnel-info-grid">
      <section class="panel personnel-info-panel">
        <div class="panel-head"><div class="panel-title-wrap"><h3>ข้อมูลส่วนตัว</h3></div></div>
        <div class="personnel-kv">
          <div><span>เลขประจำตัวประชาชน</span><strong>${escapeHtml(formatCitizenId(r.citizen_id))}</strong></div>
          <div><span>วันเดือนปีเกิด</span><strong>${thaiDateOnly(r.birth_date)}</strong></div>
          <div><span>โทรศัพท์</span><strong>${escapeHtml(r.phone || "—")}</strong></div>
          <div><span>อีเมล</span><strong>${escapeHtml(r.email || p.email || "—")}</strong></div>
          <div class="wide"><span>ที่อยู่</span><strong>${escapeHtml(r.address || "—")}</strong></div>
        </div>
      </section>
      <section class="panel personnel-info-panel">
        <div class="panel-head"><div class="panel-title-wrap"><h3>ข้อมูลการรับราชการ / การทำงาน</h3></div></div>
        <div class="personnel-kv">
          <div><span>วันที่บรรจุครั้งแรก</span><strong>${thaiDateOnly(r.first_appointment_date)}</strong></div>
          <div><span>วันที่เริ่มที่โรงเรียนนี้</span><strong>${thaiDateOnly(r.current_school_start_date)}</strong></div>
          <div><span>ตำแหน่ง</span><strong>${escapeHtml(r.position_title || "—")}</strong></div>
          <div><span>เลขที่ตำแหน่ง</span><strong>${escapeHtml(r.position_number || "—")}</strong></div>
          <div><span>วิทยฐานะ</span><strong>${escapeHtml(ACADEMIC_RANK_LABEL[r.academic_rank] || "—")}</strong></div>
          <div><span>วันที่มีผล</span><strong>${thaiDateOnly(r.academic_rank_effective_date)}</strong></div>
        </div>
      </section>
      <section class="panel personnel-info-panel">
        <div class="panel-head"><div class="panel-title-wrap"><h3>วุฒิการศึกษาและใบอนุญาต</h3></div></div>
        <div class="personnel-kv">
          <div><span>วุฒิสูงสุด</span><strong>${escapeHtml(r.highest_degree || "—")}</strong></div>
          <div><span>สาขาวิชา</span><strong>${escapeHtml(r.major || "—")}</strong></div>
          <div class="wide"><span>สถาบัน</span><strong>${escapeHtml(r.institution || "—")}</strong></div>
          <div><span>ปีที่สำเร็จ</span><strong>${escapeHtml(r.graduation_year || "—")}</strong></div>
          <div><span>เลขใบอนุญาตประกอบวิชาชีพ</span><strong>${escapeHtml(r.teacher_license_no || "—")}</strong></div>
          <div><span>วันหมดอายุใบอนุญาต</span><strong>${thaiDateOnly(r.teacher_license_expiry)}</strong></div>
        </div>
      </section>
    </div>

    <section class="panel career-panel">
      <div class="panel-head"><div class="panel-title-wrap"><h3>Timeline ความก้าวหน้าวิทยฐานะ</h3><p>คำนวณจากวันที่มีผลของวิทยฐานะปัจจุบันและค่าที่โรงเรียนตั้งไว้</p></div></div>
      ${personnelTimelineHtml(r)}
      <div class="career-disclaimer">ข้อมูลนี้เป็นเครื่องมือช่วยติดตามเวลา ไม่ใช่การรับรองสิทธิ์ยื่นวิทยฐานะ กรุณาตรวจสอบคำสั่งและหลักเกณฑ์ ก.ค.ศ. ที่ใช้บังคับจริงทุกครั้ง</div>
    </section>
  </section>`;
}


function personnelPublicTabsHtml(){
  const reviewer=isPersonnelReviewer();
  return `<div class="lesson-view-tabs personnel-view-tabs">
    <button class="lesson-view-tab ${state.personnelView==="own"?"active":""}" data-personnel-view="own">ข้อมูลของฉัน</button>
    <button class="lesson-view-tab ${state.personnelView==="public"?"active":""}" data-personnel-view="public">ข้อมูลบุคลากรอื่น</button>
    ${reviewer?`<button class="lesson-view-tab ${state.personnelView==="admin"?"active":""}" data-personnel-view="admin">แฟ้มบุคลากรสำหรับงานบุคคล</button>`:""}
  </div>`;
}
function personnelPublicRow(userId){return state.publicPersonnelDirectory.find(x=>x.user_id===userId)||null;}
function personnelPublicDirectoryHtml(){
  const rows=state.publicPersonnelDirectory.filter(x=>x.user_id!==state.user.id);
  return `<section class="personnel-hero"><div><span class="eyebrow dark">Staff Directory</span><h2>ข้อมูลบุคลากรที่เปิดเผยภายในโรงเรียน</h2><p>แสดงเฉพาะรูปภาพ ชื่อ ตำแหน่ง อายุ วิทยฐานะ วันเดือนปีเกิด และเบอร์โทรศัพท์ ข้อมูลสำคัญอื่นถูกซ่อนไว้</p></div></section>
    <section class="panel"><div class="panel-head"><div class="panel-title-wrap"><h3>เลือกบุคลากร</h3><p>เลขบัตรประชาชน ที่อยู่ วุฒิ ใบอนุญาต และข้อมูลแฟ้มส่วนบุคคลจะไม่ถูกเปิดเผยในหน้านี้</p></div></div>
    <div class="personnel-public-picker"><select class="select" id="personnel-public-select"><option value="">เลือกบุคลากร</option>${rows.map(r=>`<option value="${r.user_id}">${escapeHtml(r.full_name)} · ${escapeHtml(r.position_title||ROLE_LABEL[r.role]||r.role)}</option>`).join("")}</select><button class="btn btn-primary" id="personnel-public-open">ดูข้อมูล</button></div>
    <div class="personnel-public-grid">${rows.map(r=>{const photo=state.publicPersonnelPhotoUrls[r.user_id];return `<button class="personnel-public-card" data-personnel-public-user="${r.user_id}"><div class="personnel-card-photo">${photo?`<img src="${photo}" alt="">`:escapeHtml(initials(r.full_name))}</div><div><strong>${escapeHtml(r.full_name)}</strong><span>${escapeHtml(r.position_title||ROLE_LABEL[r.role]||r.role)}</span><small>${escapeHtml(ACADEMIC_RANK_LABEL[r.academic_rank]||r.academic_rank||"ไม่ระบุวิทยฐานะ")}</small></div><span class="teacher-card-arrow">→</span></button>`}).join("")}</div></section>`;
}
function personnelPublicDetailHtml(userId){
  const r=personnelPublicRow(userId); if(!r)return `<div class="empty"><strong>ไม่พบข้อมูลบุคลากร</strong></div>`;
  const photo=state.publicPersonnelPhotoUrls[userId];
  const age=r.birth_date?durationText(calendarDuration(r.birth_date)):"—";
  const dept=state.departments.find(d=>d.id===r.department_id);
  return `<section class="personnel-detail"><div class="personnel-detail-top"><div><button class="type-back-link" id="personnel-public-back">← กลับข้อมูลบุคลากรอื่น</button><span class="eyebrow dark">Public Staff Profile</span></div></div>
  <section class="personnel-profile-hero public-profile-hero"><div class="personnel-large-photo">${photo?`<img src="${photo}" alt="รูปบุคลากร">`:`<span>${escapeHtml(initials(r.full_name))}</span>`}</div><div class="personnel-identity"><span class="personnel-category">${escapeHtml(dept?.name_th||"บุคลากรโรงเรียน")}</span><h2>${escapeHtml(r.full_name)}</h2><p>${escapeHtml(r.position_title||ROLE_LABEL[r.role]||r.role)}${r.academic_rank?` · ${escapeHtml(ACADEMIC_RANK_LABEL[r.academic_rank]||r.academic_rank)}`:""}</p></div><div class="personnel-service-card"><small>อายุปัจจุบัน</small><strong>${escapeHtml(age)}</strong><span>${thaiDateOnly(r.birth_date)}</span></div></section>
  <section class="panel personnel-info-panel"><div class="panel-head"><div class="panel-title-wrap"><h3>ข้อมูลที่เปิดเผยภายในโรงเรียน</h3><p>หน้านี้ตั้งใจจำกัดข้อมูล ไม่แสดงเลขประจำตัวประชาชนและข้อมูลส่วนตัวเชิงลึก</p></div></div><div class="personnel-kv public-personnel-kv"><div><span>ชื่อ-นามสกุล</span><strong>${escapeHtml(r.full_name)}</strong></div><div><span>ตำแหน่ง</span><strong>${escapeHtml(r.position_title||"—")}</strong></div><div><span>อายุ</span><strong>${escapeHtml(age)}</strong></div><div><span>วิทยฐานะปัจจุบัน</span><strong>${escapeHtml(ACADEMIC_RANK_LABEL[r.academic_rank]||r.academic_rank||"—")}</strong></div><div><span>วันเดือนปีเกิด</span><strong>${thaiDateOnly(r.birth_date)}</strong></div><div><span>เบอร์โทรศัพท์</span><strong>${escapeHtml(r.phone||"—")}</strong></div></div></section></section>`;
}

function personnelWorkspaceHtml(module) {
  const tabs=personnelPublicTabsHtml();
  if(state.personnelView==="public") return `${tabs}${state.selectedPersonnelPublicUserId?personnelPublicDetailHtml(state.selectedPersonnelPublicUserId):personnelPublicDirectoryHtml()}`;
  if(state.personnelView==="admin"&&isPersonnelReviewer()) return `${tabs}${state.selectedPersonnelUserId?personnelDetailHtml(state.selectedPersonnelUserId):personnelDirectoryHtml()}`;
  return `${tabs}${personnelDetailHtml(state.user.id)}`;
}

function personnelRecordModal() {
  const r = state.personnelOwnRecord || {};
  const profile = state.profile;
  const fullNameParts = String(profile.full_name || "").trim().split(/\s+/).filter(Boolean);
  const guessedFirst = r.first_name || fullNameParts[0] || "";
  const guessedLast = r.last_name || fullNameParts.slice(1).join(" ");
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `<div class="modal modal-wide personnel-form-modal">
    <div class="modal-head"><div><h3>${r.id ? "แก้ไข" : "บันทึก"}ข้อมูลบุคลากร</h3><p>ข้อมูลนี้เป็นแฟ้มส่วนบุคคลและถูกจำกัดสิทธิ์ด้วย RLS</p></div><button class="modal-close">×</button></div>
    <form id="personnel-form" class="form-grid">
      <div class="personnel-form-section"><strong>1. ประเภทบุคลากร</strong></div>
      <div class="form-row">
        <div class="field"><label>ประเภทบุคลากร</label><select class="select" name="person_category" required>
          <option value="">เลือกประเภท</option>
          ${Object.entries(PERSON_CATEGORY_LABEL).map(([v,l]) => `<option value="${v}" ${r.person_category===v?"selected":""}>${escapeHtml(l)}</option>`).join("")}
        </select></div>
        <div class="field"><label>ประเภทการจ้าง/สถานะ</label><select class="select" name="employment_type" required>
          <option value="">เลือกประเภท</option>
          ${Object.entries(EMPLOYMENT_TYPE_LABEL).map(([v,l]) => `<option value="${v}" ${r.employment_type===v?"selected":""}>${escapeHtml(l)}</option>`).join("")}
        </select></div>
      </div>

      <div class="personnel-form-section"><strong>2. ข้อมูลส่วนตัว</strong></div>
      <div class="form-row three">
        <div class="field"><label>คำนำหน้า</label><input class="input" name="prefix" value="${escapeHtml(r.prefix || "")}" placeholder="นาย / นาง / นางสาว"></div>
        <div class="field"><label>ชื่อ</label><input class="input" name="first_name" required value="${escapeHtml(guessedFirst)}"></div>
        <div class="field"><label>นามสกุล</label><input class="input" name="last_name" required value="${escapeHtml(guessedLast)}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>เลขประจำตัวประชาชน 13 หลัก</label><input class="input" name="citizen_id" inputmode="numeric" pattern="[0-9]{13}" maxlength="13" required value="${escapeHtml(r.citizen_id || "")}"></div>
        <div class="field"><label>วันเดือนปีเกิด</label><input class="input" name="birth_date" type="date" required value="${escapeHtml(r.birth_date || "")}"></div>
      </div>
      <div class="form-row"><div class="field"><label>โทรศัพท์</label><input class="input" name="phone" value="${escapeHtml(r.phone || profile.phone || "")}"></div><div class="field"><label>อีเมล</label><input class="input" name="email" type="email" value="${escapeHtml(r.email || profile.email || "")}"></div></div>
      <div class="field"><label>ที่อยู่ปัจจุบัน</label><textarea class="input textarea" name="address">${escapeHtml(r.address || "")}</textarea></div>
      <div class="field"><label>รูปถ่ายบุคลากร</label><label class="upload-zone personnel-photo-upload"><input id="personnel-photo-file" type="file" accept="image/png,image/jpeg,image/webp"><strong>＋ เลือกรูปภาพ</strong><span>PNG / JPG / WebP ไม่เกิน 5 MB — แนะนำรูปหน้าตรง</span></label></div>

      <div class="personnel-form-section"><strong>3. ข้อมูลตำแหน่งและการบรรจุ</strong></div>
      <div class="form-row"><div class="field"><label>ตำแหน่งปัจจุบัน</label><input class="input" name="position_title" required value="${escapeHtml(r.position_title || "")}" placeholder="เช่น ครู / ผู้อำนวยการสถานศึกษา"></div><div class="field"><label>เลขที่ตำแหน่ง</label><input class="input" name="position_number" value="${escapeHtml(r.position_number || "")}"></div></div>
      <div class="form-row"><div class="field"><label>วันที่บรรจุ/เริ่มปฏิบัติงานครั้งแรก</label><input class="input" name="first_appointment_date" type="date" required value="${escapeHtml(r.first_appointment_date || "")}"></div><div class="field"><label>วันที่เริ่มปฏิบัติงานที่โรงเรียนนี้</label><input class="input" name="current_school_start_date" type="date" value="${escapeHtml(r.current_school_start_date || "")}"></div></div>
      <div class="form-row">
        <div class="field"><label>วิทยฐานะ / ระดับ</label><select class="select" name="academic_rank" required>
          <option value="">เลือกวิทยฐานะ</option>
          ${Object.entries(ACADEMIC_RANK_LABEL).map(([v,l]) => `<option value="${v}" ${r.academic_rank===v?"selected":""}>${escapeHtml(l)}</option>`).join("")}
        </select></div>
        <div class="field"><label>วันที่วิทยฐานะปัจจุบันมีผล</label><input class="input" name="academic_rank_effective_date" type="date" value="${escapeHtml(r.academic_rank_effective_date || "")}"><span class="helper">ครูผู้ช่วยสามารถใช้วันที่บรรจุเป็นวันเริ่มต้นได้</span></div>
      </div>

      <div class="personnel-form-section"><strong>4. วุฒิการศึกษา / ใบอนุญาต</strong></div>
      <div class="form-row"><div class="field"><label>วุฒิการศึกษาสูงสุด</label><input class="input" name="highest_degree" value="${escapeHtml(r.highest_degree || "")}" placeholder="เช่น ครุศาสตรบัณฑิต"></div><div class="field"><label>สาขาวิชา</label><input class="input" name="major" value="${escapeHtml(r.major || "")}"></div></div>
      <div class="form-row"><div class="field"><label>สถาบันการศึกษา</label><input class="input" name="institution" value="${escapeHtml(r.institution || "")}"></div><div class="field"><label>ปีที่สำเร็จการศึกษา</label><input class="input" name="graduation_year" value="${escapeHtml(r.graduation_year || "")}" placeholder="พ.ศ. 2565"></div></div>
      <div class="form-row"><div class="field"><label>เลขใบอนุญาตประกอบวิชาชีพ</label><input class="input" name="teacher_license_no" value="${escapeHtml(r.teacher_license_no || "")}"></div><div class="field"><label>วันหมดอายุใบอนุญาต</label><input class="input" name="teacher_license_expiry" type="date" value="${escapeHtml(r.teacher_license_expiry || "")}"></div></div>
      <div class="field"><label>หมายเหตุ</label><textarea class="input textarea" name="notes">${escapeHtml(r.notes || "")}</textarea></div>
    </form>
    <div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="save-personnel-record">บันทึกข้อมูล</button></div>
  </div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close").addEventListener("click", close);
  modal.querySelector(".modal-cancel").addEventListener("click", close);
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  modal.querySelector("#save-personnel-record").addEventListener("click", e => savePersonnelRecord(modal, e.currentTarget));
}

async function savePersonnelRecord(modal, button) {
  const form = modal.querySelector("#personnel-form");
  if (!form.reportValidity()) return;
  const fd = new FormData(form);
  const photoFile = modal.querySelector("#personnel-photo-file").files[0] || null;
  if (photoFile && !["image/png","image/jpeg","image/webp"].includes(photoFile.type)) return toast("รูปภาพไม่ถูกต้อง","รองรับเฉพาะ PNG, JPG และ WebP","error");
  if (photoFile && photoFile.size > 5 * 1024 * 1024) return toast("รูปภาพใหญ่เกินไป","กรุณาใช้ไฟล์ไม่เกิน 5 MB","error");

  const oldRecord = state.personnelOwnRecord;
  let uploadedPath = null;
  let uploadedBucket = oldRecord?.photo_bucket || "personnel-photos";
  buttonLoading(button,true,"กำลังบันทึก...");

  try {
    if (photoFile) {
      const ext = photoFile.type === "image/png" ? "png" : photoFile.type === "image/webp" ? "webp" : "jpg";
      uploadedPath = `${state.user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("personnel-photos").upload(uploadedPath, photoFile, { contentType: photoFile.type, upsert: false });
      if (uploadError) throw uploadError;
      uploadedBucket = "personnel-photos";
    }

    const payload = {
      user_id: state.user.id,
      person_category: String(fd.get("person_category")),
      employment_type: String(fd.get("employment_type")),
      prefix: String(fd.get("prefix") || "").trim() || null,
      first_name: String(fd.get("first_name") || "").trim(),
      last_name: String(fd.get("last_name") || "").trim(),
      citizen_id: String(fd.get("citizen_id") || "").replace(/\D/g,""),
      birth_date: fd.get("birth_date") || null,
      phone: String(fd.get("phone") || "").trim() || null,
      email: String(fd.get("email") || "").trim() || null,
      address: String(fd.get("address") || "").trim() || null,
      position_title: String(fd.get("position_title") || "").trim() || null,
      position_number: String(fd.get("position_number") || "").trim() || null,
      first_appointment_date: fd.get("first_appointment_date") || null,
      current_school_start_date: fd.get("current_school_start_date") || null,
      academic_rank: fd.get("academic_rank") || null,
      academic_rank_effective_date: fd.get("academic_rank_effective_date") || (fd.get("academic_rank") === "assistant_teacher" ? (fd.get("first_appointment_date") || null) : null),
      highest_degree: String(fd.get("highest_degree") || "").trim() || null,
      major: String(fd.get("major") || "").trim() || null,
      institution: String(fd.get("institution") || "").trim() || null,
      graduation_year: String(fd.get("graduation_year") || "").trim() || null,
      teacher_license_no: String(fd.get("teacher_license_no") || "").trim() || null,
      teacher_license_expiry: fd.get("teacher_license_expiry") || null,
      photo_bucket: uploadedPath ? uploadedBucket : (oldRecord?.photo_bucket || "personnel-photos"),
      photo_path: uploadedPath || oldRecord?.photo_path || null,
      notes: String(fd.get("notes") || "").trim() || null,
      profile_completed_at: oldRecord?.profile_completed_at || new Date().toISOString(),
    };

    const { data, error } = await supabase.from("personnel_records").upsert(payload, { onConflict: "user_id" }).select().single();
    if (error) throw error;

    if (uploadedPath && oldRecord?.photo_path && oldRecord.photo_path !== uploadedPath) {
      await supabase.storage.from(oldRecord.photo_bucket || "personnel-photos").remove([oldRecord.photo_path]);
    }

    await supabase.from("notifications")
      .update({ read_at: new Date().toISOString(), dismissed_at: new Date().toISOString() })
      .eq("recipient_id",state.user.id)
      .eq("type","personnel_profile_required")
      .is("dismissed_at",null);

    state.personnelOwnRecord = data;
    modal.remove();
    toast("บันทึกข้อมูลบุคลากรแล้ว","ระบบเริ่มคำนวณอายุราชการและ Timeline ให้แล้ว","success");
    await loadActiveUserData();
    await loadPersonnelWorkspace();
    state.selectedPersonnelUserId = state.user.id;
    renderDashboard();
  } catch (error) {
    if (uploadedPath) await supabase.storage.from("personnel-photos").remove([uploadedPath]);
    toast("บันทึกข้อมูลไม่สำเร็จ",error.message || "เกิดข้อผิดพลาด","error");
  } finally {
    buttonLoading(button,false);
  }
}

async function personnelPhotoDataUrl(record) {
  if (!record?.photo_path) return null;
  const { data, error } = await supabase.storage.from(record.photo_bucket || "personnel-photos").download(record.photo_path);
  if (error) return null;
  return blobToDataUrl(data);
}

function personnelA4Styles() {
  return `${a4DocumentStyles()}
    .personnel-a4-profile{display:grid;grid-template-columns:34mm 1fr;gap:7mm;margin-bottom:6mm;align-items:start;}
    .personnel-a4-photo{width:32mm;height:42mm;border:1px solid #555;object-fit:cover;background:#f8fafc;}
    .personnel-a4-name{font-size:20pt;font-weight:700;margin-bottom:1mm;}
    .personnel-a4-sub{font-size:15pt;}
    .personnel-a4-kv{display:grid;grid-template-columns:1fr 1fr;gap:1.5mm 7mm;}
    .personnel-a4-kv>div{display:grid;grid-template-columns:44mm 1fr;gap:2mm;font-size:15pt;}
    .personnel-a4-kv span{font-weight:700;}
    .personnel-a4-stage{margin:1.5mm 0;font-size:14pt;}
    .personnel-a4-note{font-size:12pt;color:#555;margin-top:5mm;border-top:1px solid #aaa;padding-top:2mm;}
  `;
}

function buildPersonnelA4Html(profile, record, assets = {}) {
  const service = record.first_appointment_date ? durationText(calendarDuration(record.first_appointment_date)) : "—";
  const stages = personnelProgression(record).slice(0,4);
  return `<article class="a4-document"><div class="a4-document-inner">
    <header class="a4-doc-head">
      ${assets.schoolLogo ? `<img class="a4-school-logo" src="${assets.schoolLogo}" alt="ตราโรงเรียน">` : ""}
      <div class="a4-school-name">${escapeHtml(schoolName())}</div>
      <div class="a4-school-meta">${escapeHtml(schoolAddress())}</div>
      <div class="a4-school-meta">${escapeHtml(educationOffice())}</div>
      <h1>แบบข้อมูลข้าราชการและบุคลากรทางการศึกษา</h1>
      <div class="sub">Personnel Information Record</div>
    </header>
    <div class="personnel-a4-profile">
      ${assets.photo ? `<img class="personnel-a4-photo" src="${assets.photo}" alt="">` : `<div class="personnel-a4-photo"></div>`}
      <div>
        <div class="personnel-a4-name">${escapeHtml(personnelDisplayName(record,profile))}</div>
        <div class="personnel-a4-sub">${escapeHtml(PERSON_CATEGORY_LABEL[record.person_category] || record.person_category)} · ${escapeHtml(EMPLOYMENT_TYPE_LABEL[record.employment_type] || record.employment_type)}</div>
        <div class="personnel-a4-sub">ตำแหน่ง ${escapeHtml(record.position_title || "—")} ${record.academic_rank && record.academic_rank !== "not_applicable" ? `· ${escapeHtml(ACADEMIC_RANK_LABEL[record.academic_rank])}` : ""}</div>
        <div class="personnel-a4-sub">อายุราชการ/อายุงาน ${escapeHtml(service)}</div>
      </div>
    </div>
    <section class="a4-section"><h2>ข้อมูลส่วนตัว</h2><div class="personnel-a4-kv">
      <div><span>เลขประจำตัวประชาชน</span><strong>${escapeHtml(formatCitizenId(record.citizen_id))}</strong></div>
      <div><span>วันเดือนปีเกิด</span><strong>${thaiDateOnly(record.birth_date)}</strong></div>
      <div><span>โทรศัพท์</span><strong>${escapeHtml(record.phone || "—")}</strong></div>
      <div><span>อีเมล</span><strong>${escapeHtml(record.email || profile.email || "—")}</strong></div>
    </div><p style="margin-top:2mm">ที่อยู่: ${escapeHtml(record.address || "—")}</p></section>
    <section class="a4-section"><h2>ข้อมูลตำแหน่งและการรับราชการ / การทำงาน</h2><div class="personnel-a4-kv">
      <div><span>วันที่บรรจุครั้งแรก</span><strong>${thaiDateOnly(record.first_appointment_date)}</strong></div>
      <div><span>เริ่มที่โรงเรียนนี้</span><strong>${thaiDateOnly(record.current_school_start_date)}</strong></div>
      <div><span>ตำแหน่ง</span><strong>${escapeHtml(record.position_title || "—")}</strong></div>
      <div><span>เลขที่ตำแหน่ง</span><strong>${escapeHtml(record.position_number || "—")}</strong></div>
      <div><span>วิทยฐานะ</span><strong>${escapeHtml(ACADEMIC_RANK_LABEL[record.academic_rank] || "—")}</strong></div>
      <div><span>วันที่มีผล</span><strong>${thaiDateOnly(record.academic_rank_effective_date)}</strong></div>
    </div></section>
    <section class="a4-section"><h2>วุฒิการศึกษาและใบอนุญาต</h2><div class="personnel-a4-kv">
      <div><span>วุฒิสูงสุด</span><strong>${escapeHtml(record.highest_degree || "—")}</strong></div>
      <div><span>สาขาวิชา</span><strong>${escapeHtml(record.major || "—")}</strong></div>
      <div><span>สถาบัน</span><strong>${escapeHtml(record.institution || "—")}</strong></div>
      <div><span>ปีที่สำเร็จ</span><strong>${escapeHtml(record.graduation_year || "—")}</strong></div>
      <div><span>ใบอนุญาตวิชาชีพ</span><strong>${escapeHtml(record.teacher_license_no || "—")}</strong></div>
      <div><span>หมดอายุ</span><strong>${thaiDateOnly(record.teacher_license_expiry)}</strong></div>
    </div></section>
    <section class="a4-section"><h2>Timeline ความก้าวหน้า (ประมาณการ)</h2>
      ${stages.length ? stages.map(stage => {
        const st = milestoneStatus(stage);
        return `<div class="personnel-a4-stage"><strong>${escapeHtml(ACADEMIC_RANK_LABEL[stage.fromRank])} → ${escapeHtml(ACADEMIC_RANK_LABEL[stage.toRank])}</strong> : ${thaiDateOnly(stage.target.toISOString().slice(0,10))} (${escapeHtml(st.text)})</div>`;
      }).join("") : `<p>ไม่มี Timeline ที่คำนวณได้</p>`}
      <div class="personnel-a4-note">หมายเหตุ: Timeline เป็นเครื่องมือช่วยติดตามจากค่าที่โรงเรียนตั้งไว้ ไม่ใช่การรับรองสิทธิ์ยื่นวิทยฐานะ ต้องตรวจสอบคำสั่งและหลักเกณฑ์ ก.ค.ศ. ที่ใช้บังคับจริง</div>
    </section>
    <footer class="a4-foot"><span>รหัสบุคลากร: ${escapeHtml(profile.employee_code || profile.id)}</span><span>สร้างจาก ${escapeHtml(appName())} · ${thaiDateTimeDocument(new Date().toISOString())}</span></footer>
  </div></article>`;
}

async function personnelA4Preview() {
  const userId = state.selectedPersonnelUserId || state.user.id;
  const record = personnelRecordFor(userId);
  const profile = personnelProfileFor(userId);
  if (!record || !profile) return toast("ยังไม่มีข้อมูลสำหรับพิมพ์","กรุณาบันทึกข้อมูลบุคลากรก่อน","error");
  const modal = document.createElement("div");
  modal.className = "modal-backdrop a4-preview-backdrop";
  modal.innerHTML = `<div class="a4-preview-shell"><div class="a4-preview-toolbar"><div><strong>แฟ้มข้อมูลบุคลากร A4</strong><span>ฟอนต์เอกสาร: TH Sarabun PSK</span></div><div class="a4-preview-actions"><button class="btn btn-ghost" id="personnel-a4-close">ปิด</button><button class="btn btn-primary" id="personnel-a4-print">พิมพ์ / บันทึก PDF</button></div></div><div class="a4-preview-loading">กำลังเตรียมเอกสาร...</div></div>`;
  document.body.appendChild(modal);
  modal.querySelector("#personnel-a4-close").addEventListener("click",()=>modal.remove());
  const [schoolLogo, photo] = await Promise.all([schoolLogoDataUrl(),personnelPhotoDataUrl(record)]);
  const assets = { schoolLogo, photo };
  modal.querySelector(".a4-preview-loading").outerHTML = `<div class="a4-preview-scroll"><style>${personnelA4Styles()}</style>${buildPersonnelA4Html(profile,record,assets)}</div>`;
  modal.querySelector("#personnel-a4-print").addEventListener("click",()=>printPersonnelA4(profile,record,assets));
}

function printPersonnelA4(profile,record,assets) {
  const w = window.open("","_blank");
  if (!w) return toast("เปิดหน้าพิมพ์ไม่ได้","กรุณาอนุญาต Pop-up สำหรับเว็บไซต์นี้","error");
  const html = `<!doctype html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ข้อมูลบุคลากร - ${escapeHtml(personnelDisplayName(record,profile))}</title><style>${personnelA4Styles()}</style></head><body class="a4-print-body">${buildPersonnelA4Html(profile,record,assets)}<script>window.addEventListener('load',()=>{const imgs=[...document.images];Promise.all([document.fonts?document.fonts.ready:Promise.resolve(),...imgs.map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r;}))]).finally(()=>setTimeout(()=>window.print(),250));});<\/script></body></html>`;
  try { w.opener=null; } catch {}
  w.document.open(); w.document.write(html); w.document.close();
}


const LEAVE_STATUS_LABEL = {
  draft: "ฉบับร่าง",
  pending_personnel: "รอหัวหน้าบุคคลตรวจ",
  pending_director: "รอผู้บริหารอนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
  cancelled: "ยกเลิก",
};

const LEAVE_ACTION_LABEL = {
  submit: "ส่งคำขอลา",
  approve_personnel: "หัวหน้าบุคคลตรวจผ่าน",
  reject_personnel: "หัวหน้าบุคคลไม่อนุมัติ",
  approve_director: "ผู้บริหารอนุมัติขั้นสุดท้าย",
  reject_director: "ผู้บริหารไม่อนุมัติ",
  cancel: "ยกเลิกคำขอ",
};

function isPersonnelHeadUser() {
  return state.profile?.role === "department_head"
    && state.profile?.department_id
    && state.profile.department_id === personnelDepartmentId();
}

function canFinalReviewLeave() {
  return ["director", "super_admin"].includes(state.profile?.role);
}

function canSeeLeaveOverview() {
  return isPersonnelHeadUser() || canFinalReviewLeave();
}

function leaveStatusClass(status) {
  if (status === "approved") return "active";
  if (status === "rejected") return "rejected";
  if (["pending_personnel","pending_director"].includes(status)) return "pending";
  if (status === "draft") return "neutral";
  return "suspended";
}

function leaveTypeByCode(code) {
  return state.leaveTypes.find(t => t.code === code) || null;
}

function leaveTypeName(code, otherText = "") {
  const type = leaveTypeByCode(code);
  if (code === "other" && otherText) return `${type?.name_th || "ลาอื่น ๆ"} (${otherText})`;
  return type?.name_th || code || "—";
}

function inclusiveLeaveDays(start, end) {
  const s = dateOnly(start);
  const e = dateOnly(end);
  if (!s || !e || e < s) return 0;
  return Math.floor((e - s) / 86400000) + 1;
}

function currentAcademicPeriod(dateValue = new Date()) {
  const d = dateValue instanceof Date ? dateValue : dateOnly(dateValue);
  const date = d || new Date();
  const month = date.getMonth() + 1;
  const semester = month >= 5 && month <= 10 ? 1 : 2;
  const academicYear = month >= 1 && month <= 4 ? date.getFullYear() + 542 : date.getFullYear() + 543;
  return { academicYear, semester };
}

function currentLeaveYear() {
  return new Date().getFullYear();
}

function leaveReportYear() {
  return Number(state.leaveReportAcademicYear || currentAcademicPeriod().academicYear);
}

function leaveReportSemesterValue() {
  return state.leaveReportSemester === "all" ? "all" : Number(state.leaveReportSemester);
}

function leavePeriodLabel() {
  const year = leaveReportYear();
  const sem = leaveReportSemesterValue();
  return sem === "all" ? `ปีการศึกษา ${year} ทั้งปี` : `ปีการศึกษา ${year} ภาคเรียนที่ ${sem}`;
}

function leavePeriodRequests({ approvedOnly = false, userId = null } = {}) {
  const year = leaveReportYear();
  const sem = leaveReportSemesterValue();
  return state.leaveRequests.filter(r => {
    if (Number(r.academic_year) !== year) return false;
    if (sem !== "all" && Number(r.semester) !== sem) return false;
    if (userId && r.requester_id !== userId) return false;
    if (approvedOnly && r.status !== "approved") return false;
    return true;
  });
}

function leaveRosterPosition(userId) {
  return state.leavePersonnelRecords.find(r => r.user_id === userId)?.position_title
    || state.leaveRequests.find(r => r.requester_id === userId)?.requester_position
    || ROLE_LABEL[state.leaveRoster.find(p => p.id === userId)?.role]
    || "—";
}

function leaveRosterName(userId) {
  const profile = state.leaveRoster.find(p => p.id === userId);
  return profile?.full_name || profile?.email || state.leaveRequests.find(r => r.requester_id === userId)?.requester_name || "บุคลากร";
}

function leaveTypeStatsForUser(userId, academicYear = leaveReportYear(), semester = leaveReportSemesterValue()) {
  const requests = state.leaveRequests.filter(r =>
    r.requester_id === userId
    && r.status === "approved"
    && Number(r.academic_year) === Number(academicYear)
    && (semester === "all" || Number(r.semester) === Number(semester))
  );
  return state.leaveTypes.map(type => {
    const rows = requests.filter(r => r.leave_type_code === type.code);
    return {
      code: type.code,
      name: type.name_th,
      times: rows.length,
      days: rows.reduce((sum, r) => sum + Number(r.leave_days || 0), 0),
    };
  });
}

function schoolLeaveSummaryRows() {
  const approved = leavePeriodRequests({ approvedOnly: true });
  return [...state.leaveRoster]
    .sort((a,b) => String(a.full_name || a.email || "").localeCompare(String(b.full_name || b.email || ""), "th"))
    .map((profile, index) => {
      const requests = approved.filter(r => r.requester_id === profile.id);
      const typeStats = leaveTypeStatsForUser(profile.id);
      return {
        index: index + 1,
        userId: profile.id,
        name: profile.full_name || profile.email || "บุคลากร",
        position: leaveRosterPosition(profile.id),
        times: requests.length,
        days: requests.reduce((sum,r)=>sum+Number(r.leave_days||0),0),
        typeStats,
      };
    });
}

function leavePeriodOverviewStats() {
  const rows = schoolLeaveSummaryRows();
  const approved = leavePeriodRequests({ approvedOnly: true });
  const peopleWithLeave = rows.filter(r => r.times > 0).length;
  const totalPeople = rows.length;
  const totalDays = approved.reduce((sum,r)=>sum+Number(r.leave_days||0),0);
  const totalTimes = approved.length;
  const byType = state.leaveTypes.map(type => {
    const items = approved.filter(r => r.leave_type_code === type.code);
    return {
      code:type.code,
      name:type.name_th,
      times:items.length,
      days:items.reduce((sum,r)=>sum+Number(r.leave_days||0),0),
    };
  }).filter(x => x.times > 0 || x.days > 0);
  return {
    totalPeople,
    peopleWithLeave,
    peopleWithoutLeave: Math.max(0,totalPeople-peopleWithLeave),
    peoplePct: totalPeople ? (peopleWithLeave/totalPeople)*100 : 0,
    totalTimes,
    totalDays,
    byType,
  };
}

function leaveQuotaLimitForSemester(semester) {
  const term = Number(semester) === 2 ? 2 : 1;
  if (term === 2) {
    return {
      maxTimes: Number(state.systemSettings?.leave_quota_term2_times ?? state.systemSettings?.leave_quota_times ?? 6),
      maxDays: Number(state.systemSettings?.leave_quota_term2_days ?? state.systemSettings?.leave_quota_days ?? 22),
    };
  }
  return {
    maxTimes: Number(state.systemSettings?.leave_quota_term1_times ?? state.systemSettings?.leave_quota_times ?? 6),
    maxDays: Number(state.systemSettings?.leave_quota_term1_days ?? state.systemSettings?.leave_quota_days ?? 22),
  };
}

function leaveQuotaStats(
  userId = state.user.id,
  academicYear = currentAcademicPeriod().academicYear,
  semester = currentAcademicPeriod().semester
) {
  const term = Number(semester) === 2 ? 2 : 1;
  const year = Number(academicYear);
  const countedCodes = new Set(state.leaveTypes.filter(t => t.counts_against_quota).map(t => t.code));
  const approved = state.leaveRequests.filter(r =>
    r.requester_id === userId
    && Number(r.academic_year) === year
    && Number(r.semester) === term
    && r.status === "approved"
    && countedCodes.has(r.leave_type_code)
  );
  const pending = state.leaveRequests.filter(r =>
    r.requester_id === userId
    && Number(r.academic_year) === year
    && Number(r.semester) === term
    && ["pending_personnel","pending_director"].includes(r.status)
    && countedCodes.has(r.leave_type_code)
  );
  const { maxTimes, maxDays } = leaveQuotaLimitForSemester(term);
  const usedTimes = approved.length;
  const usedDays = approved.reduce((sum,r) => sum + Number(r.leave_days || 0), 0);
  return {
    academicYear: year,
    semester: term,
    maxTimes,
    maxDays,
    usedTimes,
    usedDays,
    remainingTimes: Math.max(0, maxTimes - usedTimes),
    remainingDays: Math.max(0, maxDays - usedDays),
    timesPct: maxTimes > 0 ? Math.min(100, (usedTimes / maxTimes) * 100) : 100,
    daysPct: maxDays > 0 ? Math.min(100, (usedDays / maxDays) * 100) : 100,
    pendingTimes: pending.length,
    pendingDays: pending.reduce((sum,r) => sum + Number(r.leave_days || 0), 0),
  };
}

function leaveRequestsForView() {
  if (state.leaveView === "mine") return state.leaveRequests.filter(r => r.requester_id === state.user.id);
  if (state.leaveView === "pending_personnel") return state.leaveRequests.filter(r => r.status === "pending_personnel" && r.requester_id !== state.user.id);
  if (state.leaveView === "pending_director") return state.leaveRequests.filter(r => r.status === "pending_director" && r.requester_id !== state.user.id);
  return state.leaveRequests;
}

async function loadLeaveWorkspace() {
  const reviewer = canSeeLeaveOverview();
  const [requestsRes, actionsRes, typesRes, rosterRes, personnelRes, substituteRes] = await Promise.all([
    supabase.from("leave_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("leave_actions").select("*").order("created_at", { ascending: true }),
    supabase.from("leave_types").select("*").eq("is_active", true).order("sort_order"),
    reviewer
      ? supabase.from("profiles")
          .select("id,email,full_name,role,department_id,account_status")
          .in("role", ["teacher","department_head","director","super_admin"])
          .eq("account_status","active")
          .is("deleted_at",null)
          .order("full_name",{ascending:true})
      : Promise.resolve({ data: [state.profile], error: null }),
    reviewer
      ? supabase.from("personnel_records").select("user_id,position_title,first_appointment_date")
      : Promise.resolve({ data: state.personnelOwnRecord ? [state.personnelOwnRecord] : [], error: null }),
    supabase.from("substitute_lessons").select("*").order("leave_date").order("period_no"),
  ]);

  if (requestsRes.error) {
    console.error("Leave requests load failed", requestsRes.error);
    state.leaveRequests = [];
  } else state.leaveRequests = requestsRes.data || [];

  if (actionsRes.error) {
    console.error("Leave actions load failed", actionsRes.error);
    state.leaveActions = [];
  } else state.leaveActions = actionsRes.data || [];

  state.leaveTypes = typesRes.error ? [] : (typesRes.data || []);
  state.leaveRoster = rosterRes.error ? [state.profile] : (rosterRes.data || []);
  state.leavePersonnelRecords = personnelRes.error ? [] : (personnelRes.data || []);
  state.leaveSubstituteLessons = substituteRes.error ? [] : (substituteRes.data || []);

  if (!state.leaveReportAcademicYear) {
    state.leaveReportAcademicYear = currentAcademicPeriod().academicYear;
    state.leaveReportSemester = String(currentAcademicPeriod().semester);
  }

  if (!state.leaveReportPersonId && reviewer && state.leaveRoster.length) {
    state.leaveReportPersonId = state.leaveRoster[0].id;
  }

  if (state.selectedLeaveRequestId && !state.leaveRequests.some(r => r.id === state.selectedLeaveRequestId)) {
    state.selectedLeaveRequestId = null;
  }

  if (!reviewer) {
    state.leaveView = "mine";
  } else if (isPersonnelHeadUser() && state.leaveView === "pending_director") {
    state.leaveView = "pending_personnel";
  } else if (canFinalReviewLeave() && state.leaveView === "pending_personnel") {
    state.leaveView = "pending_director";
  }
}

function leaveViewTabsHtml() {
  if (!canSeeLeaveOverview()) return "";
  return `<div class="lesson-view-tabs leave-view-tabs">
    <button class="lesson-view-tab ${state.leaveView === "mine" ? "active" : ""}" data-leave-view="mine">วันลาของฉัน</button>
    ${isPersonnelHeadUser() ? `<button class="lesson-view-tab ${state.leaveView === "pending_personnel" ? "active" : ""}" data-leave-view="pending_personnel">งานรอตรวจ</button>` : ""}
    ${canFinalReviewLeave() ? `<button class="lesson-view-tab ${state.leaveView === "pending_director" ? "active" : ""}" data-leave-view="pending_director">รออนุมัติขั้นสุดท้าย</button>` : ""}
    <button class="lesson-view-tab ${state.leaveView === "overview" ? "active" : ""}" data-leave-view="overview">ภาพรวมวันลา</button>
  </div>`;
}

function leaveDonut(label, used, max, pct, unit, remaining) {
  const safePct = Math.max(0, Math.min(100, Number(pct || 0)));
  return `<article class="leave-donut-card">
    <div class="leave-donut" style="--leave-pct:${safePct}%">
      <div class="leave-donut-inner"><strong>${used}</strong><span>/ ${max} ${unit}</span></div>
    </div>
    <div class="leave-donut-copy"><strong>${escapeHtml(label)}</strong><span>คงเหลือ ${remaining} ${unit}</span><small>ใช้ไป ${safePct.toFixed(0)}%</small></div>
  </article>`;
}

function leaveRequestOrdinal(request) {
  const relevant = state.leaveRequests
    .filter(r => r.requester_id === request.requester_id
      && Number(r.leave_year) === Number(request.leave_year)
      && r.status !== "draft"
      && r.status !== "cancelled")
    .sort((a,b) => new Date(a.submitted_at || a.created_at) - new Date(b.submitted_at || b.created_at));
  const index = relevant.findIndex(r => r.id === request.id);
  return index >= 0 ? index + 1 : null;
}

function leaveSubstituteProgress(leaveRequestId) {
  const rows = state.leaveSubstituteLessons.filter(r =>
    r.leave_request_id === leaveRequestId && r.status !== "cancelled"
  );
  const assigned = rows.filter(r => r.status === "assigned").length;
  return { rows, total: rows.length, assigned, pending: Math.max(0, rows.length-assigned), complete: rows.length>0 && assigned===rows.length };
}

function leaveSubstituteStatusHtml(request) {
  if (!request.affects_teaching_schedule) return `<span class="pill neutral">ไม่ต้องจัด</span>`;
  if (request.status === "draft") return `<span class="pill neutral">รอส่งคำขอ</span>`;
  if (request.status === "rejected") return `<span class="pill suspended">ยกเลิกตามใบลา</span>`;
  const p=leaveSubstituteProgress(request.id);
  if(!p.total) return `<span class="pill neutral">ไม่พบคาบ / รอตาราง</span>`;
  return p.complete ? `<span class="pill active">จัดครบ ${p.assigned}/${p.total}</span>` : `<span class="pill pending">รอจัด ${p.assigned}/${p.total}</span>`;
}

function canOpenOwnSubstituteFromLeave(request) {
  return request.requester_id===state.user.id && request.affects_teaching_schedule && ["pending_personnel","pending_director","approved"].includes(request.status);
}

function leaveHistoryTable(requests, showRequester = false) {
  if (!requests.length) return `<div class="empty"><strong>ยังไม่มีรายการวันลา</strong><span>เมื่อมีคำขอลา รายการจะแสดงที่นี่</span></div>`;
  return `<div class="table-wrap"><table class="table leave-table"><thead><tr>
    <th>ครั้งที่</th>${showRequester ? "<th>ผู้ลา</th>" : ""}<th>ประเภท</th><th>ช่วงวันที่</th><th>จำนวน</th><th>สถานที่/ติดต่อ</th><th>สถานะ</th><th>สอนแทน</th><th>การตรวจ/อนุมัติ</th><th></th>
  </tr></thead><tbody>
    ${requests.map(r => {
      const ordinal = leaveRequestOrdinal(r);
      const reviewerHtml = `<div class="leave-reviewer-cell">
        <span><b>บุคคล:</b> ${escapeHtml(r.personnel_reviewer_name || (leavePersonnelSkipped(r) ? "ข้ามขั้นตอน" : "—"))}</span>
        <span><b>ผู้บริหาร:</b> ${escapeHtml(r.director_reviewer_name || "—")}</span>
      </div>`;
      return `<tr>
        <td><strong>${ordinal ? `ครั้งที่ ${ordinal}` : "ฉบับร่าง"}</strong><br><span class="table-muted">#${r.request_no}</span></td>
        ${showRequester ? `<td><strong>${escapeHtml(r.requester_name)}</strong><br><span class="table-muted">${escapeHtml(r.requester_position || ROLE_LABEL[r.requester_role] || r.requester_role)}</span></td>` : ""}
        <td>${escapeHtml(leaveTypeName(r.leave_type_code,r.other_leave_text))}</td>
        <td>${thaiDateOnly(r.start_date)}<br><span class="table-muted">ถึง ${thaiDateOnly(r.end_date)}</span></td>
        <td><strong>${Number(r.leave_days)} วัน</strong></td>
        <td>${escapeHtml(r.contact_during_leave || "—")}${r.contact_phone ? `<br><span class="table-muted">${escapeHtml(r.contact_phone)}</span>` : ""}</td>
        <td><span class="pill ${leaveStatusClass(r.status)}">${escapeHtml(LEAVE_STATUS_LABEL[r.status] || r.status)}</span></td>
        <td><div class="leave-substitute-cell">${leaveSubstituteStatusHtml(r)}${canOpenOwnSubstituteFromLeave(r) ? `<button class="btn btn-ghost" data-open-leave-substitute="${r.id}">จัดสอนแทน</button>` : ""}</div></td>
        <td>${reviewerHtml}</td>
        <td><button class="btn btn-ghost leave-open" data-leave-id="${r.id}">รายละเอียด</button></td>
      </tr>`;
    }).join("")}
  </tbody></table></div>`;
}

function leaveOwnDashboardHtml() {
  const period = currentAcademicPeriod();
  const quota = leaveQuotaStats(state.user.id, period.academicYear, period.semester);
  const requests = leaveRequestsForView();
  const pending = requests.filter(r => ["pending_personnel","pending_director"].includes(r.status)).length;
  const approved = requests.filter(r =>
    r.status === "approved"
    && Number(r.academic_year) === Number(period.academicYear)
    && Number(r.semester) === Number(period.semester)
  ).length;
  return `<section class="leave-hero">
    <div><span class="eyebrow dark">Personnel Leave</span><h2>วันลาของฉัน</h2><p>ยื่นคำขอ ติดตามสถานะ และดูประวัติวันลาของคุณ</p></div>
    <button class="btn btn-primary" id="new-leave-request">＋ ยื่นคำขอลา</button>
  </section>
  ${leaveViewTabsHtml()}
  <div class="leave-quota-grid">
    ${leaveDonut("จำนวนครั้งที่ใช้", quota.usedTimes, quota.maxTimes, quota.timesPct, "ครั้ง", quota.remainingTimes)}
    ${leaveDonut("จำนวนวันที่ใช้", Number(quota.usedDays.toFixed(1)), quota.maxDays, quota.daysPct, "วัน", Number(quota.remainingDays.toFixed(1)))}
    <article class="leave-quota-note">
      <span class="eyebrow dark">ปีการศึกษา ${period.academicYear} · ภาคเรียนที่ ${period.semester}</span>
      <strong>โควตาติดตามคงเหลือรายภาคเรียน</strong>
      <p>เหลือ ${quota.remainingTimes} ครั้ง / ${Number(quota.remainingDays.toFixed(1))} วัน</p>
      <small>คำขอที่กำลังรออนุมัติ ${quota.pendingTimes} ครั้ง (${Number(quota.pendingDays.toFixed(1))} วัน) ยังไม่ถูกหักจนกว่าจะอนุมัติขั้นสุดท้าย</small>
    </article>
  </div>
  <div class="lesson-stat-grid leave-stat-grid">
    <article class="metric-card"><div class="metric-label">คำขอทั้งหมด</div><div class="metric-value">${requests.length}</div></article>
    <article class="metric-card"><div class="metric-label">อยู่ระหว่างอนุมัติ</div><div class="metric-value">${pending}</div></article>
    <article class="metric-card"><div class="metric-label">อนุมัติภาคเรียนนี้</div><div class="metric-value">${approved}</div></article>
    <article class="metric-card"><div class="metric-label">รายการล่าสุด</div><div class="metric-value compact">${requests[0] ? Number(requests[0].leave_days)+" วัน" : "—"}</div></article>
  </div>
  <section class="panel" style="margin-top:18px"><div class="panel-head"><div class="panel-title-wrap"><h3>ประวัติวันลา</h3><p>จำนวนครั้ง/วันในโควตาจะนับเฉพาะรายการที่อนุมัติแล้วและประเภทที่กำหนดให้นับโควตา</p></div><button class="btn btn-ghost" id="refresh-leave">↻ รีเฟรช</button></div>${leaveHistoryTable(requests,false)}</section>`;
}

function leaveReportAcademicYears() {
  const values = new Set(state.leaveRequests.map(r => Number(r.academic_year)).filter(Boolean));
  values.add(currentAcademicPeriod().academicYear);
  return [...values].sort((a,b)=>b-a);
}

function leaveReportSigners() {
  const personnelHead = state.leaveRoster.find(p =>
    p.role === "department_head"
    && p.department_id
    && p.department_id === personnelDepartmentId()
  );
  const director = state.leaveRoster.find(p => p.role === "director");
  return {
    personnelHeadName: personnelHead?.full_name || personnelHead?.email || "",
    directorName: director?.full_name || director?.email || "",
  };
}

function leaveReportControlsHtml() {
  const signers = leaveReportSigners();
  return `<section class="leave-report-controls">
    <div class="field"><label>ปีการศึกษา</label><select class="select" id="leave-report-year">
      ${leaveReportAcademicYears().map(y=>`<option value="${y}" ${Number(y)===leaveReportYear()?"selected":""}>${y}</option>`).join("")}
    </select></div>
    <div class="field"><label>ภาคเรียน</label><select class="select" id="leave-report-semester">
      <option value="all" ${leaveReportSemesterValue()==="all"?"selected":""}>ทั้งปีการศึกษา</option>
      <option value="1" ${leaveReportSemesterValue()===1?"selected":""}>ภาคเรียนที่ 1</option>
      <option value="2" ${leaveReportSemesterValue()===2?"selected":""}>ภาคเรียนที่ 2</option>
    </select></div>
    <button class="btn btn-secondary" id="export-school-leave-report">▤ Export PDF ภาพรวมโรงเรียน</button>
    <div class="leave-report-signers-preview">
      <span>ชื่อผู้ลงนามใน PDF</span>
      <div><strong>หัวหน้าบุคคล:</strong> ${escapeHtml(signers.personnelHeadName || "ยังไม่พบชื่อในระบบ")}</div>
      <div><strong>ผู้อำนวยการโรงเรียน:</strong> ${escapeHtml(signers.directorName || "ยังไม่พบชื่อในระบบ")}</div>
    </div>
  </section>`;
}

function leaveTypePieHtml(stats) {
  const items = stats.byType.filter(x=>x.days>0);
  const total = items.reduce((sum,x)=>sum+x.days,0);
  if (!total) return `<div class="leave-empty-pie"><strong>ยังไม่มีวันลาที่อนุมัติ</strong><span>${escapeHtml(leavePeriodLabel())}</span></div>`;
  const palette = ["#4f46e5","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#64748b"];
  let acc=0;
  const stops=items.map((item,index)=>{
    const start=acc;
    acc += (item.days/total)*100;
    return `${palette[index%palette.length]} ${start.toFixed(2)}% ${acc.toFixed(2)}%`;
  }).join(",");
  return `<div class="leave-type-chart-wrap">
    <div class="leave-type-pie" style="background:conic-gradient(${stops})"><div><strong>${Number(total.toFixed(1))}</strong><span>วันรวม</span></div></div>
    <div class="leave-type-legend">${items.map((item,index)=>`<div><i style="background:${palette[index%palette.length]}"></i><span>${escapeHtml(item.name)}</span><strong>${Number(item.days.toFixed(1))} วัน</strong></div>`).join("")}</div>
  </div>`;
}

function leaveSchoolOverviewHtml() {
  const stats = leavePeriodOverviewStats();
  const rows = schoolLeaveSummaryRows();
  return `${leaveReportControlsHtml()}
    <div class="leave-overview-charts">
      <article class="leave-overview-card">
        <div class="leave-overview-card-head"><strong>บุคลากรที่มีการลา</strong><span>${escapeHtml(leavePeriodLabel())}</span></div>
        <div class="leave-donut-card report-donut">
          <div class="leave-donut" style="--leave-pct:${stats.peoplePct}%"><div class="leave-donut-inner"><strong>${stats.peopleWithLeave}</strong><span>/ ${stats.totalPeople} คน</span></div></div>
          <div class="leave-donut-copy"><strong>มีประวัติลา ${stats.peoplePct.toFixed(0)}%</strong><span>ไม่ลา ${stats.peopleWithoutLeave} คน</span><small>นับเฉพาะรายการที่อนุมัติแล้ว</small></div>
        </div>
      </article>
      <article class="leave-overview-card">
        <div class="leave-overview-card-head"><strong>สัดส่วนวันลาแยกประเภท</strong><span>${stats.totalTimes} ครั้ง · ${Number(stats.totalDays.toFixed(1))} วัน</span></div>
        ${leaveTypePieHtml(stats)}
      </article>
    </div>
    <section class="panel" style="margin-top:18px">
      <div class="panel-head"><div class="panel-title-wrap"><h3>สรุปบุคลากรทั้งโรงเรียน</h3><p>${rows.length} คน · คนที่ไม่มีวันลาจะแสดง 0</p></div></div>
      <div class="table-wrap"><table class="table leave-school-table"><thead><tr><th>#</th><th>ชื่อ-สกุล</th><th>ตำแหน่ง</th><th>จำนวนครั้ง</th><th>จำนวนวัน</th><th></th></tr></thead><tbody>
        ${rows.map(r=>`<tr><td>${r.index}</td><td><strong>${escapeHtml(r.name)}</strong></td><td>${escapeHtml(r.position)}</td><td>${r.times}</td><td>${Number(r.days.toFixed(1))}</td><td><button class="btn btn-ghost leave-person-report-open" data-leave-person="${r.userId}">ดูรายบุคคล</button></td></tr>`).join("")}
      </tbody></table></div>
    </section>
    ${leaveIndividualReportSectionHtml()}`;
}

function leaveIndividualReportSectionHtml() {
  if (!state.leaveRoster.length) return "";
  const selectedId = state.leaveReportPersonId || state.leaveRoster[0].id;
  const person = state.leaveRoster.find(p=>p.id===selectedId) || state.leaveRoster[0];
  const requests = leavePeriodRequests({userId:person.id}).sort((a,b)=>new Date(b.start_date)-new Date(a.start_date));
  const approved = requests.filter(r=>r.status==="approved");
  const typeStats = leaveTypeStatsForUser(person.id);
  const totalDays = approved.reduce((sum,r)=>sum+Number(r.leave_days||0),0);
  return `<section class="panel leave-individual-report">
    <div class="panel-head">
      <div class="panel-title-wrap"><h3>ภาพรวมวันลารายบุคคล</h3><p>เลือกบุคลากรจาก Dropdown เพื่อดูสถิติและ Export PDF</p></div>
      <button class="btn btn-secondary" id="export-person-leave-report">▤ Export PDF รายบุคคล</button>
    </div>
    <div class="leave-person-select-row">
      <div class="field"><label>เลือกบุคลากร</label><select class="select" id="leave-report-person">
        ${[...state.leaveRoster].sort((a,b)=>String(a.full_name||a.email||"").localeCompare(String(b.full_name||b.email||""),"th")).map(p=>`<option value="${p.id}" ${p.id===person.id?"selected":""}>${escapeHtml(p.full_name||p.email||"บุคลากร")}</option>`).join("")}
      </select></div>
      <div class="leave-person-summary"><strong>${escapeHtml(person.full_name||person.email||"บุคลากร")}</strong><span>${escapeHtml(leaveRosterPosition(person.id))}</span><small>${approved.length} ครั้ง · ${Number(totalDays.toFixed(1))} วัน ที่อนุมัติแล้ว</small></div>
    </div>
    <div class="leave-person-stat-grid">
      ${typeStats.map(s=>`<div><span>${escapeHtml(s.name)}</span><strong>${s.times} ครั้ง</strong><small>${Number(s.days.toFixed(1))} วัน</small></div>`).join("")}
    </div>
    ${leaveHistoryTable(requests,false)}
  </section>`;
}

function leaveReviewerDashboardHtml() {
  const requests = leaveRequestsForView();
  const pendingPersonnel = state.leaveRequests.filter(r => r.status === "pending_personnel" && r.requester_id !== state.user.id).length;
  const pendingDirector = state.leaveRequests.filter(r => r.status === "pending_director" && r.requester_id !== state.user.id).length;
  const currentPeriod = currentAcademicPeriod();
  const approvedCurrentTerm = state.leaveRequests.filter(r =>
    r.status === "approved"
    && Number(r.academic_year) === Number(currentPeriod.academicYear)
    && Number(r.semester) === Number(currentPeriod.semester)
  ).length;
  const people = new Set(state.leaveRequests.map(r => r.requester_id)).size;
  const title = state.leaveView === "pending_personnel" ? "คำขอลารอหัวหน้าบุคคลตรวจ"
    : state.leaveView === "pending_director" ? "คำขอลารอผู้บริหารอนุมัติ"
    : "ภาพรวมวันลาบุคลากร";

  if (state.leaveView === "overview") {
    return `<section class="leave-hero">
      <div><span class="eyebrow dark">Personnel Leave Report</span><h2>ภาพรวมวันลา</h2><p>รายงานทั้งโรงเรียนและรายบุคคล แยกตามปีการศึกษา/ภาคเรียน</p></div>
      <button class="btn btn-secondary" data-leave-view-direct="mine">วันลาของฉัน</button>
    </section>
    ${leaveViewTabsHtml()}
    ${leaveSchoolOverviewHtml()}`;
  }

  return `<section class="leave-hero">
    <div><span class="eyebrow dark">Personnel Leave</span><h2>${escapeHtml(title)}</h2><p>ติดตาม Workflow วันลาโดยแยกสิทธิ์ตามหน้าที่ของผู้ตรวจ</p></div>
    <button class="btn btn-secondary" data-leave-view-direct="mine">วันลาของฉัน</button>
  </section>
  ${leaveViewTabsHtml()}
  <div class="lesson-stat-grid">
    <article class="metric-card"><div class="metric-label">รอหัวหน้าบุคคล</div><div class="metric-value">${pendingPersonnel}</div></article>
    <article class="metric-card"><div class="metric-label">รอผู้บริหาร</div><div class="metric-value">${pendingDirector}</div></article>
    <article class="metric-card"><div class="metric-label">อนุมัติภาคเรียนนี้</div><div class="metric-value">${approvedCurrentTerm}</div></article>
    <article class="metric-card"><div class="metric-label">ผู้ยื่นที่มองเห็น</div><div class="metric-value">${people}</div></article>
  </div>
  <section class="panel" style="margin-top:18px"><div class="panel-head"><div class="panel-title-wrap"><h3>${escapeHtml(title)}</h3><p>ข้อมูลถูกกรองด้วย RLS ตามสิทธิ์ของคุณ</p></div><button class="btn btn-ghost" id="refresh-leave">↻ รีเฟรช</button></div>${leaveHistoryTable(requests,true)}</section>`;
}

function leaveTimelineHtml(request) {
  const actions = state.leaveActions.filter(a => a.leave_request_id === request.id);
  const personnelSkipped = request.requester_role === "department_head"
    && actions.some(a => a.action === "submit" && a.to_status === "pending_director")
    && !actions.some(a => a.action === "approve_personnel");
  return `<div class="leave-timeline">
    ${actions.length ? actions.map(a => `<div class="leave-timeline-item">
      <div class="leave-timeline-dot"></div>
      <div><strong>${escapeHtml(LEAVE_ACTION_LABEL[a.action] || a.action)}</strong><span>${escapeHtml(a.actor_name)} · ${formatDate(a.created_at)}</span>${a.comment ? `<p>${escapeHtml(a.comment)}</p>` : ""}</div>
    </div>`).join("") : `<div class="empty"><strong>ยังไม่มี Timeline</strong></div>`}
    ${personnelSkipped ? `<div class="leave-timeline-item skipped"><div class="leave-timeline-dot"></div><div><strong>ข้ามขั้นตรวจหัวหน้าบุคคล</strong><span>หัวหน้ากลุ่มงานบริหารงานบุคคล: ${escapeHtml(request.requester_name)} เป็นผู้ยื่นคำขอเอง จึงส่งตรงผู้บริหารเพื่อป้องกัน self-approval</span></div></div>` : ""}
  </div>`;
}

function selectedLeaveRequest() {
  return state.leaveRequests.find(r => r.id === state.selectedLeaveRequestId) || null;
}

function leaveDetailHtml(request) {
  const own = request.requester_id === state.user.id;
  const canPersonnelReview = isPersonnelHeadUser() && request.status === "pending_personnel" && !own;
  const canDirectorReview = canFinalReviewLeave() && request.status === "pending_director" && !own;
  const editable = own && request.status === "draft";
  const quota = leaveQuotaStats(request.requester_id, Number(request.academic_year), Number(request.semester));
  return `<section class="leave-detail">
    <div class="personnel-detail-top">
      <div><button class="type-back-link" id="leave-detail-back">← กลับ</button><span class="eyebrow dark">Leave Request #${request.request_no}</span></div>
      <div class="personnel-detail-actions">
        <button class="btn btn-secondary" id="leave-a4">▤ พิมพ์ / PDF</button>
        ${canOpenOwnSubstituteFromLeave(request) ? `<button class="btn btn-primary" data-open-leave-substitute="${request.id}">จัดสอนแทน</button>` : ""}
        ${editable ? `<button class="btn btn-secondary" id="edit-leave-request">แก้ไข</button><button class="btn btn-primary" id="submit-leave-request">ส่งคำขอ</button><button class="btn btn-danger" id="delete-leave-draft">ลบคำขอลา</button>` : ""}${isSuperAdminUser()&&!editable?`<button class="btn btn-danger" id="delete-leave-draft">ลบคำขอลา</button>`:""}
        ${canPersonnelReview ? `<button class="btn btn-primary" data-leave-review="personnel">ตรวจคำขอ</button>` : ""}
        ${canDirectorReview ? `<button class="btn btn-primary" data-leave-review="director">อนุมัติขั้นสุดท้าย</button>` : ""}
      </div>
    </div>
    <section class="leave-detail-hero">
      <div><span class="pill ${leaveStatusClass(request.status)}">${escapeHtml(LEAVE_STATUS_LABEL[request.status] || request.status)}</span><h2>${escapeHtml(leaveTypeName(request.leave_type_code,request.other_leave_text))}</h2><p>${escapeHtml(request.requester_name)} · ${escapeHtml(request.requester_position || ROLE_LABEL[request.requester_role] || request.requester_role)}</p></div>
      <div class="leave-days-big"><small>จำนวนวันลา</small><strong>${Number(request.leave_days)}</strong><span>วัน</span></div>
    </section>
    <div class="detail-grid leave-detail-grid">
      ${planField("วันที่เริ่มลา",thaiDateOnly(request.start_date))}
      ${planField("วันที่สิ้นสุด",thaiDateOnly(request.end_date))}
      ${planField("ปีการศึกษา",String(request.academic_year || "—"))}
      ${planField("ภาคเรียนที่",String(request.semester || "—"))}
      ${planField("มีผลต่อตารางสอน",request.affects_teaching_schedule ? "ต้องจัดการตารางสอน/ผู้สอนแทน" : "ไม่ต้องจัดผู้สอนแทน")}
      ${planField("สถานะการจัดสอนแทน",request.affects_teaching_schedule ? (()=>{const p=leaveSubstituteProgress(request.id); return !p.total ? "ไม่พบคาบ / รอตาราง Published" : p.complete ? `จัดครบ ${p.assigned}/${p.total} คาบ` : `จัดแล้ว ${p.assigned}/${p.total} คาบ`;})() : "ไม่ต้องจัด")}
    </div>
    <div class="long-detail"><h4>เหตุผลการลา</h4><p>${escapeHtml(request.reason)}</p></div>
    <div class="detail-grid leave-detail-grid">
      ${planField("สถานที่/ที่อยู่ระหว่างลา",request.contact_during_leave || "—")}
      ${planField("เบอร์ติดต่อระหว่างลา",request.contact_phone || "—")}
      ${planField("หัวหน้าบุคคล",request.personnel_reviewer_name || (leavePersonnelSkipped(request) ? `${request.requester_name} · ข้ามขั้นตอน (เป็นผู้ยื่นคำขอเอง)` : "—"))}
      ${planField("ผู้บริหาร",request.director_reviewer_name || "—")}
    </div>
    <section class="leave-quota-mini">
      <strong>สรุปโควตาปี ${Number(request.leave_year)+543}</strong>
      <span>อนุมัติแล้ว ${quota.usedTimes}/${quota.maxTimes} ครั้ง · ${Number(quota.usedDays.toFixed(1))}/${quota.maxDays} วัน</span>
    </section>
    <section class="panel" style="margin-top:14px"><div class="panel-head"><div class="panel-title-wrap"><h3>Timeline การอนุมัติ</h3></div></div>${leaveTimelineHtml(request)}</section>
  </section>`;
}

function leaveWorkspaceHtml(module) {
  const selected = selectedLeaveRequest();
  if (selected) return leaveDetailHtml(selected);
  if (state.leaveView === "mine" || !canSeeLeaveOverview()) return leaveOwnDashboardHtml();
  return leaveReviewerDashboardHtml();
}

function leaveRequestModal(request = null) {
  const r = request || {};
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  const defaultAffects = r.id ? Boolean(r.affects_teaching_schedule) : !["director","super_admin"].includes(state.profile.role);
  const defaultPeriod = r.academic_year && r.semester
    ? { academicYear: Number(r.academic_year), semester: Number(r.semester) }
    : currentAcademicPeriod(r.start_date || new Date());
  modal.innerHTML = `<div class="modal modal-wide">
    <div class="modal-head"><div><h3>${request ? "แก้ไขคำขอลา" : "ยื่นคำขอลา"}</h3><p>ระบบจะคำนวณจำนวนวันแบบรวมวันเริ่มและวันสิ้นสุด</p></div><button class="modal-close">×</button></div>
    <form id="leave-form" class="form-grid">
      <div class="form-row">
        <div class="field"><label>ประเภทการลา</label><select class="select" name="leave_type_code" id="leave-type-code" required>
          <option value="">เลือกประเภทการลา</option>
          ${state.leaveTypes.map(t => `<option value="${escapeHtml(t.code)}" ${r.leave_type_code===t.code?"selected":""}>${escapeHtml(t.name_th)}${t.counts_against_quota ? " · นับโควตา" : ""}</option>`).join("")}
        </select></div>
        <div class="field" id="leave-other-field"><label>รายละเอียดประเภทอื่น <span class="helper">(เมื่อเลือก “ลาอื่น ๆ”)</span></label><input class="input" name="other_leave_text" maxlength="160" value="${escapeHtml(r.other_leave_text || "")}" placeholder="ระบุประเภทการลา"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>ปีการศึกษา</label><input class="input" name="academic_year" type="number" min="2500" max="2700" required value="${defaultPeriod.academicYear}"></div>
        <div class="field"><label>ภาคเรียน</label><select class="select" name="semester" required><option value="1" ${defaultPeriod.semester===1?"selected":""}>ภาคเรียนที่ 1</option><option value="2" ${defaultPeriod.semester===2?"selected":""}>ภาคเรียนที่ 2</option></select></div>
      </div>
      <div class="field"><label>เหตุผล / รายละเอียดการลา</label><textarea class="input textarea" name="reason" required>${escapeHtml(r.reason || "")}</textarea></div>
      <div class="form-row">
        <div class="field"><label>ตั้งแต่วันที่</label><input class="input" name="start_date" id="leave-start-date" type="date" required value="${escapeHtml(r.start_date || "")}"></div>
        <div class="field"><label>ถึงวันที่</label><input class="input" name="end_date" id="leave-end-date" type="date" required value="${escapeHtml(r.end_date || "")}"></div>
      </div>
      <div class="leave-days-preview" id="leave-days-preview"><span>จำนวนวันลา</span><strong>${r.leave_days ? Number(r.leave_days) : "—"} วัน</strong></div>
      <div class="form-row">
        <div class="field"><label>สถานที่/ที่อยู่ระหว่างลา <span class="helper">(ถ้ามี)</span></label><input class="input" name="contact_during_leave" maxlength="240" value="${escapeHtml(r.contact_during_leave || "")}"></div>
        <div class="field"><label>เบอร์ติดต่อระหว่างลา <span class="helper">(ถ้ามี)</span></label><input class="input" name="contact_phone" maxlength="40" value="${escapeHtml(r.contact_phone || state.profile.phone || "")}"></div>
      </div>
      <label class="leave-teaching-check"><input type="checkbox" name="affects_teaching_schedule" ${defaultAffects ? "checked" : ""}><span><strong>มีตารางสอน/ภารกิจการสอนที่ต้องจัดแทน</strong><small>เมื่อส่งคำขอ ระบบจะสร้างรายการสอนแทนจากตาราง Published ทันที และคุณสามารถจัดครูสอนแทนได้โดยไม่ต้องรออนุมัติใบลา</small></span></label>
      <div class="drive-permission-warning leave-policy-note"><strong>โควตาติดตามรายภาคเรียน</strong><span>ประเภทที่ระบุว่า “นับโควตา” จะตรวจแยกตามปีการศึกษาและภาคเรียน · เทอม 1: ${leaveQuotaLimitForSemester(1).maxTimes} ครั้ง / ${leaveQuotaLimitForSemester(1).maxDays} วัน · เทอม 2: ${leaveQuotaLimitForSemester(2).maxTimes} ครั้ง / ${leaveQuotaLimitForSemester(2).maxDays} วัน โดยหักจริงเมื่ออนุมัติขั้นสุดท้าย</span></div>
    </form>
    <div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-secondary" id="save-leave-draft">บันทึกฉบับร่าง</button><button class="btn btn-primary" id="save-submit-leave">บันทึกและส่งคำขอ</button></div>
  </div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close").addEventListener("click",close);
  modal.querySelector(".modal-cancel").addEventListener("click",close);
  modal.addEventListener("click",e=>{if(e.target===modal)close();});

  const refresh = () => {
    const start = modal.querySelector("#leave-start-date").value;
    const end = modal.querySelector("#leave-end-date").value;
    const days = inclusiveLeaveDays(start,end);
    modal.querySelector("#leave-days-preview").innerHTML = `<span>จำนวนวันลา</span><strong>${days || "—"} วัน</strong>`;
    const other = modal.querySelector("#leave-type-code").value === "other";
    modal.querySelector("[name='other_leave_text']").required = other;
    modal.querySelector("#leave-other-field").classList.toggle("leave-field-muted",!other);
  };
  modal.querySelector("#leave-start-date").addEventListener("change",refresh);
  modal.querySelector("#leave-end-date").addEventListener("change",refresh);
  modal.querySelector("#leave-type-code").addEventListener("change",refresh);
  refresh();

  modal.querySelector("#save-leave-draft").addEventListener("click",e=>saveLeaveRequest(modal,request,false,e.currentTarget));
  modal.querySelector("#save-submit-leave").addEventListener("click",e=>saveLeaveRequest(modal,request,true,e.currentTarget));
}

function friendlyLeaveError(error) {
  const message = String(error?.message || error || "");
  if (message.includes("Leave quota exceeded: maximum") && message.includes("requests")) return "จำนวนครั้งลาในโควตาปีนี้ถึงขีดจำกัดแล้ว";
  if (message.includes("Leave quota exceeded: maximum") && message.includes("days")) return "จำนวนวันลาในโควตาปีนี้เกินขีดจำกัดที่โรงเรียนตั้งไว้";
  if (message.includes("self-approval")) return "ไม่สามารถอนุมัติคำขอลาของตนเองได้";
  return message || "เกิดข้อผิดพลาด";
}

async function saveLeaveRequest(modal,existing,submitAfter,button) {
  const form = modal.querySelector("#leave-form");
  if (!form.reportValidity()) return;
  const fd = new FormData(form);
  const start = String(fd.get("start_date") || "");
  const end = String(fd.get("end_date") || "");
  const days = inclusiveLeaveDays(start,end);
  if (!days) return toast("วันที่ลาไม่ถูกต้อง","วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มลา","error");

  const payload = {
    leave_type_code: String(fd.get("leave_type_code")),
    other_leave_text: String(fd.get("other_leave_text") || "").trim() || null,
    reason: String(fd.get("reason") || "").trim(),
    start_date: start,
    end_date: end,
    leave_year: dateOnly(start)?.getFullYear() || currentLeaveYear(),
    academic_year: Number(fd.get("academic_year")),
    semester: Number(fd.get("semester")),
    contact_during_leave: String(fd.get("contact_during_leave") || "").trim() || null,
    contact_phone: String(fd.get("contact_phone") || "").trim() || null,
    affects_teaching_schedule: Boolean(fd.get("affects_teaching_schedule")),
  };

  buttonLoading(button,true,submitAfter?"กำลังบันทึกและส่ง...":"กำลังบันทึก...");
  try {
    const result = existing
      ? await supabase.from("leave_requests").update(payload).eq("id",existing.id).select().single()
      : await supabase.from("leave_requests").insert(payload).select().single();
    if (result.error) throw result.error;
    const saved = result.data;

    if (submitAfter) {
      const { error } = await supabase.rpc("submit_leave_request",{p_leave_request_id:saved.id});
      if (error) throw error;
    }
    modal.remove();
    state.selectedLeaveRequestId = saved.id;
    toast(submitAfter?"ส่งคำขอลาแล้ว":"บันทึกฉบับร่างแล้ว",submitAfter?"หากมีคาบสอน ระบบจะแจ้งให้คุณจัดครูสอนแทนได้ทันที โดยไม่ต้องรอผลอนุมัติ":"คุณสามารถกลับมาแก้ไขก่อนส่งได้","success");
    await renderDashboard();
  } catch(error) {
    toast("ดำเนินการไม่สำเร็จ",friendlyLeaveError(error),"error");
  } finally {
    buttonLoading(button,false);
  }
}

async function submitSelectedLeaveRequest() {
  const r = selectedLeaveRequest();
  if (!r || r.status !== "draft") return;
  const { error } = await supabase.rpc("submit_leave_request",{p_leave_request_id:r.id});
  if (error) return toast("ส่งคำขอไม่สำเร็จ",friendlyLeaveError(error),"error");
  toast("ส่งคำขอลาแล้ว","ระบบแจ้งผู้ตรวจแล้ว และหากมีคาบสอนจะสร้างรายการให้คุณจัดครูสอนแทนทันที","success");
  await renderDashboard();
}

async function deleteLeaveDraft() {
  const r=selectedLeaveRequest();
  if(!r)return;
  const normalAllowed=r.requester_id===state.user.id&&r.status==="draft";
  if(!normalAllowed&&!isSuperAdminUser())return toast("ไม่มีสิทธิ์ลบคำขอนี้","ผู้ใช้งานทั่วไปลบได้เฉพาะฉบับร่างของตนเอง","error");
  secureDeleteModal({
    title:"ลบคำขอลา",
    description:`คำขอลา #${r.request_no} · ${leaveTypeName(r.leave_type_code,r.other_leave_text)}`,
    warning:"หากรายการนี้มีข้อมูลสอนแทนที่เชื่อมอยู่ รายการลูกที่ผูกด้วย Foreign Key จะถูกลบตามกติกาฐานข้อมูล",
    action:async client=>{
      const {error}=await client.from("leave_requests").delete().eq("id",r.id);
      if(error)throw error;
    },
    afterDelete:async()=>{
      state.selectedLeaveRequestId=null;
      toast("ลบคำขอลาแล้ว","ระบบบันทึกประวัติการลบไว้ใน Audit Log","success");
      await renderDashboard();
    }
  });
}

function leaveReviewModal(stage) {
  const r = selectedLeaveRequest();
  if (!r) return;
  const isPersonnel = stage === "personnel";
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `<div class="modal">
    <div class="modal-head"><div><h3>${isPersonnel ? "ตรวจคำขอลา" : "อนุมัติคำขอลาขั้นสุดท้าย"}</h3><p>${escapeHtml(r.requester_name)} · ${escapeHtml(leaveTypeName(r.leave_type_code,r.other_leave_text))} · ${Number(r.leave_days)} วัน</p></div><button class="modal-close">×</button></div>
    <div class="review-choice-grid">
      <button class="review-choice approve active" data-leave-decision="approve"><strong>✓ อนุมัติ</strong><span>${isPersonnel ? "ส่งต่อให้ผู้บริหาร" : "อนุมัติขั้นสุดท้าย"}</span></button>
      <button class="review-choice reject" data-leave-decision="reject"><strong>× ไม่อนุมัติ</strong><span>ยุติ Workflow และแจ้งผู้ลา</span></button>
    </div>
    <div class="field"><label>หมายเหตุ</label><textarea class="input textarea" id="leave-review-comment" placeholder="กรอกเหตุผลเมื่อไม่อนุมัติ"></textarea></div>
    <div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="confirm-leave-review">ยืนยัน</button></div>
  </div>`;
  document.body.appendChild(modal);
  let decision = "approve";
  const close=()=>modal.remove();
  modal.querySelector(".modal-close").addEventListener("click",close);
  modal.querySelector(".modal-cancel").addEventListener("click",close);
  modal.querySelectorAll("[data-leave-decision]").forEach(btn=>btn.addEventListener("click",()=>{
    decision=btn.dataset.leaveDecision;
    modal.querySelectorAll("[data-leave-decision]").forEach(x=>x.classList.toggle("active",x===btn));
  }));
  modal.querySelector("#confirm-leave-review").addEventListener("click",async e=>{
    const comment=modal.querySelector("#leave-review-comment").value.trim();
    if(decision==="reject"&&!comment) return toast("กรุณาระบุเหตุผล","การไม่อนุมัติต้องมีหมายเหตุ","error");
    buttonLoading(e.currentTarget,true,"กำลังบันทึก...");
    const rpc=isPersonnel?"personnel_review_leave_request":"director_review_leave_request";
    const {error}=await supabase.rpc(rpc,{p_leave_request_id:r.id,p_decision:decision,p_comment:comment||null});
    buttonLoading(e.currentTarget,false);
    if(error) return toast("ดำเนินการไม่สำเร็จ",friendlyLeaveError(error),"error");
    close();
    toast(decision==="approve"?"อนุมัติแล้ว":"บันทึกการไม่อนุมัติแล้ว",isPersonnel&&decision==="approve"?"ส่งต่อผู้บริหารเรียบร้อย":"ระบบส่งการแจ้งเตือนแล้ว","success");
    await renderDashboard();
  });
}

function leavePersonnelSkipped(request) {
  return request.status !== "draft"
    && !request.personnel_reviewed_at
    && request.requester_role === "department_head"
    && state.leaveActions.some(a=>a.leave_request_id===request.id&&a.action==="submit"&&a.to_status==="pending_director");
}

function leaveSignatureLine(title,name,date,note="") {
  return `<div class="leave-print-sign">
    <div class="leave-print-sign-space">ลงชื่อ _________________________________</div>
    <strong>${escapeHtml(title)}</strong>
    <span>(${escapeHtml(name || "........................................................")})</span>
    <small>${date ? `วันที่ดำเนินการในระบบ ${thaiDateTimeDocument(date)}` : "วันที่ ______ / ______ / ______"}</small>
    ${note ? `<em>${escapeHtml(note)}</em>` : ""}
  </div>`;
}

function leavePrintTypeLabel(name = "") {
  const value = String(name || "").trim();
  if (value.includes("ช่วยเหลือภริยา")) return "ช่วยภริยาคลอด";
  if (value.includes("อุปสมบท") || value.includes("ฮัจย์")) return "อุปสมบท/ฮัจย์";
  if (value.includes("ตรวจเลือก") || value.includes("เตรียมพล")) return "ตรวจเลือก/เตรียมพล";
  if (value.includes("ศึกษา") || value.includes("ฝึกอบรม") || value.includes("ดูงาน")) return "ศึกษา/ฝึกอบรม";
  if (value.includes("คลอดบุตร")) return "ลาคลอด";
  if (value.includes("กิจส่วนตัว")) return "ลากิจ";
  if (value.includes("ป่วย")) return "ลาป่วย";
  if (value.includes("อื่น")) return "อื่น ๆ";
  return value;
}

function leaveA4Styles() {
  return `${a4DocumentStyles()}
    .leave-print-title{font-size:19pt;font-weight:700;text-align:center;margin:3.5mm 0 2.5mm;}
    .leave-print-ref{display:flex;justify-content:space-between;font-size:12.5pt;margin-bottom:2mm;}
    .leave-print-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.2mm 7mm;font-size:14pt;}
    .leave-print-grid>div{display:grid;grid-template-columns:36mm 1fr;gap:2mm;border-bottom:1px dotted #aaa;padding:.7mm 0;}
    .leave-print-grid span{font-weight:700;}
    .leave-print-section{margin-top:2.5mm;font-size:14pt;line-height:1.35;}
    .leave-print-section h2{font-size:15pt;margin:0 0 1mm;}
    .leave-print-quota{border:1px solid #aaa;padding:1.3mm 1.8mm;margin-top:2mm;font-size:11.5pt;line-height:1.25;}
    .leave-print-stats-wrap{page-break-inside:avoid;}
    .leave-print-stats-table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:1.2mm;font-size:9.6pt;line-height:1.08;page-break-inside:avoid;}
    .leave-print-stats-table th,.leave-print-stats-table td{border:1px solid #555;padding:.8mm .45mm;text-align:center;vertical-align:middle;overflow-wrap:anywhere;}
    .leave-print-stats-table thead th{font-weight:700;background:#f7f7f7;}
    .leave-print-stats-table .leave-stat-label{width:17mm;font-weight:700;background:#fafafa;white-space:nowrap;}
    .leave-print-stats-table .leave-stat-total{width:12mm;font-weight:700;}
    .leave-print-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:5mm;page-break-inside:avoid;}
    .leave-print-sign{text-align:center;font-size:13pt;line-height:1.35;}
    .leave-print-sign-space{margin-bottom:1.5mm;white-space:nowrap;}
    .leave-print-sign strong,.leave-print-sign span,.leave-print-sign small,.leave-print-sign em{display:block;}
    .leave-print-sign small{font-size:11pt}.leave-print-sign em{font-size:10.5pt;color:#555;margin-top:1mm;}
    @media(max-width:700px){.leave-print-signatures{grid-template-columns:1fr}.leave-print-grid{grid-template-columns:1fr}}
  `;
}

function buildLeaveA4Html(request,assets={}) {
  const quota=leaveQuotaStats(request.requester_id,Number(request.academic_year),Number(request.semester));
  const submitted=request.submitted_at||request.created_at;
  const personnelSkipped=leavePersonnelSkipped(request);
  const status=LEAVE_STATUS_LABEL[request.status]||request.status;
  const stats=leaveTypeStatsForUser(request.requester_id,Number(request.academic_year),Number(request.semester));
  const totalTimes=stats.reduce((sum,s)=>sum+s.times,0);
  const totalDays=stats.reduce((sum,s)=>sum+s.days,0);
  return `<article class="a4-document"><div class="a4-document-inner">
    <header class="a4-doc-head">
      ${assets.schoolLogo?`<img class="a4-school-logo" src="${assets.schoolLogo}" alt="ตราโรงเรียน">`:""}
      <div class="a4-school-name">${escapeHtml(schoolName())}</div>
      <div class="a4-school-meta">${escapeHtml(schoolAddress())}</div>
      <div class="a4-school-meta">${escapeHtml(educationOffice())}</div>
    </header>
    <div class="leave-print-title">แบบคำขอ${escapeHtml(leaveTypeName(request.leave_type_code,request.other_leave_text))}</div>
    <div class="leave-print-ref"><span>เลขคำขอ #${request.request_no}</span><span>สถานะ: ${escapeHtml(status)}</span></div>
    <div class="leave-print-grid">
      <div><span>ชื่อผู้ลา</span><strong>${escapeHtml(request.requester_name)}</strong></div>
      <div><span>ตำแหน่ง</span><strong>${escapeHtml(request.requester_position||ROLE_LABEL[request.requester_role]||request.requester_role)}</strong></div>
      <div><span>ตั้งแต่วันที่</span><strong>${thaiDateOnly(request.start_date)}</strong></div>
      <div><span>ถึงวันที่</span><strong>${thaiDateOnly(request.end_date)}</strong></div>
      <div><span>จำนวนวันลา</span><strong>${Number(request.leave_days)} วัน</strong></div>
      <div><span>ปีการศึกษา / ภาคเรียน</span><strong>${escapeHtml(String(request.academic_year||"—"))} / ภาคเรียนที่ ${escapeHtml(String(request.semester||"—"))}</strong></div>
    </div>
    <section class="leave-print-section"><h2>เหตุผลการลา</h2><div>${escapeHtml(request.reason)}</div></section>
    <section class="leave-print-section"><h2>สถานที่/ช่องทางติดต่อระหว่างลา</h2><div>${escapeHtml(request.contact_during_leave||"—")} ${request.contact_phone?`· โทร ${escapeHtml(request.contact_phone)}`:""}</div></section>

    <section class="leave-print-section leave-print-stats-wrap">
      <h2>สถิติการลา ภาคเรียนที่ ${escapeHtml(String(request.semester||"—"))} ปีการศึกษา ${escapeHtml(String(request.academic_year||"—"))}</h2>
      <table class="leave-print-stats-table">
        <thead><tr>
          <th class="leave-stat-label">รายการ</th>
          ${stats.map(s=>`<th>${escapeHtml(leavePrintTypeLabel(s.name))}</th>`).join("")}
          <th class="leave-stat-total">รวม</th>
        </tr></thead>
        <tbody>
          <tr>
            <th class="leave-stat-label">จำนวนครั้ง</th>
            ${stats.map(s=>`<td>${s.times}</td>`).join("")}
            <th class="leave-stat-total">${totalTimes}</th>
          </tr>
          <tr>
            <th class="leave-stat-label">จำนวนวัน</th>
            ${stats.map(s=>`<td>${Number(s.days.toFixed(1))}</td>`).join("")}
            <th class="leave-stat-total">${Number(totalDays.toFixed(1))}</th>
          </tr>
        </tbody>
      </table>
      <div class="leave-print-quota">โควตาติดตามภาคเรียนที่ ${escapeHtml(String(request.semester||"—"))} ปีการศึกษา ${escapeHtml(String(request.academic_year||"—"))}: ใช้ ${quota.usedTimes}/${quota.maxTimes} ครั้ง · ${Number(quota.usedDays.toFixed(1))}/${quota.maxDays} วัน · คงเหลือ ${quota.remainingTimes} ครั้ง / ${Number(quota.remainingDays.toFixed(1))} วัน</div>
    </section>

    <div class="leave-print-signatures">
      ${leaveSignatureLine("ผู้ลา",request.requester_name,submitted,"ผู้ยื่นคำขอผ่านระบบ")}
      ${personnelSkipped
        ? leaveSignatureLine("หัวหน้ากลุ่มงานบริหารงานบุคคล",request.requester_name,null,"ข้ามขั้นตอน เนื่องจากเป็นผู้ยื่นคำขอเอง — ส่งตรงผู้บริหาร")
        : leaveSignatureLine("หัวหน้ากลุ่มงานบริหารงานบุคคล",request.personnel_reviewer_name,request.personnel_reviewed_at,request.personnel_reviewed_at?"ตรวจในระบบแล้ว — ลงนามสดหลังพิมพ์":"รอการตรวจ")}
      ${leaveSignatureLine("ผู้อำนวยการโรงเรียน",request.director_reviewer_name,request.director_reviewed_at,request.director_reviewed_at?"ดำเนินการในระบบแล้ว — ลงนามสดหลังพิมพ์":"รอการอนุมัติ")}
    </div>
    <footer class="a4-foot"><span>ระบบวันลา · ${escapeHtml(appName())}</span><span>พิมพ์เมื่อ ${thaiDateTimeDocument(new Date().toISOString())}</span></footer>
  </div></article>`;
}

function leaveReportPrintStyles() {
  return `${a4DocumentStyles()}
    @page{size:A4 landscape;margin:10mm;}
    .a4-document{width:277mm;min-height:190mm;padding:0;box-shadow:none;}
    .a4-document-inner{padding:8mm 9mm;}
    .leave-report-title{text-align:center;font-size:20pt;font-weight:700;margin:3mm 0 1mm;}
    .leave-report-sub{text-align:center;font-size:14pt;margin-bottom:4mm;}
    .leave-report-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm;margin:3mm 0 4mm;}
    .leave-report-summary>div{border:1px solid #777;padding:2mm;text-align:center;font-size:12pt;}
    .leave-report-summary strong{display:block;font-size:17pt;}
    .leave-report-table{width:100%;border-collapse:collapse;font-size:10.5pt;}
    .leave-report-table th,.leave-report-table td{border:1px solid #666;padding:1mm 1.2mm;text-align:center;vertical-align:middle;}
    .leave-report-table th{font-weight:700;background:#f5f5f5;}
    .leave-report-table td.name,.leave-report-table td.position{text-align:left;}
    .leave-report-table thead{display:table-header-group;}
    .leave-report-table tr{page-break-inside:avoid;}
    .leave-report-legend{font-size:10pt;margin-top:2mm;}
    .leave-report-signatures{display:grid;grid-template-columns:1fr 1fr;gap:25mm;margin-top:10mm;page-break-inside:avoid;}
    .leave-report-sign{text-align:center;font-size:13pt;line-height:1.5;}
    .leave-report-sign strong,.leave-report-sign span,.leave-report-sign small{display:block;}
    .leave-report-person-table{width:100%;border-collapse:collapse;font-size:12pt;margin-top:3mm;}
    .leave-report-person-table th,.leave-report-person-table td{border:1px solid #777;padding:1.3mm;text-align:center;}
    .leave-report-person-table td:nth-child(2),.leave-report-person-table td:nth-child(3){text-align:left;}
    .leave-print-grid{display:grid;grid-template-columns:1fr 1fr;gap:2mm 8mm;font-size:14pt;margin-top:3mm;}
    .leave-print-grid>div{display:grid;grid-template-columns:42mm 1fr;gap:2mm;border-bottom:1px dotted #aaa;padding:1mm 0;}
    .leave-print-grid span{font-weight:700;}
    .leave-print-section{margin-top:4mm;font-size:14pt;line-height:1.4;}
    .leave-print-section h2{font-size:15.5pt;margin:0 0 1.5mm;}
  `;
}

function leaveReportSignature(title, name = "") {
  const displayName = name || "____________________________________";
  return `<div class="leave-report-sign"><div>ลงชื่อ ____________________________________</div><strong>${escapeHtml(title)}</strong><span>(${escapeHtml(displayName)})</span><small>วันที่ ______ / ______ / ______</small></div>`;
}

function buildSchoolLeaveReportHtml(assets={}) {
  const rows=schoolLeaveSummaryRows();
  const stats=leavePeriodOverviewStats();
  const activeTypes=state.leaveTypes;
  const signers=leaveReportSigners();
  return `<article class="a4-document"><div class="a4-document-inner">
    <header class="a4-doc-head">
      ${assets.schoolLogo?`<img class="a4-school-logo" src="${assets.schoolLogo}" alt="ตราโรงเรียน">`:""}
      <div class="a4-school-name">${escapeHtml(schoolName())}</div>
      <div class="a4-school-meta">${escapeHtml(schoolAddress())}</div>
      <div class="a4-school-meta">${escapeHtml(educationOffice())}</div>
    </header>
    <div class="leave-report-title">รายงานสรุปการลาของข้าราชการและบุคลากรทางการศึกษา</div>
    <div class="leave-report-sub">${escapeHtml(leavePeriodLabel())}</div>
    <div class="leave-report-summary">
      <div><span>บุคลากรทั้งหมด</span><strong>${stats.totalPeople}</strong><small>คน</small></div>
      <div><span>มีการลา</span><strong>${stats.peopleWithLeave}</strong><small>คน</small></div>
      <div><span>จำนวนการลา</span><strong>${stats.totalTimes}</strong><small>ครั้ง</small></div>
      <div><span>จำนวนวันลา</span><strong>${Number(stats.totalDays.toFixed(1))}</strong><small>วัน</small></div>
    </div>
    <table class="leave-report-table"><thead><tr><th rowspan="2">#</th><th rowspan="2">ชื่อ-สกุล</th><th rowspan="2">ตำแหน่ง</th>${activeTypes.map(t=>`<th>${escapeHtml(t.name_th)}</th>`).join("")}<th rowspan="2">รวมครั้ง</th><th rowspan="2">รวมวัน</th></tr><tr>${activeTypes.map(()=>`<th>ครั้ง/วัน</th>`).join("")}</tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${r.index}</td><td class="name">${escapeHtml(r.name)}</td><td class="position">${escapeHtml(r.position)}</td>${activeTypes.map(t=>{const s=r.typeStats.find(x=>x.code===t.code)||{times:0,days:0};return `<td>${s.times}/${Number(s.days.toFixed(1))}</td>`}).join("")}<td>${r.times}</td><td>${Number(r.days.toFixed(1))}</td></tr>`).join("")}
    </tbody></table>
    <div class="leave-report-legend">หมายเหตุ: ช่องประเภทลาแสดง “จำนวนครั้ง / จำนวนวัน” และแสดงบุคลากร Active ทุกคน แม้ไม่มีการลา</div>
    <div class="leave-report-signatures">${leaveReportSignature("หัวหน้ากลุ่มงานบริหารงานบุคคล",signers.personnelHeadName)}${leaveReportSignature("ผู้อำนวยการโรงเรียน",signers.directorName)}</div>
    <footer class="a4-foot"><span>รายงานภาพรวมวันลา · ${escapeHtml(appName())}</span><span>พิมพ์เมื่อ ${thaiDateTimeDocument(new Date().toISOString())}</span></footer>
  </div></article>`;
}

function buildPersonLeaveReportHtml(userId,assets={}) {
  const profile=state.leaveRoster.find(p=>p.id===userId);
  const signers=leaveReportSigners();
  const name=profile?.full_name||profile?.email||leaveRosterName(userId);
  const position=leaveRosterPosition(userId);
  const requests=leavePeriodRequests({userId}).sort((a,b)=>new Date(a.start_date)-new Date(b.start_date));
  const approved=requests.filter(r=>r.status==="approved");
  const stats=leaveTypeStatsForUser(userId);
  const totalDays=approved.reduce((sum,r)=>sum+Number(r.leave_days||0),0);
  return `<article class="a4-document"><div class="a4-document-inner">
    <header class="a4-doc-head">
      ${assets.schoolLogo?`<img class="a4-school-logo" src="${assets.schoolLogo}" alt="ตราโรงเรียน">`:""}
      <div class="a4-school-name">${escapeHtml(schoolName())}</div>
      <div class="a4-school-meta">${escapeHtml(schoolAddress())}</div>
      <div class="a4-school-meta">${escapeHtml(educationOffice())}</div>
    </header>
    <div class="leave-report-title">รายงานสรุปวันลารายบุคคล</div>
    <div class="leave-report-sub">${escapeHtml(leavePeriodLabel())}</div>
    <div class="leave-print-grid">
      <div><span>ชื่อ-สกุล</span><strong>${escapeHtml(name)}</strong></div>
      <div><span>ตำแหน่ง</span><strong>${escapeHtml(position)}</strong></div>
      <div><span>จำนวนครั้งอนุมัติ</span><strong>${approved.length} ครั้ง</strong></div>
      <div><span>จำนวนวันอนุมัติ</span><strong>${Number(totalDays.toFixed(1))} วัน</strong></div>
    </div>
    <section class="leave-print-section"><h2>สรุปแยกประเภทการลา</h2><table class="leave-report-person-table"><thead><tr><th>ประเภทลา</th><th>จำนวนครั้ง</th><th>จำนวนวัน</th></tr></thead><tbody>
      ${stats.map(s=>`<tr><td>${escapeHtml(s.name)}</td><td>${s.times}</td><td>${Number(s.days.toFixed(1))}</td></tr>`).join("")}
    </tbody></table></section>
    <section class="leave-print-section"><h2>ประวัติรายการลา</h2><table class="leave-report-person-table"><thead><tr><th>#</th><th>ประเภท</th><th>ช่วงวันที่</th><th>วัน</th><th>สถานะ</th></tr></thead><tbody>
      ${requests.length?requests.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(leaveTypeName(r.leave_type_code,r.other_leave_text))}</td><td>${thaiDateOnly(r.start_date)} – ${thaiDateOnly(r.end_date)}</td><td>${Number(r.leave_days)}</td><td>${escapeHtml(LEAVE_STATUS_LABEL[r.status]||r.status)}</td></tr>`).join(""):`<tr><td colspan="5">ไม่มีรายการลาในช่วงที่เลือก</td></tr>`}
    </tbody></table></section>
    <div class="leave-report-signatures">${leaveReportSignature("หัวหน้ากลุ่มงานบริหารงานบุคคล",signers.personnelHeadName)}${leaveReportSignature("ผู้อำนวยการโรงเรียน",signers.directorName)}</div>
    <footer class="a4-foot"><span>รายงานวันลารายบุคคล · ${escapeHtml(appName())}</span><span>พิมพ์เมื่อ ${thaiDateTimeDocument(new Date().toISOString())}</span></footer>
  </div></article>`;
}

async function openLeaveReportPreview(kind) {
  if (!canSeeLeaveOverview()) return toast("ไม่มีสิทธิ์","รายงานภาพรวมสำหรับฝ่ายบุคคล/ผู้บริหารเท่านั้น","error");
  const personId=state.leaveReportPersonId || state.leaveRoster[0]?.id;
  if(kind==="person"&&!personId) return toast("ไม่พบบุคลากร","กรุณาเลือกบุคลากร","error");
  const modal=document.createElement("div");
  modal.className="modal-backdrop a4-preview-backdrop";
  modal.innerHTML=`<div class="a4-preview-shell"><div class="a4-preview-toolbar"><div><strong>${kind==="school"?"รายงานภาพรวมวันลาทั้งโรงเรียน":"รายงานวันลารายบุคคล"}</strong><span>${escapeHtml(leavePeriodLabel())} · รอเซ็นสดหลังพิมพ์</span></div><div class="a4-preview-actions"><button class="btn btn-ghost" id="leave-report-close">ปิด</button><button class="btn btn-primary" id="leave-report-print">พิมพ์ / บันทึก PDF</button></div></div><div class="a4-preview-loading">กำลังเตรียมรายงาน...</div></div>`;
  document.body.appendChild(modal);
  modal.querySelector("#leave-report-close").addEventListener("click",()=>modal.remove());
  const schoolLogo=await schoolLogoDataUrl();
  const html=kind==="school"?buildSchoolLeaveReportHtml({schoolLogo}):buildPersonLeaveReportHtml(personId,{schoolLogo});
  modal.querySelector(".a4-preview-loading").outerHTML=`<div class="a4-preview-scroll"><style>${leaveReportPrintStyles()}</style>${html}</div>`;
  modal.querySelector("#leave-report-print").addEventListener("click",()=>printLeaveReport(kind,personId,{schoolLogo}));
}

function printLeaveReport(kind,personId,assets) {
  const w=window.open("","_blank");
  if(!w) return toast("เปิดหน้าพิมพ์ไม่ได้","กรุณาอนุญาต Pop-up สำหรับเว็บไซต์นี้","error");
  const body=kind==="school"?buildSchoolLeaveReportHtml(assets):buildPersonLeaveReportHtml(personId,assets);
  const title=kind==="school"?"รายงานภาพรวมวันลา":"รายงานวันลารายบุคคล";
  const html=`<!doctype html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${leaveReportPrintStyles()}</style></head><body class="a4-print-body">${body}<script>window.addEventListener('load',()=>{const imgs=[...document.images];Promise.all([document.fonts?document.fonts.ready:Promise.resolve(),...imgs.map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r;}))]).finally(()=>setTimeout(()=>window.print(),250));});<\/script></body></html>`;
  try{w.opener=null;}catch{}
  w.document.open();w.document.write(html);w.document.close();
}

async function leaveA4Preview() {
  const request=selectedLeaveRequest();
  if(!request) return;
  const modal=document.createElement("div");
  modal.className="modal-backdrop a4-preview-backdrop";
  modal.innerHTML=`<div class="a4-preview-shell"><div class="a4-preview-toolbar"><div><strong>แบบคำขอลา A4</strong><span>เว้นช่องลายเซ็นสำหรับเซ็นสดหลังพิมพ์</span></div><div class="a4-preview-actions"><button class="btn btn-ghost" id="leave-a4-close">ปิด</button><button class="btn btn-primary" id="leave-a4-print">พิมพ์ / บันทึก PDF</button></div></div><div class="a4-preview-loading">กำลังเตรียมเอกสาร...</div></div>`;
  document.body.appendChild(modal);
  modal.querySelector("#leave-a4-close").addEventListener("click",()=>modal.remove());
  const schoolLogo=await schoolLogoDataUrl();
  const assets={schoolLogo};
  modal.querySelector(".a4-preview-loading").outerHTML=`<div class="a4-preview-scroll"><style>${leaveA4Styles()}</style>${buildLeaveA4Html(request,assets)}</div>`;
  modal.querySelector("#leave-a4-print").addEventListener("click",()=>printLeaveA4(request,assets));
}

function printLeaveA4(request,assets) {
  const w=window.open("","_blank");
  if(!w) return toast("เปิดหน้าพิมพ์ไม่ได้","กรุณาอนุญาต Pop-up สำหรับเว็บไซต์นี้","error");
  const html=`<!doctype html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ใบลา #${request.request_no}</title><style>${leaveA4Styles()}</style></head><body class="a4-print-body">${buildLeaveA4Html(request,assets)}<script>window.addEventListener('load',()=>{const imgs=[...document.images];Promise.all([document.fonts?document.fonts.ready:Promise.resolve(),...imgs.map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r;}))]).finally(()=>setTimeout(()=>window.print(),250));});<\/script></body></html>`;
  try{w.opener=null;}catch{}
  w.document.open();w.document.write(html);w.document.close();
}


const TIMETABLE_DAY_LABEL = {
  1: "วันจันทร์",
  2: "วันอังคาร",
  3: "วันพุธ",
  4: "วันพฤหัสบดี",
  5: "วันศุกร์",
  6: "วันเสาร์",
  7: "วันอาทิตย์",
};

const TIMETABLE_STAGE_LABEL = {
  early_childhood: "ปฐมวัย",
  stage1: "ช่วงชั้นที่ 1",
  stage2: "ช่วงชั้นที่ 2",
  stage3: "ช่วงชั้นที่ 3",
};

function timetableStageHeadRowsForYear(academicYear = currentTimetablePeriod().academicYear) {
  return state.timetableStageHeads.filter(row =>
    row.teacher_id === state.user?.id
    && String(row.academic_year) === String(academicYear)
  );
}

function isTimetableStageHead(academicYear = currentTimetablePeriod().academicYear) {
  return timetableStageHeadRowsForYear(academicYear).length > 0;
}

function timetableStageHeadCodes(academicYear = currentTimetablePeriod().academicYear) {
  return [...new Set(timetableStageHeadRowsForYear(academicYear).map(row => row.stage_code))];
}

function canManageSchoolTimetableMaster() {
  return isAcademicHead();
}

function canManageTimetable() {
  return isAcademicHead() || isTimetableStageHead();
}

function canManageTimetableClassLocal(classRow) {
  if (!classRow) return false;
  if (isAcademicHead()) return true;
  return timetableStageHeadRowsForYear(classRow.academic_year)
    .some(row => row.stage_code === classRow.stage_code);
}

function timetableManagerScopeLabel() {
  if (isAcademicHead()) return "ทั้งโรงเรียน";
  const labels = timetableStageHeadCodes().map(code => TIMETABLE_STAGE_LABEL[code] || code);
  return labels.length ? labels.join(" / ") : "เฉพาะช่วงชั้นที่ได้รับมอบหมาย";
}

function canViewAllTimetables() {
  return isAcademicHead() || ["director","super_admin"].includes(state.profile?.role);
}

function schoolClassLabel(c) {
  if (!c) return "—";
  const room = String(c.room_name || "").trim();
  return room ? `${c.level_name}/${room}` : c.level_name;
}

function timeShort(value) {
  return String(value || "").slice(0,5) || "—";
}

function currentTimetablePeriod() {
  const p = currentAcademicPeriod();
  return {
    academicYear: Number(state.timetableAcademicYear || p.academicYear),
    semester: Number(state.timetableSemester || p.semester),
  };
}

function timetableProfileForClass(classId) {
  return state.timetableProfiles.find(x => x.class_id === classId) || null;
}

function selectedTimetableClass() {
  return state.timetableClasses.find(c => c.id === state.timetableSelectedClassId) || null;
}

function selectedTimetableProfile() {
  return timetableProfileForClass(state.timetableSelectedClassId);
}

function timetablePeriodsFor(timetableId) {
  return state.timetablePeriods
    .filter(p => p.timetable_id === timetableId)
    .sort((a,b) => Number(a.sort_order) - Number(b.sort_order));
}

function timetableAssignmentsForClass(classId) {
  return state.timetableAssignments.filter(a => a.class_id === classId && a.is_active !== false);
}

function timetableEntriesFor(timetableId) {
  return state.timetableEntries.filter(e => e.timetable_id === timetableId);
}

function timetableAssignmentDetails(id) {
  const a = state.timetableAssignments.find(x => x.id === id);
  if (!a) return null;
  return {
    ...a,
    subject: state.timetableSubjects.find(s => s.id === a.subject_id) || null,
    classRow: state.timetableClasses.find(c => c.id === a.class_id) || null,
  };
}

function timetableTeacherName(id) {
  return state.timetableTeachers.find(t => t.id === id)?.full_name
    || state.timetableTeachers.find(t => t.id === id)?.email
    || state.timetableAssignments.find(a => a.teacher_id === id)?.teacher_name
    || (id === state.user.id ? (state.profile.full_name || state.profile.email) : "")
    || "ครูผู้สอน";
}

function timetableAcademicYears() {
  if (!isAcademicHead()) {
    const stageYears = new Set(
      state.timetableStageHeads
        .filter(row => row.teacher_id === state.user?.id)
        .map(row => Number(row.academic_year))
        .filter(Boolean)
    );
    if (stageYears.size) return [...stageYears].sort((a,b) => b-a);
  }
  const values = new Set(state.timetableClasses.map(c => Number(c.academic_year)).filter(Boolean));
  values.add(currentAcademicPeriod().academicYear);
  return [...values].sort((a,b) => b-a);
}

function timetableFilteredClasses({visibleOnly=false} = {}) {
  const p = currentTimetablePeriod();
  let rows = state.timetableClasses.filter(c =>
    Number(c.academic_year) === p.academicYear
    && Number(c.semester) === p.semester
    && c.is_active !== false
  );
  if (canManageTimetable() && !isAcademicHead()) {
    rows = rows.filter(c => canManageTimetableClassLocal(c));
  } else if (visibleOnly && !canManageTimetable() && !["director","super_admin"].includes(state.profile.role)) {
    const ids = new Set(state.timetableProfiles.map(tp => tp.class_id));
    rows = rows.filter(c => ids.has(c.id));
  }
  return rows.sort((a,b) =>
    Number(a.sort_order || 0) - Number(b.sort_order || 0)
    || String(a.level_name).localeCompare(String(b.level_name),"th")
    || String(a.room_name).localeCompare(String(b.room_name),"th")
  );
}

function timetableOwnHomeroomClassIds() {
  return state.timetableHomerooms.filter(h => h.teacher_id === state.user.id).map(h => h.class_id);
}

function timetableOwnStageHeadRows() {
  return state.timetableStageHeads.filter(h => h.teacher_id === state.user.id);
}

function timetableStudentExportClassIds() {
  if (canViewAllTimetables()) return state.timetableProfiles.map(tp => tp.class_id);
  const allowed = new Set(timetableOwnHomeroomClassIds());
  const stageRows = timetableOwnStageHeadRows();
  if (stageRows.length) {
    const years = new Set(stageRows.map(s => String(s.academic_year)));
    for (const c of state.timetableClasses) {
      if (years.has(String(c.academic_year))) allowed.add(c.id);
    }
    return [...allowed];
  }
  return [...allowed];
}

async function loadTimetableWorkspace() {
  const ownStageHeadsRes = await supabase
    .from("stage_heads")
    .select("*")
    .eq("teacher_id", state.user.id)
    .order("academic_year", { ascending: false });

  state.timetableStageHeads = ownStageHeadsRes.error ? [] : (ownStageHeadsRes.data || []);
  const hasStageHeadCapability = state.timetableStageHeads.length > 0;
  const canLoadRoster = isAcademicHead() || hasStageHeadCapability || ["director","super_admin"].includes(state.profile.role);
  const canLoadPeriodMaster = isAcademicHead() || hasStageHeadCapability || ["director","super_admin"].includes(state.profile.role);

  const [classesRes, profilesRes, periodsRes, periodTemplatesRes, periodTemplateItemsRes, subjectsRes, assignmentsRes, entriesRes, homeroomsRes, stageHeadsRes, teachersRes] = await Promise.all([
    supabase.from("school_classes").select("*").eq("is_active",true).order("academic_year",{ascending:false}).order("semester").order("sort_order").order("level_name").order("room_name"),
    supabase.from("timetable_profiles").select("*").order("created_at"),
    supabase.from("timetable_periods").select("*").order("sort_order"),
    canLoadPeriodMaster
      ? supabase.from("timetable_period_templates").select("*").order("academic_year",{ascending:false}).order("semester")
      : Promise.resolve({ data: [], error: null }),
    canLoadPeriodMaster
      ? supabase.from("timetable_period_template_items").select("*").order("sort_order")
      : Promise.resolve({ data: [], error: null }),
    supabase.from("academic_subjects").select("*").eq("is_active",true).order("subject_name"),
    supabase.from("teaching_assignments").select("*").eq("is_active",true).order("created_at"),
    supabase.from("timetable_entries").select("*").order("weekday").order("created_at"),
    supabase.from("homeroom_teachers").select("*").order("created_at"),
    canLoadRoster
      ? supabase.from("stage_heads").select("*").order("academic_year",{ascending:false})
      : Promise.resolve({ data: state.timetableStageHeads, error: null }),
    canLoadRoster
      ? supabase.from("profiles").select("id,email,full_name,role,department_id").in("role",["teacher","department_head"]).eq("account_status","active").is("deleted_at",null).order("full_name")
      : Promise.resolve({ data: [{id:state.user.id,email:state.profile.email,full_name:state.profile.full_name,role:state.profile.role,department_id:state.profile.department_id}], error:null }),
  ]);

  state.timetableClasses = classesRes.error ? [] : (classesRes.data || []);
  state.timetableProfiles = profilesRes.error ? [] : (profilesRes.data || []);
  state.timetablePeriods = periodsRes.error ? [] : (periodsRes.data || []);
  state.timetablePeriodTemplates = periodTemplatesRes.error ? [] : (periodTemplatesRes.data || []);
  state.timetablePeriodTemplateItems = periodTemplateItemsRes.error ? [] : (periodTemplateItemsRes.data || []);
  state.timetableSubjects = subjectsRes.error ? [] : (subjectsRes.data || []);
  state.timetableAssignments = assignmentsRes.error ? [] : (assignmentsRes.data || []);
  state.timetableEntries = entriesRes.error ? [] : (entriesRes.data || []);
  state.timetableHomerooms = homeroomsRes.error ? [] : (homeroomsRes.data || []);
  state.timetableStageHeads = stageHeadsRes.error ? state.timetableStageHeads : (stageHeadsRes.data || []);
  state.timetableTeachers = teachersRes.error ? [] : (teachersRes.data || []);

  const nowPeriod = currentAcademicPeriod();
  const ownStageYears = state.timetableStageHeads
    .filter(row => row.teacher_id === state.user.id)
    .map(row => Number(row.academic_year))
    .filter(Boolean);

  if (!state.timetableAcademicYear) {
    state.timetableAcademicYear = !isAcademicHead() && ownStageYears.length
      ? (ownStageYears.includes(nowPeriod.academicYear) ? nowPeriod.academicYear : ownStageYears[0])
      : nowPeriod.academicYear;
  }
  if (!state.timetableSemester) state.timetableSemester = nowPeriod.semester;

  const filtered = timetableFilteredClasses({visibleOnly:true});
  if (!state.timetableSelectedClassId || !filtered.some(c => c.id === state.timetableSelectedClassId)) {
    state.timetableSelectedClassId = filtered[0]?.id || null;
  }

  if (!state.timetableExportClassId || !filtered.some(c => c.id === state.timetableExportClassId)) {
    state.timetableExportClassId = timetableStudentExportClassIds().find(id => filtered.some(c => c.id === id))
      || filtered[0]?.id
      || null;
  }

  if (!state.timetableExportTeacherId) {
    state.timetableExportTeacherId = canViewAllTimetables()
      ? (state.timetableTeachers[0]?.id || state.user.id)
      : state.user.id;
  }

  if (canManageTimetable() && !["setup","periods","planner","export","mine"].includes(state.timetableView)) {
    state.timetableView = "planner";
  }
}

function timetablePeriodFiltersHtml() {
  const p = currentTimetablePeriod();
  return `<div class="timetable-period-filter">
    <div class="field"><label>ปีการศึกษา</label><select class="select" id="timetable-year">
      ${timetableAcademicYears().map(y=>`<option value="${y}" ${y===p.academicYear?"selected":""}>${y}</option>`).join("")}
    </select></div>
    <div class="field"><label>ภาคเรียน</label><select class="select" id="timetable-semester">
      <option value="1" ${p.semester===1?"selected":""}>1</option>
      <option value="2" ${p.semester===2?"selected":""}>2</option>
      <option value="3" ${p.semester===3?"selected":""}>3</option>
    </select></div>
  </div>`;
}

function currentTimetablePeriodTemplate() {
  const p = currentTimetablePeriod();
  return state.timetablePeriodTemplates.find(t =>
    Number(t.academic_year) === Number(p.academicYear)
    && Number(t.semester) === Number(p.semester)
  ) || null;
}

function timetablePeriodTemplateItems(templateId) {
  return state.timetablePeriodTemplateItems
    .filter(i => i.template_id === templateId)
    .sort((a,b) => Number(a.sort_order) - Number(b.sort_order));
}

function timetablePeriodModeLabel(profile) {
  return profile?.period_mode === "shared" ? "ใช้คาบกลางของโรงเรียน" : "กำหนดเฉพาะห้อง";
}

function timetablePeriodPreviewHtml(items = []) {
  if (!items.length) return `<div class="empty compact"><strong>ยังไม่ได้กำหนดคาบ</strong><span>สร้างคาบเรียน เวลา และพักกลางวันก่อน</span></div>`;
  return `<div class="period-preview-strip">${items.map(i => i.is_break
    ? `<div class="period-preview-item lunch"><strong>คาบ ${i.period_no}</strong><span>พักกลางวัน · ${timeShort(i.start_time)}–${timeShort(i.end_time)}</span></div>`
    : `<div class="period-preview-item"><strong>คาบ ${i.period_no}</strong><span>${timeShort(i.start_time)}–${timeShort(i.end_time)}</span></div>`
  ).join("")}</div>`;
}

function timetablePeriodSettingsHtml() {
  const p = currentTimetablePeriod();
  const template = currentTimetablePeriodTemplate();
  const templateItems = template ? timetablePeriodTemplateItems(template.id) : [];
  const classes = timetableFilteredClasses();
  const classIds = new Set(classes.map(c => c.id));
  const linkedProfiles = state.timetableProfiles.filter(tp =>
    classIds.has(tp.class_id)
    && tp.period_mode === "shared"
    && tp.period_template_id === template?.id
  );
  const customProfiles = state.timetableProfiles.filter(tp =>
    classIds.has(tp.class_id)
    && tp.period_mode !== "shared"
  );
  const schoolMaster = canManageSchoolTimetableMaster();
  const scopeText = isAcademicHead() ? "ทุกห้องในโรงเรียน" : `ทุกห้องใน ${timetableManagerScopeLabel()}`;

  return `${timetablePeriodFiltersHtml()}
    <section class="period-setting-intro">
      <div><span class="eyebrow dark">Period Master Settings</span><h3>ตั้งค่าคาบเรียน</h3><p>${isAcademicHead() ? "กำหนดคาบกลางทั้งโรงเรียน หรือแยกเวลาเฉพาะบางชั้น/ห้อง" : `จัดการคาบเรียนเฉพาะ ${escapeHtml(timetableManagerScopeLabel())} โดยสามารถใช้คาบกลางที่หัวหน้าวิชาการกำหนดไว้ หรือแยกเวลาเฉพาะห้องได้`}</p></div>
    </section>

    <div class="period-mode-choice-grid">
      <article class="period-mode-choice ${template ? "ready" : ""}">
        <div class="period-mode-icon">🏫</div>
        <div><strong>ใช้เหมือนกันทั้งโรงเรียน</strong><p>${schoolMaster ? "สร้างคาบกลาง 1 ชุดสำหรับปีการศึกษา/ภาคเรียน แล้วนำไปใช้กับทุกห้อง" : "ใช้คาบกลางที่หัวหน้ากลุ่มงานบริหารงานวิชาการกำหนดไว้ โดยหัวหน้าช่วงชั้นไม่แก้ Master กลางของทั้งโรงเรียน"}</p></div>
        <div class="period-choice-meta"><span>${template ? `${templateItems.length} คาบรวมพักกลางวัน · พักคาบ ${templateItems.find(i=>i.is_break)?.period_no || "—"}` : "ยังไม่ได้ตั้งค่า"}</span><small>ใช้ในขอบเขตนี้ ${linkedProfiles.length} ห้อง</small></div>
        <div class="period-choice-actions">
          ${schoolMaster ? `<button class="btn btn-secondary" id="edit-school-period-template">${template ? "แก้ไขคาบกลาง" : "สร้างคาบกลาง"}</button>` : ""}
          <button class="btn btn-primary" id="apply-school-periods-all" ${template && classes.length ? "" : "disabled"}>ใช้กับ${escapeHtml(scopeText)}</button>
        </div>
      </article>

      <article class="period-mode-choice custom">
        <div class="period-mode-icon">🏷</div>
        <div><strong>กำหนดไม่เหมือนกัน</strong><p>ห้องที่เวลาเรียนต่างจากส่วนกลางสามารถแยกออกมาแก้วันเรียน/เวลา/จำนวนคาบได้เอง</p></div>
        <div class="period-choice-meta"><span>${customProfiles.length} ห้องแบบกำหนดเอง</span><small>ห้องอื่นยังใช้คาบกลางได้ตามปกติ</small></div>
      </article>
    </div>

    <section class="panel school-period-master">
      <div class="panel-head"><div class="panel-title-wrap"><h3>คาบกลางของโรงเรียน</h3><p>ปีการศึกษา ${p.academicYear} · ภาคเรียนที่ ${p.semester}</p></div>${template ? `<span class="pill active">พร้อมใช้งาน</span>` : `<span class="pill pending">ยังไม่ตั้งค่า</span>`}</div>
      ${template
        ? `<div class="period-school-days"><strong>วันเรียน:</strong> ${(template.weekdays||[]).map(d=>escapeHtml(TIMETABLE_DAY_LABEL[d]||String(d))).join(" · ")}</div>${timetablePeriodPreviewHtml(templateItems)}`
        : schoolMaster
          ? `<div class="empty"><strong>ยังไม่มีคาบกลางของโรงเรียน</strong><span>สร้างครั้งเดียวแล้วเลือกให้ทุกชั้น/ห้องใช้ร่วมกันได้</span><button class="btn btn-primary" id="create-school-period-template">สร้างคาบกลาง</button></div>`
          : `<div class="empty"><strong>หัวหน้าวิชาการยังไม่ได้สร้างคาบกลาง</strong><span>หัวหน้าช่วงชั้นยังสามารถเลือก “กำหนดเฉพาะห้อง” และตั้งเวลาให้ห้องในช่วงชั้นของตนเองได้</span></div>`
      }
    </section>

    <section class="panel period-class-mapping">
      <div class="panel-head"><div class="panel-title-wrap"><h3>รูปแบบคาบของแต่ละชั้น / ห้อง</h3><p>${isAcademicHead() ? "กำหนดว่าห้องไหนใช้คาบกลาง และห้องไหนต้องมีเวลาเฉพาะ" : `แสดงเฉพาะห้องใน ${escapeHtml(timetableManagerScopeLabel())}`}</p></div></div>
      ${classes.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>ชั้น / ห้อง</th><th>รูปแบบคาบ</th><th>จำนวนคาบ</th><th>สถานะตาราง</th><th></th></tr></thead><tbody>
        ${classes.map(c=>{
          const tp=timetableProfileForClass(c.id);
          const periods=tp?timetablePeriodsFor(tp.id):[];
          const hasEntries=tp?timetableEntriesFor(tp.id).length>0:false;
          return `<tr>
            <td><strong>${escapeHtml(schoolClassLabel(c))}</strong><br><span class="table-muted">${escapeHtml(TIMETABLE_STAGE_LABEL[c.stage_code]||c.stage_code)}</span></td>
            <td><span class="pill ${tp?.period_mode==="shared"?"active":"neutral"}">${escapeHtml(timetablePeriodModeLabel(tp))}</span></td>
            <td>${periods.length || 0} คาบ${periods.find(x=>x.is_break)?.period_no ? ` · พักคาบ ${periods.find(x=>x.is_break).period_no}` : ""}</td>
            <td>${hasEntries?`<span class="pill pending">จัดตารางแล้ว</span>`:`<span class="pill neutral">ยังไม่มีคาบสอน</span>`}</td>
            <td><div class="admin-actions">
              ${tp?.period_mode==="shared"
                ? `<button class="btn btn-secondary" data-period-mode-custom="${c.id}" ${tp?.status==="published"?"disabled":""}>แยกเป็นเฉพาะห้อง</button>`
                : `<button class="btn btn-secondary" data-period-mode-shared="${c.id}" ${!template || hasEntries || tp?.status==="published"?"disabled":""}>ใช้คาบกลาง</button><button class="btn btn-ghost" data-configure-periods="${c.id}" ${tp?.status==="published"?"disabled":""}>แก้คาบห้องนี้</button>`
              }
            </div></td>
          </tr>`;
        }).join("")}
      </tbody></table></div>` : `<div class="empty"><strong>ยังไม่มีชั้น/ห้องในขอบเขตที่ดูแล</strong><span>${isAcademicHead() ? "สร้างชั้น/ห้องก่อน แล้วกลับมาตั้งค่าคาบเรียน" : "เพิ่มชั้น/ห้องในช่วงชั้นที่ได้รับมอบหมายก่อน"}</span></div>`}
    </section>`;
}

async function setTimetablePeriodMode(classId, mode) {
  const tp=timetableProfileForClass(classId);
  const c=state.timetableClasses.find(x=>x.id===classId);
  if(!tp||!c)return;
  const template=currentTimetablePeriodTemplate();
  if(mode==="shared"&&!template)return toast("ยังไม่มีคาบกลาง","กรุณาสร้างคาบกลางของโรงเรียนก่อน","error");
  const args={p_timetable_id:tp.id,p_mode:mode,p_template_id:mode==="shared"?template.id:null};
  const {error}=await supabase.rpc("set_timetable_period_mode",args);
  if(error)return toast("เปลี่ยนรูปแบบคาบไม่ได้",error.message,"error");
  toast("เปลี่ยนรูปแบบคาบแล้ว",`${schoolClassLabel(c)} · ${mode==="shared"?"ใช้คาบกลางของโรงเรียน":"กำหนดเฉพาะห้อง"}`,"success");
  await renderDashboard();
}

async function applySchoolPeriodTemplateToAll() {
  const template=currentTimetablePeriodTemplate();
  const classes=timetableFilteredClasses();
  if(!template||!classes.length)return;
  const blocked=classes.filter(c=>{
    const tp=timetableProfileForClass(c.id);
    return tp?.period_mode!=="shared" && timetableEntriesFor(tp?.id).length>0;
  });
  if(blocked.length){
    return toast("ยังใช้คาบกลางกับทุกห้องไม่ได้",`มี ${blocked.length} ห้องที่จัดตารางแล้วในโหมดเฉพาะห้อง กรุณาล้างคาบสอนของห้องเหล่านั้นก่อน`,"error");
  }
  const targetScope = isAcademicHead() ? "ทุกห้องในโรงเรียน" : `ทุกห้องใน ${timetableManagerScopeLabel()}`;
  if(!confirm(`ใช้คาบกลางของโรงเรียนกับ${targetScope} ปีการศึกษา ${currentTimetablePeriod().academicYear} ภาคเรียน ${currentTimetablePeriod().semester} หรือไม่?`))return;
  let applied=0;
  for(const c of classes){
    const tp=timetableProfileForClass(c.id);
    if(!tp || (tp.period_mode==="shared" && tp.period_template_id===template.id)) continue;
    const {error}=await supabase.rpc("set_timetable_period_mode",{p_timetable_id:tp.id,p_mode:"shared",p_template_id:template.id});
    if(error)return toast("ใช้คาบกลางไม่สำเร็จ",`${schoolClassLabel(c)}: ${error.message}`,"error");
    applied++;
  }
  toast("ใช้คาบกลางเรียบร้อย",`อัปเดต ${applied} ห้อง`,"success");
  await renderDashboard();
}

function timetableSchoolPeriodTemplateModal() {
  if (!canManageSchoolTimetableMaster()) {
    return toast("สิทธิ์เฉพาะหัวหน้าวิชาการ","หัวหน้าช่วงชั้นสามารถนำคาบกลางไปใช้กับช่วงชั้นของตนเองได้ แต่ไม่สามารถแก้คาบกลางที่กระทบทั้งโรงเรียน","error");
  }
  const p=currentTimetablePeriod();
  const template=currentTimetablePeriodTemplate();
  const existing=template?timetablePeriodTemplateItems(template.id):[];
  const breakRow=existing.find(x=>x.is_break);
  const count=existing.length||9;
  const lunchSlot=Number(breakRow?.period_no || Math.min(5,count));
  const weekdays=template?.weekdays||[1,2,3,4,5];
  const linked=template?state.timetableProfiles.filter(tp=>tp.period_template_id===template.id):[];
  const linkedWithEntries=linked.filter(tp=>timetableEntriesFor(tp.id).length>0);

  const modal=document.createElement("div");
  modal.className="modal-backdrop";
  modal.innerHTML=`<div class="modal modal-wide"><div class="modal-head"><div><h3>${template?"แก้ไข":"สร้าง"}คาบกลางของโรงเรียน</h3><p>ปีการศึกษา ${p.academicYear} · ภาคเรียนที่ ${p.semester} · พักกลางวันนับเป็นหนึ่งคาบ</p></div><button class="modal-close">×</button></div>
    ${linkedWithEntries.length?`<div class="drive-permission-warning"><strong>แก้ไขไม่ได้ในขณะนี้</strong><span>มี ${linkedWithEntries.length} ห้องที่ใช้คาบกลางและมีตารางสอนแล้ว ต้องล้างตารางของห้องเหล่านั้นก่อนแก้เวลา เพื่อไม่ให้คาบเดิมคลาดเคลื่อน</span></div>`:""}
    <div class="form-grid timetable-period-config">
      <div class="field"><label>วันเรียนของคาบกลาง</label><div class="weekday-checks">${[1,2,3,4,5,6,7].map(d=>`<label><input type="checkbox" data-school-weekday="${d}" ${weekdays.includes(d)?"checked":""}> ${escapeHtml(TIMETABLE_DAY_LABEL[d])}</label>`).join("")}</div></div>
      <div class="form-row">
        <div class="field"><label>จำนวนคาบทั้งหมดต่อวัน <span class="helper">(รวมพักกลางวัน)</span></label><input class="input" id="school-period-count" type="number" min="2" max="12" value="${count}"></div>
        <div class="field"><label>พักรับประทานอาหารเป็นคาบที่</label><select class="select" id="school-lunch-period"></select></div>
      </div>
      <div id="school-period-rows"></div>
      <div class="timetable-lunch-config">
        <strong id="school-lunch-title">คาบ ${lunchSlot} · พักรับประทานอาหารกลางวัน</strong>
        <div class="form-row"><div class="field"><label>เริ่ม</label><input class="input" id="school-lunch-start" type="time" value="${breakRow?timeShort(breakRow.start_time):""}"></div><div class="field"><label>สิ้นสุด</label><input class="input" id="school-lunch-end" type="time" value="${breakRow?timeShort(breakRow.end_time):""}"></div></div>
      </div>
      <div class="drive-permission-warning"><strong>การนับเลขคาบ</strong><span>ตัวอย่าง: คาบ 1–4 เรียน · คาบ 5 พักกลางวัน · หลังพักจะต่อเป็นคาบ 6, 7, 8, 9 โดยอัตโนมัติ</span></div>
    </div>
    <div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="save-school-period-template" ${linkedWithEntries.length?"disabled":""}>บันทึกคาบกลาง</button></div></div>`;
  document.body.appendChild(modal);

  const existingMap=Object.fromEntries(existing.filter(x=>!x.is_break).map(x=>[Number(x.period_no),x]));
  const countInput=modal.querySelector("#school-period-count");
  const lunchSelect=modal.querySelector("#school-lunch-period");
  const rows=modal.querySelector("#school-period-rows");

  function renderRows() {
    const n=Math.max(2,Math.min(12,Number(countInput.value||2)));
    const previous=Math.max(1,Math.min(n,Number(lunchSelect.value||lunchSlot)));
    lunchSelect.innerHTML=Array.from({length:n},(_,i)=>i+1)
      .map(no=>`<option value="${no}" ${no===previous?"selected":""}>คาบ ${no}</option>`).join("");
    lunchSelect.value=String(previous);
    modal.querySelector("#school-lunch-title").textContent=`คาบ ${previous} · พักรับประทานอาหารกลางวัน`;

    rows.innerHTML=`<div class="timetable-period-rows">${Array.from({length:n},(_,i)=>i+1)
      .filter(no=>no!==previous)
      .map(no=>{
        const ex=existingMap[no];
        return `<div class="timetable-period-row"><strong>คาบ ${no}</strong><input class="input" type="time" data-school-period-start="${no}" value="${ex?timeShort(ex.start_time):""}"><span>ถึง</span><input class="input" type="time" data-school-period-end="${no}" value="${ex?timeShort(ex.end_time):""}"></div>`;
      }).join("")}</div>`;
  }

  countInput.addEventListener("change",renderRows);
  lunchSelect.addEventListener("change",renderRows);
  renderRows();

  const close=()=>modal.remove();
  modal.querySelector(".modal-close").addEventListener("click",close);
  modal.querySelector(".modal-cancel").addEventListener("click",close);

  modal.querySelector("#save-school-period-template")?.addEventListener("click",async e=>{
    const days=[...modal.querySelectorAll("[data-school-weekday]:checked")].map(x=>Number(x.dataset.schoolWeekday));
    if(!days.length)return toast("กรุณาเลือกวันเรียน","ต้องมีอย่างน้อย 1 วัน","error");

    const n=Number(countInput.value);
    const lunchPos=Number(lunchSelect.value);
    const items=[];

    for(let no=1;no<=n;no++){
      if(no===lunchPos){
        const ls=modal.querySelector("#school-lunch-start").value;
        const le=modal.querySelector("#school-lunch-end").value;
        if(!ls||!le)return toast("กรอกเวลาพักกลางวัน","กรุณาระบุเวลาเริ่มและสิ้นสุด","error");
        items.push({sort_order:no,period_no:no,label:"พักรับประทานอาหารกลางวัน",start_time:ls,end_time:le,is_break:true});
        continue;
      }

      const start=modal.querySelector(`[data-school-period-start="${no}"]`)?.value;
      const end=modal.querySelector(`[data-school-period-end="${no}"]`)?.value;
      if(!start||!end)return toast("กรอกเวลาไม่ครบ",`กรุณากรอกเวลา คาบ ${no}`,"error");
      items.push({sort_order:no,period_no:no,label:`คาบ ${no}`,start_time:start,end_time:end,is_break:false});
    }

    buttonLoading(e.currentTarget,true,"กำลังบันทึก...");
    const {error}=await supabase.rpc("save_timetable_period_template",{p_academic_year:String(p.academicYear),p_semester:p.semester,p_weekdays:days,p_items:items});
    buttonLoading(e.currentTarget,false);
    if(error)return toast("บันทึกคาบกลางไม่สำเร็จ",error.message,"error");

    close();
    toast("บันทึกคาบกลางแล้ว",`${n} คาบรวมพักกลางวัน · พักเป็นคาบ ${lunchPos}`,"success");
    await renderDashboard();
  });
}

function timetableTabsHtml() {
  if (canManageTimetable()) {
    return `<div class="lesson-view-tabs timetable-tabs">
      <button class="lesson-view-tab ${state.timetableView==="setup"?"active":""}" data-timetable-view="setup">ข้อมูลก่อนจัดตาราง</button>
      <button class="lesson-view-tab ${state.timetableView==="periods"?"active":""}" data-timetable-view="periods">ตั้งค่าคาบเรียน</button>
      <button class="lesson-view-tab ${state.timetableView==="planner"?"active":""}" data-timetable-view="planner">จัดตาราง</button>
      <button class="lesson-view-tab ${state.timetableView==="export"?"active":""}" data-timetable-view="export">Export PDF</button>
      <button class="lesson-view-tab ${state.timetableView==="mine"?"active":""}" data-timetable-view="mine">ตารางสอนของฉัน</button>
    </div>`;
  }
  if (["director","super_admin"].includes(state.profile.role)) {
    return `<div class="lesson-view-tabs timetable-tabs">
      <button class="lesson-view-tab ${state.timetableView==="overview"?"active":""}" data-timetable-view="overview">ดูตาราง</button>
      <button class="lesson-view-tab ${state.timetableView==="export"?"active":""}" data-timetable-view="export">Export PDF</button>
    </div>`;
  }
  return `<div class="lesson-view-tabs timetable-tabs">
    <button class="lesson-view-tab active">ตารางสอนของฉัน</button>
    ${timetableOwnHomeroomClassIds().length || timetableOwnStageHeadRows().length ? `<button class="lesson-view-tab ${state.timetableView==="homeroom"?"active":""}" data-timetable-view="homeroom">ตารางเรียนที่รับผิดชอบ</button>` : ""}
  </div>`;
}

function timetableHeroHtml() {
  const managerCopy = isAcademicHead()
    ? "กำหนดชั้น ห้อง วิชา ครู คาบเรียน แล้วลากรายวิชาลงตารางโดยระบบตรวจคาบชนให้อัตโนมัติ"
    : `จัดตารางได้เฉพาะ ${timetableManagerScopeLabel()} ตามสิทธิ์หัวหน้าช่วงชั้น พร้อมระบบตรวจคาบชน`;
  return `<section class="lesson-hero timetable-hero">
    <div><span class="eyebrow dark">Academic Scheduling</span><h2>ระบบจัดตารางสอน</h2><p>${canManageTimetable() ? escapeHtml(managerCopy) : "ดูตารางที่เผยแพร่ตามสิทธิ์ของคุณ และ Export ตารางสอน/ตารางเรียนที่รับผิดชอบ"}</p></div>
    ${canManageTimetable() ? `<div class="lesson-hero-actions"><button class="btn btn-primary" id="new-timetable-class">＋ เพิ่มชั้น/ห้อง</button>${canManageSchoolTimetableMaster()?`<button class="btn btn-secondary" id="new-timetable-subject">＋ เพิ่มรายวิชา</button>`:""}<button class="btn btn-secondary" id="new-teaching-assignment">＋ กำหนดวิชา/ครู</button></div>` : ""}
  </section>`;
}

function timetableClassSelectorHtml() {
  const classes = timetableFilteredClasses({visibleOnly:true});
  return `<div class="timetable-selector-row">
    ${timetablePeriodFiltersHtml()}
    <div class="field timetable-class-select"><label>ชั้น / ห้อง</label><select class="select" id="timetable-class-select">
      ${classes.length ? classes.map(c=>`<option value="${c.id}" ${c.id===state.timetableSelectedClassId?"selected":""}>${escapeHtml(schoolClassLabel(c))}</option>`).join("") : `<option value="">ยังไม่มีชั้น/ห้อง</option>`}
    </select></div>
  </div>`;
}

function timetableAssignmentProgress(a) {
  const used = state.timetableEntries.filter(e => e.assignment_id === a.id).length;
  return { used, remaining: Math.max(0, Number(a.periods_per_week)-used), target:Number(a.periods_per_week) };
}

function timetableGridHtml({classId = state.timetableSelectedClassId, readonly = false} = {}) {
  const c = state.timetableClasses.find(x => x.id === classId);
  const profile = timetableProfileForClass(classId);
  if (!c || !profile) return `<div class="empty"><strong>ยังไม่มีตารางสำหรับชั้นนี้</strong><span>หัวหน้าวิชาการต้องสร้างชั้น/ห้องก่อน</span></div>`;
  const periods = timetablePeriodsFor(profile.id);
  const entries = timetableEntriesFor(profile.id);
  const assignments = timetableAssignmentsForClass(classId);
  const days = [...(profile.weekdays || [1,2,3,4,5])].sort((a,b)=>a-b);
  const editable = canManageTimetable() && profile.status === "draft" && !readonly;

  if (!periods.length) {
    return `<div class="empty timetable-empty-config"><strong>ยังไม่ได้กำหนดคาบเรียน</strong><span>ไปที่หน้า “ตั้งค่าคาบเรียน” เพื่อเลือกใช้คาบกลางของโรงเรียนหรือกำหนดเวลาเฉพาะห้อง</span>${canManageTimetable()?`<button class="btn btn-primary" data-open-period-settings="1">ไปตั้งค่าคาบเรียน</button>`:""}</div>`;
  }

  const aMap = Object.fromEntries(assignments.map(a => [a.id,a]));
  const subjectMap = Object.fromEntries(state.timetableSubjects.map(s=>[s.id,s]));
  const entryMap = new Map(entries.map(e=>[`${e.weekday}:${e.period_id}`,e]));

  return `<div class="timetable-grid-wrap">
    <table class="timetable-grid">
      <thead><tr><th class="day-head">วัน</th>${periods.map(p=>p.is_break
        ? `<th class="break-head"><strong>${p.period_no}</strong><span>พักกลางวัน</span><small>${timeShort(p.start_time)}–${timeShort(p.end_time)}</small></th>`
        : `<th><strong>${p.period_no}</strong><small>${timeShort(p.start_time)}–${timeShort(p.end_time)}</small></th>`).join("")}</tr></thead>
      <tbody>${days.map(day=>`<tr><th>${escapeHtml(TIMETABLE_DAY_LABEL[day] || String(day))}</th>${periods.map(p=>{
        if (p.is_break) return `<td class="timetable-break-cell"><span>${escapeHtml(p.label || "พักรับประทานอาหารกลางวัน")}</span></td>`;
        const e=entryMap.get(`${day}:${p.id}`);
        if(!e) return `<td class="timetable-drop-cell ${editable?"editable":""}" ${editable?`data-timetable-drop="1" data-day="${day}" data-period-id="${p.id}"`:""}><span class="drop-placeholder">${editable?"ลากวิชามาวาง":"—"}</span></td>`;
        const a=aMap[e.assignment_id];
        const s=subjectMap[a?.subject_id];
        return `<td class="timetable-drop-cell filled ${editable?"editable":""}" ${editable?`data-timetable-drop="1" data-day="${day}" data-period-id="${p.id}"`:""}>
          <div class="timetable-entry-card" ${editable?`draggable="true" data-timetable-entry-drag="${e.id}"`:""}>
            <strong>${escapeHtml(s?.subject_name || "รายวิชา")}</strong>
            <span>${escapeHtml(a?.teacher_name || "ครูผู้สอน")}</span>
            ${editable?`<button type="button" class="timetable-entry-remove" data-remove-timetable-entry="${e.id}" title="นำออก">×</button>`:""}
          </div>
        </td>`;
      }).join("")}</tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function timetablePlannerHtml() {
  const c = selectedTimetableClass();
  const profile = selectedTimetableProfile();
  const assignments = c ? timetableAssignmentsForClass(c.id) : [];
  const entries = profile ? timetableEntriesFor(profile.id) : [];
  const status = profile?.status || "draft";
  return `${timetableClassSelectorHtml()}
    ${c ? `<div class="timetable-planner-head">
      <div><div class="planner-badges"><span class="pill ${status==="published"?"active":"neutral"}">${status==="published"?"เผยแพร่แล้ว":"ฉบับร่าง"}</span><span class="pill ${profile?.period_mode==="shared"?"active":"neutral"}">${escapeHtml(timetablePeriodModeLabel(profile))}</span></div><h3>${escapeHtml(schoolClassLabel(c))}</h3><p>${escapeHtml(TIMETABLE_STAGE_LABEL[c.stage_code] || c.stage_code)} · ปีการศึกษา ${escapeHtml(c.academic_year)} ภาคเรียน ${c.semester}</p></div>
      <div class="lesson-hero-actions">
        <button class="btn btn-secondary" data-open-period-settings="1">⚙ ตั้งค่าคาบเรียน</button>
        ${entries.length ? `<button class="btn btn-ghost" id="clear-timetable">ล้างตาราง</button>`:""}
        <button class="btn ${status==="published"?"btn-warning":"btn-success"}" id="toggle-timetable-publish">${status==="published"?"นำกลับเป็นฉบับร่าง":"เผยแพร่ตาราง"}</button>
      </div>
    </div>
    <div class="timetable-planner-layout">
      <section class="panel timetable-board-panel">${timetableGridHtml()}</section>
      <aside class="panel timetable-palette">
        <div class="panel-head"><div class="panel-title-wrap"><h3>รายวิชาของห้องนี้</h3><p>${status==="draft"?"ลากการ์ดลงช่องตาราง":"นำกลับเป็นฉบับร่างก่อนแก้ไข"}</p></div></div>
        <div class="timetable-assignment-list">${assignments.length?assignments.map(a=>{
          const s=state.timetableSubjects.find(x=>x.id===a.subject_id);
          const prog=timetableAssignmentProgress(a);
          const draggable=status==="draft"&&prog.remaining>0;
          return `<div class="timetable-assignment-card ${prog.remaining===0?"complete":""}" ${draggable?`draggable="true" data-timetable-assignment-drag="${a.id}"`:""}>
            <div><strong>${escapeHtml(s?.subject_name||"รายวิชา")}</strong><span>${escapeHtml(a.teacher_name||"ครูผู้สอน")}</span></div>
            <div class="assignment-count"><strong>${prog.used}/${prog.target}</strong><span>คาบ</span></div>
          </div>`;
        }).join(""):`<div class="empty"><strong>ยังไม่ได้กำหนดรายวิชา</strong><span>เพิ่มวิชา + ครูผู้สอนก่อน</span></div>`}</div>
      </aside>
    </div>` : `<div class="empty"><strong>ยังไม่มีชั้น/ห้องในช่วงที่เลือก</strong><span>เริ่มจากเพิ่มชั้น/ห้อง แล้วตั้งคาบเรียน</span></div>`}`;
}

function timetableSetupHtml() {
  const classes = timetableFilteredClasses();
  const currentClass = selectedTimetableClass() || classes[0] || null;
  const assignments = currentClass ? timetableAssignmentsForClass(currentClass.id) : [];
  return `${timetablePeriodFiltersHtml()}
  <div class="grid-2 timetable-setup-grid">
    <section class="panel">
      <div class="panel-head"><div class="panel-title-wrap"><h3>ชั้น / ห้อง</h3><p>สร้างโครงห้องเรียนก่อนจัดตาราง</p></div><button class="btn btn-primary" id="new-timetable-class">＋ เพิ่ม</button></div>
      ${classes.length?`<div class="list timetable-master-list">${classes.map(c=>{
        const tp=timetableProfileForClass(c.id);
        return `<div class="list-item"><div class="list-body"><strong>${escapeHtml(schoolClassLabel(c))}</strong><p>${escapeHtml(TIMETABLE_STAGE_LABEL[c.stage_code]||c.stage_code)} · ${tp?.status==="published"?"เผยแพร่แล้ว":"ฉบับร่าง"} · ${escapeHtml(timetablePeriodModeLabel(tp))}</p></div><div class="admin-actions"><button class="btn btn-ghost" data-select-timetable-class="${c.id}">เลือก</button><button class="btn btn-danger" data-delete-timetable-class="${c.id}">ลบ</button></div></div>`;
      }).join("")}</div>`:`<div class="empty"><strong>ยังไม่มีชั้น/ห้อง</strong></div>`}
    </section>
    <section class="panel">
      <div class="panel-head"><div class="panel-title-wrap"><h3>รายวิชา</h3><p>${canManageSchoolTimetableMaster() ? "Master รายวิชาที่เปิดสอน" : "ใช้ Master รายวิชาที่หัวหน้าวิชาการกำหนดไว้"}</p></div>${canManageSchoolTimetableMaster()?`<button class="btn btn-primary" id="new-timetable-subject">＋ เพิ่ม</button>`:""}</div>
      ${state.timetableSubjects.length?`<div class="list timetable-master-list">${state.timetableSubjects.map(s=>`<div class="list-item"><div class="list-body"><strong>${escapeHtml(s.subject_name)}</strong><p>${escapeHtml(s.subject_code||"ไม่มีรหัสวิชา")}</p></div>${canManageSchoolTimetableMaster()?`<button class="btn btn-danger" data-delete-timetable-subject="${s.id}">ลบ</button>`:""}</div>`).join("")}</div>`:`<div class="empty"><strong>ยังไม่มีรายวิชา</strong><span>${canManageSchoolTimetableMaster()?"เพิ่ม Master รายวิชาก่อน":"กรุณาให้หัวหน้าวิชาการเพิ่ม Master รายวิชาก่อน"}</span></div>`}
    </section>
  </div>
  <section class="panel" style="margin-top:16px">
    <div class="panel-head"><div class="panel-title-wrap"><h3>วิชา + ชั้น/ห้อง + ครูผู้สอน</h3><p>${currentClass?`กำลังดู ${escapeHtml(schoolClassLabel(currentClass))}`:"เลือกชั้น/ห้องก่อน"}</p></div><button class="btn btn-primary" id="new-teaching-assignment" ${currentClass?"":"disabled"}>＋ กำหนดการสอน</button></div>
    ${currentClass ? (assignments.length?`<div class="table-wrap"><table class="table"><thead><tr><th>วิชา</th><th>ครูผู้สอน</th><th>คาบ/สัปดาห์</th><th>จัดแล้ว</th><th></th></tr></thead><tbody>${assignments.map(a=>{
      const s=state.timetableSubjects.find(x=>x.id===a.subject_id); const p=timetableAssignmentProgress(a);
      return `<tr><td><strong>${escapeHtml(s?.subject_name||"—")}</strong><br><span class="table-muted">${escapeHtml(s?.subject_code||"")}</span></td><td>${escapeHtml(a.teacher_name||"ครูผู้สอน")}</td><td>${a.periods_per_week}</td><td>${p.used}/${p.target}</td><td><button class="btn btn-danger" data-delete-teaching-assignment="${a.id}">ลบ</button></td></tr>`;
    }).join("")}</tbody></table></div>`:`<div class="empty"><strong>ยังไม่มีการกำหนดวิชา/ครู</strong></div>`) : `<div class="empty"><strong>เลือกชั้น/ห้อง</strong></div>`}
  </section>`;
}

function teacherTimetableData(teacherId) {
  const p = currentTimetablePeriod();
  const assignments = state.timetableAssignments.filter(a => a.teacher_id === teacherId && a.is_active !== false)
    .filter(a => {
      const c=state.timetableClasses.find(x=>x.id===a.class_id);
      return c && Number(c.academic_year)===p.academicYear && Number(c.semester)===p.semester;
    });
  const assignmentIds = new Set(assignments.map(a=>a.id));
  const entries = state.timetableEntries.filter(e=>assignmentIds.has(e.assignment_id));
  const profileIds = new Set(entries.map(e=>e.timetable_id));
  const periods = state.timetablePeriods.filter(p=>profileIds.has(p.timetable_id));
  const periodById = Object.fromEntries(periods.map(p=>[p.id,p]));
  const columnMap = new Map();
  for (const per of periods) {
    const key=`${timeShort(per.start_time)}-${timeShort(per.end_time)}-${per.is_break?1:0}`;
    if(!columnMap.has(key)) columnMap.set(key,{...per,key});
  }
  const columns=[...columnMap.values()].sort((a,b)=>String(a.start_time).localeCompare(String(b.start_time)) || Number(a.sort_order)-Number(b.sort_order));
  const days=[...new Set(state.timetableProfiles.filter(tp=>profileIds.has(tp.id)).flatMap(tp=>tp.weekdays||[]))].sort((a,b)=>a-b);
  return {assignments,entries,periodById,columns,days};
}

function teacherScheduleGridHtml(teacherId) {
  const data=teacherTimetableData(teacherId);
  if(!data.entries.length) return `<div class="empty"><strong>ยังไม่มีตารางสอนที่เผยแพร่</strong><span>เมื่อตารางถูกเผยแพร่แล้วจะปรากฏที่นี่</span></div>`;
  const aMap=Object.fromEntries(data.assignments.map(a=>[a.id,a]));
  const subjectMap=Object.fromEntries(state.timetableSubjects.map(s=>[s.id,s]));
  const entryMap=new Map();
  for(const e of data.entries){
    const per=data.periodById[e.period_id]; if(!per) continue;
    const key=`${e.weekday}:${timeShort(per.start_time)}-${timeShort(per.end_time)}-${per.is_break?1:0}`;
    entryMap.set(key,e);
  }
  return `<div class="timetable-grid-wrap"><table class="timetable-grid teacher-grid"><thead><tr><th>วัน</th>${data.columns.map(c=>c.is_break?`<th class="break-head"><strong>${c.period_no||""}</strong><span>พักกลางวัน</span><small>${timeShort(c.start_time)}–${timeShort(c.end_time)}</small></th>`:`<th><strong>${c.period_no||""}</strong><small>${timeShort(c.start_time)}–${timeShort(c.end_time)}</small></th>`).join("")}</tr></thead><tbody>${data.days.map(day=>`<tr><th>${escapeHtml(TIMETABLE_DAY_LABEL[day]||String(day))}</th>${data.columns.map(c=>{
    if(c.is_break) return `<td class="timetable-break-cell"><span>${escapeHtml(c.label||"พักกลางวัน")}</span></td>`;
    const e=entryMap.get(`${day}:${c.key}`); if(!e) return `<td>—</td>`;
    const a=aMap[e.assignment_id]; const s=subjectMap[a?.subject_id]; const cl=state.timetableClasses.find(x=>x.id===a?.class_id);
    return `<td><div class="timetable-entry-card readonly"><strong>${escapeHtml(s?.subject_name||"รายวิชา")}</strong><span>${escapeHtml(schoolClassLabel(cl))}</span></div></td>`;
  }).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function timetableMineHtml() {
  const p=currentTimetablePeriod();
  const homeroomIds=timetableOwnHomeroomClassIds().filter(id=>{
    const c=state.timetableClasses.find(x=>x.id===id); return c&&Number(c.academic_year)===p.academicYear&&Number(c.semester)===p.semester;
  });
  const stageRows=timetableOwnStageHeadRows().filter(x=>String(x.academic_year)===String(p.academicYear));
  const stageClassIds=state.timetableClasses.filter(c=>Number(c.academic_year)===p.academicYear&&Number(c.semester)===p.semester&&stageRows.some(s=>s.stage_code===c.stage_code)).map(c=>c.id);
  const responsible=[...new Set([...homeroomIds,...stageClassIds])];
  if(state.timetableView==="homeroom"){
    return `${timetablePeriodFiltersHtml()}<section class="panel"><div class="panel-head"><div class="panel-title-wrap"><h3>ตารางเรียนที่รับผิดชอบ</h3><p>ห้องประจำชั้นหรือช่วงชั้นที่ได้รับมอบหมาย</p></div></div>${responsible.length?responsible.map(id=>{
      const c=state.timetableClasses.find(x=>x.id===id); return `<div class="timetable-responsible-card"><div><strong>${escapeHtml(schoolClassLabel(c))}</strong><span>${escapeHtml(TIMETABLE_STAGE_LABEL[c?.stage_code]||"")}</span></div><div><button class="btn btn-ghost" data-preview-class-timetable="${id}">ดูตาราง</button><button class="btn btn-primary" data-export-class-timetable="${id}">พิมพ์ / PDF</button></div></div>`;
    }).join(""):`<div class="empty"><strong>ยังไม่มีห้องที่รับผิดชอบ</strong></div>`}</section>`;
  }
  return `${timetablePeriodFiltersHtml()}<section class="panel"><div class="panel-head"><div class="panel-title-wrap"><h3>ตารางสอนของฉัน</h3><p>ปีการศึกษา ${p.academicYear} ภาคเรียน ${p.semester}</p></div><button class="btn btn-primary" data-export-teacher-timetable="${state.user.id}">พิมพ์ / PDF</button></div>${teacherScheduleGridHtml(state.user.id)}</section>`;
}

function timetableOverviewHtml() {
  const classes=timetableFilteredClasses({visibleOnly:true});
  return `${timetableClassSelectorHtml()}<section class="panel"><div class="panel-head"><div class="panel-title-wrap"><h3>ตารางเรียน</h3><p>ดูตารางที่เผยแพร่ในช่วงที่เลือก</p></div></div>${state.timetableSelectedClassId?timetableGridHtml({readonly:true}):`<div class="empty"><strong>ยังไม่มีตารางที่มองเห็น</strong></div>`}</section>`;
}

function timetableExportHtml() {
  const p=currentTimetablePeriod();
  const allowedClassIds=new Set(timetableStudentExportClassIds());
  const classes=timetableFilteredClasses({visibleOnly:true}).filter(c=>allowedClassIds.has(c.id));
  const teachers=canViewAllTimetables()?state.timetableTeachers:[{id:state.user.id,full_name:state.profile.full_name,email:state.profile.email}];
  return `${timetablePeriodFiltersHtml()}<div class="grid-2 timetable-export-grid">
    <section class="panel"><div class="panel-head"><div class="panel-title-wrap"><h3>ตารางเรียนของนักเรียน</h3><p>เลือกชั้น/ห้อง แล้ว Export ตามแบบโรงเรียน</p></div></div>
      <div class="field"><label>ชั้น / ห้อง</label><select class="select" id="timetable-export-class">${classes.length?classes.map(c=>`<option value="${c.id}" ${c.id===state.timetableExportClassId?"selected":""}>${escapeHtml(schoolClassLabel(c))}</option>`).join(""):`<option value="">ไม่มีห้องที่มีสิทธิ์ Export</option>`}</select></div>
      <button class="btn btn-primary timetable-export-button" id="export-class-timetable" ${classes.length?"":"disabled"}>▤ Export ห้องที่เลือก</button>
      ${canManageTimetable()?`<button class="btn btn-secondary timetable-export-button" id="export-all-class-timetables" ${classes.length?"":"disabled"}>▤ Export ทุกห้องที่มีสิทธิ์ (${classes.length} ห้อง) เป็น PDF เดียว</button>`:""}
    </section>
    <section class="panel"><div class="panel-head"><div class="panel-title-wrap"><h3>ตารางสอนของครู</h3><p>${canViewAllTimetables()?"เลือกครูรายบุคคล หรือรวมครูทั้งหมดใน PDF เดียว":"Export ได้เฉพาะตารางของคุณ"}</p></div></div>
      <div class="field"><label>ครูผู้สอน</label><select class="select" id="timetable-export-teacher">${teachers.map(t=>`<option value="${t.id}" ${t.id===state.timetableExportTeacherId?"selected":""}>${escapeHtml(t.full_name||t.email||"ครูผู้สอน")}</option>`).join("")}</select></div>
      <button class="btn btn-primary timetable-export-button" id="export-teacher-timetable">▤ Export ครูที่เลือก</button>
      ${canManageTimetable()?`<button class="btn btn-secondary timetable-export-button" id="export-all-teacher-timetables">▤ Export ครูทั้งหมด (${teachers.length} คน) เป็น PDF เดียว</button>`:""}
    </section>
  </div>`;
}

function timetableWorkspaceHtml(module) {
  const tabs=timetableTabsHtml();
  if(canManageTimetable()){
    return `${timetableHeroHtml()}${tabs}${state.timetableView==="setup"?timetableSetupHtml():state.timetableView==="periods"?timetablePeriodSettingsHtml():state.timetableView==="export"?timetableExportHtml():state.timetableView==="mine"?timetableMineHtml():timetablePlannerHtml()}`;
  }
  if(["director","super_admin"].includes(state.profile.role)){
    if(!["overview","export"].includes(state.timetableView)) state.timetableView="overview";
    return `${timetableHeroHtml()}${tabs}${state.timetableView==="export"?timetableExportHtml():timetableOverviewHtml()}`;
  }
  if(!["mine","homeroom"].includes(state.timetableView)) state.timetableView="mine";
  return `${timetableHeroHtml()}${tabs}${timetableMineHtml()}`;
}

function timetableClassModal() {
  const p=currentTimetablePeriod();
  const allowedStageCodes = isAcademicHead()
    ? Object.keys(TIMETABLE_STAGE_LABEL)
    : timetableStageHeadCodes(p.academicYear);
  if (!allowedStageCodes.length) {
    return toast("ไม่มีสิทธิ์สร้างชั้น/ห้อง","คุณไม่ได้รับมอบหมายเป็นหัวหน้าช่วงชั้นในปีการศึกษาที่เลือก","error");
  }
  const modal=document.createElement("div");
  modal.className="modal-backdrop";
  modal.innerHTML=`<div class="modal"><div class="modal-head"><div><h3>เพิ่มชั้น / ห้อง</h3><p>สร้างห้องเรียนสำหรับจัดตารางสอน</p></div><button class="modal-close">×</button></div>
    <form id="timetable-class-form" class="form-grid">
      <div class="form-row"><div class="field"><label>ปีการศึกษา</label><input class="input" name="academic_year" required value="${p.academicYear}" ${isAcademicHead()?"":"readonly"}></div><div class="field"><label>ภาคเรียน</label><select class="select" name="semester"><option value="1" ${p.semester===1?"selected":""}>1</option><option value="2" ${p.semester===2?"selected":""}>2</option><option value="3">3</option></select></div></div>
      <div class="field"><label>ช่วงชั้น</label><select class="select" name="stage_code" required>${allowedStageCodes.map(v=>`<option value="${v}">${escapeHtml(TIMETABLE_STAGE_LABEL[v]||v)}</option>`).join("")}</select>${isAcademicHead()?"":`<span class="helper">สิทธิ์หัวหน้าช่วงชั้น: ${escapeHtml(timetableManagerScopeLabel())}</span>`}</div>
      <div class="form-row"><div class="field"><label>ระดับชั้น</label><input class="input" name="level_name" required placeholder="เช่น ป.1 หรือ อ.2"></div><div class="field"><label>ห้อง</label><input class="input" name="room_name" required value="1" placeholder="เช่น 1"></div></div>
      <div class="field"><label>ลำดับแสดงผล</label><input class="input" type="number" name="sort_order" value="0"></div>
    </form><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="save-timetable-class">สร้างชั้น/ห้อง</button></div></div>`;
  document.body.appendChild(modal);
  const close=()=>modal.remove();
  modal.querySelector(".modal-close").addEventListener("click",close); modal.querySelector(".modal-cancel").addEventListener("click",close);
  modal.querySelector("#save-timetable-class").addEventListener("click",async e=>{
    const form=modal.querySelector("#timetable-class-form"); if(!form.reportValidity()) return;
    const fd=new FormData(form); buttonLoading(e.currentTarget,true,"กำลังสร้าง...");
    const {data,error}=await supabase.from("school_classes").insert({
      academic_year:String(fd.get("academic_year")).trim(),semester:Number(fd.get("semester")),stage_code:String(fd.get("stage_code")),
      level_name:String(fd.get("level_name")).trim(),room_name:String(fd.get("room_name")).trim(),sort_order:Number(fd.get("sort_order")||0),created_by:state.user.id
    }).select().single();
    if(error){buttonLoading(e.currentTarget,false);return toast("สร้างชั้น/ห้องไม่สำเร็จ",error.message,"error");}
    const profile=await supabase.from("timetable_profiles").insert({class_id:data.id,weekdays:[1,2,3,4,5],created_by:state.user.id}).select().single();
    buttonLoading(e.currentTarget,false);
    if(profile.error){await supabase.from("school_classes").delete().eq("id",data.id);return toast("สร้างตารางไม่สำเร็จ",profile.error.message,"error");}
    state.timetableAcademicYear=Number(data.academic_year); state.timetableSemester=Number(data.semester); state.timetableSelectedClassId=data.id; state.timetableView="periods"; close();
    toast("สร้างชั้น/ห้องแล้ว","ขั้นตอนถัดไป: เลือกว่าจะใช้คาบกลางของโรงเรียนหรือกำหนดคาบเฉพาะห้อง","success");
    await renderDashboard();
  });
}

function timetablePeriodModal(classId) {
  const c=state.timetableClasses.find(x=>x.id===classId); const tp=timetableProfileForClass(classId);
  if(!c||!tp) return;
  if(tp.period_mode==="shared") return toast("ห้องนี้ใช้คาบกลาง","เปลี่ยนเป็น “กำหนดเฉพาะห้อง” ก่อนจึงจะแก้เวลาเฉพาะห้องได้","error");

  const existing=timetablePeriodsFor(tp.id);
  const hasEntries=timetableEntriesFor(tp.id).length>0;
  const breakRow=existing.find(p=>p.is_break);
  const count=existing.length||9;
  const lunchSlot=Number(breakRow?.period_no || Math.min(5,count));

  const modal=document.createElement("div");
  modal.className="modal-backdrop";
  modal.innerHTML=`<div class="modal modal-wide"><div class="modal-head"><div><h3>คาบเฉพาะห้อง — ${escapeHtml(schoolClassLabel(c))}</h3><p>กำหนดวันเรียน เวลา และพักกลางวันแยกเฉพาะห้อง โดยพักกลางวันนับเป็นหนึ่งคาบ</p></div><button class="modal-close">×</button></div>
    ${hasEntries?`<div class="drive-permission-warning"><strong>มีข้อมูลในตารางแล้ว</strong><span>ต้องล้างตารางก่อนจึงจะแก้โครงคาบ/เวลาได้ เพื่อป้องกันคาบเดิมชี้ไปยังเวลาผิด</span></div>`:""}
    <div class="form-grid timetable-period-config">
      <div class="field"><label>วันเรียน</label><div class="weekday-checks">${[1,2,3,4,5,6,7].map(d=>`<label><input type="checkbox" data-weekday="${d}" ${(tp.weekdays||[]).includes(d)?"checked":""}> ${escapeHtml(TIMETABLE_DAY_LABEL[d])}</label>`).join("")}</div></div>
      <div class="form-row">
        <div class="field"><label>จำนวนคาบทั้งหมดต่อวัน <span class="helper">(รวมพักกลางวัน)</span></label><input class="input" id="period-count" type="number" min="2" max="12" value="${count}"></div>
        <div class="field"><label>พักรับประทานอาหารเป็นคาบที่</label><select class="select" id="lunch-period"></select></div>
      </div>
      <div id="period-rows"></div>
      <div class="timetable-lunch-config">
        <strong id="lunch-period-title">คาบ ${lunchSlot} · พักรับประทานอาหารกลางวัน</strong>
        <div class="form-row"><div class="field"><label>เริ่ม</label><input class="input" id="lunch-start" type="time" value="${breakRow?timeShort(breakRow.start_time):""}"></div><div class="field"><label>สิ้นสุด</label><input class="input" id="lunch-end" type="time" value="${breakRow?timeShort(breakRow.end_time):""}"></div></div>
      </div>
    </div>
    <div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="save-period-config" ${hasEntries?"disabled":""}>บันทึกโครงตาราง</button></div></div>`;

  document.body.appendChild(modal);
  const existingMap=Object.fromEntries(existing.filter(p=>!p.is_break).map(p=>[Number(p.period_no),p]));
  const countInput=modal.querySelector("#period-count");
  const lunchSelect=modal.querySelector("#lunch-period");
  const rows=modal.querySelector("#period-rows");

  function renderRows(){
    const n=Math.max(2,Math.min(12,Number(countInput.value||2)));
    const previous=Math.max(1,Math.min(n,Number(lunchSelect.value||lunchSlot)));
    lunchSelect.innerHTML=Array.from({length:n},(_,i)=>i+1)
      .map(no=>`<option value="${no}" ${no===previous?"selected":""}>คาบ ${no}</option>`).join("");
    lunchSelect.value=String(previous);
    modal.querySelector("#lunch-period-title").textContent=`คาบ ${previous} · พักรับประทานอาหารกลางวัน`;

    rows.innerHTML=`<div class="timetable-period-rows">${Array.from({length:n},(_,i)=>i+1)
      .filter(no=>no!==previous)
      .map(no=>{
        const ex=existingMap[no];
        return `<div class="timetable-period-row"><strong>คาบ ${no}</strong><input class="input" type="time" data-period-start="${no}" value="${ex?timeShort(ex.start_time):""}"><span>ถึง</span><input class="input" type="time" data-period-end="${no}" value="${ex?timeShort(ex.end_time):""}"></div>`;
      }).join("")}</div>`;
  }

  countInput.addEventListener("change",renderRows);
  lunchSelect.addEventListener("change",renderRows);
  renderRows();

  const close=()=>modal.remove();
  modal.querySelector(".modal-close").addEventListener("click",close);
  modal.querySelector(".modal-cancel").addEventListener("click",close);

  modal.querySelector("#save-period-config")?.addEventListener("click",async e=>{
    const weekdays=[...modal.querySelectorAll("[data-weekday]:checked")].map(x=>Number(x.dataset.weekday));
    if(!weekdays.length)return toast("กรุณาเลือกวันเรียน","ต้องมีอย่างน้อย 1 วัน","error");

    const n=Number(countInput.value);
    const lunchPos=Number(lunchSelect.value);
    const items=[];

    for(let no=1;no<=n;no++){
      if(no===lunchPos){
        const ls=modal.querySelector("#lunch-start").value;
        const le=modal.querySelector("#lunch-end").value;
        if(!ls||!le)return toast("กรอกเวลาพักกลางวัน","กรุณาระบุเวลาเริ่มและสิ้นสุด","error");
        items.push({timetable_id:tp.id,sort_order:no,period_no:no,label:"พักรับประทานอาหารกลางวัน",start_time:ls,end_time:le,is_break:true});
        continue;
      }

      const start=modal.querySelector(`[data-period-start="${no}"]`)?.value;
      const end=modal.querySelector(`[data-period-end="${no}"]`)?.value;
      if(!start||!end)return toast("กรอกเวลาไม่ครบ",`กรุณากรอกเวลา คาบ ${no}`,"error");
      items.push({timetable_id:tp.id,sort_order:no,period_no:no,label:`คาบ ${no}`,start_time:start,end_time:end,is_break:false});
    }

    buttonLoading(e.currentTarget,true,"กำลังบันทึก...");
    const up=await supabase.from("timetable_profiles").update({weekdays}).eq("id",tp.id);
    if(up.error){buttonLoading(e.currentTarget,false);return toast("บันทึกวันเรียนไม่สำเร็จ",up.error.message,"error");}

    const del=await supabase.from("timetable_periods").delete().eq("timetable_id",tp.id);
    if(del.error){buttonLoading(e.currentTarget,false);return toast("ล้างคาบเดิมไม่สำเร็จ",del.error.message,"error");}

    const ins=await supabase.from("timetable_periods").insert(items);
    buttonLoading(e.currentTarget,false);
    if(ins.error)return toast("บันทึกคาบไม่สำเร็จ",ins.error.message,"error");

    close();
    toast("บันทึกโครงตารางแล้ว",`${n} คาบรวมพักกลางวัน · พักเป็นคาบ ${lunchPos}`,"success");
    await renderDashboard();
  });
}

function timetableSubjectModal() {
  const modal=document.createElement("div"); modal.className="modal-backdrop";
  modal.innerHTML=`<div class="modal"><div class="modal-head"><div><h3>เพิ่มรายวิชา</h3><p>สร้าง Master รายวิชาเพื่อใช้กับหลายชั้นได้</p></div><button class="modal-close">×</button></div><form id="subject-form" class="form-grid"><div class="form-row"><div class="field"><label>รหัสวิชา <span class="optional">(ไม่บังคับ)</span></label><input class="input" name="subject_code"></div><div class="field"><label>ชื่อวิชา</label><input class="input" name="subject_name" required></div></div><div class="field"><label>กลุ่มสาระ</label><select class="select" name="subject_group_id"><option value="">ไม่ระบุ</option>${state.subjectGroups.map(s=>`<option value="${s.id}">${escapeHtml(s.name_th)}</option>`).join("")}</select></div></form><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="save-subject">บันทึก</button></div></div>`;
  document.body.appendChild(modal); const close=()=>modal.remove(); modal.querySelector(".modal-close").addEventListener("click",close); modal.querySelector(".modal-cancel").addEventListener("click",close);
  modal.querySelector("#save-subject").addEventListener("click",async e=>{const f=modal.querySelector("#subject-form");if(!f.reportValidity())return;const fd=new FormData(f);buttonLoading(e.currentTarget,true);const {error}=await supabase.from("academic_subjects").insert({subject_code:String(fd.get("subject_code")||"").trim()||null,subject_name:String(fd.get("subject_name")).trim(),subject_group_id:fd.get("subject_group_id")||null,created_by:state.user.id});buttonLoading(e.currentTarget,false);if(error)return toast("เพิ่มรายวิชาไม่สำเร็จ",error.message,"error");close();await renderDashboard();});
}

function teachingAssignmentModal() {
  const classes=timetableFilteredClasses(); const selected=selectedTimetableClass()||classes[0];
  if(!classes.length)return toast("ยังไม่มีชั้น/ห้อง","สร้างชั้น/ห้องก่อน","error");
  if(!state.timetableSubjects.length)return toast("ยังไม่มีรายวิชา","เพิ่มรายวิชาก่อน","error");
  const modal=document.createElement("div");modal.className="modal-backdrop";
  modal.innerHTML=`<div class="modal"><div class="modal-head"><div><h3>กำหนดวิชา / ครูผู้สอน</h3><p>ระบุจำนวนคาบต่อสัปดาห์ก่อนนำไปลากวาง</p></div><button class="modal-close">×</button></div><form id="assignment-form" class="form-grid"><div class="field"><label>ชั้น / ห้อง</label><select class="select" name="class_id">${classes.map(c=>`<option value="${c.id}" ${c.id===selected?.id?"selected":""}>${escapeHtml(schoolClassLabel(c))}</option>`).join("")}</select></div><div class="field"><label>รายวิชา</label><select class="select" name="subject_id">${state.timetableSubjects.map(s=>`<option value="${s.id}">${escapeHtml(s.subject_name)}${s.subject_code?` (${escapeHtml(s.subject_code)})`:""}</option>`).join("")}</select></div><div class="field"><label>ครูผู้สอน</label><select class="select" name="teacher_id">${state.timetableTeachers.map(t=>`<option value="${t.id}">${escapeHtml(t.full_name||t.email||"ครูผู้สอน")}</option>`).join("")}</select></div><div class="field"><label>จำนวนคาบต่อสัปดาห์</label><input class="input" name="periods_per_week" type="number" min="1" max="40" value="1" required></div></form><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="save-assignment">บันทึก</button></div></div>`;
  document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector(".modal-close").addEventListener("click",close);modal.querySelector(".modal-cancel").addEventListener("click",close);
  modal.querySelector("#save-assignment").addEventListener("click",async e=>{const f=modal.querySelector("#assignment-form");if(!f.reportValidity())return;const fd=new FormData(f);buttonLoading(e.currentTarget,true);const {error}=await supabase.from("teaching_assignments").insert({class_id:fd.get("class_id"),subject_id:fd.get("subject_id"),teacher_id:fd.get("teacher_id"),periods_per_week:Number(fd.get("periods_per_week")),created_by:state.user.id});buttonLoading(e.currentTarget,false);if(error)return toast("กำหนดการสอนไม่สำเร็จ",error.message,"error");state.timetableSelectedClassId=fd.get("class_id");close();await renderDashboard();});
}

async function dropTimetableItem(payload,day,periodId) {
  const tp=selectedTimetableProfile(); if(!tp||tp.status!=="draft")return;
  let result;
  if(payload.kind==="assignment"){
    result=await supabase.from("timetable_entries").insert({timetable_id:tp.id,assignment_id:payload.id,weekday:Number(day),period_id:periodId,created_by:state.user.id});
  }else if(payload.kind==="entry"){
    result=await supabase.from("timetable_entries").update({weekday:Number(day),period_id:periodId}).eq("id",payload.id);
  }
  if(result?.error)return toast("วางคาบไม่ได้",result.error.message,"error");
  await renderDashboard();
}

async function toggleTimetablePublish() {
  const tp=selectedTimetableProfile();if(!tp)return;
  const target=tp.status==="published"?"draft":"published";
  const {error}=await supabase.from("timetable_profiles").update({status:target}).eq("id",tp.id);
  if(error)return toast(target==="published"?"เผยแพร่ไม่ได้":"นำกลับเป็นฉบับร่างไม่ได้",error.message,"error");
  toast(target==="published"?"เผยแพร่ตารางแล้ว":"กลับเป็นฉบับร่างแล้ว",target==="published"?"ครูที่มีสิทธิ์สามารถดูตารางได้แล้ว":"สามารถแก้ไขตารางได้อีกครั้ง","success");
  await renderDashboard();
}

async function clearSelectedTimetable() {
  const tp=selectedTimetableProfile();if(!tp)return;
  if(!confirm("ล้างคาบที่จัดไว้ทั้งหมดของชั้นนี้หรือไม่?"))return;
  const {error}=await supabase.from("timetable_entries").delete().eq("timetable_id",tp.id);
  if(error)return toast("ล้างตารางไม่สำเร็จ",error.message,"error");
  await renderDashboard();
}

function timetableLiveSignature(title,name,subtitle="") {
  return `<div class="timetable-sign"><div>ลงชื่อ............................................................</div><span>(${escapeHtml(name||"................................................")})</span><strong>${escapeHtml(title)}</strong>${subtitle?`<small>${escapeHtml(subtitle)}</small>`:""}</div>`;
}

function timetableA4Styles() {
  return `${a4DocumentStyles()}
    @page{size:A4 landscape;margin:8mm;}
    .a4-document{width:277mm;min-height:190mm;padding:0;box-shadow:none;}
    .a4-document-inner{padding:7mm 8mm;}
    .tt-head{text-align:center;margin-bottom:3mm;}
    .tt-head .a4-school-logo{height:24mm;max-width:34mm;}
    .tt-head h1{font-size:18pt;margin:1mm 0 .5mm;}
    .tt-head h2{font-size:16pt;margin:0;font-weight:700;}
    .tt-owner{font-size:16pt;font-weight:700;border:1px solid #333;padding:1mm;text-align:center;margin-bottom:0;}
    .tt-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12pt;}
    .tt-table th,.tt-table td{border:1px solid #333;text-align:center;vertical-align:middle;padding:.8mm .7mm;height:14mm;line-height:1.12;}
    .tt-table thead th{height:auto;font-weight:700;}
    .tt-table thead .tt-lunch-head{background:#f7f7f7;}
    .tt-table .tt-day{width:21mm;}
    .tt-table th small{display:block;font-size:9pt;font-weight:400;margin-top:.5mm;}
    .tt-cell strong{display:block;font-size:11.5pt;}
    .tt-cell span{display:block;font-size:10pt;margin-top:.5mm;}
    .tt-break{width:13mm;writing-mode:vertical-rl;transform:rotate(180deg);font-size:10.5pt;letter-spacing:.2px;}
    .tt-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:12mm;margin-top:8mm;page-break-inside:avoid;}
    .timetable-sign{text-align:center;font-size:12.5pt;line-height:1.35;}
    .timetable-sign span,.timetable-sign strong,.timetable-sign small{display:block;}
    .timetable-sign small{font-size:10.5pt;}
  `;
}

function timetableClassPdfData(classId) {
  const c=state.timetableClasses.find(x=>x.id===classId); const tp=timetableProfileForClass(classId);
  if(!c||!tp)return null;
  const periods=timetablePeriodsFor(tp.id),days=[...(tp.weekdays||[])].sort((a,b)=>a-b),entries=timetableEntriesFor(tp.id);
  const aMap=Object.fromEntries(state.timetableAssignments.map(a=>[a.id,a])),sMap=Object.fromEntries(state.timetableSubjects.map(s=>[s.id,s]));
  const map=new Map(entries.map(e=>[`${e.weekday}:${e.period_id}`,e]));
  return {c,tp,periods,days,cell(day,p){const e=map.get(`${day}:${p.id}`);if(!e)return null;const a=aMap[e.assignment_id],s=sMap[a?.subject_id];return {subject:s?.subject_name||"รายวิชา",sub:a?.teacher_name||"ครูผู้สอน"};}};
}

function buildTimetablePdfTable(data) {
  const {periods,days}=data;
  return `<table class="tt-table"><thead>
    <tr><th class="tt-day" rowspan="2">วัน</th>${periods.map(p=>`<th class="${p.is_break?"tt-lunch-head":""}">${p.period_no}</th>`).join("")}</tr>
    <tr>${periods.map(p=>`<th class="${p.is_break?"tt-lunch-head":""}"><small>${timeShort(p.start_time)}–${timeShort(p.end_time)}</small></th>`).join("")}</tr>
  </thead><tbody>
    ${days.map((day,rowIndex)=>`<tr><th class="tt-day">${escapeHtml(TIMETABLE_DAY_LABEL[day]||String(day))}</th>${periods.map(p=>{
      if(p.is_break){
        return rowIndex===0?`<td class="tt-break" rowspan="${days.length}">${escapeHtml(p.label||"พักรับประทานอาหารกลางวัน")}</td>`:"";
      }
      const cell=data.cell(day,p);
      return `<td>${cell?`<div class="tt-cell"><strong>${escapeHtml(cell.subject)}</strong><span>${escapeHtml(cell.sub)}</span></div>`:""}</td>`;
    }).join("")}</tr>`).join("")}
  </tbody></table>`;
}

function buildClassTimetableA4(classId,assets={}) {
  const data=timetableClassPdfData(classId);if(!data)return "";
  const homeroomIds=state.timetableHomerooms.filter(h=>h.class_id===classId).map(h=>h.teacher_id);
  const homeroomNames=homeroomIds.map(timetableTeacherName).filter(Boolean);
  const firstTeacher=homeroomNames.join(" / ")||"ครูประจำชั้น";
  return `<article class="a4-document"><div class="a4-document-inner">
    <header class="tt-head">${assets.schoolLogo?`<img class="a4-school-logo" src="${assets.schoolLogo}" alt="ตราโรงเรียน">`:""}<h1>ตารางจัดการเรียนรู้ ${escapeHtml(schoolName())}</h1><h2>ปีการศึกษา ${escapeHtml(data.c.academic_year)} ภาคเรียนที่ ${data.c.semester}</h2></header>
    <div class="tt-owner">${escapeHtml(schoolClassLabel(data.c))}</div>${buildTimetablePdfTable(data)}
    <div class="tt-signatures">${timetableLiveSignature("ครูประจำชั้น",firstTeacher)}${timetableLiveSignature("หัวหน้ากลุ่มงานบริหารงานวิชาการ",data.tp.academic_head_name)}${timetableLiveSignature("ผู้อำนวยการโรงเรียน",data.tp.director_name)}</div>
  </div></article>`;
}

function teacherPdfData(teacherId) {
  const d=teacherTimetableData(teacherId); if(!d.entries.length)return null;
  const aMap=Object.fromEntries(d.assignments.map(a=>[a.id,a])),sMap=Object.fromEntries(state.timetableSubjects.map(s=>[s.id,s]));
  const entryMap=new Map();
  for(const e of d.entries){const per=d.periodById[e.period_id];if(!per)continue;entryMap.set(`${e.weekday}:${timeShort(per.start_time)}-${timeShort(per.end_time)}-${per.is_break?1:0}`,e);}
  return {periods:d.columns,days:d.days,cell(day,p){const e=entryMap.get(`${day}:${p.key}`);if(!e)return null;const a=aMap[e.assignment_id],s=sMap[a?.subject_id],c=state.timetableClasses.find(x=>x.id===a?.class_id);return {subject:s?.subject_name||"รายวิชา",sub:schoolClassLabel(c)};}};
}

function buildTeacherTimetableA4(teacherId,assets={}) {
  const data=teacherPdfData(teacherId);if(!data)return "";
  const p=currentTimetablePeriod();
  const profile=state.timetableProfiles.find(tp=>{
    const c=state.timetableClasses.find(x=>x.id===tp.class_id);return c&&Number(c.academic_year)===p.academicYear&&Number(c.semester)===p.semester;
  });
  const name=timetableTeacherName(teacherId);
  return `<article class="a4-document"><div class="a4-document-inner">
    <header class="tt-head">${assets.schoolLogo?`<img class="a4-school-logo" src="${assets.schoolLogo}" alt="ตราโรงเรียน">`:""}<h1>ตารางจัดการเรียนรู้ ${escapeHtml(schoolName())}</h1><h2>ปีการศึกษา ${p.academicYear} ภาคเรียนที่ ${p.semester}</h2></header>
    <div class="tt-owner">${escapeHtml(name)}</div>${buildTimetablePdfTable(data)}
    <div class="tt-signatures">${timetableLiveSignature("ครูผู้สอน",name)}${timetableLiveSignature("หัวหน้ากลุ่มงานบริหารงานวิชาการ",profile?.academic_head_name)}${timetableLiveSignature("ผู้อำนวยการโรงเรียน",profile?.director_name)}</div>
  </div></article>`;
}

async function timetablePdfPreview(kind,id) {
  const html=kind==="class"?buildClassTimetableA4(id):buildTeacherTimetableA4(id);
  if(!html)return toast("ยังไม่มีข้อมูลตาราง","ต้องมีตารางที่จัดและมองเห็นได้ก่อน","error");
  const modal=document.createElement("div");modal.className="modal-backdrop a4-preview-backdrop";
  modal.innerHTML=`<div class="a4-preview-shell"><div class="a4-preview-toolbar"><div><strong>${kind==="class"?"ตารางเรียนของนักเรียน":"ตารางสอนของครู"}</strong><span>A4 แนวนอน · TH Sarabun PSK · เซ็นสดหลังพิมพ์</span></div><div class="a4-preview-actions"><button class="btn btn-ghost" id="tt-a4-close">ปิด</button><button class="btn btn-primary" id="tt-a4-print">พิมพ์ / บันทึก PDF</button></div></div><div class="a4-preview-loading">กำลังเตรียมเอกสาร...</div></div>`;
  document.body.appendChild(modal);modal.querySelector("#tt-a4-close").addEventListener("click",()=>modal.remove());
  const schoolLogo=await schoolLogoDataUrl(); const body=kind==="class"?buildClassTimetableA4(id,{schoolLogo}):buildTeacherTimetableA4(id,{schoolLogo});
  modal.querySelector(".a4-preview-loading").outerHTML=`<div class="a4-preview-scroll"><style>${timetableA4Styles()}</style>${body}</div>`;
  modal.querySelector("#tt-a4-print").addEventListener("click",()=>{
    const w=window.open("","_blank");if(!w)return toast("เปิดหน้าพิมพ์ไม่ได้","กรุณาอนุญาต Pop-up","error");
    w.document.write(`<!doctype html><html lang="th"><head><meta charset="UTF-8"><title>ตารางสอน</title><style>${timetableA4Styles()}</style></head><body class="a4-print-body">${body}<script>window.addEventListener('load',()=>{(document.fonts?document.fonts.ready:Promise.resolve()).finally(()=>setTimeout(()=>window.print(),250));});<\/script></body></html>`);w.document.close();
  });
}


async function timetableBatchPdfPreview(kind, ids) {
  const validIds=(ids||[]).filter(Boolean);
  if(!validIds.length)return toast("ไม่มีข้อมูลสำหรับ Export","ไม่พบรายการที่มีสิทธิ์ส่งออก","error");
  const schoolLogo=await schoolLogoDataUrl();
  const pages=validIds.map(id=>kind==="class"?buildClassTimetableA4(id,{schoolLogo}):buildTeacherTimetableA4(id,{schoolLogo})).filter(Boolean);
  if(!pages.length)return toast("ยังไม่มีข้อมูลตาราง","ต้องมีตารางที่จัดและมองเห็นได้ก่อน","error");
  const body=`<div class="timetable-batch-doc">${pages.join("")}</div>`;
  const title=kind==="class"?`ตารางเรียนรวม ${pages.length} ห้อง`:`ตารางสอนรวม ${pages.length} คน`;
  const modal=document.createElement("div");modal.className="modal-backdrop a4-preview-backdrop";
  modal.innerHTML=`<div class="a4-preview-shell"><div class="a4-preview-toolbar"><div><strong>${escapeHtml(title)}</strong><span>A4 แนวนอน · 1 ตารางต่อ 1 หน้า · รวมเป็น PDF เดียว</span></div><div class="a4-preview-actions"><button class="btn btn-ghost" id="tt-batch-close">ปิด</button><button class="btn btn-primary" id="tt-batch-print">พิมพ์ / บันทึก PDF เดียว</button></div></div><div class="a4-preview-scroll"><style>${timetableA4Styles()} .timetable-batch-doc>.a4-document{break-after:page;page-break-after:always}.timetable-batch-doc>.a4-document:last-child{break-after:auto;page-break-after:auto}</style>${body}</div></div>`;
  document.body.appendChild(modal);
  modal.querySelector("#tt-batch-close").onclick=()=>modal.remove();
  modal.querySelector("#tt-batch-print").onclick=()=>{const w=window.open("","_blank");if(!w)return toast("เปิดหน้าพิมพ์ไม่ได้","กรุณาอนุญาต Pop-up","error");w.document.write(`<!doctype html><html lang="th"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>${timetableA4Styles()} .timetable-batch-doc>.a4-document{break-after:page;page-break-after:always}.timetable-batch-doc>.a4-document:last-child{break-after:auto;page-break-after:auto}</style></head><body class="a4-print-body">${body}<script>window.addEventListener('load',()=>{(document.fonts?document.fonts.ready:Promise.resolve()).finally(()=>setTimeout(()=>window.print(),350));});<\/script></body></html>`);w.document.close();};
}

async function timetableTeacherCapabilityModal(user) {
  const period=currentAcademicPeriod();
  const [classesRes,homeroomsRes,stageRes]=await Promise.all([
    supabase.from("school_classes").select("*").eq("is_active",true).eq("academic_year",String(period.academicYear)).eq("semester",period.semester).order("sort_order").order("level_name"),
    supabase.from("homeroom_teachers").select("*").eq("teacher_id",user.id),
    supabase.from("stage_heads").select("*").eq("academic_year",String(period.academicYear)),
  ]);
  const classes=classesRes.data||[],homerooms=homeroomsRes.data||[],stageRows=stageRes.data||[];
  const currentHome=homerooms.find(h=>classes.some(c=>c.id===h.class_id));
  const currentStage=stageRows.find(s=>s.teacher_id===user.id);
  const modal=document.createElement("div");modal.className="modal-backdrop";
  modal.innerHTML=`<div class="modal"><div class="modal-head"><div><h3>ตั้งค่าครู</h3><p>${escapeHtml(user.full_name||user.email)} · ปีการศึกษา ${period.academicYear} ภาคเรียน ${period.semester}</p></div><button class="modal-close">×</button></div><div class="form-grid">
    <label class="settings-check"><input type="checkbox" id="teacher-stage-head" ${currentStage?"checked":""}> เป็นหัวหน้าช่วงชั้น</label>
    <div class="field"><label>ช่วงชั้นที่รับผิดชอบ</label><select class="select" id="teacher-stage-code">${Object.entries(TIMETABLE_STAGE_LABEL).map(([v,l])=>`<option value="${v}" ${currentStage?.stage_code===v?"selected":""}>${escapeHtml(l)}</option>`).join("")}</select></div>
    <div class="field"><label>ครูประจำชั้น</label><select class="select" id="teacher-homeroom"><option value="">ไม่กำหนด</option>${classes.map(c=>`<option value="${c.id}" ${currentHome?.class_id===c.id?"selected":""}>${escapeHtml(schoolClassLabel(c))}</option>`).join("")}</select><span class="helper">ครูหลายคนสามารถประจำชั้นห้องเดียวกันได้</span></div>
    ${classes.length?"":`<div class="drive-permission-warning"><strong>ยังไม่มีห้องในภาคเรียนปัจจุบัน</strong><span>หัวหน้าวิชาการต้องสร้างชั้น/ห้องในระบบตารางสอนก่อน จึงจะเลือกครูประจำชั้นได้</span></div>`}
  </div><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="save-teacher-capability">บันทึก</button></div></div>`;
  document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector(".modal-close").addEventListener("click",close);modal.querySelector(".modal-cancel").addEventListener("click",close);
  modal.querySelector("#save-teacher-capability").addEventListener("click",async e=>{
    buttonLoading(e.currentTarget,true,"กำลังบันทึก...");
    const classIds=classes.map(c=>c.id);
    if(classIds.length) await supabase.from("homeroom_teachers").delete().eq("teacher_id",user.id).in("class_id",classIds);
    const home=modal.querySelector("#teacher-homeroom").value;
    if(home){const h=await supabase.from("homeroom_teachers").insert({class_id:home,teacher_id:user.id,assigned_by:state.user.id});if(h.error){buttonLoading(e.currentTarget,false);return toast("บันทึกครูประจำชั้นไม่สำเร็จ",h.error.message,"error");}}
    await supabase.from("stage_heads").delete().eq("teacher_id",user.id).eq("academic_year",String(period.academicYear));
    if(modal.querySelector("#teacher-stage-head").checked){
      const s=await supabase.from("stage_heads").upsert({academic_year:String(period.academicYear),stage_code:modal.querySelector("#teacher-stage-code").value,teacher_id:user.id,assigned_by:state.user.id},{onConflict:"academic_year,stage_code"});
      if(s.error){buttonLoading(e.currentTarget,false);return toast("บันทึกหัวหน้าช่วงชั้นไม่สำเร็จ",s.error.message,"error");}
    }
    buttonLoading(e.currentTarget,false);close();toast("บันทึกข้อมูลวิชาการของครูแล้ว","","success");
  });
}


const SUBSTITUTE_STATUS_LABEL = {
  unassigned: "รอจัดครูสอนแทน",
  assigned: "จัดครูสอนแทนแล้ว",
  cancelled: "ยกเลิก",
};

const SUBSTITUTE_ACTION_LABEL = {
  assign: "มอบหมายครูสอนแทน",
  reassign: "เปลี่ยนครูสอนแทน",
  unassign: "ยกเลิกการมอบหมาย",
  sync: "ซิงก์จากระบบวันลา",
  cancel: "ยกเลิกรายการ",
};

function substituteStageHeadRows(year = state.substituteAcademicYear || currentAcademicPeriod().academicYear) {
  return state.timetableStageHeads.filter(row => row.teacher_id === state.user?.id && String(row.academic_year) === String(year));
}

function canManageSubstituteTeaching() {
  return isAcademicHead() || substituteStageHeadRows().length > 0;
}

function canManageSubstituteLesson(row) {
  if (!row) return false;
  if (row.absent_teacher_id === state.user.id) return true;
  if (isAcademicHead()) return true;
  return substituteStageHeadRows(row.academic_year).some(sh => sh.stage_code === row.stage_code);
}

function canViewSubstituteOverview() {
  return canManageSubstituteTeaching() || isPersonnelHeadUser() || ["director","super_admin"].includes(state.profile?.role);
}

function substituteAcademicYears() {
  const values = new Set(state.substituteLessons.map(x => Number(x.academic_year)).filter(Boolean));
  values.add(currentAcademicPeriod().academicYear);
  return [...values].sort((a,b) => b-a);
}

function substituteCurrentPeriod() {
  const p=currentAcademicPeriod();
  return {academicYear:Number(state.substituteAcademicYear||p.academicYear),semester:Number(state.substituteSemester||p.semester)};
}

function substitutePeriodRows() {
  const p=substituteCurrentPeriod();
  return state.substituteLessons.filter(x=>Number(x.academic_year)===p.academicYear&&Number(x.semester)===p.semester&&x.status!=="cancelled");
}

function substituteRowsForView() {
  let rows=substitutePeriodRows();
  if(state.substituteView==="mine") rows=rows.filter(x=>x.substitute_teacher_id===state.user.id);
  else if(state.substituteView==="absent") rows=rows.filter(x=>x.absent_teacher_id===state.user.id);
  else if(state.substituteView==="pending") rows=rows.filter(x=>x.status==="unassigned");
  return [...rows].sort((a,b)=>String(a.leave_date).localeCompare(String(b.leave_date))||Number(a.period_no)-Number(b.period_no));
}

function substituteRowsForBatch(leaveRequestId, leaveDate=null) {
  return substitutePeriodRows().filter(x=>x.leave_request_id===leaveRequestId&&(!leaveDate||x.leave_date===leaveDate)).sort((a,b)=>String(a.leave_date).localeCompare(String(b.leave_date))||Number(a.period_no)-Number(b.period_no));
}

function substituteBatchDates(leaveRequestId) {
  return [...new Set(substituteRowsForBatch(leaveRequestId).map(x=>x.leave_date))].sort();
}

function substituteBatchProgress(leaveRequestId, leaveDate=null) {
  const rows=substituteRowsForBatch(leaveRequestId,leaveDate),assigned=rows.filter(x=>x.status==="assigned").length;
  return {rows,total:rows.length,assigned,pending:Math.max(0,rows.length-assigned),complete:rows.length>0&&assigned===rows.length};
}

function substituteAcademicYearsForUser() {
  if(!isAcademicHead()){
    const own=state.timetableStageHeads.filter(row=>row.teacher_id===state.user.id).map(row=>Number(row.academic_year)).filter(Boolean);
    if(own.length)return [...new Set([...own,...substituteAcademicYears()])].sort((a,b)=>b-a);
  }
  return substituteAcademicYears();
}

async function loadSubstituteWorkspace() {
  const ownStageHeadsRes=await supabase.from("stage_heads").select("*").eq("teacher_id",state.user.id).order("academic_year",{ascending:false});
  if(!ownStageHeadsRes.error){
    const others=state.timetableStageHeads.filter(row=>row.teacher_id!==state.user.id);
    state.timetableStageHeads=[...others,...(ownStageHeadsRes.data||[])];
  }
  const [lessonsRes,actionsRes]=await Promise.all([
    supabase.from("substitute_lessons").select("*").order("leave_date").order("period_no"),
    supabase.from("substitute_actions").select("*").order("created_at"),
  ]);
  state.substituteLessons=lessonsRes.error?[]:(lessonsRes.data||[]);
  state.substituteActions=actionsRes.error?[]:(actionsRes.data||[]);
  const current=currentAcademicPeriod();
  if(!state.substituteAcademicYear)state.substituteAcademicYear=current.academicYear;
  if(!state.substituteSemester)state.substituteSemester=current.semester;
  if(state.selectedSubstituteLessonId&&!state.substituteLessons.some(x=>x.id===state.selectedSubstituteLessonId))state.selectedSubstituteLessonId=null;
  if(state.selectedSubstituteLeaveId){
    const dates=substituteBatchDates(state.selectedSubstituteLeaveId);
    if(!state.selectedSubstituteDate||!dates.includes(state.selectedSubstituteDate))state.selectedSubstituteDate=dates[0]||null;
  }
  if(canManageSubstituteTeaching()){
    if(!["manage","pending","mine","absent"].includes(state.substituteView))state.substituteView="manage";
  }else if(canViewSubstituteOverview()){
    if(!["manage","pending","mine","absent"].includes(state.substituteView))state.substituteView="manage";
  }else if(!["mine","absent"].includes(state.substituteView))state.substituteView="absent";
}

function substitutePeriodFilterHtml() {
  const p=substituteCurrentPeriod();
  return `<div class="substitute-filter-row"><div class="field"><label>ปีการศึกษา</label><select class="select" id="substitute-year">${substituteAcademicYearsForUser().map(y=>`<option value="${y}" ${y===p.academicYear?"selected":""}>${y}</option>`).join("")}</select></div><div class="field"><label>ภาคเรียน</label><select class="select" id="substitute-semester"><option value="1" ${p.semester===1?"selected":""}>1</option><option value="2" ${p.semester===2?"selected":""}>2</option><option value="3" ${p.semester===3?"selected":""}>3</option></select></div></div>`;
}

function substituteTabsHtml() {
  if(canManageSubstituteTeaching())return `<div class="lesson-view-tabs substitute-tabs"><button class="lesson-view-tab ${state.substituteView==="manage"?"active":""}" data-substitute-view="manage">รายการตามใบลา</button><button class="lesson-view-tab ${state.substituteView==="pending"?"active":""}" data-substitute-view="pending">รอจัดครู</button><button class="lesson-view-tab ${state.substituteView==="absent"?"active":""}" data-substitute-view="absent">การลาของฉัน</button><button class="lesson-view-tab ${state.substituteView==="mine"?"active":""}" data-substitute-view="mine">งานสอนแทนของฉัน</button></div>`;
  if(canViewSubstituteOverview())return `<div class="lesson-view-tabs substitute-tabs"><button class="lesson-view-tab ${state.substituteView==="manage"?"active":""}" data-substitute-view="manage">สถานะการจัดสอนแทน</button>${state.profile.role==="department_head"?`<button class="lesson-view-tab ${state.substituteView==="absent"?"active":""}" data-substitute-view="absent">การลาของฉัน</button>`:""}</div>`;
  return `<div class="lesson-view-tabs substitute-tabs"><button class="lesson-view-tab ${state.substituteView==="absent"?"active":""}" data-substitute-view="absent">จัดสอนแทนของฉัน</button><button class="lesson-view-tab ${state.substituteView==="mine"?"active":""}" data-substitute-view="mine">งานสอนแทนที่ได้รับ</button></div>`;
}

function substituteManagerScopeText() {
  if(isAcademicHead())return "จัดการได้ทั้งโรงเรียน";
  const labels=substituteStageHeadRows().map(row=>TIMETABLE_STAGE_LABEL[row.stage_code]||row.stage_code);
  if(labels.length)return `จัดการเฉพาะ ${[...new Set(labels)].join(" / ")}`;
  if(isPersonnelHeadUser())return "ติดตามสถานะเพื่อประกอบการตรวจวันลา";
  if(["director","super_admin"].includes(state.profile.role))return "ติดตามสถานะภาพรวม";
  return "ผู้ยื่นใบลาจัดครูสอนแทนของตนเองได้ทันที";
}

function substituteHeroHtml() {
  return `<section class="lesson-hero substitute-hero"><div><span class="eyebrow dark">Academic Substitute Teaching</span><h2>ระบบจัดการสอนแทน</h2><p>${escapeHtml(substituteManagerScopeText())} · รายการสร้างจากใบลาที่ส่งแล้วและตารางสอน Published โดยไม่ต้องรออนุมัติใบลา</p></div><div class="lesson-hero-actions">${isAcademicHead()?`<button class="btn btn-secondary" id="sync-substitute-lessons">↻ ซิงก์วันลา / ตารางสอน</button>`:""}</div></section>`;
}

function substituteStatsHtml() {
  const rows=substitutePeriodRows();
  return `<div class="lesson-stat-grid substitute-stat-grid"><article class="metric-card"><div class="metric-label">คาบทั้งหมด</div><div class="metric-value">${rows.length}</div></article><article class="metric-card"><div class="metric-label">รอจัดครู</div><div class="metric-value">${rows.filter(x=>x.status==="unassigned").length}</div></article><article class="metric-card"><div class="metric-label">จัดครูแล้ว</div><div class="metric-value">${rows.filter(x=>x.status==="assigned").length}</div></article><article class="metric-card"><div class="metric-label">ใบลาที่เกี่ยวข้อง</div><div class="metric-value">${new Set(rows.map(x=>x.leave_request_id)).size}</div></article></div>`;
}

function substituteStatusPill(status) {
  return `<span class="pill ${status==="assigned"?"active":status==="unassigned"?"pending":"suspended"}">${escapeHtml(SUBSTITUTE_STATUS_LABEL[status]||status)}</span>`;
}

function substituteBatchCardsHtml(rows) {
  if(!rows.length)return `<div class="empty"><strong>ยังไม่มีรายการสอนแทนในช่วงที่เลือก</strong><span>เมื่อส่งใบลาและมีคาบตรงกับตาราง Published ระบบจะสร้างรายการให้อัตโนมัติ</span></div>`;
  const leaveIds=[...new Set(rows.map(x=>x.leave_request_id))];
  return `<div class="substitute-batch-grid">${leaveIds.map(leaveId=>{
    const allRows=substituteRowsForBatch(leaveId),visibleRows=rows.filter(x=>x.leave_request_id===leaveId);
    if(!visibleRows.length||!allRows.length)return "";
    const first=allRows[0],dates=[...new Set(visibleRows.map(x=>x.leave_date))].sort(),overall=substituteBatchProgress(leaveId),canEdit=allRows.some(canManageSubstituteLesson);
    return `<article class="substitute-batch-card"><div class="substitute-batch-head"><div><span class="eyebrow dark">คำขอลา #${first.leave_request_no}</span><h3>${escapeHtml(first.absent_teacher_name)}</h3><p>ปีการศึกษา ${first.academic_year} · ภาคเรียน ${first.semester}</p></div>${overall.complete?`<span class="pill active">จัดครบ ${overall.assigned}/${overall.total}</span>`:`<span class="pill pending">จัดแล้ว ${overall.assigned}/${overall.total}</span>`}</div><div class="substitute-batch-progress"><i style="width:${overall.total?Math.round((overall.assigned/overall.total)*100):0}%"></i></div><div class="substitute-batch-date-row"><div class="field"><label>เลือกวันที่ลา</label><select class="select" data-substitute-date-select="${leaveId}">${dates.map(date=>{const p=substituteBatchProgress(leaveId,date);return `<option value="${date}">${thaiDateOnly(date)} · ${p.assigned}/${p.total} คาบ</option>`}).join("")}</select></div><button class="btn ${canEdit?"btn-primary":"btn-secondary"}" data-open-substitute-day="${leaveId}">${canEdit?"จัดสอนแทนวันที่เลือก":"ดูรายละเอียดวันที่เลือก"}</button></div><div class="substitute-batch-mini">${dates.map(date=>{const p=substituteBatchProgress(leaveId,date);return `<span class="${p.complete?"complete":""}">${thaiDateOnly(date)} · ${p.complete?"ครบ":"รอ "+p.pending+" คาบ"}</span>`}).join("")}</div></article>`;
  }).join("")}</div>`;
}

function substituteAssignedTableHtml(rows) {
  if(!rows.length)return `<div class="empty"><strong>ยังไม่มีงานสอนแทน</strong><span>เมื่อได้รับมอบหมาย รายการจะแสดงที่นี่</span></div>`;
  return `<div class="table-wrap"><table class="table substitute-table"><thead><tr><th>วันที่</th><th>คาบ / เวลา</th><th>ชั้น / วิชา</th><th>ครูผู้ลา</th><th>สถานะ</th><th></th></tr></thead><tbody>${rows.map(row=>`<tr><td><strong>${thaiDateOnly(row.leave_date)}</strong></td><td><strong>คาบ ${row.period_no}</strong><br><span class="table-muted">${timeShort(row.start_time)}–${timeShort(row.end_time)}</span></td><td><strong>${escapeHtml(row.class_label)}</strong><br><span class="table-muted">${escapeHtml(row.subject_name)}</span></td><td>${escapeHtml(row.absent_teacher_name)}</td><td>${substituteStatusPill(row.status)}</td><td><button class="btn btn-ghost" data-substitute-open="${row.id}">รายละเอียด</button></td></tr>`).join("")}</tbody></table></div>`;
}

function substituteTimelineHtml(row) {
  const actions=state.substituteActions.filter(a=>a.substitute_lesson_id===row.id);
  if(!actions.length)return `<div class="empty compact"><strong>ยังไม่มีประวัติการมอบหมาย</strong></div>`;
  return `<div class="leave-timeline">${actions.map(a=>`<div class="leave-timeline-item"><div class="leave-timeline-dot"></div><div><strong>${escapeHtml(SUBSTITUTE_ACTION_LABEL[a.action]||a.action)}</strong><span>${escapeHtml(a.actor_name)} · ${formatDate(a.created_at)}</span>${a.comment?`<p>${escapeHtml(a.comment)}</p>`:""}</div></div>`).join("")}</div>`;
}

function substituteDetailHtml(row) {
  const manageable=canManageSubstituteLesson(row);
  return `<section class="substitute-detail"><div class="personnel-detail-top"><div><button class="type-back-link" id="substitute-back">← กลับ</button><span class="eyebrow dark">Substitute Lesson</span></div><div class="personnel-detail-actions">${manageable?`<button class="btn ${row.status==="assigned"?"btn-secondary":"btn-primary"}" data-substitute-assign="${row.id}">${row.status==="assigned"?"เปลี่ยนครู":"เลือกครูสอนแทน"}</button>`:""}${manageable&&row.status==="assigned"?`<button class="btn btn-danger" id="unassign-substitute">ยกเลิกการมอบหมาย</button>`:""}${isSuperAdminUser()?`<button class="btn btn-danger" id="delete-substitute-record">ลบรายการสอนแทน</button>`:""}</div></div><section class="substitute-detail-hero"><div><span class="eyebrow dark">${thaiDateOnly(row.leave_date)} · คาบ ${row.period_no}</span><h2>${escapeHtml(row.class_label)} · ${escapeHtml(row.subject_name)}</h2><p>${timeShort(row.start_time)}–${timeShort(row.end_time)} · ${escapeHtml(TIMETABLE_STAGE_LABEL[row.stage_code]||row.stage_code)}</p></div>${substituteStatusPill(row.status)}</section><div class="detail-grid substitute-detail-grid">${planField("ครูผู้ลา",row.absent_teacher_name)}${planField("เลขคำขอลา",`#${row.leave_request_no}`)}${planField("ครูสอนแทน",row.substitute_teacher_name||"ยังไม่ได้มอบหมาย")}${planField("ผู้จัดครูสอนแทน",row.assigned_by_name||"—")}${planField("เวลามอบหมาย",row.assigned_at?formatDate(row.assigned_at):"—")}${planField("หมายเหตุ",row.note||"—")}</div><section class="panel" style="margin-top:14px"><div class="panel-head"><div class="panel-title-wrap"><h3>Timeline การจัดสอนแทน</h3></div></div>${substituteTimelineHtml(row)}</section></section>`;
}

function candidateDetailText(candidate) {
  if(!candidate)return "ยังไม่ได้เลือกครูสอนแทน";
  return candidate.available ? `ว่างคาบ: ${candidate.free_periods||"—"} · วันนี้มีภาระสอน ${Number(candidate.workload||0)} คาบ${candidate.busy_periods?` · ไม่ว่างคาบ: ${candidate.busy_periods}`:""}` : candidate.conflict_reason||"ไม่ว่าง";
}

async function loadSubstituteDayCandidates(rows) {
  const manageable=rows.filter(canManageSubstituteLesson);
  const results=await Promise.all(manageable.map(async row=>{const {data,error}=await supabase.rpc("get_substitute_candidates",{p_substitute_lesson_id:row.id}); return [row.id,error?[]:(data||[])];}));
  state.substituteCandidateMap=Object.fromEntries(results);
}

async function openSubstituteDayPlanner(leaveRequestId,date=null) {
  state.selectedSubstituteLessonId=null;
  state.selectedSubstituteLeaveId=leaveRequestId;
  const dates=substituteBatchDates(leaveRequestId);
  state.selectedSubstituteDate=date&&dates.includes(date)?date:(dates[0]||null);
  const rows=substituteRowsForBatch(leaveRequestId,state.selectedSubstituteDate);
  if(rows.some(canManageSubstituteLesson))await loadSubstituteDayCandidates(rows);
  await renderDashboard();
}

function substituteDayPlannerHtml() {
  const leaveId=state.selectedSubstituteLeaveId,dates=substituteBatchDates(leaveId),date=state.selectedSubstituteDate||dates[0],rows=substituteRowsForBatch(leaveId,date);
  if(!rows.length)return `<section class="panel"><button class="type-back-link" id="substitute-day-back">← กลับรายการ</button><div class="empty"><strong>ยังไม่พบคาบสอนในวันที่เลือก</strong><span>ตารางสอนต้องอยู่ในสถานะ Published จึงจะสร้างรายการสอนแทนได้</span></div></section>`;
  const first=rows[0],progress=substituteBatchProgress(leaveId,date),manageable=rows.some(canManageSubstituteLesson);
  return `<section class="substitute-day-planner"><div class="personnel-detail-top"><div><button class="type-back-link" id="substitute-day-back">← กลับรายการ</button><span class="eyebrow dark">คำขอลา #${first.leave_request_no}</span></div><div class="personnel-detail-actions"><button class="btn btn-secondary" id="export-substitute-day" ${progress.complete?"":"disabled"}>▤ Preview / Export PDF</button>${manageable?`<button class="btn btn-primary" id="save-substitute-day">บันทึกการจัดสอนแทน</button>`:""}</div></div><section class="substitute-day-hero"><div><span class="eyebrow dark">${escapeHtml(first.absent_teacher_name)}</span><h2>จัดสอนแทนรายวัน</h2><p>เลือกครูให้ครบทุกคาบในหน้าเดียว แล้วกดบันทึกครั้งเดียว</p></div><div class="substitute-day-date-box"><label>วันที่ลา</label><select class="select" id="substitute-day-date">${dates.map(d=>{const p=substituteBatchProgress(leaveId,d);return `<option value="${d}" ${d===date?"selected":""}>${thaiDateOnly(d)} · ${p.assigned}/${p.total} คาบ</option>`}).join("")}</select></div></section><div class="substitute-day-progress"><div><strong>${progress.assigned}/${progress.total}</strong><span>คาบที่จัดแล้ว</span></div><div class="substitute-batch-progress"><i style="width:${progress.total?Math.round((progress.assigned/progress.total)*100):0}%"></i></div>${progress.complete?`<span class="pill active">พร้อม Export PDF</span>`:`<span class="pill pending">เหลือ ${progress.pending} คาบ</span>`}</div><section class="panel substitute-day-table-panel"><div class="table-wrap"><table class="table substitute-day-table"><thead><tr><th>คาบ</th><th>เวลา</th><th>ชั้น / วิชา</th><th>เลือกครูสอนแทน</th><th>รายละเอียดความว่าง</th></tr></thead><tbody>${rows.map(row=>{
    const candidates=state.substituteCandidateMap[row.id]||[],available=candidates.filter(c=>c.available),selected=candidates.find(c=>c.teacher_id===row.substitute_teacher_id)||null;
    return `<tr><td><strong>คาบ ${row.period_no}</strong></td><td>${timeShort(row.start_time)}–${timeShort(row.end_time)}</td><td><strong>${escapeHtml(row.class_label)}</strong><br><span class="table-muted">${escapeHtml(row.subject_name)}</span></td><td>${manageable&&canManageSubstituteLesson(row)?`<select class="select substitute-teacher-select" data-substitute-choice="${row.id}"><option value="">ยังไม่กำหนด</option>${available.map(c=>`<option value="${c.teacher_id}" ${c.teacher_id===row.substitute_teacher_id?"selected":""}>${escapeHtml(c.teacher_name)} · วันนี้ ${Number(c.workload||0)} คาบ</option>`).join("")}</select>`:`<strong>${escapeHtml(row.substitute_teacher_name||"ยังไม่ได้กำหนด")}</strong>`}</td><td><div class="candidate-availability-detail" data-candidate-detail="${row.id}">${escapeHtml(manageable?candidateDetailText(selected):(row.substitute_teacher_name?"มอบหมายแล้ว":"ยังไม่ได้มอบหมาย"))}</div></td></tr>`;
  }).join("")}</tbody></table></div>${manageable?`<div class="substitute-day-help"><strong>ข้อมูลประกอบการเลือก</strong><span>Dropdown แสดงเฉพาะครูที่ว่างในคาบนั้น ส่วนรายละเอียดจะแสดงคาบที่ว่างทั้งวันและจำนวนภาระสอนของครูที่เลือก</span></div>`:""}</section></section>`;
}

async function saveSubstituteDayAssignments() {
  const leaveId=state.selectedSubstituteLeaveId,date=state.selectedSubstituteDate,rows=substituteRowsForBatch(leaveId,date),selects=[...document.querySelectorAll("[data-substitute-choice]")],button=document.querySelector("#save-substitute-day");
  buttonLoading(button,true,"กำลังบันทึก...");
  try{
    for(const select of selects){
      const row=rows.find(r=>r.id===select.dataset.substituteChoice); if(!row||!canManageSubstituteLesson(row))continue;
      const chosen=select.value||null; if(chosen===row.substitute_teacher_id)continue;
      if(!chosen&&row.status==="assigned"){const {error}=await supabase.rpc("unassign_substitute_teacher",{p_substitute_lesson_id:row.id,p_comment:"แก้ไขจากหน้าจัดสอนแทนรายวัน"}); if(error)throw error;}
      else if(chosen){const {error}=await supabase.rpc("assign_substitute_teacher",{p_substitute_lesson_id:row.id,p_teacher_id:chosen,p_note:null}); if(error)throw error;}
    }
    toast("บันทึกการจัดสอนแทนแล้ว","ระบบอัปเดตสถานะให้หัวหน้าบุคคลและผู้อำนวยการเห็นได้ทันที","success");
    state.substituteCandidateMap={}; await loadSubstituteWorkspace(); const fresh=substituteRowsForBatch(leaveId,date); if(fresh.some(canManageSubstituteLesson))await loadSubstituteDayCandidates(fresh); renderDashboard();
  }catch(error){toast("บันทึกไม่สำเร็จ",friendlySubstituteError(error),"error");}finally{buttonLoading(button,false);}
}

function friendlySubstituteError(error) {
  const msg=String(error?.message||error||"");
  if(msg.includes("leave request"))return "ครูที่เลือกมีคำขอลาในวันที่ดังกล่าว";
  if(msg.includes("regular class"))return "ครูที่เลือกมีคาบสอนประจำชนกับช่วงเวลานี้";
  if(msg.includes("another substitute"))return "ครูที่เลือกมีงานสอนแทนอื่นชนกับช่วงเวลานี้";
  if(msg.includes("permission"))return "บัญชีนี้ไม่มีสิทธิ์จัดคาบสอนแทนรายการนี้";
  return msg||"เกิดข้อผิดพลาด";
}

async function substituteAssignModal(lessonId) {
  const lesson=state.substituteLessons.find(x=>x.id===lessonId); if(!lesson||!canManageSubstituteLesson(lesson))return;
  const {data,error}=await supabase.rpc("get_substitute_candidates",{p_substitute_lesson_id:lessonId}); if(error)return toast("ค้นหาครูไม่ได้",friendlySubstituteError(error),"error");
  const candidates=data||[],modal=document.createElement("div"); modal.className="modal-backdrop";
  modal.innerHTML=`<div class="modal modal-wide substitute-assign-modal"><div class="modal-head"><div><h3>เลือกครูสอนแทน</h3><p>${thaiDateOnly(lesson.leave_date)} · คาบ ${lesson.period_no} · ${escapeHtml(lesson.class_label)} · ${escapeHtml(lesson.subject_name)}</p></div><button class="modal-close">×</button></div><div class="substitute-candidate-list">${candidates.length?candidates.map(c=>`<div class="substitute-candidate ${c.available?"available":"busy"}"><div class="candidate-icon">${escapeHtml(initials(c.teacher_name||"ครู"))}</div><div class="candidate-main"><strong>${escapeHtml(c.teacher_name)}</strong><span>${c.available?`ว่างคาบ ${escapeHtml(c.free_periods||"—")}`:escapeHtml(c.conflict_reason||"ไม่ว่าง")}</span><small>วันนี้มีภาระสอน ${Number(c.workload||0)} คาบ${c.busy_periods?` · ไม่ว่างคาบ ${escapeHtml(c.busy_periods)}`:""}</small></div>${c.available?`<button class="btn btn-primary" data-pick-substitute="${c.teacher_id}">เลือกครูนี้</button>`:`<span class="pill suspended">ติดคาบ</span>`}</div>`).join(""):`<div class="empty"><strong>ไม่พบครูในระบบ</strong></div>`}</div><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ปิด</button></div></div>`;
  document.body.appendChild(modal); const close=()=>modal.remove(); modal.querySelector(".modal-close").addEventListener("click",close); modal.querySelector(".modal-cancel").addEventListener("click",close);
  modal.querySelectorAll("[data-pick-substitute]").forEach(btn=>btn.addEventListener("click",async()=>{buttonLoading(btn,true,"กำลังมอบหมาย..."); const {error:assignError}=await supabase.rpc("assign_substitute_teacher",{p_substitute_lesson_id:lessonId,p_teacher_id:btn.dataset.pickSubstitute,p_note:null}); buttonLoading(btn,false); if(assignError)return toast("มอบหมายไม่สำเร็จ",friendlySubstituteError(assignError),"error"); close(); toast("มอบหมายครูสอนแทนแล้ว","","success"); await renderDashboard();}));
}

async function unassignSelectedSubstitute() {
  const row=state.substituteLessons.find(x=>x.id===state.selectedSubstituteLessonId); if(!row||row.status!=="assigned"||!canManageSubstituteLesson(row))return;
  if(!confirm(`ยกเลิกการมอบหมาย ${row.substitute_teacher_name} จากคาบนี้หรือไม่?`))return;
  const {error}=await supabase.rpc("unassign_substitute_teacher",{p_substitute_lesson_id:row.id,p_comment:"ยกเลิกการมอบหมายจากหน้าระบบ"}); if(error)return toast("ยกเลิกไม่สำเร็จ",friendlySubstituteError(error),"error");
  toast("ยกเลิกการมอบหมายแล้ว","คาบกลับสู่สถานะรอจัดครู","success"); await renderDashboard();
}

async function syncSubstituteTeaching() {
  if(!isAcademicHead())return;
  const p=substituteCurrentPeriod(),button=document.querySelector("#sync-substitute-lessons"); buttonLoading(button,true,"กำลังซิงก์...");
  const {data,error}=await supabase.rpc("sync_substitute_teaching",{p_academic_year:p.academicYear,p_semester:p.semester}); buttonLoading(button,false);
  if(error)return toast("ซิงก์ไม่สำเร็จ",friendlySubstituteError(error),"error");
  toast("ซิงก์ระบบสอนแทนแล้ว",Number(data||0)?`พบคาบใหม่ ${data} รายการ`:"ไม่มีคาบใหม่ที่ต้องเพิ่ม","success"); await renderDashboard();
}

function substituteDocumentStyles() {
  return `${a4DocumentStyles()} @page{size:A4 landscape;margin:7mm;} .a4-document{width:277mm;min-height:190mm;padding:0;box-shadow:none;font-size:13pt;} .a4-document-inner{padding:5mm 7mm;} .sub-doc-head{text-align:center;margin-bottom:3mm;} .sub-doc-head .a4-school-logo{height:20mm;max-width:30mm;margin-bottom:1mm;} .sub-doc-head .school{font-size:17pt;font-weight:700;line-height:1.05;} .sub-doc-head .meta{font-size:11.5pt;line-height:1.08;} .sub-doc-head h1{font-size:19pt;margin:1.5mm 0 .5mm;} .sub-doc-sub{display:flex;justify-content:center;gap:8mm;font-size:12.5pt;margin-bottom:2mm;} .sub-doc-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11.5pt;} .sub-doc-table th,.sub-doc-table td{border:1px solid #222;padding:1.2mm 1mm;text-align:center;vertical-align:middle;line-height:1.08;height:10.5mm;} .sub-doc-table th{font-weight:700;background:#fafafa;} .sub-doc-table .sig-cell{height:12mm;} .sub-doc-signatures{display:grid;grid-template-columns:repeat(4,1fr);gap:5mm;margin-top:7mm;page-break-inside:avoid;} .sub-doc-sign{text-align:center;font-size:11.5pt;line-height:1.25;} .sub-doc-sign strong,.sub-doc-sign span{display:block;} .sub-doc-foot{font-size:9.5pt;color:#555;margin-top:3mm;text-align:right;}`;
}

function substituteWetSign(title,name) {return `<div class="sub-doc-sign"><div>ลงชื่อ....................................................</div><span>(${escapeHtml(name||"................................................")})</span><strong>${escapeHtml(title)}</strong></div>`;}

function buildSubstituteDocument(rows,signers,schoolLogo) {
  if(!rows.length)return ""; const first=rows[0];
  return `<article class="a4-document"><div class="a4-document-inner"><header class="sub-doc-head">${schoolLogo?`<img class="a4-school-logo" src="${schoolLogo}" alt="ตราโรงเรียน">`:""}<div class="school">${escapeHtml(schoolName())}</div><div class="meta">${escapeHtml(schoolAddress())}</div><div class="meta">${escapeHtml(educationOffice())}</div><h1>บันทึกการจัดครูสอนแทน</h1></header><div class="sub-doc-sub"><span>ผู้ลา: <strong>${escapeHtml(first.absent_teacher_name)}</strong></span><span>วันที่: <strong>${thaiDateOnly(first.leave_date)}</strong></span><span>คำขอลา #${first.leave_request_no}</span></div><table class="sub-doc-table"><thead><tr><th style="width:10mm">#</th><th style="width:16mm">คาบ</th><th style="width:29mm">เวลา</th><th style="width:28mm">ชั้น/ห้อง</th><th>รายวิชา</th><th style="width:45mm">ครูผู้สอนแทน</th><th style="width:48mm">ลายมือชื่อผู้สอนแทน</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.period_no}</td><td>${timeShort(r.start_time)}–${timeShort(r.end_time)}</td><td>${escapeHtml(r.class_label)}</td><td>${escapeHtml(r.subject_name)}</td><td>${escapeHtml(r.substitute_teacher_name||"ยังไม่กำหนด")}</td><td class="sig-cell"></td></tr>`).join("")}</tbody></table><div class="sub-doc-signatures">${substituteWetSign("ผู้ยื่นคำขอลา / ผู้จัดสอนแทน",first.absent_teacher_name)}${substituteWetSign("หัวหน้ากลุ่มงานบริหารงานวิชาการ",signers.academic_head_name)}${substituteWetSign(signers.stage_head_title||"หัวหน้าช่วงชั้น",signers.stage_head_name)}${substituteWetSign("ผู้อำนวยการโรงเรียน",signers.director_name)}</div><div class="sub-doc-foot">เอกสารนี้ใช้เป็นหลักฐานการแจ้งและรับทราบการปฏิบัติหน้าที่สอนแทน · ลงลายมือชื่อสดหลังพิมพ์</div></div></article>`;
}

async function substitutePdfPreview(leaveRequestId,leaveDate) {
  const rows=substituteRowsForBatch(leaveRequestId,leaveDate),progress=substituteBatchProgress(leaveRequestId,leaveDate);
  if(!rows.length)return toast("ไม่มีข้อมูลสำหรับ Export","","error"); if(!progress.complete)return toast("ยังจัดครูไม่ครบ","กรุณาเลือกครูสอนแทนให้ครบทุกคาบก่อน Export PDF","error");
  const [signersRes,schoolLogo]=await Promise.all([supabase.rpc("get_substitute_document_signers",{p_leave_request_id:leaveRequestId}),schoolLogoDataUrl()]); if(signersRes.error)return toast("เตรียมชื่อผู้ลงนามไม่ได้",signersRes.error.message,"error");
  const signers=signersRes.data?.[0]||{},body=buildSubstituteDocument(rows,signers,schoolLogo),modal=document.createElement("div"); modal.className="modal-backdrop a4-preview-backdrop";
  modal.innerHTML=`<div class="a4-preview-shell"><div class="a4-preview-toolbar"><div><strong>บันทึกการจัดครูสอนแทน</strong><span>A4 แนวนอน · 1 หน้า · ช่องเซ็นสด</span></div><div class="a4-preview-actions"><button class="btn btn-ghost" id="sub-doc-close">ปิด</button><button class="btn btn-primary" id="sub-doc-print">พิมพ์ / บันทึก PDF</button></div></div><div class="a4-preview-scroll"><style>${substituteDocumentStyles()}</style>${body}</div></div>`;
  document.body.appendChild(modal); modal.querySelector("#sub-doc-close").addEventListener("click",()=>modal.remove()); modal.querySelector("#sub-doc-print").addEventListener("click",()=>{const w=window.open("","_blank"); if(!w)return toast("เปิดหน้าพิมพ์ไม่ได้","กรุณาอนุญาต Pop-up","error"); w.document.write(`<!doctype html><html lang="th"><head><meta charset="UTF-8"><title>บันทึกการจัดครูสอนแทน</title><style>${substituteDocumentStyles()}</style></head><body class="a4-print-body">${body}<script>window.addEventListener('load',()=>{(document.fonts?document.fonts.ready:Promise.resolve()).finally(()=>setTimeout(()=>window.print(),250));});<\/script></body></html>`); w.document.close();});
}

function substituteWorkspaceHtml(module) {
  const selectedLesson=state.substituteLessons.find(x=>x.id===state.selectedSubstituteLessonId); if(selectedLesson)return substituteDetailHtml(selectedLesson);
  if(state.selectedSubstituteLeaveId&&state.selectedSubstituteDate)return substituteDayPlannerHtml();
  const rows=substituteRowsForView(),title=state.substituteView==="pending"?"ใบลาที่มีคาบรอจัดครู":state.substituteView==="mine"?"งานสอนแทนที่ได้รับ":state.substituteView==="absent"?"การจัดสอนแทนของฉัน":"สถานะการจัดสอนแทน";
  return `${substituteHeroHtml()}${substituteTabsHtml()}${substitutePeriodFilterHtml()}${canViewSubstituteOverview()?substituteStatsHtml():""}<section class="panel" style="margin-top:14px"><div class="panel-head"><div class="panel-title-wrap"><h3>${escapeHtml(title)}</h3><p>${state.substituteView==="mine"?"รายการคาบที่คุณได้รับมอบหมาย":"เลือกวันที่จากแต่ละใบลาเพื่อจัดทุกคาบในหน้าเดียว"}</p></div><button class="btn btn-ghost" id="refresh-substitute">↻ รีเฟรช</button></div>${state.substituteView==="mine"?substituteAssignedTableHtml(rows):substituteBatchCardsHtml(rows)}</section>`;
}


function projectCurrentYear(){return Number(state.projectAcademicYear||currentAcademicPeriod().academicYear);}
function projectYears(){const s=new Set(state.schoolProjects.map(p=>Number(p.academic_year)).filter(Boolean));s.add(currentAcademicPeriod().academicYear);return [...s].sort((a,b)=>b-a);}
function projectActivitiesFor(id){return state.projectActivities.filter(a=>a.project_id===id&&a.status==="active");}
function projectDisbursementsFor(pid,aid=undefined){return state.budgetDisbursements.filter(b=>b.project_id===pid&&(aid===undefined?true:aid===null?b.activity_id==null:b.activity_id===aid));}
function projectBudgetStats(p){const acts=projectActivitiesFor(p.id),allocated=acts.reduce((s,a)=>s+Number(a.budget_amount||0),0),ds=projectDisbursementsFor(p.id).filter(b=>["document_ready","printed","paid"].includes(b.status)),committed=ds.reduce((s,b)=>s+Number(b.amount||0),0),paid=ds.filter(b=>b.status==="paid").reduce((s,b)=>s+Number(b.amount||0),0);return{allocated,unallocated:Math.max(0,Number(p.budget_amount||0)-allocated),committed,paid};}
function activityBudgetStats(a){const ds=projectDisbursementsFor(a.project_id,a.id).filter(b=>["document_ready","printed","paid"].includes(b.status)),committed=ds.reduce((s,b)=>s+Number(b.amount||0),0),paid=ds.filter(b=>b.status==="paid").reduce((s,b)=>s+Number(b.amount||0),0);return{committed,paid,remaining:Math.max(0,Number(a.budget_amount||0)-committed)};}
function projectDepartmentName(p){return p.department_code==="other"?(p.department_custom||"อื่น ๆ"):(PROJECT_DEPARTMENT_LABEL[p.department_code]||p.department_code);}
function selectedProject(){return state.schoolProjects.find(p=>p.id===state.selectedProjectId)||null;}
function selectedBudgetRequest(){return state.budgetDisbursements.find(b=>b.id===state.selectedDisbursementId)||null;}

async function loadProjectWorkspace(){
  const [p,a,b,c,s,people,sigs]=await Promise.all([
    supabase.from("school_projects").select("*").order("academic_year",{ascending:false}).order("project_no"),
    supabase.from("project_activities").select("*").order("activity_no"),
    supabase.from("budget_disbursements").select("*").order("created_at",{ascending:false}),
    supabase.from("budget_control_settings").select("*").order("department_code"),
    supabase.from("budget_disbursement_signers").select("*").order("slot"),
    supabase.from("personnel_public_directory").select("*").order("full_name"),
    supabase.from("signatures").select("*").eq("user_id",state.user.id).order("created_at",{ascending:false}),
  ]);
  state.schoolProjects=p.error?[]:(p.data||[]);
  state.projectActivities=a.error?[]:(a.data||[]);
  state.budgetDisbursements=b.error?[]:(b.data||[]);
  state.budgetControlSettings=c.error?[]:(c.data||[]);
  state.budgetSignerAssignments=s.error?[]:(s.data||[]);
  if(!people.error)state.publicPersonnelDirectory=people.data||[];
  if(!sigs.error)state.signatures=sigs.data||[];
  if(!state.projectAcademicYear)state.projectAcademicYear=currentAcademicPeriod().academicYear;
}

function projectHeroHtml(){return `<section class="lesson-hero project-hero"><div><span class="eyebrow dark">Plan & Budget</span><h2>ระบบโครงการและงบประมาณ</h2><p>ครูสร้างโครงการและกิจกรรมของตนเอง ระบบคำนวณงบจัดสรร–เบิกจ่าย–คงเหลือ และส่งข้อมูลเข้าสู่ฝ่ายแผนงานและงบประมาณแบบ Realtime</p></div><div class="lesson-hero-actions">${canActAsProjectTeacher()?`<button class="btn btn-primary" id="new-school-project">＋ เพิ่มโครงการ</button>`:""}</div></section>`;}
function projectTabsHtml(){return `<div class="lesson-view-tabs"><button class="lesson-view-tab ${state.projectView==="mine"?"active":""}" data-project-view="mine">โครงการของฉัน</button><button class="lesson-view-tab ${state.projectView==="overview"?"active":""}" data-project-view="overview">ภาพรวมตามฝ่าย</button><button class="lesson-view-tab ${state.projectView==="budget"?"active":""}" data-project-view="budget">การเบิกงบประมาณ</button><button class="lesson-view-tab ${state.projectView==="registry"?"active":""}" data-project-view="registry">ทะเบียนคุมการเบิกจ่าย</button></div>`;}
function projectYearFilterHtml(){return `<div class="project-year-filter"><div class="field"><label>ปีการศึกษา</label><select class="select" id="project-year">${projectYears().map(y=>`<option value="${y}" ${y===projectCurrentYear()?"selected":""}>${y}</option>`).join("")}</select></div></div>`;}
function projectBudgetMeter(p){const s=projectBudgetStats(p),total=Number(p.budget_amount||0),pct=total?Math.min(100,Math.round(s.allocated/total*100)):0;return `<div class="project-budget-summary"><div><strong>${money(total)} บาท</strong><span>งบโครงการ</span></div><div class="project-budget-meter"><i style="width:${pct}%"></i></div><div class="project-budget-mini"><span>จัดสรรกิจกรรม <b>${money(s.allocated)}</b></span><span>ยังไม่จัดสรร <b>${money(s.unallocated)}</b></span><span>เบิก/กันวงเงิน <b>${money(s.committed)}</b></span><span>จ่ายจริง <b>${money(s.paid)}</b></span></div></div>`;}
function projectCardHtml(p){const acts=projectActivitiesFor(p.id),s=projectBudgetStats(p),own=p.owner_id===state.user.id;return `<article class="project-card"><div class="project-card-main"><button class="project-expand" data-toggle-project="${p.id}">⌄</button><div><div class="project-code-row"><span class="project-code">${escapeHtml(p.project_no)}</span><span class="pill neutral">${escapeHtml(projectDepartmentName(p))}</span></div><h3>${escapeHtml(p.project_name)}</h3><p>ผู้รับผิดชอบ: ${escapeHtml(p.owner_name)} · ${acts.length} กิจกรรม</p></div><div class="project-card-budget"><strong>${money(p.budget_amount)}</strong><span>บาท</span><small>เหลือจัดสรร ${money(s.unallocated)}</small></div><div class="project-card-actions"><button class="btn btn-ghost" data-open-project="${p.id}">รายละเอียด</button>${own?`<button class="btn btn-secondary" data-edit-project="${p.id}">แก้ไข</button>`:""}</div></div><div class="project-inline-budget">${projectBudgetMeter(p)}</div><div class="project-activities-collapse" data-project-activities="${p.id}">${acts.length?`<div class="table-wrap"><table class="table"><thead><tr><th>เลขกิจกรรม</th><th>กิจกรรม</th><th>ผู้รับผิดชอบ</th><th>งบ</th><th>คงเหลือ</th><th></th></tr></thead><tbody>${acts.map(a=>{const x=activityBudgetStats(a);return `<tr><td><strong>${escapeHtml(a.activity_no)}</strong></td><td>${escapeHtml(a.activity_name)}</td><td>${escapeHtml(a.owner_name)}</td><td>${money(a.budget_amount)}</td><td>${money(x.remaining)}</td><td><button class="btn btn-ghost" data-open-activity="${a.id}">รายละเอียด</button></td></tr>`}).join("")}</tbody></table></div>`:`<div class="empty compact"><strong>ยังไม่มีกิจกรรมย่อย</strong></div>`}</div></article>`;}
function projectMineHtml(){const year=projectCurrentYear(),rows=state.schoolProjects.filter(p=>Number(p.academic_year)===year&&p.owner_id===state.user.id&&p.status!=="cancelled"),ownActs=state.projectActivities.filter(a=>a.owner_id===state.user.id&&a.status==="active"&&Number(state.schoolProjects.find(p=>p.id===a.project_id)?.academic_year)===year);return `${projectYearFilterHtml()}<div class="project-stat-grid"><article class="metric-card"><div class="metric-label">โครงการที่รับผิดชอบ</div><div class="metric-value">${rows.length}</div></article><article class="metric-card"><div class="metric-label">กิจกรรมที่รับผิดชอบ</div><div class="metric-value">${ownActs.length}</div></article><article class="metric-card"><div class="metric-label">งบโครงการรวม</div><div class="metric-value money-value">${money(rows.reduce((s,p)=>s+Number(p.budget_amount||0),0))}</div></article></div><section class="panel"><div class="panel-head"><div class="panel-title-wrap"><h3>โครงการของฉัน</h3><p>ผู้สร้างเป็นผู้รับผิดชอบหลักโดยอัตโนมัติ</p></div><button class="btn btn-primary" id="new-school-project">＋ เพิ่มโครงการ</button></div>${rows.length?`<div class="project-card-list">${rows.map(projectCardHtml).join("")}</div>`:`<div class="empty"><strong>ยังไม่มีโครงการ</strong></div>`}</section>${ownActs.length?`<section class="panel" style="margin-top:14px"><div class="panel-head"><div class="panel-title-wrap"><h3>กิจกรรมของฉันในโครงการอื่น</h3></div></div><div class="table-wrap"><table class="table"><thead><tr><th>เลขกิจกรรม</th><th>กิจกรรม</th><th>โครงการหลัก</th><th>งบ</th><th></th></tr></thead><tbody>${ownActs.map(a=>{const p=state.schoolProjects.find(x=>x.id===a.project_id);return `<tr><td>${escapeHtml(a.activity_no)}</td><td>${escapeHtml(a.activity_name)}</td><td>${escapeHtml(p?.project_no||"—")} ${escapeHtml(p?.project_name||"")}</td><td>${money(a.budget_amount)}</td><td><button class="btn btn-ghost" data-open-activity="${a.id}">รายละเอียด</button></td></tr>`}).join("")}</tbody></table></div></section>`:""}`;}
function projectOverviewHtml(){const year=projectCurrentYear();const cards=Object.entries(PROJECT_DEPARTMENT_LABEL).map(([c,l])=>{const rs=state.schoolProjects.filter(p=>Number(p.academic_year)===year&&p.department_code===c&&p.status!=="cancelled");return `<button class="project-department-card ${state.projectDepartmentFilter===c?"active":""}" data-project-department="${c}"><span>${escapeHtml(l)}</span><strong>${rs.length} โครงการ</strong><small>${money(rs.reduce((s,p)=>s+Number(p.budget_amount||0),0))} บาท</small></button>`}).join("");const rows=state.schoolProjects.filter(p=>Number(p.academic_year)===year&&p.department_code===state.projectDepartmentFilter&&p.status!=="cancelled").sort((a,b)=>String(a.project_no).localeCompare(String(b.project_no),"th",{numeric:true}));return `${projectYearFilterHtml()}<div class="project-department-grid">${cards}</div><section class="panel"><div class="panel-head"><div class="panel-title-wrap"><h3>${escapeHtml(PROJECT_DEPARTMENT_LABEL[state.projectDepartmentFilter]||"โครงการ")}</h3><p>ข้อมูล Realtime จากครูผู้รับผิดชอบโครงการและกิจกรรม</p></div></div>${rows.length?`<div class="project-card-list">${rows.map(projectCardHtml).join("")}</div>`:`<div class="empty"><strong>ยังไม่มีโครงการในฝ่ายนี้</strong></div>`}</section>`;}
function budgetStatusPill(s){return `<span class="pill ${s==="paid"?"active":s==="document_ready"||s==="printed"?"pending":s==="cancelled"?"suspended":"neutral"}">${escapeHtml(BUDGET_STATUS_LABEL[s]||s)}</span>`;}
function projectBudgetRequestsHtml(){const rows=state.budgetDisbursements.filter(b=>Number(b.academic_year)===projectCurrentYear());return `${projectYearFilterHtml()}<section class="panel"><div class="panel-head"><div class="panel-title-wrap"><h3>คำขอเบิกงบประมาณ</h3><p>เลขคุมถูกออกอัตโนมัติแยกตามฝ่ายและปี พ.ศ. เมื่อสร้างคำขอ</p></div></div>${rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>เลขคุม</th><th>โครงการ/กิจกรรม</th><th>ครั้งที่</th><th>วันที่</th><th>ผู้ขอ</th><th>จำนวน</th><th>สถานะ</th><th></th></tr></thead><tbody>${rows.map(b=>{const p=state.schoolProjects.find(x=>x.id===b.project_id),a=state.projectActivities.find(x=>x.id===b.activity_id);return `<tr><td><strong class="budget-control-number">${escapeHtml(b.control_number||"—")}</strong></td><td><strong>${escapeHtml(a?.activity_no||p?.project_no||"—")}</strong><br><span class="table-muted">${escapeHtml(a?.activity_name||p?.project_name||"")}</span></td><td>${b.request_round}</td><td>${thaiDateOnly(b.request_date)}</td><td>${escapeHtml(b.requester_name)}</td><td>${money(b.amount)}</td><td>${budgetStatusPill(b.status)}</td><td><button class="btn btn-ghost" data-open-budget-request="${b.id}">รายละเอียด</button></td></tr>`}).join("")}</tbody></table></div>`:`<div class="empty"><strong>ยังไม่มีคำขอเบิก</strong></div>`}</section>`;}
function budgetControlSetting(code){return state.budgetControlSettings.find(x=>x.department_code===code)||null;}
function budgetRegistryRows(){return state.budgetDisbursements.filter(b=>b.control_number&&b.department_code===state.budgetRegistryDepartmentFilter).sort((a,b)=>Number(b.control_sequence||0)-Number(a.control_sequence||0));}
function budgetControlRegistryHtml(){
  const codes=["academic","personnel","general","plan_budget"];
  const rows=budgetRegistryRows(),setting=budgetControlSetting(state.budgetRegistryDepartmentFilter);
  return `<section class="budget-registry-hero"><div><span class="eyebrow dark">Budget Control Register</span><h2>ทะเบียนคุมการเบิกจ่าย</h2><p>เลขคุมแยกตามกลุ่มงานและปี พ.ศ. เช่น 5/2569 โดยฐานข้อมูลเป็นผู้รันเลขเพื่อป้องกันเลขซ้ำ</p></div>${state.profile.role==="super_admin"?`<button class="btn btn-primary" id="budget-control-settings">⚙ ตั้งค่าเลขคุม</button>`:""}</section>
  <div class="budget-control-dept-grid">${codes.map(code=>{const s=budgetControlSetting(code),count=state.budgetDisbursements.filter(b=>b.department_code===code&&b.control_number).length;return `<button class="budget-control-dept ${state.budgetRegistryDepartmentFilter===code?"active":""}" data-budget-registry-dept="${code}"><span>${escapeHtml(PROJECT_DEPARTMENT_LABEL[code])}</span><strong>${s?`${s.last_number||0}/${s.control_year}`:"ยังไม่ตั้งค่า"}</strong><small>${count} รายการในระบบ · เลขถัดไป ${s?`${Number(s.last_number||0)+1}/${s.control_year}`:"—"}</small></button>`}).join("")}</div>
  <section class="panel"><div class="panel-head"><div class="panel-title-wrap"><h3>${escapeHtml(PROJECT_DEPARTMENT_LABEL[state.budgetRegistryDepartmentFilter]||state.budgetRegistryDepartmentFilter)}</h3><p>${setting?`ปีเลขคุม ${setting.control_year} · เริ่มที่ ${setting.start_number} · ล่าสุด ${setting.last_number||0}/${setting.control_year}`:"ยังไม่ได้ตั้งค่าเลขคุมสำหรับฝ่ายนี้"}</p></div></div>${rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>เลขคุม</th><th>วันที่</th><th>โครงการ/กิจกรรม</th><th>ผู้ขอเบิก</th><th>จำนวนเงิน</th><th>สถานะ</th><th></th></tr></thead><tbody>${rows.map(b=>{const p=state.schoolProjects.find(x=>x.id===b.project_id),a=state.projectActivities.find(x=>x.id===b.activity_id);return `<tr><td><strong>${escapeHtml(b.control_number)}</strong></td><td>${thaiDateOnly(b.request_date)}</td><td>${escapeHtml(a?`${a.activity_no} ${a.activity_name}`:`${p?.project_no||""} ${p?.project_name||""}`)}</td><td>${escapeHtml(b.requester_name)}</td><td>${money(b.amount)}</td><td>${budgetStatusPill(b.status)}</td><td><button class="btn btn-ghost" data-open-budget-request="${b.id}">รายละเอียด</button></td></tr>`}).join("")}</tbody></table></div>`:`<div class="empty"><strong>ยังไม่มีรายการเลขคุมในฝ่ายนี้</strong></div>`}</section>`;
}
function budgetControlSettingsModal(){
  if(state.profile.role!=="super_admin")return;
  const current=budgetControlSetting(state.budgetRegistryDepartmentFilter),m=document.createElement("div");m.className="modal-backdrop";
  m.innerHTML=`<div class="modal"><div class="modal-head"><div><h3>ตั้งค่าเลขทะเบียนคุมการเบิกจ่าย</h3><p>Super Admin กำหนดปี พ.ศ. และเลขเริ่มต้นแยกแต่ละฝ่าย</p></div><button class="modal-close">×</button></div><form id="budget-control-form" class="form-grid"><div class="field"><label>กลุ่มงาน</label><select class="select" name="department_code">${Object.entries(PROJECT_DEPARTMENT_LABEL).filter(([c])=>c!=="other").map(([c,l])=>`<option value="${c}" ${c===state.budgetRegistryDepartmentFilter?"selected":""}>${escapeHtml(l)}</option>`).join("")}</select></div><div class="form-row"><div class="field"><label>ปี พ.ศ. ของเลขคุม</label><input class="input" name="control_year" type="number" min="2500" max="3000" required value="${current?.control_year||new Date().getFullYear()+543}"></div><div class="field"><label>เลขเริ่มต้น</label><input class="input" name="start_number" type="number" min="1" required value="${current?.start_number||1}"></div></div><div class="project-paper-note"><strong>ข้อควรทราบ</strong><span>เมื่อฝ่ายนั้นออกเลขคุมในปีเดียวกันไปแล้ว ระบบจะไม่ยอมย้อนเลขหรือเปลี่ยนเลขเริ่มต้น เพื่อรักษาทะเบียนคุมให้ตรวจสอบย้อนหลังได้ หากขึ้นปีใหม่ให้เปลี่ยนปี พ.ศ. แล้วระบบจะเริ่มจากเลขเริ่มต้นใหม่</span></div></form><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="save-budget-control">บันทึกการตั้งค่า</button></div></div>`;
  document.body.appendChild(m);const close=()=>m.remove();m.querySelector(".modal-close").onclick=close;m.querySelector(".modal-cancel").onclick=close;m.querySelector("#save-budget-control").onclick=async e=>{const f=m.querySelector("#budget-control-form");if(!f.reportValidity())return;const d=new FormData(f),payload={department_code:String(d.get("department_code")),control_year:Number(d.get("control_year")),start_number:Number(d.get("start_number"))};buttonLoading(e.target,true,"กำลังบันทึก...");const {error}=await supabase.from("budget_control_settings").upsert(payload,{onConflict:"department_code"});buttonLoading(e.target,false);if(error)return toast("ตั้งค่าเลขคุมไม่สำเร็จ",error.message,"error");state.budgetRegistryDepartmentFilter=payload.department_code;close();toast("ตั้งค่าเลขคุมแล้ว",`${PROJECT_DEPARTMENT_LABEL[payload.department_code]} · เริ่ม ${payload.start_number}/${payload.control_year}`,"success");await renderDashboard();};
}
function projectDetailHtml(p){const acts=projectActivitiesFor(p.id),s=projectBudgetStats(p),own=p.owner_id===state.user.id;return `<section class="project-detail"><div class="personnel-detail-top"><div><button class="type-back-link" id="project-back">← กลับรายการ</button><span class="eyebrow dark">${escapeHtml(p.project_no)}</span></div><div class="personnel-detail-actions"><button class="btn btn-secondary" id="project-pdf">▤ Export PDF</button>${canActAsProjectTeacher()?`<button class="btn btn-primary" id="new-project-activity">＋ เพิ่มกิจกรรมย่อย</button>`:""}${own?`<button class="btn btn-ghost" data-edit-project="${p.id}">แก้ไข</button>`:""}${(own||isSuperAdminUser())?`<button class="btn btn-danger" id="delete-school-project">ลบโครงการ</button>`:""}</div></div><section class="project-detail-hero"><div><span class="pill neutral">${escapeHtml(projectDepartmentName(p))}</span><h2>${escapeHtml(p.project_name)}</h2><p>ผู้รับผิดชอบ: ${escapeHtml(p.owner_name)} · ปีการศึกษา ${p.academic_year}</p></div><div class="project-big-budget"><strong>${money(p.budget_amount)}</strong><span>บาท</span></div></section>${projectBudgetMeter(p)}<div class="detail-grid" style="margin-top:14px">${planField("เลขโครงการ",p.project_no)}${planField("ฝ่าย/แผนงาน",projectDepartmentName(p))}${planField("ผู้รับผิดชอบ",p.owner_name)}${planField("งบประมาณ",`${money(p.budget_amount)} บาท`)}${planField("จัดสรรแล้ว",`${money(s.allocated)} บาท`)}${planField("ยังไม่จัดสรร",`${money(s.unallocated)} บาท`)}${planField("เบิก/กันวงเงิน",`${money(s.committed)} บาท`)}${planField("จ่ายจริง",`${money(s.paid)} บาท`)}${planField("หมายเหตุ",p.notes||"—")}</div><section class="panel" style="margin-top:14px"><div class="panel-head"><div class="panel-title-wrap"><h3>กิจกรรมย่อย</h3><p>เลขกิจกรรมต้องขึ้นต้นด้วย ${escapeHtml(p.project_no)}.</p></div></div>${acts.length?`<div class="project-activity-detail-list">${acts.map(a=>{const x=activityBudgetStats(a);return `<article class="activity-detail-card"><div><span class="project-code">${escapeHtml(a.activity_no)}</span><h4>${escapeHtml(a.activity_name)}</h4><p>${escapeHtml(a.owner_name)}</p></div><div class="activity-budget"><strong>${money(a.budget_amount)}</strong><span>งบกิจกรรม</span><small>คงเหลือ ${money(x.remaining)}</small></div><div class="admin-actions"><button class="btn btn-ghost" data-open-activity="${a.id}">รายละเอียด</button>${a.owner_id===state.user.id?`<button class="btn btn-primary" data-new-budget-activity="${a.id}">ขอเบิก</button>`:""}</div></article>`}).join("")}</div>`:`<div class="empty"><strong>ยังไม่มีกิจกรรมย่อย</strong></div>`}</section>${own&&s.unallocated>0?`<section class="panel" style="margin-top:14px"><div class="panel-head"><div class="panel-title-wrap"><h3>งบส่วนที่ยังไม่จัดสรร</h3><p>ขอเบิกจากโครงการหลักได้เฉพาะส่วนนี้</p></div><button class="btn btn-primary" data-new-budget-project="${p.id}">ขอเบิกจากโครงการหลัก</button></div></section>`:""}</section>`;}
function activityDetailHtml(a){const p=state.schoolProjects.find(x=>x.id===a.project_id),s=activityBudgetStats(a),rows=projectDisbursementsFor(a.project_id,a.id),isActivityOwner=a.owner_id===state.user.id;return `<section class="project-detail"><div class="personnel-detail-top"><div><button class="type-back-link" id="activity-back">← กลับโครงการ</button><span class="eyebrow dark">${escapeHtml(a.activity_no)}</span></div><div class="personnel-detail-actions"><button class="btn btn-secondary" id="activity-pdf">▤ Export PDF</button>${isActivityOwner?`<button class="btn btn-primary" data-new-budget-activity="${a.id}">ขอเบิก</button>`:""}${(isActivityOwner||isSuperAdminUser())?`<button class="btn btn-danger" id="delete-project-activity">ลบกิจกรรม</button>`:""}</div></div><section class="project-detail-hero"><div><span class="pill neutral">กิจกรรมย่อย</span><h2>${escapeHtml(a.activity_name)}</h2><p>ผู้รับผิดชอบ: ${escapeHtml(a.owner_name)}</p></div><div class="project-big-budget"><strong>${money(a.budget_amount)}</strong><span>บาท</span></div></section>${!isActivityOwner?`<div class="activity-owner-rule"><strong>สิทธิ์การขอเบิกเป็นของผู้รับผิดชอบกิจกรรมเท่านั้น</strong><span>แม้คุณจะเป็นผู้รับผิดชอบโครงการหลัก ก็ไม่สามารถขอเบิกงบของกิจกรรมนี้แทน ${escapeHtml(a.owner_name)} ได้</span></div>`:""}<div class="detail-grid" style="margin-top:14px">${planField("เลขกิจกรรม",a.activity_no)}${planField("โครงการหลัก",`${p?.project_no||""} ${p?.project_name||""}`)}${planField("งบกิจกรรม",`${money(a.budget_amount)} บาท`)}${planField("เบิก/กันวงเงิน",`${money(s.committed)} บาท`)}${planField("คงเหลือ",`${money(s.remaining)} บาท`)}${planField("หมายเหตุ",a.notes||"—")}</div><section class="panel" style="margin-top:14px"><div class="panel-head"><div class="panel-title-wrap"><h3>ประวัติการขอเบิก</h3></div></div>${rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>ครั้งที่</th><th>วันที่</th><th>รายละเอียด</th><th>จำนวน</th><th>สถานะ</th><th></th></tr></thead><tbody>${rows.map(b=>`<tr><td>${b.request_round}</td><td>${thaiDateOnly(b.request_date)}</td><td>${escapeHtml(b.description)}</td><td>${money(b.amount)}</td><td>${budgetStatusPill(b.status)}</td><td><button class="btn btn-ghost" data-open-budget-request="${b.id}">รายละเอียด</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty compact"><strong>ยังไม่มีคำขอเบิก</strong></div>`}</section></section>`;}
function budgetLineItems(r){
  let items=r?.line_items;
  if(typeof items==="string"){
    try{items=JSON.parse(items)}catch{items=[]}
  }
  if(Array.isArray(items)&&items.length){
    return items.map(item=>({description:String(item?.description||"").trim(),amount:Number(item?.amount||0)})).filter(item=>item.description&&item.amount>0);
  }
  return r?.description&&Number(r?.amount)>0?[{description:r.description,amount:Number(r.amount)}]:[];
}
function budgetLineItemsTableHtml(r){
  const items=budgetLineItems(r);
  return `<section class="budget-line-summary-panel"><div class="panel-head"><div class="panel-title-wrap"><h3>รายการใช้เงิน</h3><p>${items.length} รายการ · ระบบรวมยอดและตัดวงเงินจากยอดรวมนี้</p></div><strong class="budget-line-grand-total">${money(r.amount)} บาท</strong></div>${items.length?`<div class="table-wrap"><table class="table budget-line-detail-table"><thead><tr><th style="width:48px">#</th><th>รายการ</th><th style="width:160px">จำนวนเงิน</th></tr></thead><tbody>${items.map((item,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(item.description)}</td><td><strong>${money(item.amount)}</strong> บาท</td></tr>`).join("")}<tr class="budget-line-total-row"><td colspan="2"><strong>รวมทั้งสิ้น</strong></td><td><strong>${money(r.amount)} บาท</strong></td></tr></tbody></table></div>`:`<div class="empty compact"><strong>ไม่พบรายการใช้เงิน</strong></div>`}</section>`;
}

function budgetSignersFor(id){return state.budgetSignerAssignments.filter(s=>s.disbursement_id===id);}
const BUDGET_SIGNER_LABEL={requester:"ผู้ขอเบิก",department_head:"หัวหน้าฝ่ายเจ้าของโครงการ",plan_budget:"หัวหน้ากลุ่มงานบริหารแผนและงบประมาณ",director:"ผู้อำนวยการโรงเรียน",inspector1:"กรรมการตรวจรับคนที่ 1",inspector2:"กรรมการตรวจรับคนที่ 2",inspector3:"กรรมการตรวจรับคนที่ 3"};
function budgetSignerMethodLabel(s){if(!s)return"ยังไม่ได้เลือก";if(s.method==="paper")return"เซ็นสดบนกระดาษ";if(s.method==="drawn")return"เซ็นสดในระบบแล้ว";if(s.method==="upload")return"อัปโหลดลายเซ็นแล้ว";if(s.method==="stored")return"ใช้ลายเซ็นที่บันทึกไว้";return s.method;}
function budgetSignerPanelHtml(r){const slots=["requester","department_head","plan_budget","director","inspector1","inspector2","inspector3"],rows=budgetSignersFor(r.id),own=r.requester_id===state.user.id||state.profile.role==="super_admin";return `<section class="panel budget-signer-panel"><div class="panel-head"><div class="panel-title-wrap"><h3>ผู้ลงนามและคณะกรรมการตรวจรับ</h3><p>ผู้ถูกเลือกแต่ละคนเลือกได้ว่าจะเซ็นในระบบ อัปโหลดลายเซ็น ใช้ลายเซ็นที่บันทึกไว้ หรือเว้นไว้เซ็นบนกระดาษ</p></div>${own?`<button class="btn btn-primary" id="configure-budget-signers">เลือกผู้ลงนาม / กรรมการ</button>`:""}</div><div class="budget-signer-status-grid">${slots.map(slot=>{const s=rows.find(x=>x.slot===slot),mine=s?.user_id===state.user.id;return `<article class="budget-signer-status"><div><span>${escapeHtml(BUDGET_SIGNER_LABEL[slot])}</span><strong>${escapeHtml(s?.signer_name||"ยังไม่ได้เลือก")}</strong><small>${escapeHtml(s?.signer_position||"")}</small></div><div><span class="pill ${s?.signed_at?"active":s?"pending":"neutral"}">${escapeHtml(budgetSignerMethodLabel(s))}</span>${mine?`<button class="btn btn-secondary" data-sign-budget-slot="${slot}">จัดการลายเซ็นของฉัน</button>`:""}</div></article>`}).join("")}</div></section>`;}
function budgetRequestDetailHtml(r){const p=state.schoolProjects.find(x=>x.id===r.project_id),a=state.projectActivities.find(x=>x.id===r.activity_id),own=r.requester_id===state.user.id;return `<section class="project-detail"><div class="personnel-detail-top"><div><button class="type-back-link" id="budget-request-back">← กลับรายการเบิก</button><span class="eyebrow dark">เลขคุม ${escapeHtml(r.control_number||"—")} · ครั้งที่ ${r.request_round}</span></div><div class="personnel-detail-actions">${own&&r.status==="draft"?`<button class="btn btn-primary" id="prepare-budget-request">จัดทำเอกสาร</button>`:""}${["document_ready","printed","paid"].includes(r.status)?`<button class="btn btn-secondary" id="budget-request-pdf">▤ Preview / Export PDF</button>`:""}${isPlanBudgetHead()&&["document_ready","printed"].includes(r.status)?`<button class="btn btn-success" id="mark-budget-paid">บันทึกว่าเบิกจ่ายแล้ว</button>`:""}${((own&&r.status==="draft")||isSuperAdminUser())?`<button class="btn btn-danger" id="delete-budget-request">ลบคำขอเบิก</button>`:""}</div></div><section class="project-detail-hero"><div>${budgetStatusPill(r.status)}<h2>${escapeHtml(a?`${a.activity_no} ${a.activity_name}`:`${p?.project_no||""} ${p?.project_name||""}`)}</h2><p>เลขทะเบียนคุมการเบิกจ่าย <strong>${escapeHtml(r.control_number||"—")}</strong> · ผู้ขอเบิก ${escapeHtml(r.requester_name)} · ${thaiDateOnly(r.request_date)}</p></div><div class="project-big-budget"><strong>${money(r.amount)}</strong><span>บาท</span></div></section>${budgetLineItemsTableHtml(r)}<div class="detail-grid" style="margin-top:14px">${planField("เลขคุม",r.control_number||"—")}${planField("โครงการ",`${p?.project_no||"—"} ${p?.project_name||""}`)}${planField("กิจกรรม",a?`${a.activity_no} ${a.activity_name}`:"เบิกจากโครงการหลัก")}${planField("ปีการศึกษา",r.academic_year)}${planField("ภาคเรียน",r.semester)}${planField("จำนวนเงินรวม",`${money(r.amount)} บาท`)}${planField("สถานะ",BUDGET_STATUS_LABEL[r.status]||r.status)}${planField("หมายเหตุ",r.notes||"—")}</div>${budgetSignerPanelHtml(r)}<div class="project-paper-note"><strong>ยืดหยุ่นเรื่องลายเซ็น</strong><span>การเลือกวิธีลงนามไม่ได้บังคับทุกคนให้เซ็นออนไลน์ หากตกลงเซ็นเอกสารต่อหน้า ให้เลือก “เซ็นสดบนกระดาษ” แล้ว PDF จะเว้นพื้นที่ลายเซ็นไว้</span></div></section>`;}
function projectWorkspaceHtml(){const r=selectedBudgetRequest();if(r)return budgetRequestDetailHtml(r);const p=selectedProject();if(p){if(state.selectedProjectActivityId){const a=state.projectActivities.find(x=>x.id===state.selectedProjectActivityId);if(a)return activityDetailHtml(a);}return projectDetailHtml(p);}return `${projectHeroHtml()}${projectTabsHtml()}${state.projectView==="overview"?projectOverviewHtml():state.projectView==="budget"?projectBudgetRequestsHtml():state.projectView==="registry"?budgetControlRegistryHtml():projectMineHtml()}`;}

function projectModal(p=null){const x=p||{},period=currentAcademicPeriod(),m=document.createElement("div");m.className="modal-backdrop";m.innerHTML=`<div class="modal modal-wide"><div class="modal-head"><div><h3>${p?"แก้ไขโครงการ":"เพิ่มโครงการ"}</h3><p>ผู้สร้างคือผู้รับผิดชอบหลักอัตโนมัติ</p></div><button class="modal-close">×</button></div><form id="project-form" class="form-grid"><div class="form-row"><div class="field"><label>เลขโครงการ</label><input class="input" name="project_no" required value="${escapeHtml(x.project_no||"")}" placeholder="เช่น วช.1"></div><div class="field"><label>ปีการศึกษา</label><input class="input" name="academic_year" type="number" required value="${x.academic_year||period.academicYear}"></div></div><div class="field"><label>ชื่อโครงการ</label><input class="input" name="project_name" required value="${escapeHtml(x.project_name||"")}"></div><div class="form-row"><div class="field"><label>งบประมาณ</label><input class="input" name="budget_amount" type="number" min="0" step="0.01" required value="${x.budget_amount??0}"></div><div class="field"><label>ภาคเรียน</label><select class="select" name="semester"><option value="">ทั้งปี/ไม่ระบุ</option><option value="1" ${x.semester==1?"selected":""}>1</option><option value="2" ${x.semester==2?"selected":""}>2</option><option value="3" ${x.semester==3?"selected":""}>3</option></select></div></div><div class="field"><label>ฝ่าย / แผนงาน</label><select class="select" name="department_code" id="project-department">${Object.entries(PROJECT_DEPARTMENT_LABEL).map(([v,l])=>`<option value="${v}" ${x.department_code===v?"selected":""}>${escapeHtml(l)}</option>`).join("")}</select></div><div class="field ${x.department_code==="other"?"":"hidden"}" id="project-custom-wrap"><label>ชื่อฝ่าย/แผนงานอื่น</label><input class="input" name="department_custom" value="${escapeHtml(x.department_custom||"")}"></div><div class="field"><label>หมายเหตุ</label><textarea class="input textarea" name="notes">${escapeHtml(x.notes||"")}</textarea></div></form><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="save-project">บันทึก</button></div></div>`;document.body.appendChild(m);const close=()=>m.remove();m.querySelector(".modal-close").onclick=close;m.querySelector(".modal-cancel").onclick=close;m.querySelector("#project-department").onchange=e=>m.querySelector("#project-custom-wrap").classList.toggle("hidden",e.target.value!=="other");m.querySelector("#save-project").onclick=async e=>{const f=m.querySelector("#project-form");if(!f.reportValidity())return;const d=new FormData(f),payload={project_no:String(d.get("project_no")).trim(),project_name:String(d.get("project_name")).trim(),academic_year:Number(d.get("academic_year")),semester:d.get("semester")?Number(d.get("semester")):null,department_code:String(d.get("department_code")),department_custom:String(d.get("department_custom")||"").trim()||null,budget_amount:Number(d.get("budget_amount")||0),owner_id:state.user.id,owner_name:state.profile.full_name||state.profile.email,notes:String(d.get("notes")||"").trim()||null};buttonLoading(e.target,true);const q=p?supabase.from("school_projects").update(payload).eq("id",p.id):supabase.from("school_projects").insert(payload);const {data,error}=await q.select().single();buttonLoading(e.target,false);if(error)return toast("บันทึกโครงการไม่สำเร็จ",error.message,"error");close();state.selectedProjectId=data.id;await renderDashboard();};}
function projectActivityModal(p){const acts=projectActivitiesFor(p.id);let n=1;while(acts.some(a=>a.activity_no===`${p.project_no}.${n}`))n++;const m=document.createElement("div");m.className="modal-backdrop";m.innerHTML=`<div class="modal"><div class="modal-head"><div><h3>เพิ่มกิจกรรมย่อย</h3><p>${escapeHtml(p.project_no)} ${escapeHtml(p.project_name)}</p></div><button class="modal-close">×</button></div><form id="activity-form" class="form-grid"><div class="field"><label>เลขกิจกรรม</label><input class="input" name="activity_no" required value="${escapeHtml(p.project_no)}.${n}"><span class="helper">ต้องขึ้นต้นด้วย ${escapeHtml(p.project_no)}.</span></div><div class="field"><label>ชื่อกิจกรรม</label><input class="input" name="activity_name" required></div><div class="field"><label>งบกิจกรรม</label><input class="input" name="budget_amount" type="number" min="0" step="0.01" required value="0"></div><div class="field"><label>หมายเหตุ</label><textarea class="input textarea" name="notes"></textarea></div></form><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="save-activity">บันทึก</button></div></div>`;document.body.appendChild(m);const close=()=>m.remove();m.querySelector(".modal-close").onclick=close;m.querySelector(".modal-cancel").onclick=close;m.querySelector("#save-activity").onclick=async e=>{const f=m.querySelector("#activity-form");if(!f.reportValidity())return;const d=new FormData(f),payload={project_id:p.id,activity_no:String(d.get("activity_no")).trim(),activity_name:String(d.get("activity_name")).trim(),budget_amount:Number(d.get("budget_amount")||0),owner_id:state.user.id,owner_name:state.profile.full_name||state.profile.email,notes:String(d.get("notes")||"").trim()||null};buttonLoading(e.target,true);const {error}=await supabase.from("project_activities").insert(payload);buttonLoading(e.target,false);if(error)return toast("เพิ่มกิจกรรมไม่สำเร็จ",error.message,"error");close();await renderDashboard();};}
function budgetRequestModal(p,a=null){
  if(a&&a.owner_id!==state.user.id)return toast("ไม่มีสิทธิ์ขอเบิกกิจกรรมนี้",`กิจกรรม ${a.activity_no} เป็นสิทธิ์ของ ${a.owner_name} ผู้รับผิดชอบกิจกรรมเท่านั้น แม้คุณจะเป็นเจ้าของโครงการหลักก็ไม่สามารถเบิกแทนได้`,"error");
  if(!a&&p.owner_id!==state.user.id)return toast("ไม่มีสิทธิ์ขอเบิกจากโครงการนี้","การเบิกจากงบโครงการหลักทำได้เฉพาะผู้รับผิดชอบโครงการหลักเท่านั้น","error");
  const control=budgetControlSetting(p.department_code);
  if(!control)return toast("ยังไม่ได้ตั้งค่าเลขคุม",`กรุณาให้ Super Admin ตั้งค่าเลขคุมของ ${projectDepartmentName(p)} ก่อนสร้างคำขอเบิก`,"error");
  const preview=`${Number(control.last_number||0)+1}/${control.control_year}`;
  const period=currentAcademicPeriod(),available=a?activityBudgetStats(a).remaining:projectBudgetStats(p).unallocated,m=document.createElement("div");m.className="modal-backdrop";
  m.innerHTML=`<div class="modal modal-wide"><div class="modal-head"><div><h3>ขอเบิกงบประมาณ</h3><p>${escapeHtml(a?`${a.activity_no} ${a.activity_name}`:`${p.project_no} ${p.project_name}`)}</p></div><button class="modal-close">×</button></div><div class="budget-request-top-grid"><div class="budget-control-preview"><span>เลขทะเบียนคุมที่จะได้รับ</span><strong>${escapeHtml(preview)}</strong><small>รันอัตโนมัติจาก ${escapeHtml(projectDepartmentName(p))} · เลขจริงยืนยันโดยฐานข้อมูลเมื่อบันทึก</small></div><div class="budget-available-box"><span>วงเงินที่ขอเบิกได้</span><strong>${money(available)} บาท</strong></div></div><form id="budget-form" class="form-grid"><div class="form-row"><div class="field"><label>วันที่ขอเบิก</label><input class="input" name="request_date" type="date" required value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>ปีการศึกษา / ภาคเรียน</label><div class="form-row compact-fields"><input class="input" name="academic_year" type="number" required value="${period.academicYear}"><select class="select" name="semester"><option value="1" ${period.semester===1?"selected":""}>ภาคเรียน 1</option><option value="2" ${period.semester===2?"selected":""}>ภาคเรียน 2</option><option value="3" ${period.semester===3?"selected":""}>ภาคเรียน 3</option></select></div></div></div><div class="budget-line-builder"><div class="budget-line-builder-head"><div><strong>รายละเอียดว่าใช้ทำอะไร</strong><span>กรอกเป็นรายการและราคา ระบบจะรวมยอดให้อัตโนมัติ</span></div><button class="btn btn-secondary" type="button" id="add-budget-line">＋ เพิ่มรายการ</button></div><div id="budget-line-items"></div><div class="budget-live-summary"><div><span>สรุปรายการ</span><div id="budget-line-summary">ยังไม่ได้กรอกรายการ</div></div><div class="budget-live-total"><span>ยอดรวม</span><strong id="budget-line-total">0.00 บาท</strong><small id="budget-line-remaining">คงเหลือหลังขอเบิก ${money(available)} บาท</small></div></div></div><div class="field"><label>หมายเหตุ <span class="optional">(ไม่บังคับ)</span></label><textarea class="input textarea" name="notes"></textarea></div></form><div class="project-paper-note"><strong>เลขคุมไม่กรอกเอง</strong><span>ระบบออกเลขคุมตามฝ่ายแบบ Transaction-safe เช่น ${escapeHtml(preview)} จึงลดปัญหาเลขซ้ำเมื่อมีหลายคนสร้างคำขอพร้อมกัน</span></div><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-secondary" data-save-budget="draft">บันทึกร่าง</button><button class="btn btn-primary" data-save-budget="document_ready">จัดทำเอกสาร</button></div></div>`;
  document.body.appendChild(m);const close=()=>m.remove(),list=m.querySelector("#budget-line-items"),totalEl=m.querySelector("#budget-line-total"),remainingEl=m.querySelector("#budget-line-remaining"),summaryEl=m.querySelector("#budget-line-summary");
  const addLine=(description="",amount="")=>{const row=document.createElement("div");row.className="budget-line-item";row.innerHTML=`<div class="field"><label>ซื้อ / ใช้จ่ายอะไร</label><input class="input" data-budget-line-description required value="${escapeHtml(description)}" placeholder="เช่น ซื้อครุภัณฑ์ / ซื้อวัสดุ / ค่าจัดทำป้าย"></div><div class="field budget-line-amount-field"><label>กี่บาท</label><input class="input" data-budget-line-amount type="number" min="0.01" step="0.01" required value="${amount}"></div><button class="btn btn-danger budget-line-remove" type="button" title="ลบรายการ">×</button>`;list.appendChild(row);refresh();};
  const getItems=()=>[...list.querySelectorAll(".budget-line-item")].map(row=>({description:row.querySelector("[data-budget-line-description]").value.trim(),amount:Number(row.querySelector("[data-budget-line-amount]").value||0)}));
  const refresh=()=>{const items=getItems(),total=items.reduce((s,x)=>s+(x.amount>0?x.amount:0),0),remaining=available-total;totalEl.textContent=`${money(total)} บาท`;remainingEl.textContent=remaining>=0?`คงเหลือหลังขอเบิก ${money(remaining)} บาท`:`เกินวงเงิน ${money(Math.abs(remaining))} บาท`;remainingEl.classList.toggle("over",remaining<0);const filled=items.filter(x=>x.description||x.amount>0);summaryEl.innerHTML=filled.length?filled.map((x,i)=>`<span>${i+1}. ${escapeHtml(x.description||"ยังไม่ระบุรายการ")} <b>${money(x.amount)} บาท</b></span>`).join(""):"ยังไม่ได้กรอกรายการ";const rows=[...list.querySelectorAll(".budget-line-item")];rows.forEach(row=>row.querySelector(".budget-line-remove").disabled=rows.length===1);};
  m.querySelector(".modal-close").onclick=close;m.querySelector(".modal-cancel").onclick=close;m.querySelector("#add-budget-line").onclick=()=>addLine();list.addEventListener("input",refresh);list.addEventListener("click",e=>{const btn=e.target.closest(".budget-line-remove");if(!btn||btn.disabled)return;btn.closest(".budget-line-item")?.remove();refresh();});addLine();
  m.querySelectorAll("[data-save-budget]").forEach(btn=>btn.onclick=async()=>{const f=m.querySelector("#budget-form");if(!f.reportValidity())return;const items=getItems();if(!items.length||items.some(x=>!x.description||x.amount<=0))return toast("กรอกรายการใช้เงินให้ครบ","แต่ละรายการต้องมีรายละเอียดและจำนวนเงินมากกว่า 0 บาท","error");const total=items.reduce((s,x)=>s+x.amount,0);if(total>available)return toast("ยอดรวมเกินวงเงิน",`ยอดรวม ${money(total)} บาท แต่วงเงินที่ขอเบิกได้คือ ${money(available)} บาท`,"error");const d=new FormData(f),summary=items.map(x=>`${x.description} - ${money(x.amount)} บาท`).join("\n"),payload={project_id:p.id,activity_id:a?.id||null,request_round:1,request_date:d.get("request_date"),academic_year:Number(d.get("academic_year")),semester:Number(d.get("semester")),description:summary,amount:total,line_items:items,requester_id:state.user.id,requester_name:state.profile.full_name||state.profile.email,department_code:p.department_code,status:btn.dataset.saveBudget,signers:{},notes:String(d.get("notes")||"").trim()||null};buttonLoading(btn,true,"กำลังบันทึก...");const {data,error}=await supabase.from("budget_disbursements").insert(payload).select().single();buttonLoading(btn,false);if(error)return toast("บันทึกคำขอเบิกไม่สำเร็จ",error.message,"error");close();state.selectedProjectId=null;state.selectedProjectActivityId=null;state.selectedDisbursementId=data.id;state.projectView="budget";toast(btn.dataset.saveBudget==="document_ready"?"จัดทำคำขอเบิกแล้ว":"บันทึกฉบับร่างแล้ว",`เลขคุม ${data.control_number||"—"} · ${items.length} รายการ · รวม ${money(total)} บาท`,"success");await renderDashboard();});
}
async function prepareBudgetRequest(r){const {error}=await supabase.from("budget_disbursements").update({status:"document_ready"}).eq("id",r.id);if(error)return toast("จัดทำเอกสารไม่สำเร็จ",error.message,"error");await renderDashboard();}
function budgetPeopleForSlot(r,slot){
  const people=state.publicPersonnelDirectory||[];
  const requesterDept=people.find(x=>x.user_id===r.requester_id)?.department_code||r.department_code;
  if(slot==="department_head")return people.filter(x=>x.role==="department_head"&&x.department_code===r.department_code);
  if(slot==="plan_budget")return people.filter(x=>x.role==="department_head"&&x.department_code==="plan_budget");
  if(slot==="director")return people.filter(x=>["director","super_admin"].includes(x.role));
  if(slot.startsWith("inspector"))return people.filter(x=>x.department_code===requesterDept&&x.user_id!==r.requester_id);
  return [];
}
function budgetPersonOptions(list,current){return `<option value="">-- เลือกบุคลากร --</option>${list.map(x=>`<option value="${x.user_id}" ${x.user_id===current?"selected":""}>${escapeHtml(x.full_name)} · ${escapeHtml(x.position_title||ROLE_LABEL[x.role]||x.role)}</option>`).join("")}`;}
function budgetSignersModal(r){
  const existing=budgetSignersFor(r.id),get=slot=>existing.find(x=>x.slot===slot)?.user_id||"",m=document.createElement("div");m.className="modal-backdrop";
  m.innerHTML=`<div class="modal modal-wide"><div class="modal-head"><div><h3>เลือกผู้ลงนามและคณะกรรมการตรวจรับ</h3><p>รายชื่อคณะกรรมการตรวจรับถูกจำกัดให้เป็นบุคลากรฝ่ายเดียวกับคำขอเบิกนี้</p></div><button class="modal-close">×</button></div><div class="budget-assignment-note"><strong>ผู้ขอเบิก</strong><span>${escapeHtml(r.requester_name)} (กำหนดอัตโนมัติ)</span></div><form id="budget-signer-assignments" class="form-grid"><div class="field"><label>หัวหน้าฝ่ายเจ้าของโครงการ</label><select class="select" name="department_head">${budgetPersonOptions(budgetPeopleForSlot(r,"department_head"),get("department_head"))}</select></div><div class="field"><label>หัวหน้ากลุ่มงานบริหารแผนและงบประมาณ</label><select class="select" name="plan_budget">${budgetPersonOptions(budgetPeopleForSlot(r,"plan_budget"),get("plan_budget"))}</select></div><div class="field"><label>ผู้อำนวยการโรงเรียน</label><select class="select" name="director">${budgetPersonOptions(budgetPeopleForSlot(r,"director"),get("director"))}</select></div><div class="personnel-form-section"><strong>คณะกรรมการตรวจรับ 3 คน · ต้องอยู่ฝ่ายเดียวกับผู้ขอเบิก</strong></div>${[1,2,3].map(i=>`<div class="field"><label>กรรมการตรวจรับคนที่ ${i}</label><select class="select" name="inspector${i}">${budgetPersonOptions(budgetPeopleForSlot(r,`inspector${i}`),get(`inspector${i}`))}</select></div>`).join("")}</form><div class="project-paper-note"><strong>ระบบจะแจ้งเตือน</strong><span>เมื่อเลือกกรรมการตรวจรับ ระบบส่ง Notification ไปยังบุคคลที่ถูกเลือกให้เข้ามาดูคำขอ และบุคคลนั้นเลือกวิธีลงลายเซ็นของตัวเองได้ภายหลัง</span></div><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="save-budget-signer-assignments">บันทึกรายชื่อ</button></div></div>`;
  document.body.appendChild(m);const close=()=>m.remove();m.querySelector(".modal-close").onclick=close;m.querySelector(".modal-cancel").onclick=close;m.querySelector("#save-budget-signer-assignments").onclick=async e=>{const d=new FormData(m.querySelector("#budget-signer-assignments")),assignments={};for(const k of ["department_head","plan_budget","director","inspector1","inspector2","inspector3"])assignments[k]=d.get(k)||null;const inspectors=[assignments.inspector1,assignments.inspector2,assignments.inspector3].filter(Boolean);if(new Set(inspectors).size!==inspectors.length)return toast("คณะกรรมการซ้ำกัน","กรรมการตรวจรับทั้ง 3 คนต้องเป็นคนละคนกัน","error");buttonLoading(e.target,true,"กำลังบันทึก...");const {error}=await supabase.rpc("set_budget_signer_assignments",{p_disbursement_id:r.id,p_assignments:assignments});buttonLoading(e.target,false);if(error)return toast("บันทึกผู้ลงนามไม่สำเร็จ",error.message,"error");close();toast("บันทึกรายชื่อแล้ว","กรรมการตรวจรับที่ถูกเลือกได้รับการแจ้งเตือนแล้ว","success");await renderDashboard();};
}
async function budgetUploadSignatureAsset(r,slot,blob,mime){const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg",path=`${r.id}/${slot}/${crypto.randomUUID()}.${ext}`,up=await supabase.storage.from("budget-signatures").upload(path,blob,{contentType:mime,upsert:false});if(up.error)throw up.error;return path;}
function budgetSignerActionModal(r,slot){
  const assignment=budgetSignersFor(r.id).find(x=>x.slot===slot);if(!assignment||assignment.user_id!==state.user.id)return toast("ไม่มีสิทธิ์ลงนามช่องนี้","คุณไม่ได้ถูกเลือกเป็นผู้ลงนามในช่องดังกล่าว","error");
  const m=document.createElement("div");m.className="modal-backdrop";m.innerHTML=`<div class="modal modal-wide"><div class="modal-head"><div><h3>ลายเซ็นของฉัน · ${escapeHtml(BUDGET_SIGNER_LABEL[slot])}</h3><p>เลือกวิธีที่สะดวกได้ ไม่จำเป็นต้องเซ็นออนไลน์</p></div><button class="modal-close">×</button></div><div class="signature-mode-grid"><button class="signature-mode-option" data-budget-sign-method="paper"><strong>เซ็นบนกระดาษ</strong><span>PDF เว้นช่องลายเซ็นไว้</span></button><button class="signature-mode-option" data-budget-sign-method="drawn"><strong>เซ็นสดในระบบ</strong><span>ใช้นิ้ว เมาส์ หรือปากกา</span></button><button class="signature-mode-option" data-budget-sign-method="upload"><strong>อัปโหลดรูปภาพ</strong><span>PNG / JPG / WebP</span></button><button class="signature-mode-option" data-budget-sign-method="stored"><strong>ลายเซ็นที่บันทึกไว้</strong><span>ใช้ลายเซ็นของบัญชีนี้</span></button></div><div id="budget-sign-workspace"></div><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ปิด</button></div></div>`;document.body.appendChild(m);const close=()=>m.remove(),work=m.querySelector("#budget-sign-workspace");m.querySelector(".modal-close").onclick=close;m.querySelector(".modal-cancel").onclick=close;
  const savePaper=async()=>{const {error}=await supabase.rpc("set_budget_signature",{p_disbursement_id:r.id,p_slot:slot,p_method:"paper",p_signature_id:null,p_storage_path:null});if(error)return toast("บันทึกวิธีลงนามไม่สำเร็จ",error.message,"error");toast("เลือกเซ็นบนกระดาษแล้ว","PDF จะเว้นช่องลายเซ็นไว้พร้อมชื่อของคุณ","success");close();await renderDashboard();};
  m.querySelectorAll("[data-budget-sign-method]").forEach(btn=>btn.onclick=()=>{const method=btn.dataset.budgetSignMethod;if(method==="paper")return savePaper();if(method==="drawn"){work.innerHTML=`<div class="signature-canvas-wrap"><canvas id="signature-canvas" width="900" height="300"></canvas></div><div class="signature-canvas-actions"><span>เซ็นในกรอบด้านบน</span><button class="btn btn-ghost" id="signature-clear" type="button">ล้าง</button><button class="btn btn-primary" id="budget-save-drawn" type="button">บันทึกลายเซ็น</button></div>`;setupSignatureCanvas(m);work.querySelector("#budget-save-drawn").onclick=async e=>{if(!m._signatureHasInk?.())return toast("ยังไม่มีลายเซ็น","กรุณาเซ็นก่อนบันทึก","error");buttonLoading(e.target,true,"กำลังบันทึก...");try{const blob=await canvasBlob(work.querySelector("#signature-canvas")),path=await budgetUploadSignatureAsset(r,slot,blob,"image/png"),{error}=await supabase.rpc("set_budget_signature",{p_disbursement_id:r.id,p_slot:slot,p_method:"drawn",p_signature_id:null,p_storage_path:path});if(error)throw error;if(assignment.storage_path)await supabase.storage.from("budget-signatures").remove([assignment.storage_path]);toast("บันทึกลายเซ็นแล้ว","ลายเซ็นจะแสดงใน PDF","success");close();await renderDashboard();}catch(err){toast("บันทึกลายเซ็นไม่สำเร็จ",err.message||String(err),"error")}finally{buttonLoading(e.target,false)}};}else if(method==="upload"){work.innerHTML=`<div class="field"><label>เลือกรูปลายเซ็น</label><input class="input" id="budget-sign-file" type="file" accept="image/png,image/jpeg,image/webp"></div><button class="btn btn-primary" id="budget-save-upload">อัปโหลดและบันทึก</button>`;work.querySelector("#budget-save-upload").onclick=async e=>{const file=work.querySelector("#budget-sign-file").files[0];if(!file)return toast("กรุณาเลือกไฟล์","","error");buttonLoading(e.target,true,"กำลังอัปโหลด...");try{const path=await budgetUploadSignatureAsset(r,slot,file,file.type),{error}=await supabase.rpc("set_budget_signature",{p_disbursement_id:r.id,p_slot:slot,p_method:"upload",p_signature_id:null,p_storage_path:path});if(error)throw error;if(assignment.storage_path)await supabase.storage.from("budget-signatures").remove([assignment.storage_path]);toast("บันทึกลายเซ็นแล้ว","","success");close();await renderDashboard();}catch(err){toast("บันทึกลายเซ็นไม่สำเร็จ",err.message||String(err),"error")}finally{buttonLoading(e.target,false)}};}else{work.innerHTML=`<div class="field"><label>ลายเซ็นที่บันทึกไว้</label><select class="select" id="budget-stored-signature"><option value="">เลือกลายเซ็น</option>${state.signatures.map(s=>`<option value="${s.id}" ${s.is_default?"selected":""}>${escapeHtml(s.label||"ลายเซ็น")}${s.is_default?" · ค่าเริ่มต้น":""}</option>`).join("")}</select></div><button class="btn btn-primary" id="budget-save-stored">ใช้ลายเซ็นนี้</button>`;work.querySelector("#budget-save-stored").onclick=async e=>{const id=work.querySelector("#budget-stored-signature").value,sig=state.signatures.find(x=>x.id===id);if(!sig)return toast("เลือกลายเซ็นก่อน","","error");buttonLoading(e.target,true,"กำลังบันทึก...");try{const {data,error}=await supabase.storage.from(sig.bucket_id||"signatures").download(sig.storage_path);if(error)throw error;const mime=data.type||"image/png",path=await budgetUploadSignatureAsset(r,slot,data,mime),res=await supabase.rpc("set_budget_signature",{p_disbursement_id:r.id,p_slot:slot,p_method:"stored",p_signature_id:sig.id,p_storage_path:path});if(res.error)throw res.error;if(assignment.storage_path)await supabase.storage.from("budget-signatures").remove([assignment.storage_path]);toast("ใช้ลายเซ็นที่บันทึกไว้แล้ว","","success");close();await renderDashboard();}catch(err){toast("บันทึกลายเซ็นไม่สำเร็จ",err.message||String(err),"error")}finally{buttonLoading(e.target,false)}};}});}
function projectPdfStyles(){return `${a4DocumentStyles()} @page{size:A4 portrait;margin:10mm}.a4-document{width:190mm;min-height:277mm;padding:0;box-shadow:none}.a4-document-inner{padding:7mm 9mm}.project-doc-head{text-align:center}.project-doc-head .a4-school-logo{height:22mm;max-width:30mm}.project-doc-head h1{font-size:18pt;margin:2mm 0 0}.project-doc-head h2{font-size:15pt;margin:0}.project-doc-meta{text-align:center;font-size:11pt}.project-doc-info{display:grid;grid-template-columns:1fr 1fr;gap:1mm 6mm;margin:5mm 0;font-size:12pt}.project-doc-info div{border-bottom:1px dotted #777;padding:1.3mm 0}.project-doc-table{width:100%;border-collapse:collapse;font-size:11pt}.project-doc-table th,.project-doc-table td{border:1px solid #222;padding:1.5mm;text-align:center}.project-doc-table th{background:#fafafa}`;}
async function projectPdfPreview(p,a=null){const logo=await schoolLogoDataUrl(),body=a?`<article class="a4-document"><div class="a4-document-inner"><header class="project-doc-head">${logo?`<img class="a4-school-logo" src="${logo}">`:""}<h1>${escapeHtml(schoolName())}</h1><div class="project-doc-meta">${escapeHtml(schoolAddress())}<br>${escapeHtml(educationOffice())}</div><h2>รายละเอียดกิจกรรม</h2></header><div class="project-doc-info"><div><strong>เลขกิจกรรม:</strong> ${escapeHtml(a.activity_no)}</div><div><strong>ชื่อกิจกรรม:</strong> ${escapeHtml(a.activity_name)}</div><div><strong>โครงการ:</strong> ${escapeHtml(p.project_no)} ${escapeHtml(p.project_name)}</div><div><strong>ผู้รับผิดชอบ:</strong> ${escapeHtml(a.owner_name)}</div><div><strong>งบกิจกรรม:</strong> ${money(a.budget_amount)} บาท</div><div><strong>คงเหลือ:</strong> ${money(activityBudgetStats(a).remaining)} บาท</div></div></div></article>`:`<article class="a4-document"><div class="a4-document-inner"><header class="project-doc-head">${logo?`<img class="a4-school-logo" src="${logo}">`:""}<h1>${escapeHtml(schoolName())}</h1><div class="project-doc-meta">${escapeHtml(schoolAddress())}<br>${escapeHtml(educationOffice())}</div><h2>รายละเอียดโครงการ</h2></header><div class="project-doc-info"><div><strong>เลขโครงการ:</strong> ${escapeHtml(p.project_no)}</div><div><strong>ชื่อโครงการ:</strong> ${escapeHtml(p.project_name)}</div><div><strong>ฝ่าย:</strong> ${escapeHtml(projectDepartmentName(p))}</div><div><strong>ผู้รับผิดชอบ:</strong> ${escapeHtml(p.owner_name)}</div><div><strong>งบประมาณ:</strong> ${money(p.budget_amount)} บาท</div><div><strong>ยังไม่จัดสรร:</strong> ${money(projectBudgetStats(p).unallocated)} บาท</div></div><table class="project-doc-table"><thead><tr><th>เลขกิจกรรม</th><th>กิจกรรม</th><th>ผู้รับผิดชอบ</th><th>งบ</th><th>คงเหลือ</th></tr></thead><tbody>${projectActivitiesFor(p.id).map(x=>`<tr><td>${escapeHtml(x.activity_no)}</td><td>${escapeHtml(x.activity_name)}</td><td>${escapeHtml(x.owner_name)}</td><td>${money(x.budget_amount)}</td><td>${money(activityBudgetStats(x).remaining)}</td></tr>`).join("")||`<tr><td colspan="5">ยังไม่มีกิจกรรม</td></tr>`}</tbody></table></div></article>`;openPrintPreview(body,projectPdfStyles(),a?"รายละเอียดกิจกรรม":"รายละเอียดโครงการ");}

async function deleteSelectedBudgetRequest(){
  const r=selectedBudgetRequest();if(!r)return;
  const normalAllowed=r.requester_id===state.user.id&&r.status==="draft";
  if(!normalAllowed&&!isSuperAdminUser())return toast("ไม่มีสิทธิ์ลบคำขอเบิกนี้","ผู้ขอเบิกลบได้เฉพาะฉบับร่างของตนเอง","error");
  secureDeleteModal({
    title:"ลบคำขอเบิกงบประมาณ",
    description:`เลขคุม ${r.control_number||"—"} · ครั้งที่ ${r.request_round} · ${money(r.amount)} บาท`,
    warning:isSuperAdminUser()&&r.status!=="draft"
      ?"รายการนี้ไม่ใช่ฉบับร่าง การลบอาจทำให้เลขทะเบียนคุมมีช่วงว่าง แต่ระบบจะไม่ย้อนเลขทะเบียนคุมกลับไปใช้ซ้ำ"
      :"เลขทะเบียนคุมที่เคยถูกออกแล้วจะไม่ถูกนำกลับมาใช้ซ้ำหลังลบ",
    action:async client=>{
      const signaturePaths=budgetSignersFor(r.id).map(x=>x.storage_path).filter(Boolean);
      if(signaturePaths.length){
        const {error}=await client.storage.from("budget-signatures").remove(signaturePaths);
        if(error)throw new Error(`ลบไฟล์ลายเซ็นไม่สำเร็จ: ${error.message}`);
      }
      const {error}=await client.from("budget_disbursements").delete().eq("id",r.id);
      if(error)throw error;
    },
    afterDelete:async()=>{
      state.selectedDisbursementId=null;state.projectView="budget";
      toast("ลบคำขอเบิกแล้ว","เลขคุมเดิมจะไม่ถูกนำกลับมาใช้ซ้ำ","success");
      await renderDashboard();
    }
  });
}

async function deleteSelectedProject(){
  const p=state.schoolProjects.find(x=>x.id===state.selectedProjectId);if(!p)return;
  if(p.owner_id!==state.user.id&&!isSuperAdminUser())return;
  const linked=projectDisbursementsFor(p.id);
  if(linked.length)return toast("ยังลบโครงการไม่ได้",`มีเอกสารขอเบิกเชื่อมอยู่ ${linked.length} รายการ กรุณาจัดการเอกสารเหล่านั้นก่อน`,"error");
  secureDeleteModal({
    title:"ลบโครงการ",
    description:`${p.project_no} ${p.project_name}`,
    warning:"กิจกรรมย่อยภายใต้โครงการนี้จะถูกลบตามไปด้วย หากไม่มีเอกสารงบประมาณที่อ้างอิงอยู่",
    action:async client=>{
      const {error}=await client.from("school_projects").delete().eq("id",p.id);
      if(error)throw error;
    },
    afterDelete:async()=>{
      state.selectedProjectId=null;state.selectedProjectActivityId=null;
      toast("ลบโครงการแล้ว","","success");await renderDashboard();
    }
  });
}

async function deleteSelectedProjectActivity(){
  const a=state.projectActivities.find(x=>x.id===state.selectedProjectActivityId);if(!a)return;
  if(a.owner_id!==state.user.id&&!isSuperAdminUser())return;
  const linked=projectDisbursementsFor(a.project_id,a.id);
  if(linked.length)return toast("ยังลบกิจกรรมไม่ได้",`กิจกรรมนี้มีเอกสารขอเบิกเชื่อมอยู่ ${linked.length} รายการ กรุณาจัดการเอกสารเหล่านั้นก่อน`,"error");
  secureDeleteModal({
    title:"ลบกิจกรรมย่อย",
    description:`${a.activity_no} ${a.activity_name}`,
    warning:"งบที่จัดสรรให้กิจกรรมนี้จะกลับไปเป็นวงเงินที่ยังไม่จัดสรรของโครงการหลัก",
    action:async client=>{
      const {error}=await client.from("project_activities").delete().eq("id",a.id);
      if(error)throw error;
    },
    afterDelete:async()=>{
      state.selectedProjectActivityId=null;
      toast("ลบกิจกรรมแล้ว","","success");await renderDashboard();
    }
  });
}

async function deleteSelectedHomeVisitRecord(){
  const r=homeVisitRecord();if(!r)return;
  const normalAllowed=r.status==="draft"&&(r.recorder_id===state.user.id||r.homeroom_teacher_id===state.user.id||canManageAllHomeVisits());
  if(!normalAllowed&&!isSuperAdminUser())return;
  secureDeleteModal({
    title:"ลบข้อมูลเยี่ยมบ้านนักเรียน",
    description:`${r.class_label} · ${r.student_first_name} ${r.student_last_name}`,
    warning:"สมาชิกครัวเรือน รูปภาพ และลายเซ็นที่ผูกกับนักเรียนรายนี้จะถูกลบตามไปด้วย",
    action:async client=>{
      const photoPaths=homeVisitPhotosFor(r.id).map(x=>x.storage_path).filter(Boolean);
      const signPaths=homeVisitSignaturesFor(r.id).map(x=>x.storage_path).filter(Boolean);
      const paths=[...new Set([...photoPaths,...signPaths])];
      if(paths.length){
        const {error}=await client.storage.from("home-visits").remove(paths);
        if(error)throw new Error(`ลบรูป/ลายเซ็นไม่สำเร็จ: ${error.message}`);
      }
      const {error}=await client.from("home_visit_records").delete().eq("id",r.id);
      if(error)throw error;
    },
    afterDelete:async()=>{
      state.selectedHomeVisitId=null;state.homeVisitStep=1;
      toast("ลบข้อมูลเยี่ยมบ้านแล้ว","","success");await renderDashboard();
    }
  });
}

async function deleteSelectedSubstituteRecord(){
  const row=state.substituteLessons.find(x=>x.id===state.selectedSubstituteLessonId);
  if(!row||!isSuperAdminUser())return;
  secureDeleteModal({
    title:"ลบรายการจัดสอนแทน",
    description:`${thaiDateOnly(row.leave_date)} · คาบ ${row.period_no} · ${row.class_label} ${row.subject_name}`,
    warning:"รายการสอนแทนเป็นข้อมูลที่สร้างจากใบลาและตาราง Published หากซิงก์ระบบใหม่ รายการอาจถูกสร้างขึ้นอีกถ้าเงื่อนไขต้นทางยังอยู่",
    action:async client=>{
      const {error}=await client.from("substitute_lessons").delete().eq("id",row.id);
      if(error)throw error;
    },
    afterDelete:async()=>{
      state.selectedSubstituteLessonId=null;
      toast("ลบรายการสอนแทนแล้ว","","success");await renderDashboard();
    }
  });
}

function budgetPdfBalanceStats(r,p,a){
  const reservedStatuses=new Set(["document_ready","printed","paid"]);
  if(a){
    const total=Number(a.budget_amount||0);
    const previousUsed=projectDisbursementsFor(p.id,a.id)
      .filter(x=>x.id!==r.id && Number(x.request_round||0)<Number(r.request_round||0) && reservedStatuses.has(x.status))
      .reduce((sum,x)=>sum+Number(x.amount||0),0);
    const previousRemaining=Math.max(0,total-previousUsed);
    const currentUse=Number(r.amount||0);
    const currentRemaining=Math.max(0,previousRemaining-currentUse);
    return {
      scopeLabel:"งบประมาณกิจกรรม",
      total,
      previousRemaining,
      currentUse,
      currentRemaining
    };
  }
  const activeActivities=projectActivitiesFor(p.id);
  const allocated=activeActivities.reduce((sum,x)=>sum+Number(x.budget_amount||0),0);
  const total=Math.max(0,Number(p?.budget_amount||0)-allocated);
  const previousUsed=projectDisbursementsFor(p.id,null)
    .filter(x=>x.id!==r.id && Number(x.request_round||0)<Number(r.request_round||0) && reservedStatuses.has(x.status))
    .reduce((sum,x)=>sum+Number(x.amount||0),0);
  const previousRemaining=Math.max(0,total-previousUsed);
  const currentUse=Number(r.amount||0);
  const currentRemaining=Math.max(0,previousRemaining-currentUse);
  return {
    scopeLabel:"วงเงินโครงการส่วนที่ยังไม่ได้จัดสรรให้กิจกรรม",
    total,
    previousRemaining,
    currentUse,
    currentRemaining
  };
}

function budgetPdfBalanceHtml(r,p,a){
  const b=budgetPdfBalanceStats(r,p,a);
  return `<section class="budget-balance-pdf">
    <div class="budget-balance-title">${escapeHtml(b.scopeLabel)}</div>
    <div class="budget-balance-grid">
      <div><span>งบประมาณทั้งหมด</span><strong>${money(b.total)} บาท</strong></div>
      <div><span>คงเหลือจากครั้งที่แล้ว</span><strong>${money(b.previousRemaining)} บาท</strong></div>
      <div><span>ใช้ครั้งนี้</span><strong>${money(b.currentUse)} บาท</strong></div>
      <div><span>คงเหลือปัจจุบัน</span><strong>${money(b.currentRemaining)} บาท</strong></div>
    </div>
  </section>`;
}

function budgetPdfStyles(){return `${projectPdfStyles()} .budget-balance-pdf{border:1px solid #222;margin:2mm 0 4mm;page-break-inside:avoid}.budget-balance-title{text-align:center;font-size:12pt;font-weight:700;padding:1.2mm;border-bottom:1px solid #222;background:#fafafa}.budget-balance-grid{display:grid;grid-template-columns:repeat(4,1fr)}.budget-balance-grid>div{text-align:center;padding:2mm 1mm;border-right:1px solid #aaa}.budget-balance-grid>div:last-child{border-right:0}.budget-balance-grid span{display:block;font-size:9.8pt}.budget-balance-grid strong{display:block;font-size:12.5pt;margin-top:.8mm} .budget-control-pdf{display:flex;justify-content:flex-end;align-items:baseline;gap:3mm;margin:2mm 0 3mm;font-size:11pt}.budget-control-pdf strong{font-size:15pt;border:1px solid #222;padding:1mm 4mm;border-radius:2mm} .budget-line-pdf-table{width:100%;border-collapse:collapse;font-size:10.8pt;margin-top:4mm}.budget-line-pdf-table th,.budget-line-pdf-table td{border:1px solid #222;padding:1.6mm 2mm;vertical-align:top}.budget-line-pdf-table th{background:#fafafa;text-align:center}.budget-line-pdf-table .no{width:10mm;text-align:center}.budget-line-pdf-table .amount{width:38mm;text-align:right}.budget-line-pdf-table .total td{font-weight:700;background:#fafafa}.budget-doc-note{font-size:10.5pt;margin-top:2.5mm}.budget-doc-sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:7mm;margin-top:6mm}.budget-doc-inspector-title{text-align:center;font-size:12pt;font-weight:700;margin-top:5mm;margin-bottom:1mm}.budget-doc-inspectors{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:2mm}.budget-doc-sign{text-align:center;font-size:10.5pt;min-height:31mm}.budget-doc-sign-image{display:block;max-width:42mm;height:11mm;object-fit:contain;margin:0 auto .5mm}.budget-doc-sign-space{height:11mm}.budget-doc-sign .line{margin-top:1mm}.budget-doc-sign-position{display:block;font-size:9pt}.budget-doc-sign small{display:block;font-size:8.5pt;color:#555}`;}
function docSign(title,s={}){return `<div class="budget-doc-sign">${s.image?`<img class="budget-doc-sign-image" src="${s.image}" alt="ลายเซ็น">`:`<div class="budget-doc-sign-space"></div>`}<div class="line">ลงชื่อ............................................</div><div>(${escapeHtml(s.name||"................................")})</div><strong>${escapeHtml(title)}</strong>${s.position&&s.position!==title?`<span class="budget-doc-sign-position">${escapeHtml(s.position)}</span>`:""}<small>${s.method&&s.method!=="paper"?"ลงนามผ่านระบบ":""}</small></div>`;}
async function budgetRequestPdfPreview(r){
  const p=state.schoolProjects.find(x=>x.id===r.project_id),a=state.projectActivities.find(x=>x.id===r.activity_id),items=budgetLineItems(r),logo=await schoolLogoDataUrl(),assignments=budgetSignersFor(r.id),sigMap={};
  for(const s of assignments){let image=null;if(s.storage_path&&s.method!=="paper"){const {data,error}=await supabase.storage.from(s.bucket_id||"budget-signatures").download(s.storage_path);if(!error&&data)image=await blobToDataUrl(data)}sigMap[s.slot]={name:s.signer_name,position:s.signer_position,method:s.method,image};}
  const legacy=r.signers||{};for(const slot of Object.keys(BUDGET_SIGNER_LABEL)){if(!sigMap[slot]&&legacy[slot])sigMap[slot]={name:legacy[slot].name,position:legacy[slot].position,method:"paper",image:null};}
  const body=`<article class="a4-document"><div class="a4-document-inner"><header class="project-doc-head">${logo?`<img class="a4-school-logo" src="${logo}">`:""}<h1>${escapeHtml(schoolName())}</h1><div class="project-doc-meta">${escapeHtml(schoolAddress())}<br>${escapeHtml(educationOffice())}</div><h2>ใบขอเบิกใช้งบประมาณโครงการ / กิจกรรม</h2></header><div class="budget-control-pdf"><span>เลขทะเบียนคุมการเบิกจ่าย</span><strong>${escapeHtml(r.control_number||"—")}</strong></div><div class="project-doc-info"><div><strong>โครงการ:</strong> ${escapeHtml(p?.project_no||"—")} ${escapeHtml(p?.project_name||"")}</div><div><strong>กิจกรรม:</strong> ${escapeHtml(a?`${a.activity_no} ${a.activity_name}`:"เบิกจากโครงการหลัก")}</div><div><strong>เบิกครั้งที่:</strong> ${r.request_round}</div><div><strong>วันที่:</strong> ${thaiDateOnly(r.request_date)}</div><div><strong>ปีการศึกษา:</strong> ${r.academic_year}</div><div><strong>ภาคเรียน:</strong> ${r.semester}</div></div>${budgetPdfBalanceHtml(r,p,a)}<table class="budget-line-pdf-table"><thead><tr><th class="no">#</th><th>รายการใช้เงิน</th><th class="amount">จำนวนเงิน (บาท)</th></tr></thead><tbody>${items.map((item,i)=>`<tr><td class="no">${i+1}</td><td>${escapeHtml(item.description)}</td><td class="amount">${money(item.amount)}</td></tr>`).join("")}<tr class="total"><td colspan="2"><strong>รวมทั้งสิ้น</strong></td><td class="amount"><strong>${money(r.amount)}</strong></td></tr></tbody></table><div class="budget-doc-note"><strong>หมายเหตุ:</strong> ${escapeHtml(r.notes||"—")}</div><div class="budget-doc-sign-grid">${docSign("ผู้ขอเบิก",sigMap.requester)}${docSign("หัวหน้าฝ่ายเจ้าของโครงการ",sigMap.department_head)}${docSign("หัวหน้ากลุ่มงานบริหารแผนและงบประมาณ",sigMap.plan_budget)}${docSign("ผู้อำนวยการโรงเรียน",sigMap.director)}</div><div class="budget-doc-inspector-title">คณะกรรมการตรวจรับ</div><div class="budget-doc-inspectors">${docSign("กรรมการตรวจรับคนที่ 1",sigMap.inspector1)}${docSign("กรรมการตรวจรับคนที่ 2",sigMap.inspector2)}${docSign("กรรมการตรวจรับคนที่ 3",sigMap.inspector3)}</div></div></article>`;openPrintPreview(body,budgetPdfStyles(),"ใบขอเบิกงบประมาณ");
}
function openPrintPreview(body,styles,title){const m=document.createElement("div");m.className="modal-backdrop a4-preview-backdrop";m.innerHTML=`<div class="a4-preview-shell"><div class="a4-preview-toolbar"><div><strong>${escapeHtml(title)}</strong><span>A4 แนวตั้ง</span></div><div class="a4-preview-actions"><button class="btn btn-ghost" id="doc-close">ปิด</button><button class="btn btn-primary" id="doc-print">พิมพ์ / บันทึก PDF</button></div></div><div class="a4-preview-scroll"><style>${styles}</style>${body}</div></div>`;document.body.appendChild(m);m.querySelector("#doc-close").onclick=()=>m.remove();m.querySelector("#doc-print").onclick=()=>{const w=window.open("","_blank");if(!w)return toast("เปิดหน้าพิมพ์ไม่ได้","กรุณาอนุญาต Pop-up","error");w.document.write(`<!doctype html><html lang="th"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>${styles}</style></head><body class="a4-print-body">${body}<script>window.addEventListener('load',()=>{(document.fonts?document.fonts.ready:Promise.resolve()).finally(()=>setTimeout(()=>window.print(),250));});<\/script></body></html>`);w.document.close();};}

const HOME_VISIT_STATUS_LABEL={draft:"ฉบับร่าง",complete:"ข้อมูลครบแล้ว"};
const HOME_VISIT_STEPS=["ข้อมูลนักเรียน","สมาชิกครัวเรือน","สถานะครัวเรือน/ที่อยู่อาศัย","การเดินทาง/ที่อยู่/รูปภาพ","การรับรองและลายเซ็น","ตรวจสอบ / Export"];
function homeVisitPeriod(){const p=currentAcademicPeriod();return{academicYear:String(state.homeVisitAcademicYear||p.academicYear),semester:Number(state.homeVisitSemester||p.semester)}}
function homeVisitRecord(){return state.homeVisitRecords.find(r=>r.id===state.selectedHomeVisitId)||null}
function homeVisitMembersFor(id){return state.homeVisitMembers.filter(m=>m.record_id===id).sort((a,b)=>a.member_no-b.member_no)}
function homeVisitPhotosFor(id){return state.homeVisitPhotos.filter(p=>p.record_id===id)}
function homeVisitSignaturesFor(id){return state.homeVisitSignatures.filter(s=>s.record_id===id)}
function canManageAllHomeVisits(){return state.profile?.role==="super_admin"||state.profile?.role==="director"||(state.profile?.role==="department_head"&&state.departments.find(d=>d.id===state.profile.department_id)?.code==="general")}
function homeVisitAllowedClasses(){const p=homeVisitPeriod(),all=state.homeVisitClasses.filter(c=>String(c.academic_year)===p.academicYear&&Number(c.semester)===p.semester&&c.is_active);if(canManageAllHomeVisits())return all;const ids=new Set(state.homeVisitHomerooms.filter(h=>h.teacher_id===state.user.id).map(h=>h.class_id));return all.filter(c=>ids.has(c.id))}
function homeVisitStatusPill(r){return `<span class="pill ${r.status==="complete"?"active":"pending"}">${HOME_VISIT_STATUS_LABEL[r.status]||r.status}</span>`}
async function loadHomeVisitWorkspace(){const p=currentAcademicPeriod();if(!state.homeVisitAcademicYear)state.homeVisitAcademicYear=p.academicYear;if(!state.homeVisitSemester)state.homeVisitSemester=p.semester;const [rr,mr,pr,sr,cr,hr]=await Promise.all([supabase.from("home_visit_records").select("*").order("updated_at",{ascending:false}),supabase.from("home_visit_household_members").select("*").order("member_no"),supabase.from("home_visit_photos").select("*").order("created_at"),supabase.from("home_visit_signatures").select("*").order("signed_at"),supabase.from("school_classes").select("*").eq("is_active",true).order("sort_order").order("level_name"),supabase.from("homeroom_teachers").select("*")]);state.homeVisitRecords=rr.error?[]:(rr.data||[]);state.homeVisitMembers=mr.error?[]:(mr.data||[]);state.homeVisitPhotos=pr.error?[]:(pr.data||[]);state.homeVisitSignatures=sr.error?[]:(sr.data||[]);state.homeVisitClasses=cr.error?[]:(cr.data||[]);state.homeVisitHomerooms=hr.error?[]:(hr.data||[]);const allowed=homeVisitAllowedClasses();if(!state.homeVisitClassId||!allowed.some(c=>c.id===state.homeVisitClassId))state.homeVisitClassId=allowed[0]?.id||null;if(state.selectedHomeVisitId&&!state.homeVisitRecords.some(r=>r.id===state.selectedHomeVisitId))state.selectedHomeVisitId=null}
function homeVisitFilteredRecords(){const p=homeVisitPeriod();return state.homeVisitRecords.filter(r=>String(r.academic_year)===p.academicYear&&Number(r.semester)===p.semester&&(!state.homeVisitClassId||r.class_id===state.homeVisitClassId))}
function homeVisitHeroHtml(){return `<section class="lesson-hero home-visit-hero"><div><span class="eyebrow dark">General Administration · Student Home Visit</span><h2>ระบบเยี่ยมบ้านนักเรียน</h2><p>กรอกข้อมูลตามแบบ นร./กสศ.01 · แนบรูปภาพ · ลายเซ็นหลายรูปแบบ · Export รายบุคคลหรือรวมทั้งห้องเป็น PDF เดียว</p></div><div class="lesson-hero-actions"><button class="btn btn-primary" id="new-home-visit">＋ เพิ่มนักเรียน</button></div></section>`}
function homeVisitFiltersHtml(){const p=homeVisitPeriod(),classes=homeVisitAllowedClasses();return `<div class="home-visit-filters"><div class="field"><label>ปีการศึกษา</label><input class="input" id="hv-year" type="number" value="${p.academicYear}"></div><div class="field"><label>ภาคเรียน</label><select class="select" id="hv-sem"><option value="1" ${p.semester===1?"selected":""}>1</option><option value="2" ${p.semester===2?"selected":""}>2</option><option value="3" ${p.semester===3?"selected":""}>3</option></select></div><div class="field hv-class-filter"><label>ชั้น / ห้อง</label><select class="select" id="hv-class">${classes.map(c=>`<option value="${c.id}" ${c.id===state.homeVisitClassId?"selected":""}>${escapeHtml(schoolClassLabel(c))}</option>`).join("")}</select></div></div>`}
function homeVisitListHtml(){const rows=homeVisitFilteredRecords(),c=state.homeVisitClasses.find(x=>x.id===state.homeVisitClassId);return `${homeVisitHeroHtml()}${homeVisitFiltersHtml()}<section class="panel"><div class="panel-head"><div class="panel-title-wrap"><h3>${c?`ข้อมูลเยี่ยมบ้าน ${escapeHtml(schoolClassLabel(c))}`:"ข้อมูลเยี่ยมบ้าน"}</h3><p>${rows.length} คน · เลือก Export รายบุคคล หรือรวมทุกคนในห้อง</p></div><div class="admin-actions"><button class="btn btn-secondary" id="export-home-visit-class" ${rows.length?"":"disabled"}>▤ Export ทั้งห้อง (${rows.length} คน) PDF เดียว</button><button class="btn btn-primary" id="new-home-visit">＋ เพิ่มนักเรียน</button></div></div>${rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>นักเรียน</th><th>ชั้น</th><th>ครูประจำชั้น</th><th>ผู้บันทึก</th><th>สถานะ</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${escapeHtml(r.student_first_name)} ${escapeHtml(r.student_last_name)}</strong><br><span class="table-muted">${escapeHtml(r.student_citizen_or_g||"—")}</span></td><td>${escapeHtml(r.class_label)}</td><td>${escapeHtml(r.homeroom_teacher_name||"—")}</td><td>${escapeHtml(r.recorder_name)}</td><td>${homeVisitStatusPill(r)}</td><td><div class="admin-actions"><button class="btn btn-ghost" data-open-home-visit="${r.id}">กรอก/รายละเอียด</button><button class="btn btn-secondary" data-export-home-visit="${r.id}">PDF รายบุคคล</button></div></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty"><strong>ยังไม่มีข้อมูลเยี่ยมบ้านในห้องนี้</strong><span>กด “เพิ่มนักเรียน” เพื่อเริ่มกรอกแบบฟอร์ม</span></div>`}</section>`}
function hvRadio(name,value,label,current){return `<label class="hv-choice"><input type="radio" name="${name}" value="${escapeHtml(value)}" ${current===value?"checked":""}> ${escapeHtml(label)}</label>`}
function hvCheck(name,value,label,arr=[]){return `<label class="hv-choice"><input type="checkbox" name="${name}" value="${escapeHtml(value)}" ${arr.includes(value)?"checked":""}> ${escapeHtml(label)}</label>`}
function hvText(fd,key,label,placeholder=""){return `<div class="field"><label>${escapeHtml(label)}</label><input class="input" name="${key}" value="${escapeHtml(fd[key]||"")}" placeholder="${escapeHtml(placeholder)}"></div>`}
function hvNumber(fd,key,label){return `<div class="field"><label>${escapeHtml(label)}</label><input class="input" type="number" step="0.01" name="${key}" value="${escapeHtml(fd[key]??"")}"></div>`}
function homeVisitStep1(r){const f=r.form_data||{};return `<div class="form-grid hv-step-card"><div class="form-row">${hvText(f,"student_nickname","ชื่อเล่น")}${hvText(f,"student_age","อายุ")}</div><div class="field"><label>สถานภาพครอบครัว</label><div class="hv-choice-grid">${[["together","พ่อแม่อยู่ด้วยกัน"],["separated","พ่อแม่แยกกันอยู่"],["divorced","พ่อแม่หย่าร้าง"],["father_deceased","พ่อเสียชีวิต/สาบสูญ"],["mother_deceased","แม่เสียชีวิต/สาบสูญ"],["both_deceased","เสียชีวิตทั้งคู่/สาบสูญ"],["abandoned","พ่อ/แม่ทอดทิ้ง"]].map(x=>hvRadio("family_status",x[0],x[1],f.family_status)).join("")}</div></div><div class="field"><label>นักเรียนอาศัยอยู่กับ</label><div class="hv-choice-grid">${[["parents","พ่อ/แม่"],["relative","ญาติ"],["alone","อยู่ลำพัง"],["guardian","ผู้อุปการะ/นายจ้าง"],["institution","ครัวเรือนสถาบัน"]].map(x=>hvRadio("lives_with",x[0],x[1],f.lives_with)).join("")}</div></div><div class="form-row">${hvText(f,"guardian_name","ชื่อ-นามสกุลผู้ปกครอง")}${hvText(f,"guardian_relationship","ความสัมพันธ์กับนักเรียน")}</div><div class="form-row">${hvText(f,"guardian_education","การศึกษาสูงสุด")}${hvText(f,"guardian_occupation","อาชีพ")}</div><div class="form-row">${hvText(f,"guardian_phone","เบอร์โทรศัพท์")}${hvText(f,"guardian_citizen_id","เลขประจำตัวประชาชนผู้ปกครอง")}</div><div class="hv-choice-grid">${hvCheck("flags","no_guardian_citizen","ไม่มีเลขประจำตัวประชาชน",f.flags||[])}${hvCheck("flags","state_welfare","ได้สวัสดิการแห่งรัฐ (ทะเบียนคนจน)",f.flags||[])}</div></div>`}
function householdRowsHtml(r){const rows=homeVisitMembersFor(r.id);const template=(m={},i=0)=>`<tr data-hv-member="${m.id||"new-"+i}"><td>${i+1}</td><td><input class="input input-sm" data-m="full_name" value="${escapeHtml(m.full_name||"")}"></td><td><input class="input input-sm" data-m="relationship" value="${escapeHtml(m.relationship||"")}"></td><td><input class="input input-sm" data-m="citizen_id" value="${escapeHtml(m.citizen_id||"")}"></td><td><input class="input input-sm" data-m="education_level" value="${escapeHtml(m.education_level||"")}"></td><td><input class="input input-sm" data-m="age" type="number" value="${m.age??""}"></td><td><input data-m="has_disability" type="checkbox" ${m.has_disability?"checked":""}></td><td><input data-m="has_chronic_disease" type="checkbox" ${m.has_chronic_disease?"checked":""}></td><td><input class="input input-sm" data-m="income_wage" type="number" value="${m.income_wage||0}"></td><td><input class="input input-sm" data-m="income_agriculture" type="number" value="${m.income_agriculture||0}"></td><td><input class="input input-sm" data-m="income_business" type="number" value="${m.income_business||0}"></td><td><input class="input input-sm" data-m="income_welfare" type="number" value="${m.income_welfare||0}"></td><td><input class="input input-sm" data-m="income_other" type="number" value="${m.income_other||0}"></td><td><button class="btn btn-danger hv-member-remove" type="button">×</button></td></tr>`;return `<div class="table-wrap hv-household-table"><table class="table"><thead><tr><th>#</th><th>ชื่อ-นามสกุล</th><th>ความสัมพันธ์</th><th>เลขประชาชน</th><th>การศึกษา</th><th>อายุ</th><th>พิการ</th><th>โรคเรื้อรัง</th><th>ค่าจ้าง</th><th>เกษตร</th><th>ธุรกิจ</th><th>สวัสดิการ</th><th>อื่น ๆ</th><th></th></tr></thead><tbody id="hv-members-body">${rows.length?rows.map((m,i)=>template(m,i)).join(""):template({},0)}</tbody></table></div><button class="btn btn-secondary" type="button" id="hv-add-member">＋ เพิ่มสมาชิกครัวเรือน</button>`}
function homeVisitStep2(r){return `<div class="hv-step-card"><div class="panel-head"><div class="panel-title-wrap"><h3>จำนวนสมาชิกในครัวเรือน</h3><p>กรอกได้สูงสุด 10 คนตามแบบ นร./กสศ.01 รายได้รวมต่อคนคำนวณอัตโนมัติเมื่อ Export</p></div></div>${householdRowsHtml(r)}</div>`}
function homeVisitStep3(r){const f=r.form_data||{},dep=f.dependency||[],floor=f.floor_material||[],wall=f.wall_material||[],roof=f.roof_material||[],water=f.water_source||[],elec=f.electric_source||[],vehicles=f.vehicles||[],goods=f.household_goods||[];return `<div class="form-grid hv-step-card"><div class="field"><label>3.1 ภาระพึ่งพิง (เลือกได้มากกว่า 1)</label><div class="hv-choice-grid">${[["disability","มีความพิการ"],["chronic","มีโรคเรื้อรัง"],["elderly","ผู้สูงอายุ 60 ปีขึ้นไป"],["single_parent","พ่อ/แม่เลี้ยงเดี่ยว"],["unemployed","มีคนอายุ 15-65 ปีว่างงาน"]].map(x=>hvCheck("dependency",x[0],x[1],dep)).join("")}</div></div><div class="field"><label>3.2 การอยู่อาศัย</label><div class="hv-choice-grid">${[["own","อยู่บ้านตนเอง/เจ้าของบ้าน"],["rent","บ้านเช่า"],["free","อยู่กับผู้อื่น/อยู่ฟรี"],["dorm","หอพัก"]].map(x=>hvRadio("housing_type",x[0],x[1],f.housing_type)).join("")}</div>${hvNumber(f,"rent_amount","ค่าเช่าต่อเดือน (บาท)")}</div><div class="field"><label>3.3 วัสดุพื้นบ้าน</label><div class="hv-choice-grid">${["กระเบื้อง/เซรามิค","ปาเก้/ไม้ขัดเงา","ซีเมนต์เปลือย","ไม้กระดาน","ไวนิล/กระเบื้องยาง/เสื่อน้ำมัน","ไม้ไผ่","ดิน/ทราย","อื่น ๆ"].map(v=>hvCheck("floor_material",v,v,floor)).join("")}</div></div><div class="field"><label>วัสดุฝาบ้าน</label><div class="hv-choice-grid">${["ฉาบซีเมนต์","อิฐ/ก้อนปูน/อิฐบล็อก","สังกะสี","ไม้กระดาน","ไม้อัด","สมาร์ทบอร์ด/ไฟเบอร์/ซีเมนต์บอร์ด","ไม้ไผ่/ท่อนไม้/เศษไม้","ดิน/ไวนิล/อื่น ๆ"].map(v=>hvCheck("wall_material",v,v,wall)).join("")}</div></div><div class="field"><label>วัสดุหลังคา</label><div class="hv-choice-grid">${["โลหะ","กระเบื้อง/เซรามิค","ไม้กระดาน","ใบไม้/วัสดุธรรมชาติ","ไวนิล/กระดาษ/พลาสติก","อื่น ๆ"].map(v=>hvCheck("roof_material",v,v,roof)).join("")}</div></div><div class="form-row">${hvText(f,"toilet","ห้องส้วม (มี/ไม่มี)")}${hvText(f,"agri_land","ที่ดินทำการเกษตร")}</div><div class="field"><label>3.5 แหล่งน้ำดื่ม</label><div class="hv-choice-grid">${["น้ำดื่มบรรจุขวด/ตู้หยอดน้ำ","น้ำประปา","น้ำบ่อ/น้ำบาดาล","น้ำฝน/น้ำประปาภูเขา/ลำธาร"].map(v=>hvCheck("water_source",v,v,water)).join("")}</div></div><div class="field"><label>3.6 แหล่งไฟฟ้า</label><div class="hv-choice-grid">${["ไม่มีไฟฟ้า","เครื่องปั่นไฟ/โซลาเซลล์","ไฟต่อพ่วง/แบตเตอรี่","ไฟบ้านหรือมิเตอร์"].map(v=>hvCheck("electric_source",v,v,elec)).join("")}</div></div><div class="field"><label>3.7 ยานพาหนะ</label><div class="hv-choice-grid">${["รถยนต์นั่งส่วนบุคคล","รถปิกอัพ/รถบรรทุกเล็ก/รถตู้","รถไถ/รถเกี่ยวข้าว","รถมอเตอร์ไซต์/เรือประมงพื้นบ้าน"].map(v=>hvCheck("vehicles",v,v,vehicles)).join("")}</div></div><div class="field"><label>3.8 ของใช้ในครัวเรือน</label><div class="hv-choice-grid">${["คอมพิวเตอร์","แอร์","ทีวีจอแบน","เครื่องซักผ้า","ตู้เย็น"].map(v=>hvCheck("household_goods",v,v,goods)).join("")}</div></div><div class="field"><label>4. ข้อมูลครัวเรือนสถาบัน (ถ้ามี)</label><textarea class="input textarea" name="institution_info" placeholder="ประเภท/ชื่อสถาบัน จังหวัด ผู้รับผิดชอบ เบอร์โทร ระยะเวลาอยู่ การช่วยเหลือ รายจ่าย/รายรับ/ทรัพย์สิน...">${escapeHtml(f.institution_info||"")}</textarea></div></div>`}
function homeVisitStep4(r){const f=r.form_data||{};return `<div class="form-grid hv-step-card"><div class="field"><label>5. วิธีเดินทางหลัก</label><div class="hv-choice-grid">${["เดิน","จักรยาน","รถโรงเรียน","จักรยานยนต์ส่วนตัว","รถส่วนตัว","เรือส่วนตัว","จักรยานยนต์รับจ้าง","รถโดยสารประจำทาง/รับจ้าง","เรือโดยสารประจำทาง/รับจ้าง"].map(v=>hvRadio("travel_mode",v,v,f.travel_mode)).join("")}</div></div><div class="form-row">${hvNumber(f,"travel_distance_km","ระยะทางไป-กลับ (กม.)")}${hvText(f,"travel_time","เวลาไป-กลับ (ชั่วโมง:นาที)")}</div><div class="form-row">${hvNumber(f,"travel_cost_month","ค่าเดินทาง/เดือน")}${hvNumber(f,"school_money_day","ได้เงินมาโรงเรียน/วัน (ไม่รวมค่าเดินทาง)")}</div><h3>6. ที่ตั้งที่พักอาศัยปัจจุบัน</h3><div class="form-row">${hvText(f,"house_no","บ้านเลขที่")}${hvText(f,"village_no","หมู่ที่")}${hvText(f,"soi","ตรอก/ซอย")}${hvText(f,"road","ถนน")}</div><div class="form-row">${hvText(f,"subdistrict","ตำบล/แขวง")}${hvText(f,"district","อำเภอ/เขต")}${hvText(f,"province","จังหวัด")}${hvText(f,"postal_code","รหัสไปรษณีย์")}</div><h3>7. ภาพถ่าย</h3><div class="hv-photo-grid">${homeVisitPhotoSlot(r,"student","รูปถ่ายนักเรียน")}${homeVisitPhotoSlot(r,"exterior","รูปที่ 1 ภายนอกที่พักอาศัย")}${homeVisitPhotoSlot(r,"interior","รูปที่ 2 ภายในที่พักอาศัย")}</div><div class="field"><label>ที่มาภาพถ่ายที่พักอาศัย</label><div class="hv-choice-grid">${hvRadio("photo_source","teacher","คุณครูลงเยี่ยมบ้านด้วยตนเอง",f.photo_source)}${hvRadio("photo_source","student","ให้นักเรียนถ่ายภาพมาให้",f.photo_source)}</div></div>${hvText(f,"photo_alternative_reason","กรณีใช้ภาพนักเรียนคู่ป้ายโรงเรียน - ระบุเหตุผล")}</div>`}
function homeVisitPhotoSlot(r,kind,label){
  const p=homeVisitPhotosFor(r.id).find(x=>x.kind===kind);
  return `<div class="hv-photo-slot">
    <div class="hv-photo-preview" data-hv-photo-preview="${kind}">
      <img data-hv-photo-img="${kind}" alt="${escapeHtml(label)}" hidden>
      <span data-hv-photo-placeholder="${kind}">${p?"กำลังโหลดรูปที่บันทึกไว้...":"ยังไม่มีรูป"}</span>
    </div>
    <strong>${escapeHtml(label)}</strong>
    <input type="file" accept="image/png,image/jpeg,image/webp" data-hv-photo-file="${kind}">
    <small class="helper">เมื่อเลือกไฟล์แล้ว กด “บันทึกขั้นตอนนี้” ได้เลย หรือกดอัปโหลดทันที</small>
    <button class="btn btn-secondary" type="button" data-upload-hv-photo="${kind}">อัปโหลด / เปลี่ยนรูปทันที</button>
  </div>`;
}
function signatureMethodBlock(r,type,label){const s=homeVisitSignaturesFor(r.id).find(x=>x.signer_type===type);return `<div class="hv-sign-card"><strong>${escapeHtml(label)}</strong><div class="field"><label>ชื่อผู้ลงนาม</label><input class="input" data-hv-signer-name="${type}" value="${escapeHtml(s?.signer_name||"")}"></div><div class="field"><label>วิธีลงนาม</label><select class="select" data-hv-sign-method="${type}"><option value="blank" ${!s?"selected":""}>เว้นไว้เซ็นบนกระดาษ</option><option value="drawn" ${s?.method==="drawn"?"selected":""}>เซ็นสดบนหน้าจอ</option><option value="upload" ${s?.method==="upload"?"selected":""}>อัปโหลดรูปลายเซ็น</option><option value="stored" ${s?.method==="stored"?"selected":""}>ใช้ลายเซ็นที่บันทึกไว้ในระบบ</option></select></div><button class="btn btn-secondary" type="button" data-hv-sign="${type}">ตั้งค่า / ลงนาม</button>${s?`<span class="pill active">บันทึกแล้ว · ${escapeHtml(s.method)}</span>`:""}</div>`}
function homeVisitStep5(r){return `<div class="hv-step-card"><div class="project-paper-note"><strong>การรับรองข้อมูล</strong><span>ข้อมูลข้อ 1-7 ต้องถูกต้องตามความเป็นจริง และข้อมูลส่วนบุคคลใช้ตามวัตถุประสงค์ของแบบ นร./กสศ.01</span></div><div class="hv-sign-grid">${signatureMethodBlock(r,"student","นักเรียน")}${signatureMethodBlock(r,"guardian","ผู้ปกครอง")}${signatureMethodBlock(r,"state_officer","เจ้าหน้าที่ของรัฐ")}${signatureMethodBlock(r,"director","ผู้อำนวยการสถานศึกษา")}${signatureMethodBlock(r,"home_visit_teacher","ครูผู้เยี่ยมบ้าน/สำรวจข้อมูล")}</div></div>`}
function homeVisitStep6(r){return `<div class="hv-step-card"><section class="project-detail-hero"><div>${homeVisitStatusPill(r)}<h2>${escapeHtml(r.student_first_name)} ${escapeHtml(r.student_last_name)}</h2><p>${escapeHtml(r.class_label)} · ครูประจำชั้น ${escapeHtml(r.homeroom_teacher_name||"—")} · ผู้บันทึก ${escapeHtml(r.recorder_name)}</p></div></section><div class="detail-grid" style="margin-top:14px">${planField("เลขประชาชน/รหัส G",r.student_citizen_or_g||"—")}${planField("สมาชิกครัวเรือน",`${homeVisitMembersFor(r.id).length} คน`)}${planField("รูปภาพ",`${homeVisitPhotosFor(r.id).length} รูป`)}${planField("ลายเซ็นในระบบ",`${homeVisitSignaturesFor(r.id).length} รายการ`)}</div><div class="admin-actions hv-final-actions"><button class="btn btn-secondary" data-export-home-visit="${r.id}">▤ Preview / Export PDF รายบุคคล</button><button class="btn ${r.status==="complete"?"btn-secondary":"btn-primary"}" id="toggle-home-visit-complete">${r.status==="complete"?"กลับเป็นฉบับร่าง":"ทำเครื่องหมายข้อมูลครบแล้ว"}</button></div></div>`}
function homeVisitRecordHtml(r){return `<section class="home-visit-record"><div class="personnel-detail-top"><div><button class="type-back-link" id="home-visit-back">← กลับรายชื่อ</button><span class="eyebrow dark">${escapeHtml(r.class_label)} · ${escapeHtml(r.student_first_name)} ${escapeHtml(r.student_last_name)}</span></div><div class="personnel-detail-actions"><button class="btn btn-secondary" data-export-home-visit="${r.id}">PDF รายบุคคล</button>${((r.status==="draft"&&(r.recorder_id===state.user.id||r.homeroom_teacher_id===state.user.id||canManageAllHomeVisits()))||isSuperAdminUser())?`<button class="btn btn-danger" id="delete-home-visit-record">ลบข้อมูลเยี่ยมบ้าน</button>`:""}</div></div><div class="hv-step-tabs">${HOME_VISIT_STEPS.map((s,i)=>`<button class="hv-step-tab ${state.homeVisitStep===i+1?"active":""}" data-hv-step="${i+1}"><span>${i+1}</span>${escapeHtml(s)}</button>`).join("")}</div><form id="home-visit-form">${state.homeVisitStep===1?homeVisitStep1(r):state.homeVisitStep===2?homeVisitStep2(r):state.homeVisitStep===3?homeVisitStep3(r):state.homeVisitStep===4?homeVisitStep4(r):state.homeVisitStep===5?homeVisitStep5(r):homeVisitStep6(r)}</form><div class="hv-step-nav"><button class="btn btn-ghost" id="hv-prev" ${state.homeVisitStep===1?"disabled":""}>← ก่อนหน้า</button><button class="btn btn-primary" id="hv-save-step" ${state.homeVisitStep===6?"disabled":""}>บันทึกขั้นตอนนี้</button><button class="btn btn-secondary" id="hv-next" ${state.homeVisitStep===6?"disabled":""}>ถัดไป →</button></div></section>`}
function homeVisitWorkspaceHtml(){const r=homeVisitRecord();return r?homeVisitRecordHtml(r):`${homeVisitListHtml()}`}
function homeVisitCreateModal(){const classes=homeVisitAllowedClasses();if(!classes.length)return toast("ยังไม่มีชั้นเรียนที่รับผิดชอบ","ต้องกำหนดครูประจำชั้นหรือใช้บัญชีหัวหน้าบริหารทั่วไปก่อน","error");const m=document.createElement("div");m.className="modal-backdrop";m.innerHTML=`<div class="modal"><div class="modal-head"><div><h3>เพิ่มนักเรียนสำหรับเยี่ยมบ้าน</h3><p>สร้างแบบข้อมูลใหม่แยกตามปีการศึกษา/ภาคเรียน</p></div><button class="modal-close">×</button></div><form id="hv-create" class="form-grid"><div class="field"><label>ชั้น / ห้อง</label><select class="select" name="class_id">${classes.map(c=>`<option value="${c.id}" ${c.id===state.homeVisitClassId?"selected":""}>${escapeHtml(schoolClassLabel(c))}</option>`).join("")}</select></div><div class="form-row"><div class="field"><label>ชื่อนักเรียน</label><input class="input" name="first_name" required></div><div class="field"><label>นามสกุล</label><input class="input" name="last_name" required></div></div><div class="field"><label>เลขประจำตัวประชาชน / เลขรหัส G</label><input class="input" name="citizen"></div></form><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="hv-create-save">สร้างแบบฟอร์ม</button></div></div>`;document.body.appendChild(m);const close=()=>m.remove();m.querySelector(".modal-close").onclick=close;m.querySelector(".modal-cancel").onclick=close;m.querySelector("#hv-create-save").onclick=async e=>{const f=m.querySelector("#hv-create");if(!f.reportValidity())return;const d=new FormData(f);buttonLoading(e.target,true,"กำลังสร้าง...");const {data,error}=await supabase.from("home_visit_records").insert({class_id:d.get("class_id"),student_first_name:String(d.get("first_name")).trim(),student_last_name:String(d.get("last_name")).trim(),student_citizen_or_g:String(d.get("citizen")||"").trim()||null,academic_year:"0",semester:1,class_label:"-",recorder_id:state.user.id,recorder_name:state.profile.full_name||state.profile.email,form_data:{}}).select().single();buttonLoading(e.target,false);if(error)return toast("สร้างแบบฟอร์มไม่สำเร็จ",error.message,"error");close();state.selectedHomeVisitId=data.id;state.homeVisitStep=1;await renderDashboard();};}
function formValuesObject(form){const obj={};const fd=new FormData(form);for(const [k,v] of fd.entries()){if(obj[k]!==undefined){if(!Array.isArray(obj[k]))obj[k]=[obj[k]];obj[k].push(v)}else obj[k]=v}return obj}
async function saveHomeVisitStep(r){
  if(state.homeVisitStep===2)return saveHouseholdMembers(r);
  if([5,6].includes(state.homeVisitStep))return true;

  let photoCount=0;
  if(state.homeVisitStep===4){
    const photoResult=await savePendingHomeVisitPhotos(r);
    if(!photoResult.ok)return false;
    photoCount=photoResult.count;
  }

  const values=formValuesObject(document.querySelector("#home-visit-form"));
  const f={...(r.form_data||{})};
  for(const [k,v] of Object.entries(values))f[k]=v;
  for(const name of ["flags","dependency","floor_material","wall_material","roof_material","water_source","electric_source","vehicles","household_goods"]){
    const els=[...document.querySelectorAll(`[name="${name}"]:checked`)];
    if(els.length||document.querySelector(`[name="${name}"]`))f[name]=els.map(x=>x.value);
  }
  const {error}=await supabase.from("home_visit_records").update({form_data:f}).eq("id",r.id);
  if(error){toast("บันทึกไม่สำเร็จ",error.message,"error");return false}
  toast("บันทึกแล้ว",photoCount?`บันทึกข้อมูลพร้อมรูปภาพ ${photoCount} รูปแล้ว`:"ข้อมูลขั้นตอนนี้ถูกเก็บเป็นแบบร่างแล้ว","success");
  await loadHomeVisitWorkspace();
  return true;
}
async function saveHouseholdMembers(r){const rows=[...document.querySelectorAll("#hv-members-body tr")],payload=[];for(let i=0;i<rows.length;i++){const row=rows[i],get=k=>row.querySelector(`[data-m="${k}"]`),name=get("full_name")?.value.trim();if(!name)continue;payload.push({record_id:r.id,member_no:i+1,full_name:name,relationship:get("relationship").value.trim()||null,citizen_id:get("citizen_id").value.trim()||null,education_level:get("education_level").value.trim()||null,age:get("age").value?Number(get("age").value):null,has_disability:get("has_disability").checked,has_chronic_disease:get("has_chronic_disease").checked,income_wage:Number(get("income_wage").value||0),income_agriculture:Number(get("income_agriculture").value||0),income_business:Number(get("income_business").value||0),income_welfare:Number(get("income_welfare").value||0),income_other:Number(get("income_other").value||0)})}const del=await supabase.from("home_visit_household_members").delete().eq("record_id",r.id);if(del.error)return toast("บันทึกสมาชิกไม่สำเร็จ",del.error.message,"error"),false;if(payload.length){const ins=await supabase.from("home_visit_household_members").insert(payload);if(ins.error)return toast("บันทึกสมาชิกไม่สำเร็จ",ins.error.message,"error"),false}toast("บันทึกสมาชิกครัวเรือนแล้ว",`${payload.length} คน`,"success");await loadHomeVisitWorkspace();return true}
function showHomeVisitLocalPhotoPreview(kind,file){
  const img=document.querySelector(`[data-hv-photo-img="${kind}"]`);
  const placeholder=document.querySelector(`[data-hv-photo-placeholder="${kind}"]`);
  if(!img||!file)return;
  const url=URL.createObjectURL(file);
  img.src=url;
  img.hidden=false;
  img.onload=()=>URL.revokeObjectURL(url);
  if(placeholder)placeholder.hidden=true;
}

async function hydrateHomeVisitPhotoPreviews(){
  const r=homeVisitRecord();
  if(!r)return;
  for(const photo of homeVisitPhotosFor(r.id)){
    const img=document.querySelector(`[data-hv-photo-img="${photo.kind}"]`);
    const placeholder=document.querySelector(`[data-hv-photo-placeholder="${photo.kind}"]`);
    if(!img)continue;
    const {data,error}=await supabase.storage.from(photo.bucket_id||"home-visits").createSignedUrl(photo.storage_path,3600);
    if(error||!data?.signedUrl){
      if(placeholder){placeholder.hidden=false;placeholder.textContent="โหลดรูปที่บันทึกไว้ไม่สำเร็จ";}
      continue;
    }
    img.src=data.signedUrl;
    img.hidden=false;
    if(placeholder)placeholder.hidden=true;
  }
}

async function persistHomeVisitPhoto(r,kind,file,{silent=false}={}){
  if(!file){
    if(!silent)toast("กรุณาเลือกรูปภาพ","PNG, JPG หรือ WebP ไม่เกิน 8 MB","error");
    return false;
  }
  if(file.size>8*1024*1024){
    if(!silent)toast("ไฟล์ใหญ่เกินไป","รูปต้องไม่เกิน 8 MB","error");
    return false;
  }
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)){
    if(!silent)toast("ชนิดไฟล์ไม่รองรับ","รองรับเฉพาะ PNG, JPG และ WebP","error");
    return false;
  }
  const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
  const path=`${r.id}/photos/${kind}-${crypto.randomUUID()}.${ext}`;
  const old=homeVisitPhotosFor(r.id).find(x=>x.kind===kind);
  const up=await supabase.storage.from("home-visits").upload(path,file,{contentType:file.type,upsert:false});
  if(up.error){
    if(!silent)toast("อัปโหลดรูปไม่สำเร็จ",up.error.message,"error");
    return false;
  }

  let dbError=null;
  if(old){
    const res=await supabase.from("home_visit_photos")
      .update({storage_path:path,bucket_id:"home-visits",uploaded_by:state.user.id})
      .eq("id",old.id);
    dbError=res.error;
  }else{
    const res=await supabase.from("home_visit_photos")
      .insert({record_id:r.id,kind,storage_path:path,bucket_id:"home-visits",uploaded_by:state.user.id});
    dbError=res.error;
  }

  if(dbError){
    await supabase.storage.from("home-visits").remove([path]);
    if(!silent)toast("บันทึกรูปไม่สำเร็จ",dbError.message,"error");
    return false;
  }

  if(old?.storage_path && old.storage_path!==path){
    await supabase.storage.from(old.bucket_id||"home-visits").remove([old.storage_path]);
  }
  return true;
}

async function uploadHomeVisitPhoto(r,kind){
  const input=document.querySelector(`[data-hv-photo-file="${kind}"]`);
  const file=input?.files?.[0];
  const ok=await persistHomeVisitPhoto(r,kind,file);
  if(!ok)return;
  toast("อัปโหลดรูปแล้ว","รูปถูกบันทึกแล้วและจะใช้ใน PDF อัตโนมัติ","success");
  await loadHomeVisitWorkspace();
  renderDashboard();
}

async function savePendingHomeVisitPhotos(r){
  const pending=[...document.querySelectorAll("[data-hv-photo-file]")]
    .map(input=>({kind:input.dataset.hvPhotoFile,file:input.files?.[0]}))
    .filter(x=>x.file);
  if(!pending.length)return {ok:true,count:0};
  let count=0;
  for(const item of pending){
    const ok=await persistHomeVisitPhoto(r,item.kind,item.file,{silent:true});
    if(!ok){
      toast("บันทึกรูปภาพไม่สำเร็จ",`ไม่สามารถบันทึกรูป ${item.kind} ได้ กรุณาลองเลือกไฟล์ใหม่อีกครั้ง`,"error");
      return {ok:false,count};
    }
    count++;
  }
  return {ok:true,count};
}
function homeVisitSignatureModal(r,type){const label={student:"นักเรียน",guardian:"ผู้ปกครอง",state_officer:"เจ้าหน้าที่ของรัฐ",director:"ผู้อำนวยการสถานศึกษา",home_visit_teacher:"ครูผู้เยี่ยมบ้าน/สำรวจข้อมูล"}[type]||type,name=document.querySelector(`[data-hv-signer-name="${type}"]`)?.value.trim()||"",method=document.querySelector(`[data-hv-sign-method="${type}"]`)?.value||"blank";if(method==="blank")return toast("เลือกเว้นลายเซ็นไว้แล้ว","PDF จะมีเส้นว่างสำหรับเซ็นบนกระดาษ","success");if(method==="stored"){const sig=state.signatures.find(s=>s.is_default)||state.signatures[0];if(!sig)return toast("ยังไม่มีลายเซ็นที่บันทึกไว้","สร้างลายเซ็นของฉันก่อน หรือเลือกวิธีอื่น","error");return saveHomeVisitSignature(r,type,name,label,"stored",{signature_id:sig.id})}const m=document.createElement("div");m.className="modal-backdrop";m.innerHTML=`<div class="modal"><div class="modal-head"><div><h3>${method==="drawn"?"เซ็นสด":"อัปโหลดลายเซ็น"} · ${escapeHtml(label)}</h3></div><button class="modal-close">×</button></div>${method==="drawn"?`<div class="signature-canvas-wrap"><canvas id="signature-canvas" width="900" height="300"></canvas></div><div class="signature-canvas-actions"><span>ใช้เมาส์ นิ้ว หรือปากกาเซ็น</span><button class="btn btn-ghost" id="signature-clear" type="button">ล้าง</button></div>`:`<div class="field"><label>รูปลายเซ็น</label><input class="input" id="hv-sign-file" type="file" accept="image/png,image/jpeg,image/webp"></div>`}<div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="hv-sign-save">บันทึกลายเซ็น</button></div></div>`;document.body.appendChild(m);const close=()=>m.remove();m.querySelector(".modal-close").onclick=close;m.querySelector(".modal-cancel").onclick=close;if(method==="drawn")setupSignatureCanvas(m);m.querySelector("#hv-sign-save").onclick=async()=>{let blob,mime,ext;if(method==="drawn"){if(!m._signatureHasInk?.())return toast("ยังไม่มีลายเซ็น","กรุณาเซ็นก่อนบันทึก","error");blob=await canvasBlob(m.querySelector("#signature-canvas"));mime="image/png";ext="png"}else{blob=m.querySelector("#hv-sign-file").files[0];if(!blob)return toast("กรุณาเลือกไฟล์","","error");mime=blob.type;ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg"}const path=`${r.id}/signatures/${type}-${crypto.randomUUID()}.${ext}`,up=await supabase.storage.from("home-visits").upload(path,blob,{contentType:mime});if(up.error)return toast("อัปโหลดลายเซ็นไม่สำเร็จ",up.error.message,"error");await saveHomeVisitSignature(r,type,name,label,method,{bucket_id:"home-visits",storage_path:path});close();await renderDashboard()}}
async function saveHomeVisitSignature(r,type,name,label,method,extra={}){const old=homeVisitSignaturesFor(r.id).find(x=>x.signer_type===type);if(old)await supabase.from("home_visit_signatures").delete().eq("id",old.id);const {error}=await supabase.from("home_visit_signatures").insert({record_id:r.id,signer_type:type,signer_name:name||null,signer_position:label,method,...extra});if(error)return toast("บันทึกลายเซ็นไม่สำเร็จ",error.message,"error");toast("บันทึกลายเซ็นแล้ว",label,"success")}
async function homeVisitAssetData(path,bucket="home-visits"){if(!path)return null;const {data,error}=await supabase.storage.from(bucket).download(path);if(error)return null;return await new Promise(resolve=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.readAsDataURL(data)})}
async function homeVisitRecordAssets(r){
  const photos=homeVisitPhotosFor(r.id),sigs=homeVisitSignaturesFor(r.id),photoData={},sigData={};
  for(const p of photos){
    photoData[p.kind]=await homeVisitAssetData(p.storage_path,p.bucket_id||"home-visits");
  }
  for(const s of sigs){
    if(s.method==="stored"&&s.signature_id){
      const master=state.signatures.find(x=>x.id===s.signature_id);
      if(master)sigData[s.signer_type]=await homeVisitAssetData(master.storage_path,master.bucket_id||"signatures");
    }else if(s.storage_path){
      sigData[s.signer_type]=await homeVisitAssetData(s.storage_path,s.bucket_id||"home-visits");
    }
  }
  return {photos:photoData,sigs:sigData};
}
function yes(v){return v?"✓":"□"}
function hvPdfHeader(r,logo,title="แบบบันทึกการเยี่ยมบ้านนักเรียน"){return `<header class="hv-pdf-head">${logo?`<img src="${logo}" class="a4-school-logo">`:""}<h1>${escapeHtml(schoolName())}</h1><p>${escapeHtml(schoolAddress())}</p><p>${escapeHtml(educationOffice())}</p><h2>${escapeHtml(title)}</h2><p>ปีการศึกษา ${escapeHtml(r.academic_year)} ภาคเรียนที่ ${r.semester}</p><p>${escapeHtml(r.class_label)} · ครูประจำชั้น ${escapeHtml(r.homeroom_teacher_name||"—")} · ผู้บันทึก ${escapeHtml(r.recorder_name)}</p></header>`}
function hvKeyList(obj,keys){return keys.map(([k,l])=>`<div><strong>${escapeHtml(l)}</strong><span>${escapeHtml(obj?.[k]||"—")}</span></div>`).join("")}
function buildHomeVisitPdfPages(r,assets,logo){const f=r.form_data||{},members=homeVisitMembersFor(r.id),sigs=homeVisitSignaturesFor(r.id),totalIncome=members.reduce((s,m)=>s+Number(m.total_income??(Number(m.income_wage||0)+Number(m.income_agriculture||0)+Number(m.income_business||0)+Number(m.income_welfare||0)+Number(m.income_other||0))),0),avg=members.length?totalIncome/members.length:0;const page=(body,n)=>`<article class="a4-document hv-pdf-page"><div class="a4-document-inner">${hvPdfHeader(r,logo)}${body}<div class="hv-page-no">หน้า ${n}</div></div></article>`;const p1=`<section class="hv-pdf-section"><h3>1. ข้อมูลนักเรียน</h3><div class="hv-info-grid">${hvKeyList({name:`${r.student_first_name} ${r.student_last_name}`,id:r.student_citizen_or_g,...f},[["name","ชื่อนักเรียน"],["id","เลขประชาชน/รหัส G"],["student_age","อายุ"],["family_status","สถานภาพครอบครัว"],["lives_with","อาศัยอยู่กับ"],["guardian_name","ผู้ปกครอง"],["guardian_relationship","ความสัมพันธ์"],["guardian_phone","โทรศัพท์"],["guardian_occupation","อาชีพผู้ปกครอง"],["guardian_education","การศึกษาผู้ปกครอง"]])}<div class="hv-student-photo">${assets.photos.student?`<img src="${assets.photos.student}">`:`<span>รูปถ่ายนักเรียน</span>`}</div></div></section><section class="hv-pdf-section"><h3>2. สมาชิกในครัวเรือน</h3><table class="hv-pdf-table tiny"><thead><tr><th>#</th><th>ชื่อ-นามสกุล</th><th>ความสัมพันธ์</th><th>เลขประชาชน</th><th>การศึกษา</th><th>อายุ</th><th>พิการ</th><th>โรคเรื้อรัง</th><th>ค่าจ้าง</th><th>เกษตร</th><th>ธุรกิจ</th><th>สวัสดิการ</th><th>อื่น ๆ</th><th>รวม</th></tr></thead><tbody>${members.map(m=>`<tr><td>${m.member_no}</td><td>${escapeHtml(m.full_name)}</td><td>${escapeHtml(m.relationship||"")}</td><td>${escapeHtml(m.citizen_id||"")}</td><td>${escapeHtml(m.education_level||"")}</td><td>${m.age??""}</td><td>${yes(m.has_disability)}</td><td>${yes(m.has_chronic_disease)}</td><td>${money(m.income_wage)}</td><td>${money(m.income_agriculture)}</td><td>${money(m.income_business)}</td><td>${money(m.income_welfare)}</td><td>${money(m.income_other)}</td><td>${money(m.total_income)}</td></tr>`).join("")}<tr><td colspan="13"><strong>รวมรายได้ครัวเรือน</strong></td><td><strong>${money(totalIncome)}</strong></td></tr><tr><td colspan="13"><strong>รายได้เฉลี่ยต่อคน</strong></td><td><strong>${money(avg)}</strong></td></tr></tbody></table></section>`;const list=(label,arr)=>`<div class="hv-pdf-item"><strong>${label}</strong><span>${escapeHtml(Array.isArray(arr)?arr.join(" / "):(arr||"—"))}</span></div>`;const p2=`<section class="hv-pdf-section"><h3>3. ข้อมูลสถานะของครัวเรือน / ลักษณะที่อยู่อาศัย</h3><div class="hv-info-grid two">${list("ภาระพึ่งพิง",f.dependency)}${list("การอยู่อาศัย",f.housing_type)}${list("ค่าเช่า",f.rent_amount?`${f.rent_amount} บาท/เดือน`:"—")}${list("วัสดุพื้น",f.floor_material)}${list("วัสดุฝา",f.wall_material)}${list("วัสดุหลังคา",f.roof_material)}${list("ห้องส้วม",f.toilet)}${list("ที่ดินเกษตร",f.agri_land)}${list("แหล่งน้ำดื่ม",f.water_source)}${list("แหล่งไฟฟ้า",f.electric_source)}${list("ยานพาหนะ",f.vehicles)}${list("ของใช้ในครัวเรือน",f.household_goods)}</div></section><section class="hv-pdf-section"><h3>4. ข้อมูลทั่วไปของสถาบัน (ถ้ามี)</h3><div class="hv-long-box">${escapeHtml(f.institution_info||"ไม่ใช่ครัวเรือนสถาบัน / ไม่ได้ระบุ")}</div></section><section class="hv-pdf-section"><h3>5-6. การเดินทางและที่ตั้งที่พักอาศัย</h3><div class="hv-info-grid two">${list("วิธีเดินทางหลัก",f.travel_mode)}${list("ระยะทางไป-กลับ",f.travel_distance_km?`${f.travel_distance_km} กม.`:"—")}${list("เวลาไป-กลับ",f.travel_time)}${list("ค่าเดินทาง/เดือน",f.travel_cost_month?`${f.travel_cost_month} บาท`:"—")}${list("ได้เงินมาโรงเรียน/วัน",f.school_money_day?`${f.school_money_day} บาท`:"—")}${list("ที่อยู่",`${f.house_no||""} หมู่ ${f.village_no||""} ${f.soi||""} ${f.road||""} ${f.subdistrict||""} ${f.district||""} ${f.province||""} ${f.postal_code||""}`)}</div></section>`;const p3=`<section class="hv-pdf-section"><h3>7. ภาพถ่ายที่พักอาศัยของนักเรียน</h3><div class="hv-home-photos"><div>${assets.photos.exterior?`<img src="${assets.photos.exterior}">`:`<span>รูปที่ 1 ภายนอกที่พักอาศัย</span>`}<strong>รูปที่ 1 ภายนอกที่พักอาศัย</strong></div><div>${assets.photos.interior?`<img src="${assets.photos.interior}">`:`<span>รูปที่ 2 ภายในที่พักอาศัย</span>`}<strong>รูปที่ 2 ภายในที่พักอาศัย</strong></div></div><p>ที่มาภาพ: ${escapeHtml(f.photo_source||"—")} ${f.photo_alternative_reason?`· เหตุผลภาพทดแทน: ${escapeHtml(f.photo_alternative_reason)}`:""}</p></section><section class="hv-pdf-section"><h3>8-10. การรับรองข้อมูลและลายเซ็น</h3><p>ขอรับรองว่าข้อมูลที่บันทึกเป็นข้อมูลที่ถูกต้องตามความเป็นจริง และรับทราบการเก็บ ใช้ เปิดเผยข้อมูลส่วนบุคคลตามวัตถุประสงค์ของแบบฟอร์ม</p><div class="hv-signature-pdf-grid">${[["student","นักเรียน"],["guardian","ผู้ปกครอง"],["state_officer","เจ้าหน้าที่ของรัฐ"],["director","ผู้อำนวยการสถานศึกษา"],["home_visit_teacher","ครูผู้เยี่ยมบ้าน/สำรวจข้อมูล"]].map(([t,l])=>{const s=sigs.find(x=>x.signer_type===t),img=assets.sigs[t];return `<div class="hv-pdf-sign"><div class="hv-sign-image">${img?`<img src="${img}">`:""}</div><div>ลงชื่อ................................................</div><span>(${escapeHtml(s?.signer_name||"................................................")})</span><strong>${escapeHtml(s?.signer_position||l)}</strong></div>`}).join("")}</div><div class="hv-recorder-box">ผู้บันทึกข้อมูล: <strong>${escapeHtml(r.recorder_name)}</strong> · วันที่พิมพ์เอกสาร ${new Date().toLocaleDateString("th-TH")}</div></section>`;return[page(p1,1),page(p2,2),page(p3,3)]}
function homeVisitPdfStyles(){return `${a4DocumentStyles()} @page{size:A4 landscape;margin:7mm}.a4-document{width:277mm;min-height:190mm;padding:0;box-shadow:none}.a4-document-inner{padding:4mm 7mm}.hv-pdf-page{break-after:page;page-break-after:always;position:relative}.hv-pdf-head{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;border-bottom:1px solid #222;padding-bottom:2mm;margin-bottom:2mm;line-height:1.08}.hv-pdf-head .a4-school-logo{display:block;height:17mm;max-width:24mm;object-fit:contain;margin:0 auto 1.2mm}.hv-pdf-head h1,.hv-pdf-head h2,.hv-pdf-head p{font-size:16pt!important;font-weight:400;margin:.35mm 0;line-height:1.08}.hv-pdf-head h1,.hv-pdf-head h2{font-weight:700}.hv-pdf-section{margin-bottom:2mm}.hv-pdf-section h3{font-size:11.5pt;margin:0 0 1.5mm;border-bottom:1px solid #777;padding-bottom:.5mm}.hv-info-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) 30mm;gap:1.2mm 4mm;font-size:9.5pt;position:relative}.hv-info-grid.two{grid-template-columns:1fr 1fr}.hv-info-grid>div,.hv-pdf-item{display:flex;gap:2mm;border-bottom:1px dotted #aaa;padding:1mm 0}.hv-info-grid strong,.hv-pdf-item strong{min-width:27mm}.hv-info-grid span,.hv-pdf-item span{flex:1}.hv-student-photo{grid-column:4;grid-row:1/span 5;width:28mm;height:36mm;border:1px solid #555;display:flex;align-items:center;justify-content:center;justify-self:end;align-self:start;padding:1mm;box-sizing:border-box}.hv-student-photo img{width:100%;height:100%;object-fit:cover}.hv-student-photo span{font-size:8.5pt;color:#666;text-align:center}.hv-pdf-table{width:100%;border-collapse:collapse;table-layout:fixed}.hv-pdf-table th,.hv-pdf-table td{border:1px solid #333;padding:.6mm;font-size:7.3pt;text-align:center;vertical-align:middle}.hv-pdf-table.tiny th,.hv-pdf-table.tiny td{font-size:6.8pt}.hv-long-box{border:1px solid #777;padding:2mm;min-height:18mm;font-size:9pt}.hv-home-photos{display:grid;grid-template-columns:1fr 1fr;gap:6mm}.hv-home-photos>div{height:75mm;border:1px solid #555;display:flex;flex-direction:column;align-items:center;justify-content:center}.hv-home-photos img{width:100%;height:65mm;object-fit:contain}.hv-home-photos strong{font-size:9pt}.hv-signature-pdf-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4mm;margin-top:3mm}.hv-pdf-sign{text-align:center;font-size:9pt}.hv-sign-image{height:17mm}.hv-sign-image img{max-width:100%;max-height:16mm;object-fit:contain}.hv-pdf-sign span,.hv-pdf-sign strong{display:block}.hv-recorder-box{margin-top:3mm;text-align:right;font-size:9pt}.hv-page-no{position:absolute;right:7mm;bottom:3mm;font-size:8pt;color:#666}`;}
async function homeVisitPdfPreview(records){const list=Array.isArray(records)?records:[records],valid=list.filter(Boolean);if(!valid.length)return;const logo=await schoolLogoDataUrl(),pages=[];for(const r of valid){const assets=await homeVisitRecordAssets(r);pages.push(...buildHomeVisitPdfPages(r,assets,logo))}const body=`<div class="hv-batch-doc">${pages.join("")}</div>`,title=valid.length>1?`แบบเยี่ยมบ้านรวม ${valid[0].class_label} (${valid.length} คน)`:`แบบเยี่ยมบ้าน ${valid[0].student_first_name} ${valid[0].student_last_name}`,m=document.createElement("div");m.className="modal-backdrop a4-preview-backdrop";m.innerHTML=`<div class="a4-preview-shell"><div class="a4-preview-toolbar"><div><strong>${escapeHtml(title)}</strong><span>A4 แนวนอน · ${pages.length} หน้า · รวมอยู่ใน PDF เดียว</span></div><div class="a4-preview-actions"><button class="btn btn-ghost" id="hv-pdf-close">ปิด</button><button class="btn btn-primary" id="hv-pdf-print">พิมพ์ / บันทึก PDF</button></div></div><div class="a4-preview-scroll"><style>${homeVisitPdfStyles()}</style>${body}</div></div>`;document.body.appendChild(m);m.querySelector("#hv-pdf-close").onclick=()=>m.remove();m.querySelector("#hv-pdf-print").onclick=()=>{const w=window.open("","_blank");if(!w)return toast("เปิดหน้าพิมพ์ไม่ได้","กรุณาอนุญาต Pop-up","error");w.document.write(`<!doctype html><html lang="th"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>${homeVisitPdfStyles()}</style></head><body class="a4-print-body">${body}<script>window.addEventListener('load',()=>{(document.fonts?document.fonts.ready:Promise.resolve()).finally(()=>setTimeout(()=>window.print(),500));});<\/script></body></html>`);w.document.close()}}
function moduleView(code) {
  const module = state.modules.find(m => m.code === code);
  if (!module) return `<div class="empty"><strong>ไม่พบระบบย่อย</strong></div>`;
  if (code === "lesson_plans") return lessonWorkspaceHtml(module);
  if (code === "personnel_records") return personnelWorkspaceHtml(module);
  if (code === "leave_management") return leaveWorkspaceHtml(module);
  if (code === "timetable_management") return timetableWorkspaceHtml(module);
  if (code === "substitute_teaching") return substituteWorkspaceHtml(module);
  if (code === "project_management") return projectWorkspaceHtml(module);
  if (code === "home_visit_management") return homeVisitWorkspaceHtml(module);
  return `<section class="panel"><div class="empty"><strong>${escapeHtml(module.name_th)}</strong><span>Module นี้ยังไม่มีหน้าทำงานเฉพาะ</span></div></section>`;
}

function lessonPlanModal(plan = null, requestedType = null) {
  const p = plan || {};
  const type = plan?.plan_type || requestedType || state.lessonPlanMode || "weekly";
  const semesterPlan = type === "semester";
  const existingFiles = plan && state.lessonDetail?.plan?.id === plan.id ? (state.lessonDetail.files || []) : [];
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.dataset.attachmentMethod = "pdf";

  const weeklyFields = `
      <div class="form-row"><div class="field"><label>สัปดาห์ที่</label><input class="input" name="week_number" type="number" min="1" value="${escapeHtml(p.week_number || "")}"></div><div class="field"><label>วันที่ใช้สอน</label><input class="input" name="teach_date" type="date" required value="${escapeHtml(p.teach_date || "")}"></div></div>
      <div class="field"><label>หน่วยการเรียนรู้</label><input class="input" name="learning_unit" value="${escapeHtml(p.learning_unit || "")}"></div>
      <div class="field"><label>เรื่องที่สอน</label><input class="input" name="topic" required value="${escapeHtml(p.topic || "")}"></div>
      <div class="field"><label>จุดประสงค์การเรียนรู้</label><textarea class="input textarea" name="learning_objectives" required>${escapeHtml(p.learning_objectives || "")}</textarea></div>
      <div class="field"><label>สาระ/เนื้อหาสำคัญ</label><textarea class="input textarea" name="content_summary">${escapeHtml(p.content_summary || "")}</textarea></div>
      <div class="field"><label>กิจกรรมการเรียนรู้</label><textarea class="input textarea" name="activities">${escapeHtml(p.activities || "")}</textarea></div>
      <div class="field"><label>การวัดและประเมินผล</label><textarea class="input textarea" name="assessment">${escapeHtml(p.assessment || "")}</textarea></div>`;

  const existingAttachments = existingFiles.length
    ? `<div class="attached-files-summary"><div class="attached-files-title"><strong>✓ แนบอยู่แล้ว ${existingFiles.length} รายการ</strong><span>เอกสารเหล่านี้ถูกบันทึกในระบบแล้ว</span></div>${existingFiles.map(f => {
        const drive = f.attachment_type === "google_drive";
        return `<div class="attached-file-chip ${drive ? "drive" : ""}"><span>${drive ? "DRIVE" : "PDF"}</span><strong>${escapeHtml(f.file_name)}</strong><small>${drive ? "Google Drive Link" : (f.file_size ? `${(f.file_size/1024/1024).toFixed(2)} MB` : "PDF")}</small></div>`;
      }).join("")}</div>`
    : `<div class="no-file-yet">ยังไม่มีเอกสารแนบในแผนนี้</div>`;

  modal.innerHTML = `<div class="modal modal-wide"><div class="modal-head"><div><span class="form-type-badge">${escapeHtml(lessonPlanTypeLabel(type))}</span><h3>${plan ? `แก้ไข${lessonPlanTypeLabel(type)}` : `สร้าง${lessonPlanTypeLabel(type)}ใหม่`}</h3><p>${semesterPlan ? "กรอกข้อมูลรายวิชา แล้วเลือกแนบ PDF หรือ Google Drive สำหรับแผนทั้งภาคเรียน" : "บันทึกเป็นฉบับร่างก่อนส่งเข้าสู่ Workflow ได้"}</p></div><button class="modal-close">×</button></div>
    <form id="lesson-form" class="form-grid" data-plan-type="${type}">
      <div class="form-row"><div class="field"><label>ปีการศึกษา</label><input class="input" name="academic_year" required value="${escapeHtml(p.academic_year || "2569")}"></div><div class="field"><label>ภาคเรียน</label><select class="select" name="semester"><option value="1" ${p.semester==1?'selected':''}>1</option><option value="2" ${p.semester==2?'selected':''}>2</option><option value="3" ${p.semester==3?'selected':''}>3</option></select></div></div>
      <div class="form-row"><div class="field"><label>รหัสวิชา</label><input class="input" name="subject_code" ${semesterPlan ? "required" : ""} value="${escapeHtml(p.subject_code || "")}"></div><div class="field"><label>ชื่อวิชา</label><input class="input" name="subject_name" required value="${escapeHtml(p.subject_name || "")}"></div></div>
      <div class="field"><label>ชั้น/ระดับที่สอน</label><input class="input" name="class_level" ${semesterPlan ? "required" : ""} value="${escapeHtml(p.class_level || "")}" placeholder="เช่น ม.2/1"></div>
      ${semesterPlan ? `<div class="semester-form-note"><strong>แผนรายภาคเรียน</strong><span>ไม่ต้องระบุสัปดาห์ วันที่สอน หน่วยการเรียนรู้ เรื่อง จุดประสงค์ เนื้อหา กิจกรรม หรือการวัดผล — รายละเอียดทั้งหมดให้อยู่ในเอกสารที่แนบ</span></div>` : weeklyFields}

      <div class="field attachment-field">
        <label>เอกสารแผนการสอน</label>
        ${existingAttachments}
        <div class="attachment-method-tabs">
          <button type="button" class="attachment-method active" data-attachment-method="pdf"><span>PDF</span><strong>อัปโหลด PDF</strong><small>เก็บใน Supabase</small></button>
          <button type="button" class="attachment-method" data-attachment-method="google_drive"><span>G</span><strong>Google Drive Link</strong><small>ประหยัด Storage</small></button>
        </div>

        <div id="attachment-pdf-pane" class="attachment-pane">
          <label class="upload-zone"><input id="lesson-pdfs" type="file" accept="application/pdf,.pdf" multiple><strong>＋ เลือก PDF เพิ่ม</strong><span>รองรับหลายไฟล์ ไฟล์ละไม่เกิน 20 MB</span></label>
          <div id="selected-pdf-preview" class="selected-file-preview"><span>ยังไม่ได้เลือกไฟล์ใหม่</span></div>
        </div>

        <div id="attachment-drive-pane" class="attachment-pane hidden">
          <div class="drive-link-box">
            <div class="field"><label>ลิงก์ Google Drive</label><input class="input" id="drive-url" type="url" inputmode="url" placeholder="https://drive.google.com/file/d/..."></div>
            <div class="field"><label>ชื่อเอกสาร <span class="optional">(ไม่บังคับ)</span></label><input class="input" id="drive-label" maxlength="160" placeholder="เช่น แผนการสอนรายภาคเรียน วิชาคณิตศาสตร์"></div>
            <div class="drive-permission-warning"><strong>สำคัญ: ตรวจสิทธิ์การแชร์ก่อนส่ง</strong><span>ตั้งค่า Google Drive ให้หัวหน้ากลุ่มงานและผู้บริหารเปิดดูได้ เช่น “Anyone with the link can view” หรือแชร์ให้บัญชีโรงเรียนโดยตรง</span></div>
          </div>
        </div>
      </div>
    </form>
    <div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-secondary" id="save-draft">บันทึกฉบับร่าง</button><button class="btn btn-primary" id="save-submit">บันทึกและส่งตรวจ</button></div></div>`;

  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close").addEventListener("click", close);
  modal.querySelector(".modal-cancel").addEventListener("click", close);
  modal.addEventListener("click", e => { if (e.target === modal) close(); });

  modal.querySelectorAll("[data-attachment-method]").forEach(btn => btn.addEventListener("click", () => {
    const method = btn.dataset.attachmentMethod;
    modal.dataset.attachmentMethod = method;
    modal.querySelectorAll("[data-attachment-method]").forEach(x => x.classList.toggle("active", x === btn));
    modal.querySelector("#attachment-pdf-pane").classList.toggle("hidden", method !== "pdf");
    modal.querySelector("#attachment-drive-pane").classList.toggle("hidden", method !== "google_drive");
  }));

  modal.querySelector("#lesson-pdfs").addEventListener("change", e => {
    const files = [...e.currentTarget.files];
    const preview = modal.querySelector("#selected-pdf-preview");
    preview.innerHTML = files.length
      ? `<strong>เลือกเพิ่ม ${files.length} ไฟล์</strong>${files.map(f => `<div class="selected-file-row"><span>✓</span><span>${escapeHtml(f.name)}</span><small>${(f.size/1024/1024).toFixed(2)} MB</small></div>`).join("")}`
      : `<span>ยังไม่ได้เลือกไฟล์ใหม่</span>`;
  });

  modal.querySelector("#save-draft").addEventListener("click", e => saveLessonPlanFromModal(modal, plan, false, e.currentTarget));
  modal.querySelector("#save-submit").addEventListener("click", e => saveLessonPlanFromModal(modal, plan, true, e.currentTarget));
}

function normalizeGoogleDriveUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  let url;
  try { url = new URL(raw); } catch { return null; }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || !["drive.google.com", "docs.google.com"].includes(host)) return null;
  return url.toString();
}

async function saveLessonPlanFromModal(modal, existing, submitAfter, button) {
  const form = modal.querySelector("#lesson-form");
  if (!form.reportValidity()) return;
  const fd = new FormData(form);
  const type = form.dataset.planType || existing?.plan_type || "weekly";
  const semesterPlan = type === "semester";
  const attachmentMethod = modal.dataset.attachmentMethod || "pdf";
  const pdfs = attachmentMethod === "pdf" ? [...modal.querySelector("#lesson-pdfs").files] : [];
  const driveRaw = attachmentMethod === "google_drive" ? modal.querySelector("#drive-url").value : "";
  const driveUrl = driveRaw ? normalizeGoogleDriveUrl(driveRaw) : null;
  const driveLabel = String(modal.querySelector("#drive-label")?.value || "").trim();

  for (const file of pdfs) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return toast("ไฟล์ไม่ถูกต้อง", "อนุญาตเฉพาะ PDF", "error");
    if (file.size > 20 * 1024 * 1024) return toast("ไฟล์ใหญ่เกินไป", `${file.name} เกิน 20 MB`, "error");
  }

  if (driveRaw && !driveUrl) {
    return toast("ลิงก์ Google Drive ไม่ถูกต้อง", "กรุณาใช้ลิงก์ https://drive.google.com หรือ https://docs.google.com", "error");
  }

  const existingAttachmentCount =
    existing && state.lessonDetail?.plan?.id === existing.id
      ? (state.lessonDetail.files?.length || 0)
      : 0;

  const newAttachmentCount = pdfs.length + (driveUrl ? 1 : 0);
  if (submitAfter && existingAttachmentCount + newAttachmentCount === 0) {
    return toast("ยังส่งแผนไม่ได้", "กรุณาแนบ PDF หรือ Google Drive Link อย่างน้อย 1 รายการก่อนส่ง", "error");
  }

  const commonPayload = {
    academic_year: String(fd.get("academic_year")).trim(),
    semester: Number(fd.get("semester")),
    subject_code: String(fd.get("subject_code") || "").trim() || null,
    subject_name: String(fd.get("subject_name")).trim(),
    class_level: String(fd.get("class_level") || "").trim() || null,
  };

  const payload = semesterPlan
    ? {
        ...commonPayload,
        week_number: null,
        teach_date: null,
        learning_unit: null,
        topic: null,
        learning_objectives: null,
        content_summary: null,
        activities: null,
        assessment: null,
      }
    : {
        ...commonPayload,
        week_number: fd.get("week_number") ? Number(fd.get("week_number")) : null,
        teach_date: fd.get("teach_date") || null,
        learning_unit: String(fd.get("learning_unit") || "").trim() || null,
        topic: String(fd.get("topic") || "").trim() || null,
        learning_objectives: String(fd.get("learning_objectives") || "").trim() || null,
        content_summary: String(fd.get("content_summary") || "").trim() || null,
        activities: String(fd.get("activities") || "").trim() || null,
        assessment: String(fd.get("assessment") || "").trim() || null,
      };

  if (!existing) payload.plan_type = type;

  buttonLoading(button, true, submitAfter ? "กำลังบันทึกและส่ง..." : "กำลังบันทึก...");
  let plan;
  let result;
  if (existing) {
    result = await supabase.from("lesson_plans").update(payload).eq("id", existing.id).select().single();
  } else {
    result = await supabase.from("lesson_plans").insert(payload).select().single();
  }
  if (result.error) {
    buttonLoading(button, false);
    return toast("บันทึกไม่สำเร็จ", result.error.message, "error");
  }
  plan = result.data;

  try {
    for (const file of pdfs) await uploadLessonPdf(plan, file);
    if (driveUrl) await addGoogleDriveAttachment(plan, driveUrl, driveLabel);

    if (submitAfter) {
      const { error } = await supabase.rpc("submit_lesson_plan", { p_lesson_plan_id: plan.id });
      if (error) throw error;
    }
  } catch (error) {
    buttonLoading(button, false);
    toast("บันทึกข้อมูลแล้ว แต่ขั้นตอนต่อไม่สำเร็จ", error.message, "error");
    return;
  }

  buttonLoading(button, false);
  modal.remove();
  state.selectedLessonPlanId = plan.id;
  state.lessonPlanMode = type;
  toast(
    submitAfter ? "ส่งแผนแล้ว" : "บันทึกฉบับร่างแล้ว",
    submitAfter ? "ระบบแจ้งหัวหน้ากลุ่มงานแล้ว" : "คุณสามารถกลับมาแก้ไขและส่งภายหลังได้",
    "success"
  );
  await renderDashboard();
}

async function uploadLessonPdf(plan, file) {
  // Storage object keys use ASCII-only internal names.
  // The original Thai filename is kept in lesson_plan_files.file_name for display.
  const path = `${state.user.id}/${plan.id}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage.from("lesson-plans").upload(path, file, { contentType: "application/pdf", upsert: false });
  if (uploadError) throw uploadError;
  const { error: metaError } = await supabase.from("lesson_plan_files").insert({ lesson_plan_id: plan.id, uploaded_by: state.user.id, bucket_id: "lesson-plans", storage_path: path, file_name: file.name, mime_type: "application/pdf", file_size: file.size, attachment_type: "pdf", external_url: null });
  if (metaError) {
    await supabase.storage.from("lesson-plans").remove([path]);
    throw metaError;
  }
}

async function addGoogleDriveAttachment(plan, url, label) {
  const fileName = label || `Google Drive — ${plan.subject_name || "แผนการสอน"}`;
  const { error } = await supabase.from("lesson_plan_files").insert({
    lesson_plan_id: plan.id,
    uploaded_by: state.user.id,
    bucket_id: null,
    storage_path: null,
    file_name: fileName,
    mime_type: null,
    file_size: null,
    attachment_type: "google_drive",
    external_url: url,
  });
  if (error) throw error;
}

async function openPrivateFile(file) {
  if (file.attachment_type === "google_drive") {
    const url = normalizeGoogleDriveUrl(file.external_url);
    if (!url) return toast("เปิดลิงก์ไม่ได้", "ลิงก์ Google Drive ไม่ถูกต้อง", "error");
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const { data, error } = await supabase.storage.from(file.bucket_id || "lesson-plans").download(file.storage_path);
  if (error) return toast("เปิดไฟล์ไม่สำเร็จ", error.message, "error");
  const url = URL.createObjectURL(data);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function deleteLessonFile(file) {
  const label = file.attachment_type === "google_drive" ? "ลิงก์" : "ไฟล์";
  if (!window.confirm(`ลบ${label} ${file.file_name} ?`)) return;

  if (file.attachment_type !== "google_drive" && file.storage_path) {
    const { error: storageError } = await supabase.storage.from(file.bucket_id || "lesson-plans").remove([file.storage_path]);
    if (storageError) return toast("ลบไฟล์ไม่สำเร็จ", storageError.message, "error");
  }

  const { error } = await supabase.from("lesson_plan_files").delete().eq("id", file.id);
  if (error) return toast("ลบเอกสารแนบไม่สำเร็จ", error.message, "error");
  toast("ลบเอกสารแนบแล้ว", "", "success");
  await renderDashboard();
}

async function deleteDraftLessonPlan() {
  const p=state.lessonDetail?.plan;
  if(!p)return;
  const normalAllowed=p.teacher_id===state.user.id&&["draft","revision_requested"].includes(p.status);
  if(!normalAllowed&&!isSuperAdminUser())return toast("ไม่มีสิทธิ์ลบแผนนี้","ครูผู้สอนลบได้เฉพาะฉบับร่างหรือรายการที่ถูกส่งกลับแก้ไข","error");
  const label=`${p.subject_name}${p.plan_type==="semester"?" — แผนรายภาคเรียน":` — ${p.topic||"แผนรายสัปดาห์"}`}`;
  secureDeleteModal({
    title:"ลบแผนการสอน",
    description:label,
    warning:"แผน Timeline และเอกสารแนบที่ผูกกับรายการนี้จะถูกลบออกจากระบบด้วย",
    action:async client=>{
      const paths=(state.lessonDetail?.files||[]).map(f=>f.storage_path).filter(Boolean);
      if(paths.length){
        const {error}=await client.storage.from("lesson-plans").remove(paths);
        if(error)throw new Error(`ลบไฟล์แนบไม่สำเร็จ: ${error.message}`);
      }
      const approved=state.lessonDetail?.approvedDocument;
      if(approved?.storage_path){
        const {error}=await client.storage.from(approved.bucket_id||"approved-lesson-plans").remove([approved.storage_path]);
        if(error&&isSuperAdminUser())throw new Error(`ลบ Approved PDF ไม่สำเร็จ: ${error.message}`);
      }
      const {error}=await client.from("lesson_plans").delete().eq("id",p.id);
      if(error)throw error;
    },
    afterDelete:async()=>{
      state.selectedLessonPlanId=null;state.lessonDetail=null;
      toast("ลบแผนการสอนแล้ว","ระบบบันทึกประวัติการลบไว้ใน Audit Log","success");
      await renderDashboard();
    }
  });
}

async function submitSelectedLessonPlan() {
  const p = state.lessonDetail?.plan;
  if (!p) return;
  if (!(state.lessonDetail?.files?.length > 0)) {
    return toast("ยังส่งแผนไม่ได้", "กรุณาแนบ PDF หรือ Google Drive Link อย่างน้อย 1 รายการก่อนส่ง", "error");
  }
  if (!window.confirm("ส่งแผนเข้าสู่ขั้นตอนตรวจสอบหรือไม่? หลังส่งแล้วจะไม่สามารถแก้ไขได้จนกว่าจะถูกส่งกลับ")) return;
  const { error } = await supabase.rpc("submit_lesson_plan", { p_lesson_plan_id: p.id });
  if (error) return toast("ส่งแผนไม่สำเร็จ", error.message, "error");
  toast("ส่งแผนเรียบร้อย", "หัวหน้ากลุ่มงานจะได้รับการแจ้งเตือน", "success");
  await renderDashboard();
}

function reviewModal(role) {
  const p = state.lessonDetail?.plan;
  if (!p) return;
  const director = role === "director";
  const reviewerTitle = director ? "ผู้บริหาร" : "หัวหน้ากลุ่มงานวิชาการ";
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `<div class="modal"><div class="modal-head"><div><h3>${director ? "อนุมัติขั้นสุดท้าย" : "ตรวจสอบและลงนามแผน"}</h3><p>${escapeHtml(p.teacher_name || "ครูผู้สอน")} · ${escapeHtml(p.subject_name)}</p></div><button class="modal-close">×</button></div>
    <div class="form-grid">
      <div class="field"><label>การดำเนินการ</label><select class="select" id="review-decision"><option value="approve">อนุมัติ</option><option value="revision">ส่งกลับแก้ไข</option><option value="reject">ไม่อนุมัติ</option></select></div>
      <div class="field" id="review-signature-field"><label>ลายเซ็นของ${reviewerTitle}</label><select class="select" id="review-signature"><option value="">เลือกลายเซ็น</option>${state.signatures.map(s => `<option value="${s.id}" ${s.is_default ? 'selected' : ''}>${escapeHtml(s.label || 'ลายเซ็น')} · ${s.source === 'drawn' ? 'เซ็นสด' : 'รูปภาพ'} ${s.is_default ? '• ค่าเริ่มต้น' : ''}</option>`).join('')}</select><div class="signature-help"><span>การอนุมัติต้องมีลายเซ็น</span><button type="button" class="link-button" id="review-manage-signature">สร้าง/จัดการลายเซ็น</button></div></div>
      <div class="field"><label>ความคิดเห็น / หมายเหตุ</label><textarea class="input textarea" id="review-comment" placeholder="จำเป็นเมื่อส่งกลับแก้ไขหรือไม่อนุมัติ"></textarea></div>
    </div><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="review-confirm">ยืนยัน</button></div></div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close").addEventListener("click", close);
  modal.querySelector(".modal-cancel").addEventListener("click", close);
  modal.querySelector("#review-manage-signature").addEventListener("click", () => { close(); signatureManagerModal(); });
  const decision = modal.querySelector("#review-decision");
  const sigField = modal.querySelector("#review-signature-field");
  decision.addEventListener("change", () => sigField.classList.toggle("hidden", decision.value !== "approve"));
  modal.querySelector("#review-confirm").addEventListener("click", async e => {
    const d = decision.value;
    const comment = modal.querySelector("#review-comment").value.trim();
    if (["revision","reject"].includes(d) && !comment) return toast("กรุณาระบุเหตุผล", "ต้องมีความคิดเห็นเมื่อส่งกลับหรือไม่อนุมัติ", "error");
    const signatureId = d === "approve" ? (modal.querySelector("#review-signature").value || null) : null;
    if (d === "approve" && !signatureId) return toast("กรุณาเลือกลายเซ็น", `${reviewerTitle}ต้องลงนามก่อนอนุมัติ`, "error");

    buttonLoading(e.currentTarget, true, "กำลังบันทึก...");
    const rpc = director ? "director_review_lesson_plan" : "head_review_lesson_plan";
    const args = { p_lesson_plan_id: p.id, p_decision: d, p_comment: comment || null, p_signature_id: signatureId };
    const { error } = await supabase.rpc(rpc, args);
    buttonLoading(e.currentTarget, false);
    if (error) return toast("ดำเนินการไม่สำเร็จ", error.message, "error");
    close();

    if (director && d === "approve") {
      toast("อนุมัติขั้นสุดท้ายแล้ว", "กำลังสร้าง PDF ฉบับอนุมัติถาวร...", "success");
      await loadLessonPlanWorkspace();
      try {
        await generateAndArchiveApprovedPdf({ silent: true });
        toast("สร้าง Approved PDF แล้ว", "ครูและผู้เกี่ยวข้องสามารถดาวน์โหลดฉบับเดิมได้ตลอดตามสิทธิ์", "success");
      } catch (pdfError) {
        console.error("Approved PDF generation failed", pdfError);
        toast("อนุมัติสำเร็จ แต่สร้าง PDF ยังไม่สำเร็จ", "เปิดแผนนี้แล้วกด “สร้าง Approved PDF” เพื่อสร้างใหม่ได้", "error");
      }
      await renderDashboard();
      return;
    }

    toast("บันทึกผลการตรวจแล้ว", d === "approve" ? "ลงนามแล้วและ Workflow เดินหน้าสู่ขั้นตอนถัดไป" : "ครูผู้ส่งได้รับการแจ้งเตือนแล้ว", "success");
    await renderDashboard();
  });
}

function signatureManagerModal() {
  const roleLabel = state.profile.role === "department_head" ? "หัวหน้ากลุ่มงาน" : state.profile.role === "director" ? "ผู้บริหาร" : "ผู้อนุมัติ";
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.dataset.sigMode = "drawn";
  modal.innerHTML = `<div class="modal modal-signature"><div class="modal-head"><div><h3>ลายเซ็นของฉัน</h3><p>${roleLabel}สามารถเซ็นสดบนจอ หรืออัปโหลดรูปภาพลายเซ็นได้</p></div><button class="modal-close">×</button></div>
    <div class="signature-list">${state.signatures.length ? state.signatures.map(s => `<div class="signature-row"><div><strong>${escapeHtml(s.label || "ลายเซ็น")}</strong><span>${s.source === 'drawn' ? '✍ เซ็นสด' : '🖼 รูปภาพ'} · ${s.is_default ? "ค่าเริ่มต้น" : formatDate(s.created_at)}</span></div><div class="admin-actions"><button class="btn btn-ghost signature-preview" data-sig-id="${s.id}">ดู</button>${!s.is_default ? `<button class="btn btn-secondary signature-default" data-sig-id="${s.id}">ตั้งเป็นค่าเริ่มต้น</button>` : `<span class="pill active">Default</span>`}<button class="btn btn-danger signature-delete" data-sig-id="${s.id}">ลบ</button></div></div>`).join("") : `<div class="empty"><strong>ยังไม่มีลายเซ็น</strong><span>สร้างได้ทั้งแบบเซ็นสดและอัปโหลดรูปภาพ</span></div>`}</div>
    <hr class="soft-rule">
    <div class="signature-mode-tabs"><button type="button" class="signature-mode active" data-signature-mode="drawn">✍ เซ็นสด</button><button type="button" class="signature-mode" data-signature-mode="upload">🖼 อัปโหลดรูปภาพ</button></div>
    <div class="form-grid">
      <div class="field"><label>ชื่อลายเซ็น</label><input class="input" id="signature-label" placeholder="เช่น ลายเซ็น${roleLabel}"></div>
      <div id="signature-drawn-pane" class="signature-pane"><div class="signature-canvas-wrap"><canvas id="signature-canvas" width="900" height="300"></canvas></div><div class="signature-canvas-actions"><span>ใช้เมาส์ นิ้ว หรือปากกาเซ็นในช่องด้านบน</span><button type="button" class="btn btn-ghost" id="signature-clear">ล้างลายเซ็น</button></div></div>
      <div id="signature-upload-pane" class="signature-pane hidden"><div class="field"><label>ไฟล์ลายเซ็น</label><input class="input" id="signature-file" type="file" accept="image/png,image/jpeg,image/webp"><span class="helper">PNG, JPG หรือ WebP ไม่เกิน 5 MB</span></div></div>
      <label class="check-row"><input type="checkbox" id="signature-default" ${state.signatures.length ? '' : 'checked'}> ตั้งเป็นลายเซ็นเริ่มต้น</label>
    </div>
    <div class="modal-actions"><button class="btn btn-ghost modal-cancel">ปิด</button><button class="btn btn-primary" id="signature-save">บันทึกลายเซ็น</button></div></div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close").addEventListener("click", close);
  modal.querySelector(".modal-cancel").addEventListener("click", close);

  setupSignatureCanvas(modal);
  modal.querySelectorAll("[data-signature-mode]").forEach(btn => btn.addEventListener("click", () => {
    modal.dataset.sigMode = btn.dataset.signatureMode;
    modal.querySelectorAll("[data-signature-mode]").forEach(x => x.classList.toggle("active", x === btn));
    modal.querySelector("#signature-drawn-pane").classList.toggle("hidden", modal.dataset.sigMode !== "drawn");
    modal.querySelector("#signature-upload-pane").classList.toggle("hidden", modal.dataset.sigMode !== "upload");
  }));
  modal.querySelector("#signature-save").addEventListener("click", e => saveSignatureFromManager(modal, e.currentTarget));
  modal.querySelectorAll(".signature-preview").forEach(b => b.addEventListener("click", () => previewSignature(b.dataset.sigId)));
  modal.querySelectorAll(".signature-default").forEach(b => b.addEventListener("click", () => setDefaultSignature(b.dataset.sigId, modal)));
  modal.querySelectorAll(".signature-delete").forEach(b => b.addEventListener("click", () => deleteSignature(b.dataset.sigId, modal)));
}

function setupSignatureCanvas(modal) {
  const canvas = modal.querySelector("#signature-canvas");
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#0f172a";
  let drawing = false;
  let hasInk = false;

  const point = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };
  canvas.addEventListener("pointerdown", e => {
    drawing = true; hasInk = true; canvas.setPointerCapture(e.pointerId);
    const p = point(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
  });
  canvas.addEventListener("pointermove", e => {
    if (!drawing) return;
    const p = point(e); ctx.lineTo(p.x, p.y); ctx.stroke();
  });
  const stop = () => { drawing = false; };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("pointerleave", stop);
  modal.querySelector("#signature-clear").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); hasInk = false;
  });
  modal._signatureHasInk = () => hasInk;
}

function canvasBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, "image/png", 1));
}

async function saveSignatureFromManager(modal, button) {
  const label = modal.querySelector("#signature-label").value.trim() || "ลายเซ็น";
  const makeDefault = modal.querySelector("#signature-default").checked;
  const mode = modal.dataset.sigMode || "drawn";
  let blob, ext, mime, source;

  if (mode === "drawn") {
    if (!modal._signatureHasInk?.()) return toast("ยังไม่มีลายเซ็น", "กรุณาเซ็นในช่องก่อนบันทึก", "error");
    blob = await canvasBlob(modal.querySelector("#signature-canvas"));
    ext = "png"; mime = "image/png"; source = "drawn";
  } else {
    const file = modal.querySelector("#signature-file").files[0];
    if (!file) return toast("กรุณาเลือกไฟล์", "เลือกรูปภาพลายเซ็นก่อนบันทึก", "error");
    if (!["image/png","image/jpeg","image/webp"].includes(file.type)) return toast("ประเภทไฟล์ไม่รองรับ", "ใช้ PNG, JPG หรือ WebP", "error");
    if (file.size > 5 * 1024 * 1024) return toast("ไฟล์ใหญ่เกินไป", "ลายเซ็นต้องไม่เกิน 5 MB", "error");
    blob = file;
    ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    mime = file.type; source = "upload";
  }

  buttonLoading(button, true, "กำลังบันทึก...");
  if (makeDefault && state.signatures.length) {
    const { error: clearError } = await supabase.from("signatures").update({ is_default: false }).eq("user_id", state.user.id);
    if (clearError) { buttonLoading(button, false); return toast("บันทึกไม่สำเร็จ", clearError.message, "error"); }
  }

  const path = `${state.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("signatures").upload(path, blob, { contentType: mime, upsert: false });
  if (upErr) { buttonLoading(button, false); return toast("อัปโหลดไม่สำเร็จ", upErr.message, "error"); }

  const { error } = await supabase.from("signatures").insert({
    user_id: state.user.id,
    label,
    bucket_id: "signatures",
    storage_path: path,
    is_default: makeDefault || state.signatures.length === 0,
    source,
  });
  if (error) {
    await supabase.storage.from("signatures").remove([path]);
    buttonLoading(button, false);
    return toast("บันทึกลายเซ็นไม่สำเร็จ", error.message, "error");
  }

  buttonLoading(button, false);
  modal.remove();
  toast("เพิ่มลายเซ็นแล้ว", source === "drawn" ? "บันทึกลายเซ็นสดเรียบร้อย" : "บันทึกรูปภาพลายเซ็นเรียบร้อย", "success");
  await renderDashboard();
  signatureManagerModal();
}

async function previewSignature(id) {
  const sig = state.signatures.find(s => s.id === id) || state.lessonDetail?.signatures?.find(s => s.id === id);
  if (!sig) return;
  const { data, error } = await supabase.storage.from(sig.bucket_id || "signatures").download(sig.storage_path);
  if (error) return toast("เปิดลายเซ็นไม่สำเร็จ", error.message, "error");
  const url = URL.createObjectURL(data); window.open(url, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function setDefaultSignature(id, modal) {
  await supabase.from("signatures").update({ is_default: false }).eq("user_id", state.user.id);
  const { error } = await supabase.from("signatures").update({ is_default: true }).eq("id", id);
  if (error) return toast("อัปเดตไม่สำเร็จ", error.message, "error");
  modal.remove(); await renderDashboard(); signatureManagerModal();
}

async function deleteSignature(id, modal) {
  const sig = state.signatures.find(s => s.id === id); if (!sig) return;
  if (!window.confirm("ลบลายเซ็นนี้หรือไม่? ลายเซ็นที่ถูกใช้อนุมัติแล้วจะลบไม่ได้")) return;
  const { error: storageError } = await supabase.storage.from(sig.bucket_id || "signatures").remove([sig.storage_path]);
  if (storageError) return toast("ลบไม่ได้", "ลายเซ็นอาจถูกใช้งานในเอกสารที่อนุมัติแล้ว", "error");
  const { error } = await supabase.from("signatures").delete().eq("id", id);
  if (error) return toast("ลบข้อมูลไม่สำเร็จ", error.message, "error");
  modal.remove(); toast("ลบลายเซ็นแล้ว", "", "success"); await renderDashboard(); signatureManagerModal();
}


function thaiDateOnly(value) {
  if (!value) return "—";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? new Date(`${value}T00:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function thaiDateTimeDocument(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(new Date(value));
}

function actionForRole(detail, role) {
  const action = role === "department_head" ? "approve_head" : "approve_director";
  return [...(detail.timeline || [])].reverse().find(item => item.action === action) || null;
}

function signatureForAction(detail, action) {
  if (!action?.signature_id) return null;
  return (detail.signatures || []).find(sig => sig.id === action.signature_id) || null;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function signatureDataUrl(signature) {
  if (!signature) return null;
  const { data, error } = await supabase.storage.from(signature.bucket_id || "signatures").download(signature.storage_path);
  if (error) {
    console.warn("Signature download failed for print", error);
    return null;
  }
  return blobToDataUrl(data);
}

async function schoolLogoDataUrl() {
  try {
    const response = await fetch("./school-logo.png", { cache: "force-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await blobToDataUrl(await response.blob());
  } catch (error) {
    console.warn("School logo could not be loaded for A4 document", error);
    return null;
  }
}

function a4DocumentStyles() {
  return `
    @font-face{font-family:"TH SarabunPSK";src:url("https://cdn.jsdelivr.net/gh/SarabunConsortium/TH-Sarabun-PSK@master/THSarabunPSK%20Regular.ttf") format("truetype");font-style:normal;font-weight:400;font-display:block;}
    @font-face{font-family:"TH SarabunPSK";src:url("https://cdn.jsdelivr.net/gh/SarabunConsortium/TH-Sarabun-PSK@master/THSarabunPSK%20Bold.ttf") format("truetype");font-style:normal;font-weight:700;font-display:block;}
    @font-face{font-family:"TH SarabunPSK";src:url("https://cdn.jsdelivr.net/gh/SarabunConsortium/TH-Sarabun-PSK@master/THSarabunPSK%20Italic.ttf") format("truetype");font-style:italic;font-weight:400;font-display:block;}
    @font-face{font-family:"TH SarabunPSK";src:url("https://cdn.jsdelivr.net/gh/SarabunConsortium/TH-Sarabun-PSK@master/THSarabunPSK%20BoldItalic.ttf") format("truetype");font-style:italic;font-weight:700;font-display:block;}
    html,body,button,input,select,textarea,table,*{font-family:"TH SarabunPSK",sans-serif!important;}
    @page{size:A4;margin:14mm 16mm 16mm;}
    *{box-sizing:border-box;}
    body.a4-print-body{margin:0;background:#eef2f7;color:#111;font-family:"TH SarabunPSK",sans-serif;}
    .a4-document{width:210mm;min-height:297mm;margin:0 auto;background:white;padding:16mm 18mm 18mm;font-family:"TH SarabunPSK",sans-serif;font-size:16pt;line-height:1.18;color:#111;}
    .a4-doc-head{text-align:center;border-bottom:1px solid #222;padding-bottom:7mm;margin-bottom:6mm;}
    .a4-school-logo{display:block;width:auto;height:31mm;max-width:42mm;object-fit:contain;margin:0 auto 2.5mm;}
    .a4-school-name{font-size:18pt;font-weight:700;line-height:1.05;margin:0 0 1mm;}
    .a4-school-meta{font-size:16pt;font-weight:400;line-height:1.1;margin:0;}
    .a4-doc-head h1{font-size:22pt;line-height:1.05;margin:3mm 0 0;font-weight:700;}
    .a4-doc-head .sub{font-size:16pt;margin-top:2mm;}
    .a4-status{display:inline-block;margin-top:3mm;padding:1mm 5mm;border:1px solid #333;border-radius:999px;font-size:14pt;}
    .a4-status.approved{border-color:#166534;color:#166534;}
    .a4-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5mm 8mm;margin:0 0 5mm;}
    .a4-meta{display:grid;grid-template-columns:36mm 1fr;gap:2mm;font-size:16pt;min-width:0;}
    .a4-meta .label{font-weight:700;}
    .a4-section{margin:4.5mm 0;break-inside:avoid;}
    .a4-section h2{font-size:18pt;margin:0 0 1.5mm;border-bottom:1px solid #aaa;padding-bottom:1mm;font-weight:700;}
    .a4-section p{font-size:16pt;white-space:pre-wrap;margin:0;text-align:left;}
    .a4-files{margin:1mm 0 0 6mm;padding:0;}
    .a4-files li{font-size:15pt;margin:0 0 1.5mm;}\n    .a4-drive-url{display:block;font-size:11pt;color:#475569;word-break:break-all;line-height:1.15;}
    .a4-approval-title{font-size:18pt;font-weight:700;text-align:center;margin:8mm 0 4mm;}
    .a4-signatures{display:grid;grid-template-columns:1fr 1fr;gap:12mm;margin-top:4mm;break-inside:avoid;}
    .a4-signbox{text-align:center;min-height:57mm;padding-top:2mm;}
    .a4-sign-image{height:23mm;max-width:58mm;object-fit:contain;display:block;margin:0 auto 1mm;}
    .a4-sign-placeholder{height:23mm;display:flex;align-items:center;justify-content:center;color:#777;font-size:14pt;border-bottom:1px dotted #999;margin:0 auto 1mm;max-width:58mm;}
    .a4-sign-line{font-size:16pt;min-height:7mm;}
    .a4-sign-name{font-size:16pt;font-weight:700;}
    .a4-sign-role{font-size:15pt;}
    .a4-sign-date{font-size:14pt;color:#333;margin-top:1mm;}
    .a4-foot{margin-top:8mm;padding-top:3mm;border-top:1px solid #aaa;display:flex;justify-content:space-between;gap:10mm;font-size:12pt;color:#555;}
    .a4-approved-mark{position:absolute;right:12mm;top:10mm;transform:rotate(-7deg);border:2px solid rgba(22,101,52,.35);color:rgba(22,101,52,.45);font-weight:700;font-size:18pt;padding:1mm 4mm;border-radius:3mm;}
    .a4-document-inner{position:relative;}
    @media print{
      body.a4-print-body{background:#fff;}
      .a4-document{width:auto;min-height:0;margin:0;padding:0;box-shadow:none;}
      .a4-section,.a4-signatures{break-inside:avoid;page-break-inside:avoid;}
    }
    @media(max-width:900px){.a4-document{width:100%;min-height:auto;padding:28px 24px;}.a4-grid,.a4-signatures{grid-template-columns:1fr;}.a4-meta{grid-template-columns:125px 1fr;}}
  `;
}

function lessonHeadReviewSkipped(detail) {
  return Boolean((detail?.timeline || []).find(item =>
    ["submit", "resubmit"].includes(item.action)
    && item.to_status === "pending_director"
    && item.actor_id === detail?.plan?.teacher_id
  ));
}

function a4HeadReviewSkippedBlock() {
  return `<div class="a4-signbox a4-signbox-skipped">
    <div class="a4-sign-placeholder">ข้ามขั้นตอน</div>
    <div class="a4-sign-line">ผู้ส่งเป็นหัวหน้ากลุ่มงานบริหารวิชาการ</div>
    <div class="a4-sign-name">(ไม่ลงนามรับรองแผนของตนเอง)</div>
    <div class="a4-sign-role">ส่งตรงให้ผู้บริหารพิจารณา</div>
    <div class="a4-sign-date">ป้องกันการอนุมัติเอกสารของตนเอง</div>
  </div>`;
}

function a4SignatureBlock(title, action, signatureUrl) {
  const signed = Boolean(action?.signature_id);
  const name = action?.actor_name || "—";
  return `<div class="a4-signbox">
    ${signatureUrl ? `<img class="a4-sign-image" src="${signatureUrl}" alt="ลายเซ็น ${escapeHtml(title)}">` : `<div class="a4-sign-placeholder">${signed ? "ไม่สามารถโหลดภาพลายเซ็น" : "รอลงนาม"}</div>`}
    <div class="a4-sign-line">ลงชื่อ ........................................................</div>
    <div class="a4-sign-name">(${escapeHtml(name)})</div>
    <div class="a4-sign-role">${escapeHtml(title)}</div>
    <div class="a4-sign-date">${action ? `ลงนาม ${thaiDateTimeDocument(action.created_at)}` : "ยังไม่ผ่านขั้นตอนนี้"}</div>
  </div>`;
}

function buildA4DocumentHtml(detail, assets = {}) {
  const p = detail.plan;
  const type = p.plan_type || "weekly";
  const semesterPlan = type === "semester";
  const headAction = actionForRole(detail, "department_head");
  const directorAction = actionForRole(detail, "director");
  const files = detail.files || [];
  const statusText = lessonStatusLabel(p.status);
  const approved = p.status === "approved";
  const section = (title, value) => value ? `<section class="a4-section"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(value)}</p></section>` : "";
  const documentTitle = semesterPlan
    ? "เอกสารประกอบการตรวจและอนุมัติแผนการจัดการเรียนรู้รายภาคเรียน"
    : "เอกสารประกอบการตรวจและอนุมัติแผนการจัดการเรียนรู้";

  return `<article class="a4-document"><div class="a4-document-inner">
    ${approved ? `<div class="a4-approved-mark">อนุมัติแล้ว</div>` : ""}
    <header class="a4-doc-head">
      ${assets.schoolLogo ? `<img class="a4-school-logo" src="${assets.schoolLogo}" alt="ตราสัญลักษณ์โรงเรียน">` : ""}
      <div class="a4-school-name">${escapeHtml(schoolName())}</div>
      <div class="a4-school-meta">${escapeHtml(schoolAddress())}</div>
      <div class="a4-school-meta">${escapeHtml(educationOffice())}</div>
      <h1>${escapeHtml(documentTitle)}</h1>
      <div class="sub">${semesterPlan ? "Semester Lesson Plan Approval Document" : "Lesson Plan Approval Document"}</div>
      <div class="a4-status ${approved ? "approved" : ""}">${escapeHtml(statusText)}</div>
    </header>

    <div class="a4-grid">
      <div class="a4-meta"><div class="label">ประเภทแผน</div><div>${escapeHtml(lessonPlanTypeLabel(type))}</div></div>
      <div class="a4-meta"><div class="label">ครูผู้สอน</div><div>${escapeHtml(p.teacher_name || "ครูผู้สอน")}</div></div>
      <div class="a4-meta"><div class="label">ปีการศึกษา</div><div>${escapeHtml(p.academic_year || "—")} / ภาคเรียน ${escapeHtml(String(p.semester || "—"))}</div></div>
      <div class="a4-meta"><div class="label">รายวิชา</div><div>${escapeHtml([p.subject_code, p.subject_name].filter(Boolean).join(" ") || "—")}</div></div>
      <div class="a4-meta"><div class="label">ชั้น/ระดับ</div><div>${escapeHtml(p.class_level || "—")}</div></div>
      ${semesterPlan ? "" : `
      <div class="a4-meta"><div class="label">หน่วยการเรียนรู้</div><div>${escapeHtml(p.learning_unit || "—")}</div></div>
      <div class="a4-meta"><div class="label">สัปดาห์ที่</div><div>${escapeHtml(p.week_number ? String(p.week_number) : "—")}</div></div>
      <div class="a4-meta"><div class="label">เรื่อง</div><div>${escapeHtml(p.topic || "—")}</div></div>
      <div class="a4-meta"><div class="label">วันที่สอน</div><div>${thaiDateOnly(p.teach_date)}</div></div>`}
    </div>

    ${semesterPlan ? "" : `
      ${section("จุดประสงค์การเรียนรู้", p.learning_objectives)}
      ${section("สาระ / เนื้อหาสำคัญ", p.content_summary)}
      ${section("กิจกรรมการเรียนรู้", p.activities)}
      ${section("การวัดและประเมินผล", p.assessment)}
    `}

    <section class="a4-section"><h2>${semesterPlan ? "ไฟล์แผนการสอนรายภาคเรียนที่แนบ" : "เอกสารแผนการสอนที่แนบ"}</h2>
      ${files.length ? `<ol class="a4-files">${files.map(f => f.attachment_type === "google_drive"
        ? `<li><strong>[Google Drive]</strong> ${escapeHtml(f.file_name)}<span class="a4-drive-url">${escapeHtml(f.external_url || "")}</span></li>`
        : `<li><strong>[PDF]</strong> ${escapeHtml(f.file_name)}${f.file_size ? ` (${(f.file_size/1024/1024).toFixed(2)} MB)` : ""}</li>`
      ).join("")}</ol>` : `<p>ยังไม่มีเอกสารแนบ</p>`}
    </section>

    <div class="a4-approval-title">การตรวจและอนุมัติ</div>
    <div class="a4-signatures">
      ${lessonHeadReviewSkipped(detail) ? a4HeadReviewSkippedBlock() : a4SignatureBlock("หัวหน้ากลุ่มงานบริหารวิชาการ", headAction, assets.headSignature)}
      ${a4SignatureBlock("ผู้อำนวยการโรงเรียน", directorAction, assets.directorSignature)}
    </div>

    <footer class="a4-foot"><span>เลขอ้างอิง: ${escapeHtml(p.id)}</span><span>สร้างจาก ${escapeHtml(appName())} · ${thaiDateTimeDocument(new Date().toISOString())}</span></footer>
  </div></article>`;
}

async function loadA4Assets(detail) {
  const headAction = actionForRole(detail, "department_head");
  const directorAction = actionForRole(detail, "director");
  const [headSignature, directorSignature, schoolLogo] = await Promise.all([
    signatureDataUrl(signatureForAction(detail, headAction)),
    signatureDataUrl(signatureForAction(detail, directorAction)),
    schoolLogoDataUrl(),
  ]);
  return { headSignature, directorSignature, schoolLogo };
}

async function lessonA4PreviewModal() {
  const detail = state.lessonDetail;
  if (!detail?.plan) return;
  const modal = document.createElement("div");
  modal.className = "modal-backdrop a4-preview-backdrop";
  modal.innerHTML = `<div class="a4-preview-shell"><div class="a4-preview-toolbar"><div><strong>ตัวอย่างเอกสาร A4</strong><span>ฟอนต์เอกสาร: TH Sarabun PSK</span></div><div class="a4-preview-actions"><button class="btn btn-ghost" id="a4-close">ปิด</button><button class="btn btn-primary" id="a4-print">พิมพ์ / บันทึก PDF</button></div></div><div class="a4-preview-loading">กำลังเตรียมเอกสารและลายเซ็น...</div></div>`;
  document.body.appendChild(modal);
  const shell = modal.querySelector(".a4-preview-shell");
  modal.querySelector("#a4-close").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });

  const assets = await loadA4Assets(detail);
  shell.querySelector(".a4-preview-loading").outerHTML = `<div class="a4-preview-scroll"><style>${a4DocumentStyles()}</style>${buildA4DocumentHtml(detail, assets)}</div>`;
  modal.querySelector("#a4-print").addEventListener("click", () => printLessonA4(detail, assets));
}

function printLessonA4(detail, assets) {
  const w = window.open("", "_blank");
  if (!w) return toast("เปิดหน้าพิมพ์ไม่ได้", "กรุณาอนุญาต Pop-up สำหรับเว็บไซต์นี้", "error");
  const html = `<!doctype html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>แผนการสอน - ${escapeHtml(detail.plan.subject_name || "เอกสาร")}</title><style>${a4DocumentStyles()}</style></head><body class="a4-print-body">${buildA4DocumentHtml(detail, assets)}<script>window.addEventListener('load',()=>{const imgs=[...document.images];Promise.all([document.fonts?document.fonts.ready:Promise.resolve(),...imgs.map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r;}))]).finally(()=>setTimeout(()=>window.print(),250));});<\/script></body></html>`;
  try { w.opener = null; } catch {}
  w.document.open();
  w.document.write(html);
  w.document.close();
}


function waitForElementImages(root) {
  const images = [...root.querySelectorAll("img")];
  return Promise.all(images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));
}

async function createApprovedPdfBlob(detail, assets) {
  const stage = document.createElement("div");
  stage.className = "approved-pdf-render-stage";
  stage.setAttribute("aria-hidden", "true");
  stage.style.cssText = "position:fixed;left:-12000px;top:0;width:210mm;background:#fff;pointer-events:none;z-index:-9999;";
  stage.innerHTML = `<style>${a4DocumentStyles()}</style>${buildA4DocumentHtml(detail, assets)}`;
  document.body.appendChild(stage);

  try {
    if (document.fonts?.ready) await document.fonts.ready;
    await waitForElementImages(stage);

    const sheet = stage.querySelector(".a4-document");
    if (!sheet) throw new Error("ไม่พบโครงเอกสาร A4");
    sheet.style.width = "210mm";
    sheet.style.margin = "0";
    sheet.style.boxShadow = "none";

    const canvas = await html2canvas(sheet, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 1200,
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const pageHeightPx = Math.max(1, Math.floor(canvas.width * (pageHeightMm / pageWidthMm)));
    const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage("a4", "portrait");
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = pageHeightPx;
      const ctx = slice.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);

      const sourceY = page * pageHeightPx;
      const sourceHeight = Math.min(pageHeightPx, canvas.height - sourceY);
      if (sourceHeight > 0) {
        ctx.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight,
          0, 0, canvas.width, sourceHeight
        );
      }

      const img = slice.toDataURL("image/jpeg", 0.94);
      pdf.addImage(img, "JPEG", 0, 0, pageWidthMm, pageHeightMm, undefined, "FAST");
    }

    return pdf.output("blob");
  } finally {
    stage.remove();
  }
}

function approvedPdfFileName(plan) {
  const subject = String(plan.subject_name || "แผนการสอน").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 70);
  const prefix = plan.plan_type === "semester" ? "แผนรายภาคเรียนอนุมัติแล้ว" : "แผนการสอนอนุมัติแล้ว";
  return `${prefix}-${subject}-${plan.academic_year || ""}.pdf`;
}

async function generateAndArchiveApprovedPdf({ silent = false } = {}) {
  const detail = state.lessonDetail;
  const plan = detail?.plan;
  if (!plan) throw new Error("ไม่พบข้อมูลแผน");
  if (plan.status !== "approved") throw new Error("สร้าง Approved PDF ได้หลังผู้บริหารอนุมัติแล้วเท่านั้น");
  if (detail.approvedDocument) return detail.approvedDocument;
  if (!["director", "super_admin"].includes(state.profile.role)) throw new Error("เฉพาะผู้บริหารหรือ Super Admin เท่านั้นที่สร้าง PDF ฉบับถาวรได้");

  const assets = await loadA4Assets(detail);
  if (!lessonHeadReviewSkipped(detail) && !assets.headSignature) throw new Error("ไม่พบลายเซ็นหัวหน้ากลุ่มงานวิชาการใน Workflow");
  if (!assets.directorSignature) throw new Error("ไม่พบลายเซ็นผู้บริหารใน Workflow");

  if (!silent) toast("กำลังสร้าง Approved PDF", "กำลังประมวลผลหน้า A4 และลายเซ็น...", "success");
  const blob = await createApprovedPdfBlob(detail, assets);
  if (!blob?.size) throw new Error("สร้างไฟล์ PDF ไม่สำเร็จ");
  if (blob.size > 25 * 1024 * 1024) throw new Error("PDF ที่สร้างมีขนาดเกิน 25 MB");

  const storagePath = `${plan.id}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("approved-lesson-plans")
    .upload(storagePath, blob, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const metadata = {
    lesson_plan_id: plan.id,
    generated_by: state.user.id,
    bucket_id: "approved-lesson-plans",
    storage_path: storagePath,
    file_name: approvedPdfFileName(plan),
    mime_type: "application/pdf",
    file_size: blob.size,
  };

  const { data, error: metadataError } = await supabase
    .from("approved_lesson_plan_documents")
    .insert(metadata)
    .select()
    .single();

  if (metadataError) {
    await supabase.storage.from("approved-lesson-plans").remove([storagePath]);
    if (String(metadataError.code || "") === "23505") {
      const { data: existing } = await supabase
        .from("approved_lesson_plan_documents")
        .select("*")
        .eq("lesson_plan_id", plan.id)
        .maybeSingle();
      if (existing) {
        state.lessonDetail.approvedDocument = existing;
        return existing;
      }
    }
    throw metadataError;
  }

  state.lessonDetail.approvedDocument = data;
  return data;
}

async function downloadApprovedPdf() {
  const doc = state.lessonDetail?.approvedDocument;
  if (!doc) return toast("ยังไม่มี Approved PDF", "เอกสารฉบับถาวรยังไม่ได้ถูกสร้าง", "error");

  const { data, error } = await supabase.storage
    .from(doc.bucket_id || "approved-lesson-plans")
    .download(doc.storage_path);
  if (error) return toast("ดาวน์โหลดไม่สำเร็จ", error.message, "error");

  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = doc.file_name || "approved-lesson-plan.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function generateApprovedPdfFromDetail(button) {
  buttonLoading(button, true, "กำลังสร้าง PDF...");
  try {
    await generateAndArchiveApprovedPdf();
    toast("สร้าง Approved PDF แล้ว", "ไฟล์ถูกเก็บถาวรในระบบและพร้อมดาวน์โหลด", "success");
    await renderDashboard();
  } catch (error) {
    console.error(error);
    toast("สร้าง Approved PDF ไม่สำเร็จ", error.message || "เกิดข้อผิดพลาด", "error");
  } finally {
    buttonLoading(button, false);
  }
}

function bindDashboardEvents() {
  document.querySelectorAll("[data-view]").forEach(el => {
    el.addEventListener("click", () => {
      const nextView = el.dataset.view;
      if (nextView === "module:lesson_plans" && state.currentView !== "module:lesson_plans") {
        state.lessonPlanMode = null;
        state.lessonTeacherView = "all";
        state.lessonTeacherId = null;
        state.selectedLessonPlanId = null;
        state.lessonDetail = null;
      }
      if (nextView === "module:personnel_records" && state.currentView !== "module:personnel_records") {
        state.personnelView=isPersonnelReviewer()?"admin":"own";
        state.selectedPersonnelUserId=null;
        state.selectedPersonnelPublicUserId=null;
      }
      if (nextView === "module:leave_management" && state.currentView !== "module:leave_management") {
        state.selectedLeaveRequestId = null;
        state.leaveView = "mine";
      }
      if (nextView === "module:timetable_management" && state.currentView !== "module:timetable_management") {
        state.timetableSelectedClassId = null;
        state.timetableView = ["director","super_admin"].includes(state.profile.role) ? "overview" : "planner";
        state.timetableAcademicYear = currentAcademicPeriod().academicYear;
        state.timetableSemester = currentAcademicPeriod().semester;
      }
      if (nextView === "module:substitute_teaching" && state.currentView !== "module:substitute_teaching") {
        state.selectedSubstituteLessonId = null;
        state.selectedSubstituteLeaveId = null;
        state.selectedSubstituteDate = null;
        state.substituteCandidateMap = {};
        state.substituteAcademicYear = currentAcademicPeriod().academicYear;
        state.substituteSemester = currentAcademicPeriod().semester;
        state.substituteView = "manage";
      }
      if (nextView === "module:project_management" && state.currentView !== "module:project_management") {
        state.selectedProjectId=null; state.selectedProjectActivityId=null; state.selectedDisbursementId=null;
        state.projectAcademicYear=currentAcademicPeriod().academicYear;
        state.projectView=isPlanBudgetHead()?"overview":"mine"; state.projectDepartmentFilter="academic"; state.budgetRegistryDepartmentFilter="academic";
      }
      if (nextView === "module:home_visit_management" && state.currentView !== "module:home_visit_management") {
        state.selectedHomeVisitId=null; state.homeVisitStep=1; state.homeVisitAcademicYear=currentAcademicPeriod().academicYear; state.homeVisitSemester=currentAcademicPeriod().semester; state.homeVisitClassId=null;
      }
      state.currentView = nextView;
      state.sidebarOpen = false;
      renderDashboard();
    });
  });

  document.querySelectorAll(".nav-toggle").forEach(btn => {
    btn.addEventListener("click", () => btn.closest(".nav-group").classList.toggle("open"));
  });

  document.querySelector("#mobile-menu")?.addEventListener("click", () => {
    state.sidebarOpen = !state.sidebarOpen;
    document.querySelector(".dashboard")?.classList.toggle("sidebar-open", state.sidebarOpen);
  });

  document.querySelector("#signout-btn")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    state.currentView = "dashboard";
    renderAuth("signin");
  });

  document.querySelectorAll("[data-personnel-view]").forEach(btn=>btn.addEventListener("click",()=>{state.personnelView=btn.dataset.personnelView;state.selectedPersonnelUserId=null;state.selectedPersonnelPublicUserId=null;renderDashboard();}));
  document.querySelectorAll("[data-personnel-user]").forEach(btn => btn.addEventListener("click", () => {
    state.personnelView="admin"; state.selectedPersonnelUserId = btn.dataset.personnelUser; renderDashboard();
  }));
  document.querySelector("#personnel-back")?.addEventListener("click", () => { state.selectedPersonnelUserId = null; renderDashboard(); });
  document.querySelectorAll("[data-personnel-public-user]").forEach(btn=>btn.addEventListener("click",()=>{state.personnelView="public";state.selectedPersonnelPublicUserId=btn.dataset.personnelPublicUser;renderDashboard();}));
  document.querySelector("#personnel-public-open")?.addEventListener("click",()=>{const id=document.querySelector("#personnel-public-select")?.value;if(!id)return toast("เลือกบุคลากรก่อน","กรุณาเลือกรายชื่อที่ต้องการดู","error");state.selectedPersonnelPublicUserId=id;renderDashboard();});
  document.querySelector("#personnel-public-back")?.addEventListener("click",()=>{state.selectedPersonnelPublicUserId=null;renderDashboard();});
  document.querySelector("#personnel-my-record")?.addEventListener("click", () => { state.personnelView="own"; state.selectedPersonnelUserId = null; renderDashboard(); });
  document.querySelector("#refresh-personnel")?.addEventListener("click", () => renderDashboard());
  document.querySelector("#edit-personnel-record")?.addEventListener("click", () => personnelRecordModal());
  document.querySelector("#personnel-a4")?.addEventListener("click", () => personnelA4Preview());
  document.querySelectorAll("[data-notification-personnel]").forEach(el => el.addEventListener("click", async () => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id",state.user.id).eq("type","personnel_profile_required").is("read_at",null);
    state.currentView = "module:personnel_records";
    state.selectedPersonnelUserId = state.user.id;
    await loadActiveUserData();
    renderDashboard();
  }));

  document.querySelectorAll("[data-leave-view]").forEach(btn=>btn.addEventListener("click",()=>{
    state.leaveView=btn.dataset.leaveView;
    state.selectedLeaveRequestId=null;
    renderDashboard();
  }));
  document.querySelectorAll("[data-leave-view-direct]").forEach(btn=>btn.addEventListener("click",()=>{
    state.leaveView=btn.dataset.leaveViewDirect;
    state.selectedLeaveRequestId=null;
    renderDashboard();
  }));
  document.querySelector("#leave-report-year")?.addEventListener("change",e=>{
    state.leaveReportAcademicYear=Number(e.currentTarget.value);
    renderDashboard();
  });
  document.querySelector("#leave-report-semester")?.addEventListener("change",e=>{
    state.leaveReportSemester=e.currentTarget.value;
    renderDashboard();
  });
  document.querySelector("#leave-report-person")?.addEventListener("change",e=>{
    state.leaveReportPersonId=e.currentTarget.value;
    renderDashboard();
  });
  document.querySelectorAll("[data-leave-person]").forEach(btn=>btn.addEventListener("click",()=>{
    state.leaveReportPersonId=btn.dataset.leavePerson;
    document.querySelector("#leave-report-person")?.scrollIntoView({behavior:"smooth",block:"center"});
    renderDashboard();
  }));
  document.querySelector("#export-school-leave-report")?.addEventListener("click",()=>openLeaveReportPreview("school"));
  document.querySelector("#export-person-leave-report")?.addEventListener("click",()=>openLeaveReportPreview("person"));
  document.querySelector("#new-leave-request")?.addEventListener("click",()=>leaveRequestModal());
  document.querySelector("#refresh-leave")?.addEventListener("click",()=>renderDashboard());
  document.querySelectorAll(".leave-open").forEach(btn=>btn.addEventListener("click",()=>{
    state.selectedLeaveRequestId=btn.dataset.leaveId;
    renderDashboard();
  }));
  document.querySelector("#leave-detail-back")?.addEventListener("click",()=>{
    state.selectedLeaveRequestId=null;
    renderDashboard();
  });
  document.querySelector("#edit-leave-request")?.addEventListener("click",()=>{
    const r=selectedLeaveRequest();
    if(r) leaveRequestModal(r);
  });
  document.querySelector("#submit-leave-request")?.addEventListener("click",()=>submitSelectedLeaveRequest());
  document.querySelector("#delete-leave-draft")?.addEventListener("click",()=>deleteLeaveDraft());
  document.querySelectorAll("[data-leave-review]").forEach(btn=>btn.addEventListener("click",()=>leaveReviewModal(btn.dataset.leaveReview)));
  document.querySelector("#leave-a4")?.addEventListener("click",()=>leaveA4Preview());
  document.querySelectorAll("[data-notification-leave]").forEach(el=>el.addEventListener("click",async()=>{
    const id=el.dataset.notificationLeave;
    await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("entity_id",id).eq("recipient_id",state.user.id);
    state.currentView="module:leave_management";
    state.selectedLeaveRequestId=id;
    await loadActiveUserData();
    await renderDashboard();
  }));

  document.querySelectorAll("[data-substitute-view]").forEach(btn=>btn.addEventListener("click",()=>{
    state.substituteView=btn.dataset.substituteView;
    state.selectedSubstituteLessonId=null;
    state.selectedSubstituteLeaveId=null;
    state.selectedSubstituteDate=null;
    state.substituteCandidateMap={};
    renderDashboard();
  }));
  document.querySelector("#substitute-year")?.addEventListener("change",e=>{
    state.substituteAcademicYear=Number(e.currentTarget.value);
    state.selectedSubstituteLessonId=null; state.selectedSubstituteLeaveId=null; state.selectedSubstituteDate=null; state.substituteCandidateMap={}; renderDashboard();
  });
  document.querySelector("#substitute-semester")?.addEventListener("change",e=>{
    state.substituteSemester=Number(e.currentTarget.value);
    state.selectedSubstituteLessonId=null; state.selectedSubstituteLeaveId=null; state.selectedSubstituteDate=null; state.substituteCandidateMap={}; renderDashboard();
  });
  document.querySelector("#refresh-substitute")?.addEventListener("click",()=>renderDashboard());
  document.querySelector("#sync-substitute-lessons")?.addEventListener("click",()=>syncSubstituteTeaching());
  document.querySelectorAll("[data-substitute-open]").forEach(btn=>btn.addEventListener("click",()=>{
    state.selectedSubstituteLessonId=btn.dataset.substituteOpen; state.selectedSubstituteLeaveId=null; state.selectedSubstituteDate=null; renderDashboard();
  }));
  document.querySelectorAll("[data-substitute-assign]").forEach(btn=>btn.addEventListener("click",()=>substituteAssignModal(btn.dataset.substituteAssign)));
  document.querySelectorAll("[data-open-substitute-day]").forEach(btn=>btn.addEventListener("click",async()=>{
    const leaveId=btn.dataset.openSubstituteDay,select=document.querySelector(`[data-substitute-date-select="${leaveId}"]`);
    await openSubstituteDayPlanner(leaveId,select?.value||null);
  }));
  document.querySelector("#substitute-day-date")?.addEventListener("change",async e=>await openSubstituteDayPlanner(state.selectedSubstituteLeaveId,e.currentTarget.value));
  document.querySelector("#substitute-day-back")?.addEventListener("click",()=>{
    state.selectedSubstituteLeaveId=null; state.selectedSubstituteDate=null; state.substituteCandidateMap={}; renderDashboard();
  });
  document.querySelector("#save-substitute-day")?.addEventListener("click",()=>saveSubstituteDayAssignments());
  document.querySelector("#export-substitute-day")?.addEventListener("click",()=>substitutePdfPreview(state.selectedSubstituteLeaveId,state.selectedSubstituteDate));
  document.querySelectorAll("[data-substitute-choice]").forEach(select=>select.addEventListener("change",()=>{
    const lessonId=select.dataset.substituteChoice,candidate=(state.substituteCandidateMap[lessonId]||[]).find(c=>c.teacher_id===select.value),detail=document.querySelector(`[data-candidate-detail="${lessonId}"]`);
    if(detail)detail.textContent=candidateDetailText(candidate);
  }));
  document.querySelector("#substitute-back")?.addEventListener("click",()=>{state.selectedSubstituteLessonId=null;renderDashboard();});
  document.querySelector("#unassign-substitute")?.addEventListener("click",()=>unassignSelectedSubstitute());
  document.querySelector("#delete-substitute-record")?.addEventListener("click",()=>deleteSelectedSubstituteRecord());
  document.querySelectorAll("[data-open-leave-substitute]").forEach(btn=>btn.addEventListener("click",async()=>{
    const leaveId=btn.dataset.openLeaveSubstitute;
    state.currentView="module:substitute_teaching"; state.substituteView="absent"; state.selectedSubstituteLeaveId=leaveId; state.selectedSubstituteLessonId=null; state.selectedSubstituteDate=null; state.substituteCandidateMap={};
    await renderDashboard();
    const dates=substituteBatchDates(leaveId);
    if(dates.length)await openSubstituteDayPlanner(leaveId,dates[0]);
  }));
  document.querySelectorAll("[data-notification-substitute]").forEach(el=>el.addEventListener("click",async()=>{
    const entityId=el.dataset.notificationSubstitute,entityType=el.dataset.substituteEntity;
    await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("recipient_id",state.user.id).eq("entity_type",entityType).eq("entity_id",entityId);
    state.currentView="module:substitute_teaching";
    state.selectedSubstituteLessonId=entityType==="substitute_lesson"?entityId:null;
    state.selectedSubstituteLeaveId=entityType==="substitute_batch"?entityId:null;
    state.selectedSubstituteDate=null; state.substituteCandidateMap={};
    await loadActiveUserData(); await renderDashboard();
    if(entityType==="substitute_batch"&&state.selectedSubstituteLeaveId){const dates=substituteBatchDates(state.selectedSubstituteLeaveId); if(dates.length)await openSubstituteDayPlanner(state.selectedSubstituteLeaveId,dates[0]);}
  }));

  document.querySelector("#notification-btn")?.addEventListener("click", () => showNotificationModal());

  document.querySelector("#system-settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button[type="submit"]');
    buttonLoading(btn, true, "กำลังบันทึก...");
    const payload = {
      system_name: document.querySelector("#setting-system-name").value.trim(),
      brand_short: document.querySelector("#setting-brand-short").value.trim(),
      school_name_th: document.querySelector("#setting-school-name").value.trim(),
      school_address_th: document.querySelector("#setting-school-address").value.trim(),
      education_office_th: document.querySelector("#setting-education-office").value.trim(),
      special_area_school: document.querySelector("#setting-special-area").checked,
      assistant_teacher_years: Number(document.querySelector("#setting-assistant-years").value || 2),
      qualification_standard_years: Number(document.querySelector("#setting-standard-years").value || 4),
      qualification_special_years: Number(document.querySelector("#setting-special-years").value || 3),
      leave_quota_term1_times: Number(document.querySelector("#setting-leave-term1-times").value || 0),
      leave_quota_term1_days: Number(document.querySelector("#setting-leave-term1-days").value || 0),
      leave_quota_term2_times: Number(document.querySelector("#setting-leave-term2-times").value || 0),
      leave_quota_term2_days: Number(document.querySelector("#setting-leave-term2-days").value || 0),
      updated_by: state.user.id,
    };
    const { error } = await supabase.from("system_settings").update(payload).eq("id", 1);
    buttonLoading(btn, false);
    if (error) return toast("บันทึกการตั้งค่าไม่สำเร็จ", error.message, "error");
    await loadPublicData();
    toast("บันทึกการตั้งค่าแล้ว", "ชื่อระบบและข้อมูลหัวเอกสารถูกอัปเดตแล้ว", "success");
    renderDashboard();
  });

  document.querySelectorAll("[data-user-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const user = state.pendingUsers.find(u => u.id === btn.dataset.userId);
      if (!user) return;
      if (["approve","reactivate"].includes(btn.dataset.userAction)) {
        showApprovalModal(user, btn.dataset.userAction);
      } else if (btn.dataset.userAction === "delete") {
        deleteUserAccount(user, btn);
      } else {
        runUserDecision(user, btn.dataset.userAction);
      }
    });
  });

  document.querySelectorAll("#new-home-visit").forEach(btn=>btn.addEventListener("click",()=>homeVisitCreateModal()));
  document.querySelector("#hv-year")?.addEventListener("change",e=>{state.homeVisitAcademicYear=Number(e.currentTarget.value);state.homeVisitClassId=null;renderDashboard();});
  document.querySelector("#hv-sem")?.addEventListener("change",e=>{state.homeVisitSemester=Number(e.currentTarget.value);state.homeVisitClassId=null;renderDashboard();});
  document.querySelector("#hv-class")?.addEventListener("change",e=>{state.homeVisitClassId=e.currentTarget.value;renderDashboard();});
  document.querySelectorAll("[data-open-home-visit]").forEach(btn=>btn.addEventListener("click",()=>{state.selectedHomeVisitId=btn.dataset.openHomeVisit;state.homeVisitStep=1;renderDashboard();}));
  document.querySelector("#home-visit-back")?.addEventListener("click",()=>{state.selectedHomeVisitId=null;state.homeVisitStep=1;renderDashboard();});
  document.querySelector("#delete-home-visit-record")?.addEventListener("click",()=>deleteSelectedHomeVisitRecord());

  document.querySelectorAll("[data-hv-step]").forEach(btn=>btn.addEventListener("click",()=>{state.homeVisitStep=Number(btn.dataset.hvStep);renderDashboard();}));
  document.querySelector("#hv-prev")?.addEventListener("click",()=>{state.homeVisitStep=Math.max(1,state.homeVisitStep-1);renderDashboard();});
  document.querySelector("#hv-next")?.addEventListener("click",async()=>{const r=homeVisitRecord();if(r&&await saveHomeVisitStep(r)){state.homeVisitStep=Math.min(6,state.homeVisitStep+1);renderDashboard();}});
  document.querySelector("#hv-save-step")?.addEventListener("click",async()=>{const r=homeVisitRecord();if(r)await saveHomeVisitStep(r);});
  document.querySelector("#hv-add-member")?.addEventListener("click",()=>{const body=document.querySelector("#hv-members-body"),count=body?.children.length||0;if(count>=10)return toast("สมาชิกสูงสุด 10 คน","ตามแบบ นร./กสศ.01 รองรับสมาชิก 1-10 คน","error");const tmp=document.createElement("tbody");tmp.innerHTML=householdRowsHtml({id:homeVisitRecord().id}).match(/<tbody id="hv-members-body">([\s\S]*?)<\/tbody>/)?.[1]||"";const row=tmp.querySelector("tr");if(row){row.querySelector("td").textContent=count+1;row.dataset.hvMember=`new-${count}`;body.appendChild(row);}});
  document.querySelector("#hv-members-body")?.addEventListener("click",e=>{const b=e.target.closest(".hv-member-remove");if(!b)return;const rows=[...document.querySelectorAll("#hv-members-body tr")];if(rows.length<=1)return;b.closest("tr")?.remove();[...document.querySelectorAll("#hv-members-body tr")].forEach((r,i)=>r.children[0].textContent=i+1);});
  document.querySelectorAll("[data-hv-photo-file]").forEach(input=>input.addEventListener("change",()=>{const file=input.files?.[0];if(file)showHomeVisitLocalPhotoPreview(input.dataset.hvPhotoFile,file);}));
  document.querySelectorAll("[data-upload-hv-photo]").forEach(btn=>btn.addEventListener("click",()=>{const r=homeVisitRecord();if(r)uploadHomeVisitPhoto(r,btn.dataset.uploadHvPhoto);}));
  if(state.currentView==="module:home_visit_management"&&state.selectedHomeVisitId)hydrateHomeVisitPhotoPreviews();
  document.querySelectorAll("[data-hv-sign]").forEach(btn=>btn.addEventListener("click",()=>{const r=homeVisitRecord();if(r)homeVisitSignatureModal(r,btn.dataset.hvSign);}));
  document.querySelector("#toggle-home-visit-complete")?.addEventListener("click",async()=>{const r=homeVisitRecord();if(!r)return;const target=r.status==="complete"?"draft":"complete",{error}=await supabase.from("home_visit_records").update({status:target}).eq("id",r.id);if(error)return toast("เปลี่ยนสถานะไม่สำเร็จ",error.message,"error");await renderDashboard();});
  document.querySelectorAll("[data-export-home-visit]").forEach(btn=>btn.addEventListener("click",()=>{const r=state.homeVisitRecords.find(x=>x.id===btn.dataset.exportHomeVisit);if(r)homeVisitPdfPreview(r);}));
  document.querySelector("#export-home-visit-class")?.addEventListener("click",()=>homeVisitPdfPreview(homeVisitFilteredRecords()));
  document.querySelector("#export-all-class-timetables")?.addEventListener("click",()=>{const ids=timetableFilteredClasses({visibleOnly:true}).filter(c=>new Set(timetableStudentExportClassIds()).has(c.id)).map(c=>c.id);timetableBatchPdfPreview("class",ids);});
  document.querySelector("#export-all-teacher-timetables")?.addEventListener("click",()=>timetableBatchPdfPreview("teacher",state.timetableTeachers.map(t=>t.id)));

  document.querySelectorAll("[data-budget-registry-dept]").forEach(btn=>btn.addEventListener("click",()=>{state.budgetRegistryDepartmentFilter=btn.dataset.budgetRegistryDept;renderDashboard();}));
  document.querySelector("#budget-control-settings")?.addEventListener("click",()=>budgetControlSettingsModal());
  document.querySelector("#configure-budget-signers")?.addEventListener("click",()=>{const r=selectedBudgetRequest();if(r)budgetSignersModal(r);});
  document.querySelectorAll("[data-sign-budget-slot]").forEach(btn=>btn.addEventListener("click",()=>{const r=selectedBudgetRequest();if(r)budgetSignerActionModal(r,btn.dataset.signBudgetSlot);}));
  document.querySelectorAll("[data-project-view]").forEach(btn=>btn.addEventListener("click",()=>{state.projectView=btn.dataset.projectView;state.selectedProjectId=null;state.selectedProjectActivityId=null;state.selectedDisbursementId=null;renderDashboard();}));
  document.querySelector("#project-year")?.addEventListener("change",e=>{state.projectAcademicYear=Number(e.currentTarget.value);renderDashboard();});
  document.querySelectorAll("[data-project-department]").forEach(btn=>btn.addEventListener("click",()=>{state.projectDepartmentFilter=btn.dataset.projectDepartment;renderDashboard();}));
  document.querySelectorAll("#new-school-project").forEach(btn=>btn.addEventListener("click",()=>projectModal()));
  document.querySelectorAll("[data-edit-project]").forEach(btn=>btn.addEventListener("click",()=>{const p=state.schoolProjects.find(x=>x.id===btn.dataset.editProject);if(p)projectModal(p);}));
  document.querySelectorAll("[data-toggle-project]").forEach(btn=>btn.addEventListener("click",()=>{btn.classList.toggle("open");document.querySelector(`[data-project-activities="${btn.dataset.toggleProject}"]`)?.classList.toggle("open");}));
  document.querySelectorAll("[data-open-project]").forEach(btn=>btn.addEventListener("click",()=>{state.selectedProjectId=btn.dataset.openProject;state.selectedProjectActivityId=null;state.selectedDisbursementId=null;renderDashboard();}));
  document.querySelector("#project-back")?.addEventListener("click",()=>{state.selectedProjectId=null;state.selectedProjectActivityId=null;renderDashboard();});
  document.querySelector("#delete-school-project")?.addEventListener("click",()=>deleteSelectedProject());

  document.querySelector("#new-project-activity")?.addEventListener("click",()=>{const p=selectedProject();if(p)projectActivityModal(p);});
  document.querySelectorAll("[data-open-activity]").forEach(btn=>btn.addEventListener("click",()=>{const a=state.projectActivities.find(x=>x.id===btn.dataset.openActivity);if(a){state.selectedProjectId=a.project_id;state.selectedProjectActivityId=a.id;renderDashboard();}}));
  document.querySelector("#activity-back")?.addEventListener("click",()=>{state.selectedProjectActivityId=null;renderDashboard();});
  document.querySelector("#delete-project-activity")?.addEventListener("click",()=>deleteSelectedProjectActivity());

  document.querySelectorAll("[data-new-budget-activity]").forEach(btn=>btn.addEventListener("click",()=>{const a=state.projectActivities.find(x=>x.id===btn.dataset.newBudgetActivity),p=state.schoolProjects.find(x=>x.id===a?.project_id);if(p&&a)budgetRequestModal(p,a);}));
  document.querySelectorAll("[data-new-budget-project]").forEach(btn=>btn.addEventListener("click",()=>{const p=state.schoolProjects.find(x=>x.id===btn.dataset.newBudgetProject);if(p)budgetRequestModal(p);}));
  document.querySelectorAll("[data-open-budget-request]").forEach(btn=>btn.addEventListener("click",()=>{state.selectedProjectId=null;state.selectedProjectActivityId=null;state.selectedDisbursementId=btn.dataset.openBudgetRequest;state.projectView="budget";renderDashboard();}));
  document.querySelector("#budget-request-back")?.addEventListener("click",()=>{state.selectedDisbursementId=null;state.projectView="budget";renderDashboard();});
  document.querySelector("#delete-budget-request")?.addEventListener("click",()=>deleteSelectedBudgetRequest());

  document.querySelector("#prepare-budget-request")?.addEventListener("click",()=>{const r=selectedBudgetRequest();if(r)prepareBudgetRequest(r);});
  document.querySelector("#budget-request-pdf")?.addEventListener("click",()=>{const r=selectedBudgetRequest();if(r)budgetRequestPdfPreview(r);});
  document.querySelector("#mark-budget-paid")?.addEventListener("click",async()=>{const r=selectedBudgetRequest();if(!r||!confirm(`บันทึกว่าเบิกจ่าย ${money(r.amount)} บาท แล้วหรือไม่?`))return;const {error}=await supabase.from("budget_disbursements").update({status:"paid"}).eq("id",r.id);if(error)return toast("บันทึกไม่สำเร็จ",error.message,"error");await renderDashboard();});
  document.querySelector("#project-pdf")?.addEventListener("click",()=>{const p=selectedProject();if(p)projectPdfPreview(p);});
  document.querySelector("#activity-pdf")?.addEventListener("click",()=>{const a=state.projectActivities.find(x=>x.id===state.selectedProjectActivityId),p=state.schoolProjects.find(x=>x.id===a?.project_id);if(p&&a)projectPdfPreview(p,a);});
  document.querySelectorAll("[data-notification-budget]").forEach(el=>el.addEventListener("click",async()=>{const id=el.dataset.notificationBudget;await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("recipient_id",state.user.id).eq("entity_type","budget_disbursement").eq("entity_id",id);state.currentView="module:project_management";state.projectView="budget";state.selectedDisbursementId=id;await loadActiveUserData();await renderDashboard();}));

  document.querySelectorAll("[data-user-academic]").forEach(btn => btn.addEventListener("click", () => {
    const user=state.pendingUsers.find(u=>u.id===btn.dataset.userAcademic);
    if(user) timetableTeacherCapabilityModal(user);
  }));

  document.querySelectorAll("[data-timetable-view]").forEach(btn=>btn.addEventListener("click",()=>{
    state.timetableView=btn.dataset.timetableView;
    renderDashboard();
  }));
  document.querySelector("#timetable-year")?.addEventListener("change",e=>{state.timetableAcademicYear=Number(e.currentTarget.value);state.timetableSelectedClassId=null;state.timetableExportClassId=null;renderDashboard();});
  document.querySelector("#timetable-semester")?.addEventListener("change",e=>{state.timetableSemester=Number(e.currentTarget.value);state.timetableSelectedClassId=null;state.timetableExportClassId=null;renderDashboard();});
  document.querySelector("#timetable-class-select")?.addEventListener("change",e=>{state.timetableSelectedClassId=e.currentTarget.value||null;renderDashboard();});
  document.querySelectorAll("[data-select-timetable-class]").forEach(btn=>btn.addEventListener("click",()=>{state.timetableSelectedClassId=btn.dataset.selectTimetableClass;renderDashboard();}));
  document.querySelectorAll("#new-timetable-class").forEach(btn=>btn.addEventListener("click",()=>timetableClassModal()));
  document.querySelectorAll("#new-timetable-subject").forEach(btn=>btn.addEventListener("click",()=>timetableSubjectModal()));
  document.querySelectorAll("#new-teaching-assignment").forEach(btn=>btn.addEventListener("click",()=>teachingAssignmentModal()));
  document.querySelectorAll("[data-open-period-settings]").forEach(btn=>btn.addEventListener("click",()=>{state.timetableView="periods";renderDashboard();}));
  document.querySelectorAll("[data-configure-periods]").forEach(btn=>btn.addEventListener("click",()=>timetablePeriodModal(btn.dataset.configurePeriods)));
  document.querySelectorAll("[data-period-mode-shared]").forEach(btn=>btn.addEventListener("click",()=>setTimetablePeriodMode(btn.dataset.periodModeShared,"shared")));
  document.querySelectorAll("[data-period-mode-custom]").forEach(btn=>btn.addEventListener("click",()=>setTimetablePeriodMode(btn.dataset.periodModeCustom,"custom")));
  document.querySelector("#edit-school-period-template")?.addEventListener("click",()=>timetableSchoolPeriodTemplateModal());
  document.querySelector("#create-school-period-template")?.addEventListener("click",()=>timetableSchoolPeriodTemplateModal());
  document.querySelector("#apply-school-periods-all")?.addEventListener("click",()=>applySchoolPeriodTemplateToAll());
  document.querySelector("#toggle-timetable-publish")?.addEventListener("click",()=>toggleTimetablePublish());
  document.querySelector("#clear-timetable")?.addEventListener("click",()=>clearSelectedTimetable());
  document.querySelectorAll("[data-remove-timetable-entry]").forEach(btn=>btn.addEventListener("click",async e=>{
    e.stopPropagation();const {error}=await supabase.from("timetable_entries").delete().eq("id",btn.dataset.removeTimetableEntry);if(error)return toast("นำคาบออกไม่ได้",error.message,"error");await renderDashboard();
  }));
  document.querySelectorAll("[data-delete-timetable-class]").forEach(btn=>btn.addEventListener("click",async()=>{
    const c=state.timetableClasses.find(x=>x.id===btn.dataset.deleteTimetableClass);if(!c||!confirm(`ลบ ${schoolClassLabel(c)} และข้อมูลตารางทั้งหมดหรือไม่?`))return;
    const {error}=await supabase.from("school_classes").delete().eq("id",c.id);if(error)return toast("ลบชั้น/ห้องไม่สำเร็จ",error.message,"error");state.timetableSelectedClassId=null;await renderDashboard();
  }));
  document.querySelectorAll("[data-delete-timetable-subject]").forEach(btn=>btn.addEventListener("click",async()=>{
    if(!confirm("ลบรายวิชานี้หรือไม่?"))return;const {error}=await supabase.from("academic_subjects").delete().eq("id",btn.dataset.deleteTimetableSubject);if(error)return toast("ลบรายวิชาไม่ได้",error.message,"error");await renderDashboard();
  }));
  document.querySelectorAll("[data-delete-teaching-assignment]").forEach(btn=>btn.addEventListener("click",async()=>{
    if(!confirm("ลบการกำหนดวิชา/ครูนี้หรือไม่? คาบที่จัดไว้ของรายการนี้จะถูกนำออกด้วย"))return;const {error}=await supabase.from("teaching_assignments").delete().eq("id",btn.dataset.deleteTeachingAssignment);if(error)return toast("ลบการกำหนดการสอนไม่สำเร็จ",error.message,"error");await renderDashboard();
  }));
  document.querySelectorAll("[data-timetable-assignment-drag]").forEach(el=>el.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",JSON.stringify({kind:"assignment",id:el.dataset.timetableAssignmentDrag}))));
  document.querySelectorAll("[data-timetable-entry-drag]").forEach(el=>el.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",JSON.stringify({kind:"entry",id:el.dataset.timetableEntryDrag}))));
  document.querySelectorAll("[data-timetable-drop]").forEach(cell=>{
    cell.addEventListener("dragover",e=>{e.preventDefault();cell.classList.add("drag-over");});
    cell.addEventListener("dragleave",()=>cell.classList.remove("drag-over"));
    cell.addEventListener("drop",async e=>{e.preventDefault();cell.classList.remove("drag-over");try{const payload=JSON.parse(e.dataTransfer.getData("text/plain"));await dropTimetableItem(payload,cell.dataset.day,cell.dataset.periodId);}catch{toast("ลากวางไม่สำเร็จ","ข้อมูล Drag & Drop ไม่ถูกต้อง","error");}});
  });
  document.querySelector("#timetable-export-class")?.addEventListener("change",e=>state.timetableExportClassId=e.currentTarget.value||null);
  document.querySelector("#timetable-export-teacher")?.addEventListener("change",e=>state.timetableExportTeacherId=e.currentTarget.value||state.user.id);
  document.querySelector("#export-class-timetable")?.addEventListener("click",()=>timetablePdfPreview("class",state.timetableExportClassId));
  document.querySelector("#export-teacher-timetable")?.addEventListener("click",()=>timetablePdfPreview("teacher",state.timetableExportTeacherId||state.user.id));
  document.querySelectorAll("[data-export-class-timetable]").forEach(btn=>btn.addEventListener("click",()=>timetablePdfPreview("class",btn.dataset.exportClassTimetable)));
  document.querySelectorAll("[data-export-teacher-timetable]").forEach(btn=>btn.addEventListener("click",()=>timetablePdfPreview("teacher",btn.dataset.exportTeacherTimetable)));
  document.querySelectorAll("[data-preview-class-timetable]").forEach(btn=>btn.addEventListener("click",()=>{state.timetableSelectedClassId=btn.dataset.previewClassTimetable;state.timetableView="homeroom";timetablePdfPreview("class",btn.dataset.previewClassTimetable);}));

  document.querySelectorAll("[data-plan-mode]").forEach(btn => btn.addEventListener("click", () => {
    state.lessonPlanMode = btn.dataset.planMode;
    state.lessonTeacherView = "all";
    state.lessonTeacherId = null;
    state.selectedLessonPlanId = null;
    state.lessonDetail = null;
    renderDashboard();
  }));
  document.querySelector("#change-plan-mode")?.addEventListener("click", () => {
    state.lessonPlanMode = null;
    state.lessonTeacherView = "all";
    state.lessonTeacherId = null;
    state.selectedLessonPlanId = null;
    state.lessonDetail = null;
    renderDashboard();
  });
  document.querySelectorAll("[data-lesson-view]").forEach(btn => btn.addEventListener("click", () => {
    state.lessonTeacherView = btn.dataset.lessonView;
    if (state.lessonTeacherView !== "teachers") state.lessonTeacherId = null;
    renderDashboard();
  }));
  document.querySelectorAll("[data-teacher-id]").forEach(btn => btn.addEventListener("click", () => {
    state.lessonTeacherView = "teachers";
    state.lessonTeacherId = btn.dataset.teacherId;
    renderDashboard();
  }));
  document.querySelector("#teacher-directory-back")?.addEventListener("click", () => {
    state.lessonTeacherView = "teachers";
    state.lessonTeacherId = null;
    renderDashboard();
  });
  document.querySelector("#new-lesson-plan")?.addEventListener("click", () => lessonPlanModal(null, state.lessonPlanMode || "weekly"));
  document.querySelector("#refresh-lessons")?.addEventListener("click", () => renderDashboard());
  document.querySelector("#manage-signatures")?.addEventListener("click", () => signatureManagerModal());
  document.querySelector("#lesson-detail-back")?.addEventListener("click", () => {
    const type = state.lessonDetail?.plan?.plan_type || "weekly";
    state.lessonPlanMode = type;
    state.selectedLessonPlanId = null;
    state.lessonDetail = null;
    renderDashboard();
  });
  document.querySelector("#preview-a4-plan")?.addEventListener("click", () => lessonA4PreviewModal());
  document.querySelector("#download-approved-pdf")?.addEventListener("click", () => downloadApprovedPdf());
  document.querySelector("#generate-approved-pdf")?.addEventListener("click", e => generateApprovedPdfFromDetail(e.currentTarget));
  document.querySelector("#edit-lesson-plan")?.addEventListener("click", () => lessonPlanModal(state.lessonDetail?.plan));
  document.querySelector("#submit-lesson-plan")?.addEventListener("click", () => submitSelectedLessonPlan());
  document.querySelector("#delete-draft-plan")?.addEventListener("click", () => deleteDraftLessonPlan());
  document.querySelectorAll(".lesson-open").forEach(btn => btn.addEventListener("click", async () => { state.selectedLessonPlanId = btn.dataset.planId; await renderDashboard(); }));
  document.querySelectorAll(".file-open").forEach(btn => btn.addEventListener("click", () => { const f = state.lessonDetail?.files.find(x => x.id === btn.dataset.fileId); if (f) openPrivateFile(f); }));
  document.querySelectorAll(".file-delete").forEach(btn => btn.addEventListener("click", () => { const f = state.lessonDetail?.files.find(x => x.id === btn.dataset.fileId); if (f) deleteLessonFile(f); }));
  document.querySelectorAll("[data-review-role]").forEach(btn => btn.addEventListener("click", () => reviewModal(btn.dataset.reviewRole)));
  document.querySelectorAll(".timeline-signature-preview").forEach(btn => btn.addEventListener("click", () => previewSignature(btn.dataset.sigId)));
}

function showNotificationModal() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <div><h3>การแจ้งเตือน</h3><p>${state.notifications.filter(n => !n.read_at).length} รายการที่ยังไม่ได้อ่าน</p></div>
        <button class="modal-close">×</button>
      </div>
      ${notificationList(20)}
      <div class="modal-actions notification-actions">
        <button class="btn btn-secondary" id="mark-all-read">ทำเครื่องหมายว่าอ่านแล้ว</button>
        <button class="btn btn-danger" id="clear-all-notifications">ล้างการแจ้งเตือนทั้งหมด</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll("[data-notification-plan]").forEach(el => el.addEventListener("click", async () => {
    const id = el.dataset.notificationPlan;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("entity_id", id).eq("recipient_id", state.user.id);
    state.currentView = "module:lesson_plans"; state.selectedLessonPlanId = id; modal.remove(); await loadActiveUserData(); await renderDashboard();
  }));
  modal.querySelectorAll("[data-notification-personnel]").forEach(el => el.addEventListener("click", async () => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id",state.user.id).eq("type","personnel_profile_required").is("read_at",null);
    state.currentView = "module:personnel_records";
    state.selectedPersonnelUserId = state.user.id;
    modal.remove();
    await loadActiveUserData();
    await renderDashboard();
  }));
  modal.querySelectorAll("[data-notification-leave]").forEach(el => el.addEventListener("click", async () => {
    const id=el.dataset.notificationLeave;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("entity_id",id).eq("recipient_id",state.user.id);
    state.currentView="module:leave_management";
    state.selectedLeaveRequestId=id;
    modal.remove();
    await loadActiveUserData();
    await renderDashboard();
  }));
  modal.querySelectorAll("[data-notification-substitute]").forEach(el => el.addEventListener("click", async () => {
    const entityId=el.dataset.notificationSubstitute;
    const entityType=el.dataset.substituteEntity;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id",state.user.id).eq("entity_type",entityType).eq("entity_id",entityId);
    state.currentView="module:substitute_teaching";
    state.selectedSubstituteLessonId=entityType==="substitute_lesson"?entityId:null;
    state.selectedSubstituteLeaveId=entityType==="substitute_batch"?entityId:null;
    state.selectedSubstituteDate=null;
    state.substituteCandidateMap={};
    modal.remove();
    await loadActiveUserData();
    await renderDashboard();
    if(entityType==="substitute_batch"&&state.selectedSubstituteLeaveId){const dates=substituteBatchDates(state.selectedSubstituteLeaveId); if(dates.length)await openSubstituteDayPlanner(state.selectedSubstituteLeaveId,dates[0]);}
  }));
  modal.querySelectorAll("[data-notification-budget]").forEach(el => el.addEventListener("click", async () => {
    const id=el.dataset.notificationBudget; await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("recipient_id",state.user.id).eq("entity_type","budget_disbursement").eq("entity_id",id);
    state.currentView="module:project_management"; state.projectView="budget"; state.selectedProjectId=null; state.selectedProjectActivityId=null; state.selectedDisbursementId=id; modal.remove(); await loadActiveUserData(); await renderDashboard();
  }));
  modal.querySelector(".modal-close").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
  modal.querySelector("#mark-all-read")?.addEventListener("click", async () => {
    const unread = state.notifications.filter(n => !n.read_at).map(n => n.id);
    if (unread.length) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unread);
    }
    modal.remove();
    await loadActiveUserData();
    renderDashboard();
  });
  modal.querySelector("#clear-all-notifications")?.addEventListener("click", async () => {
    if (!confirm("ล้างการแจ้งเตือนทั้งหมดออกจาก Notification Center หรือไม่? ข้อมูล Workflow จริงจะไม่ถูกลบ")) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("notifications")
      .update({ read_at: now, dismissed_at: now })
      .eq("recipient_id", state.user.id)
      .is("dismissed_at", null);
    if (error) return toast("ล้างการแจ้งเตือนไม่สำเร็จ",error.message,"error");
    modal.remove();
    await loadActiveUserData();
    toast("ล้างการแจ้งเตือนแล้ว","ซ่อนรายการเดิมทั้งหมดจาก Notification Center โดยไม่ลบประวัติ Workflow","success");
    renderDashboard();
  });
}

function showApprovalModal(user, action) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <div><h3>${action === "approve" ? "อนุมัติผู้ใช้งาน" : "เปิดใช้งานบัญชี"}</h3><p>${escapeHtml(user.full_name || user.email)}</p></div>
        <button class="modal-close">×</button>
      </div>
      <div class="form-grid">
        <div class="approval-profile-summary">
          <div><span>กลุ่มงานที่ผู้สมัครแจ้ง</span><strong>${escapeHtml(state.departments.find(d => d.id === user.requested_department_id)?.name_th || "—")}</strong></div>
          <div><span>กลุ่มสาระ / ระดับ</span><strong>${escapeHtml(state.subjectGroups.find(s => s.id === user.subject_group_id)?.name_th || "—")}</strong></div>
        </div>
        <div class="field">
          <label>กำหนดสิทธิ์</label>
          <select class="select" id="role-select">
            <option value="teacher" ${user.role === "teacher" ? "selected" : ""}>Teacher — ครูผู้สอน</option>
            <option value="department_head" ${user.role === "department_head" ? "selected" : ""}>Head of Department — หัวหน้ากลุ่มงาน</option>
            <option value="director" ${user.role === "director" ? "selected" : ""}>Director — ผู้บริหาร</option>
          </select>
        </div>
        <div class="field hidden" id="department-field">
          <label>กลุ่มงานที่รับผิดชอบ</label>
          <select class="select" id="department-select">
            <option value="">เลือกกลุ่มงาน</option>
            ${state.departments.map(d => `<option value="${d.id}" ${(user.department_id || user.requested_department_id) === d.id ? "selected" : ""}>${escapeHtml(d.name_th)}</option>`).join("")}
          </select>
        </div>
        <div class="helper">Teacher และ Director ไม่ผูกกับกลุ่มงาน ส่วน Head of Department ต้องกำหนดกลุ่มงาน 1 กลุ่ม</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost modal-cancel">ยกเลิก</button>
        <button class="btn btn-primary" id="confirm-approval">${action === "approve" ? "อนุมัติบัญชี" : "เปิดใช้งาน"}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const roleSelect = modal.querySelector("#role-select");
  const depField = modal.querySelector("#department-field");
  const sync = () => depField.classList.toggle("hidden", roleSelect.value !== "department_head");
  sync();
  roleSelect.addEventListener("change", sync);

  const close = () => modal.remove();
  modal.querySelector(".modal-close").addEventListener("click", close);
  modal.querySelector(".modal-cancel").addEventListener("click", close);
  modal.addEventListener("click", e => { if (e.target === modal) close(); });

  modal.querySelector("#confirm-approval").addEventListener("click", async (e) => {
    const role = roleSelect.value;
    const departmentId = modal.querySelector("#department-select").value || null;
    if (role === "department_head" && !departmentId) {
      toast("กรุณาเลือกกลุ่มงาน", "หัวหน้ากลุ่มงานต้องมี Department", "error");
      return;
    }
    const btn = e.currentTarget;
    buttonLoading(btn, true, "กำลังบันทึก...");
    const { error } = await supabase.rpc("admin_review_user", {
      p_user_id: user.id,
      p_decision: action,
      p_role: role,
      p_department_id: role === "department_head" ? departmentId : null,
    });
    buttonLoading(btn, false);
    if (error) {
      toast("ดำเนินการไม่สำเร็จ", error.message, "error");
      return;
    }
    close();
    toast("บันทึกเรียบร้อย", `${user.full_name || user.email} ได้รับการอัปเดตแล้ว`, "success");
    await loadActiveUserData();
    renderDashboard();
  });
}

async function deleteUserAccount(user, triggerButton = null) {
  const display = user.full_name || user.email || "ผู้ใช้งาน";
  const confirmed = window.confirm(`ลบผู้ใช้ “${display}” ออกจากระบบหรือไม่?\n\nบัญชีนี้จะไม่สามารถเข้าสู่ระบบได้อีก แต่ประวัติแผน Workflow และ Audit จะถูกเก็บไว้เพื่อการตรวจสอบย้อนหลัง`);
  if (!confirmed) return;

  buttonLoading(triggerButton, true, "กำลังลบ...");
  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
    body: { user_id: user.id },
  });
  buttonLoading(triggerButton, false);

  if (error) {
    let message = error.message || "ไม่สามารถลบผู้ใช้ได้";
    try {
      const payload = await error.context?.json?.();
      if (payload?.error) message = payload.error;
    } catch {}
    toast("ลบผู้ใช้ไม่สำเร็จ", message, "error");
    return;
  }
  if (data?.error) {
    toast("ลบผู้ใช้ไม่สำเร็จ", data.error, "error");
    return;
  }

  toast("ลบผู้ใช้แล้ว", `${display} ถูกนำออกจากการเข้าใช้งาน แต่ประวัติเดิมยังถูกเก็บไว้`, "success");
  await loadActiveUserData();
  renderDashboard();
}

async function runUserDecision(user, action) {
  const label = action === "reject" ? "ปฏิเสธ" : "ระงับ";
  if (!window.confirm(`${label}บัญชีของ ${user.full_name || user.email} ?`)) return;
  const { error } = await supabase.rpc("admin_review_user", {
    p_user_id: user.id,
    p_decision: action,
    p_role: null,
    p_department_id: null,
  });
  if (error) {
    toast("ดำเนินการไม่สำเร็จ", error.message, "error");
    return;
  }
  toast("อัปเดตบัญชีแล้ว", `${label}บัญชีเรียบร้อย`, "success");
  await loadActiveUserData();
  renderDashboard();
}

function renderSystemError(title, message) {
  app.innerHTML = `
    <main class="center-page">
      <section class="status-card">
        <div class="status-icon">!</div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        <div class="status-actions"><button class="btn btn-primary" id="retry">ลองใหม่</button><button class="btn btn-ghost" id="error-signout">ออกจากระบบ</button></div>
      </section>
    </main>`;
  document.querySelector("#retry").addEventListener("click", bootstrapApp);
  document.querySelector("#error-signout").addEventListener("click", async () => { await supabase.auth.signOut(); renderAuth("signin"); });
}

function subscribeRealtime() {
  return supabase
    .channel("school-os:user-events", { config: { private: false } })
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, async () => {
      if (!state.user || state.profile?.account_status !== "active") return;
      await loadActiveUserData();
      await renderDashboard();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "lesson_plans" }, async () => {
      if (!state.user || state.profile?.account_status !== "active") return;
      if (state.currentView === "module:lesson_plans") await renderDashboard();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "workflow_actions" }, async () => {
      if (!state.user || state.profile?.account_status !== "active") return;
      if (state.currentView === "module:lesson_plans" && state.selectedLessonPlanId) await renderDashboard();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "leave_requests" }, async () => {
      if (!state.user || state.profile?.account_status !== "active") return;
      if (state.currentView === "module:leave_management") await renderDashboard();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "leave_actions" }, async () => {
      if (!state.user || state.profile?.account_status !== "active") return;
      if (state.currentView === "module:leave_management") await renderDashboard();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "timetable_profiles" }, async () => {
      if (!state.user || state.profile?.account_status !== "active") return;
      if (state.currentView === "module:timetable_management") await renderDashboard();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "timetable_entries" }, async () => {
      if (!state.user || state.profile?.account_status !== "active") return;
      if (state.currentView === "module:timetable_management") await renderDashboard();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "substitute_lessons" }, async () => {
      if (!state.user || state.profile?.account_status !== "active") return;
      if (state.currentView === "module:substitute_teaching") await renderDashboard();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "substitute_actions" }, async () => {
      if (!state.user || state.profile?.account_status !== "active") return;
      if (state.currentView === "module:substitute_teaching" && state.selectedSubstituteLessonId) await renderDashboard();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "school_projects" }, async () => { if(state.currentView==="module:project_management") await renderDashboard(); })
    .on("postgres_changes", { event: "*", schema: "public", table: "project_activities" }, async () => { if(state.currentView==="module:project_management") await renderDashboard(); })
    .on("postgres_changes", { event: "*", schema: "public", table: "budget_disbursements" }, async () => { if(state.currentView==="module:project_management") await renderDashboard(); })
    .on("postgres_changes", { event: "*", schema: "public", table: "home_visit_records" }, async () => { if(state.currentView==="module:home_visit_management") await renderDashboard(); })
    .on("postgres_changes", { event: "*", schema: "public", table: "home_visit_household_members" }, async () => { if(state.currentView==="module:home_visit_management"&&state.selectedHomeVisitId) await renderDashboard(); })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: state.user ? `id=eq.${state.user.id}` : undefined }, async () => {
      if (!state.user) return;
      await bootstrapApp();
    })
    .subscribe();
}

let realtimeChannel = null;

supabase.auth.onAuthStateChange(async (event, session) => {
  state.session = session;
  state.user = session?.user || null;

  if (realtimeChannel) {
    await supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  if (state.user) {
    setTimeout(async () => {
      await bootstrapApp();
      realtimeChannel = subscribeRealtime();
    }, 0);
  } else {
    state.profile = null;
    renderAuth("signin");
  }
});

await loadPublicData();
await bootstrapApp();
if (state.user) realtimeChannel = subscribeRealtime();
