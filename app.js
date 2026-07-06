/* =============================================
   Reto 60 Días · Buenos Hábitos
   app.js — v5.0 Firebase
   ============================================= */

/* ─── Firebase config ─── */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA611-DTiBzEVCWrgx3viz97SPi5_MeQnM",
  authDomain: "reto60dias-kuale.firebaseapp.com",
  projectId: "reto60dias-kuale",
  storageBucket: "reto60dias-kuale.firebasestorage.app",
  messagingSenderId: "1035947441835",
  appId: "1:1035947441835:web:bff8066f84a9af1a4341ee"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth        = getAuth(firebaseApp);
const db          = getFirestore(firebaseApp);

/* ─── Hábitos por defecto ─── */
const DEFAULT_HABITS = [
  { icon: "💧", name: "Tomar 2L de agua" },
  { icon: "🏃", name: "30 min de actividad física" },
  { icon: "🥗", name: "Alimentación Saludable" },
  { icon: "😴", name: "Dormir 7-8 horas" },
  { icon: "🚫", name: "Sin comida chatarra" },
  { icon: "🧘", name: "5 min de mindfulness" },
  { icon: "📵", name: "Sin pantallas 1h antes de dormir" },
  { icon: "📱", name: "Máx. 30 min en redes sociales" },
  { icon: "🚶", name: "Pausas Activas" },
  { icon: "🙏", name: "Reconocer 1 logro del día" },
];

/* ─── Cards por defecto ─── */
const DEFAULT_MINDFULNESS = [
  {icon:"🌬️",title:"Respiración 4-7-8",time:"5 min",desc:"Inhala 4 seg, retén 7, exhala 8. Repite 4 veces. Reduce el estrés de inmediato.",link:""},
  {icon:"🧍",title:"Escaneo corporal",time:"5 min",desc:"Recorre tu cuerpo mentalmente de pies a cabeza. ¿Dónde hay tensión? Suéltala al exhalar.",link:""},
  {icon:"👁️",title:"Los 5 sentidos",time:"3-5 min",desc:"5 cosas que ves, 4 que tocas, 3 que escuchas, 2 que hueles, 1 que saboreas.",link:""},
  {icon:"🙏",title:"Minuto de gratitud",time:"2-5 min",desc:"Una cosa que salió bien hoy. Visualízala y deja que genere sensación positiva.",link:""},
  {icon:"⬜",title:"Respiración cuadrada",time:"4-5 min",desc:"Inhala 4 → retén 4 → exhala 4 → retén 4. Repite 5 veces.",link:""},
];

const DEFAULT_PAUSA = [
  {icon:"🔄",title:"Movilidad de cuello",time:"30 seg",desc:"Inclina la cabeza hacia adelante y atrás. Gira suavemente a ambos lados. Realiza movimientos lentos y controlados.",link:""},
  {icon:"💪",title:"Rotación de hombros",time:"30 seg",desc:"Haz círculos hacia adelante durante 15 segundos. Haz círculos hacia atrás durante 15 segundos.",link:""},
  {icon:"🙆",title:"Estiramiento de brazos y espalda",time:"30 seg",desc:"Extiende ambos brazos al frente. Entrelaza las manos y empuja suavemente hacia adelante. Mantén 15 segundos y repite elevando los brazos sobre la cabeza.",link:""},
  {icon:"🏋️",title:"Sentadillas",time:"1 minuto",desc:"Realiza 10 a 15 sentadillas a ritmo moderado. Mantén la espalda recta y los pies separados al ancho de los hombros.",link:""},
  {icon:"🚶",title:"Marcha en el lugar",time:"1 minuto",desc:"Eleva ligeramente las rodillas. Balancea los brazos de forma natural. Mantén un ritmo cómodo.",link:""},
  {icon:"👟",title:"Elevación de talones",time:"30 seg",desc:"Ponte de pie. Eleva los talones y mantente en puntas por un segundo. Baja lentamente y repite.",link:""},
  {icon:"🦵",title:"Estiramiento de piernas",time:"30 seg",desc:"Apoya una pierna al frente. Inclina ligeramente el cuerpo hacia adelante. Mantén 15 segundos por cada pierna.",link:""},
  {icon:"🌬️",title:"Respiración profunda",time:"30 seg",desc:"Inhala por la nariz durante 4 segundos. Mantén el aire 2 segundos. Exhala lentamente por la boca durante 6 segundos.",link:""},
];

const DAYS        = 60;
const WEEK_DAYS   = 7;
const TOTAL_WEEKS = Math.ceil(DAYS / WEEK_DAYS);
const ADMIN_USER  = "admin";
const ADMIN_PASS  = "admin";

/* ─── App state ─── */
let HABITS            = [];
let MINDFULNESS_CARDS = [];
let PAUSA_CARDS       = [];
let NOTIF_SCHEDULE    = [];
let curUser = null;
let currentUid = null;
let currentEmail = null;
let isAdmin     = false;
let curTab      = "tracker";
let curWeek     = 0;
let uData       = { data: {}, joinDate: "", password: "" };
let adminChart1 = null;
let adminChart2 = null;
let _midnightTimer = null;
let _pendingDelete = null; // alias; se usa _pendingDeleteName en deleteUser()

/* ══════════════════════════════════════
   FIREBASE HELPERS
══════════════════════════════════════ */

/* ── Hábitos ── */
async function loadHabits() {
  try {
    const snap = await getDoc(doc(db, "config", "habits"));
    if (snap.exists() && snap.data().list) {
      HABITS = snap.data().list;
    } else {
      HABITS = DEFAULT_HABITS.map(h => ({ ...h }));
      await saveHabits();
    }
  } catch {
    HABITS = DEFAULT_HABITS.map(h => ({ ...h }));
  }
}

async function saveHabits() {
  await setDoc(doc(db, "config", "habits"), { list: HABITS });
}

/* ── Cards de Mindfulness y Pausa Activa ── */
async function loadCards() {
  try {
    const mSnap = await getDoc(doc(db, "config", "mindfulness"));
    if (mSnap.exists() && mSnap.data().list) {
      MINDFULNESS_CARDS = mSnap.data().list;
    } else {
      MINDFULNESS_CARDS = DEFAULT_MINDFULNESS.map(c => ({ ...c }));
      await setDoc(doc(db, "config", "mindfulness"), { list: MINDFULNESS_CARDS });
    }
  } catch { MINDFULNESS_CARDS = DEFAULT_MINDFULNESS.map(c => ({ ...c })); }

  try {
    const pSnap = await getDoc(doc(db, "config", "pausaActiva"));
    if (pSnap.exists() && pSnap.data().list) {
      PAUSA_CARDS = pSnap.data().list;
    } else {
      PAUSA_CARDS = DEFAULT_PAUSA.map(c => ({ ...c }));
      await setDoc(doc(db, "config", "pausaActiva"), { list: PAUSA_CARDS });
    }
  } catch { PAUSA_CARDS = DEFAULT_PAUSA.map(c => ({ ...c })); }
}

async function saveMindfulness() {
  await setDoc(doc(db, "config", "mindfulness"), { list: MINDFULNESS_CARDS });
}

async function savePausa() {
  await setDoc(doc(db, "config", "pausaActiva"), { list: PAUSA_CARDS });
}

/* ── Notificaciones ── */
const DEFAULT_NOTIF = [
  { id: 1, activa: true,  hora: "08:00", titulo: "⏰ Reto 60 días · Kuale", mensaje: "¡Buenos días! Recuerda registrar tus hábitos de hoy." },
  { id: 2, activa: false, hora: "13:00", titulo: "⏰ Reto 60 días · Kuale", mensaje: "A mitad del día, ¿cómo van tus hábitos?" },
  { id: 3, activa: false, hora: "20:00", titulo: "⏰ Reto 60 días · Kuale", mensaje: "¡Último aviso! No olvides registrar tus hábitos antes de dormir." },
];

async function loadNotifSchedule() {
  try {
    const snap = await getDoc(doc(db, "config", "notificaciones"));
    if (snap.exists() && snap.data().list) {
      NOTIF_SCHEDULE = snap.data().list;
    } else {
      NOTIF_SCHEDULE = DEFAULT_NOTIF.map(n => ({ ...n }));
      await setDoc(doc(db, "config", "notificaciones"), { list: NOTIF_SCHEDULE });
    }
  } catch { NOTIF_SCHEDULE = DEFAULT_NOTIF.map(n => ({ ...n })); }
}

async function saveNotifSchedule() {
  await setDoc(doc(db, "config", "notificaciones"), { list: NOTIF_SCHEDULE });
}

/* ── Usuarios ── */
async function getUser(uid){

    const snap=await getDoc(
        doc(db,"users",uid)
    );

    return snap.exists()?snap.data():null;

}

async function saveUser(uid,data){

    await setDoc(
        doc(db,"users",uid),
        data,
        {merge:true}
    );

}

async function deleteUserDoc(uid) {

    await deleteDoc(
        doc(db,"users",uid)
    );

    const progSnap = await getDocs(
        collection(db,"users",uid,"progress")
    );

    await Promise.all(
        progSnap.docs.map(d=>deleteDoc(d.ref))
    );

}

async function getAllUserDocs() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => ({ name: d.id, ...d.data() }));
}

/* ── Progreso ── */
async function loadProgress(uid) {
    const snap = await getDoc(
        doc(db, "users", uid, "progress", "data")
    );

    return snap.exists()
        ? (snap.data().grid || {})
        : {};
}

async function saveProgress(uid, grid, lastSaved) {

    await setDoc(
        doc(db,"users",uid,"progress","data"),
        {
            grid,
            lastSaved
        }
    );

}

/* ══════════════════════════════════════
   LOADING SCREEN
══════════════════════════════════════ */
function showLoading(msg = "Cargando...") {
  document.getElementById("loading-screen").style.display = "flex";
  document.getElementById("loading-msg").textContent = msg;
}
function hideLoading() {
  document.getElementById("loading-screen").style.display = "none";
}

/* ══════════════════════════════════════
   AUTH
══════════════════════════════════════ */
/* ── Mapa de códigos de error de Firebase Auth ── */
function authErrMsg(code) {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":  return "Correo o contraseña incorrectos.";
    case "auth/invalid-email":        return "El correo no es válido.";
    case "auth/email-already-in-use": return "Ese correo ya está registrado.";
    case "auth/weak-password":        return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/too-many-requests":    return "Demasiados intentos. Intenta más tarde.";
    case "auth/network-request-failed": return "Sin conexión. Revisa tu internet.";
    default: return "Error de autenticación. Intenta de nuevo.";
  }
}

async function doLogin() {
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errEl    = document.getElementById("auth-err");
  errEl.textContent = "";

  if (!email)    { errEl.textContent = "Escribe tu correo."; return; }
  if (!password) { errEl.textContent = "Escribe tu contraseña."; return; }

  showLoading("Iniciando sesión...");
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged se encarga del resto
  } catch (e) {
    hideLoading();
    errEl.textContent = authErrMsg(e.code);
  }
}

async function doRegister() {
  const nombre   = document.getElementById("nombre") ? document.getElementById("nombre").value.trim() : "";
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errEl    = document.getElementById("auth-err");
  errEl.textContent = "";

  if (!nombre)         { errEl.textContent = "Escribe tu nombre."; return; }
  if (!email)          { errEl.textContent = "Escribe tu correo."; return; }
  if (password.length < 6) { errEl.textContent = "Mínimo 6 caracteres."; return; }

  showLoading("Creando cuenta...");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: nombre });
    await setDoc(doc(db, "users", cred.user.uid), {
      nombre,
      correo: email,
      joinDate: new Date().toISOString().split("T")[0]
    });
    // Resetear UI de registro
    document.getElementById("register-section").style.display = "none";
    document.getElementById("login-btn").style.display = "block";
    document.getElementById("toggle-register-btn").innerHTML = '<i class="ti ti-user-plus"></i> ¿Primera vez? Regístrate';
    // onAuthStateChanged maneja el login automático
  } catch (e) {
    hideLoading();
    errEl.textContent = authErrMsg(e.code);
  }
}

/* ── login/register alias para compatibilidad ── */
async function login()    { await doLogin(); }
async function register() { await doRegister(); }

async function doLogout() {
  if (_midnightTimer) clearTimeout(_midnightTimer);
  curUser = null; currentUid = null; currentEmail = null;
  isAdmin = false; curTab = "tracker"; curWeek = 0;
  uData = { data: {}, joinDate: "", password: "" };
  try { await signOut(auth); } catch (e) { console.warn("signOut error:", e); }
  document.getElementById("auth-screen").style.display  = "flex";
  document.getElementById("main-screen").style.display  = "none";
  const emailEl = document.getElementById("email");
  const passEl  = document.getElementById("password");
  if (emailEl) emailEl.value = "";
  if (passEl)  passEl.value  = "";
  document.getElementById("auth-err").textContent = "";
}

async function launchMain() {
  await loadHabits();
  await loadCards();
  await loadNotifSchedule();
  registerSW();

  if (!isAdmin) {
    // Cargar datos del usuario y su progreso desde Firestore
    const userData = await getUser(currentUid);
    if (userData) {
      uData.joinDate  = userData.joinDate  || "";
      uData.lastSaved = userData.lastSaved || null;
    }
    const grid = await loadProgress(currentUid);
    uData.data = grid;
  }

  hideLoading();
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("main-screen").style.display  = "block";
  const chip = document.getElementById("user-chip");
  chip.textContent = isAdmin ? "Administrador" : curUser;
  chip.className   = isAdmin ? "admin-chip" : "user-chip";
  buildTabs();
  renderTab(isAdmin ? "admin" : "tracker");
  if (!isAdmin) scheduleMidnightSave();
}

/* ─── Recover password ─── */
async function doRecover() {
  // El input en el HTML es "rec-user" pero ahora se espera un correo
  const emailInput = document.getElementById("rec-email") || document.getElementById("rec-user");
  const email = emailInput ? emailInput.value.trim() : "";
  const err   = document.getElementById("recover-err");

  if (!email) { err.textContent = "Escribe tu correo electrónico."; return; }

  try {
    await sendPasswordResetEmail(auth, email);
    err.style.color = "var(--green)";
    err.textContent = "✓ Correo de recuperación enviado. Revisa tu bandeja.";
    setTimeout(() => {
      document.getElementById("recover-modal").style.display = "none";
      err.textContent = ""; err.style.color = "";
    }, 3000);
  } catch (e) {
    if (e.code === "auth/user-not-found" || e.code === "auth/invalid-email") {
      err.textContent = "No hay cuenta registrada con ese correo.";
    } else {
      err.textContent = "Error al enviar correo. Intenta de nuevo.";
    }
  }
}

/* ══════════════════════════════════════
   TABS
══════════════════════════════════════ */
function buildTabs() {
  const nav  = document.getElementById("tab-nav");
  const tabs = isAdmin
    ? [{ id: "admin", label: "Panel admin" }, { id: "habitos", label: "Gestionar hábitos" }, { id: "notificaciones", label: "Notificaciones" }]
    : [{ id: "tracker", label: "Mi reto" }];
  nav.innerHTML = tabs.map(t =>
    `<button class="tab-btn" data-tab="${t.id}">${t.label}</button>`
  ).join("");
  nav.querySelectorAll(".tab-btn").forEach(btn =>
    btn.addEventListener("click", () => renderTab(btn.dataset.tab))
  );
}

function setActiveTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === tab)
  );
}

function renderTab(tab) {
  curTab = tab;
  setActiveTab(tab);
  if      (tab === "tracker")       renderTracker();
  else if (tab === "admin")          renderAdmin();
  else if (tab === "habitos")        renderHabitos();
  else if (tab === "notificaciones") renderNotificaciones();
}

/* ══════════════════════════════════════
   TRACKER
══════════════════════════════════════ */
function gs(d, h) { return (uData.data || {})[`${d}_${h}`] || 0; }
function cs(d, h) {
  if (!uData.data) uData.data = {};
  uData.data[`${d}_${h}`] = (gs(d, h) + 1) % 3;
}

/* ── Auto-save ── */
async function autoSave() {
  const lastSaved = new Date().toISOString();
  uData.lastSaved = lastSaved;
  await saveProgress(
      currentUid,
      uData.data,
      lastSaved
  );

  await saveUser(
      currentUid,
      {
          lastSaved
      }
  );
}

/* ── Midnight auto-save ── */
function scheduleMidnightSave() {
  if (_midnightTimer) clearTimeout(_midnightTimer);
  const now  = new Date();
  const next = new Date(now);
  next.setHours(23, 59, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  _midnightTimer = setTimeout(async () => {
    if (curUser && !isAdmin) {
      await autoSave();
      sendReminderNotification("¡Día guardado! 💪", "Tu progreso de hoy quedó registrado.");
    }
    scheduleMidnightSave();
  }, next - now);
}

/* ── Web Notifications (legacy btn en tracker) ── */
async function requestNotification() {
  const granted = await requestNotifPermission();
  if (granted) {
    sendScheduleToSW();
    updateNotifyBtn();
    showToast("✓ Notificaciones activadas");
  }
}

function updateNotifyBtn() {
  const btn = document.getElementById("notify-btn");
  if (!btn) return;
  const granted = "Notification" in window && Notification.permission === "granted";
  btn.classList.toggle("notify-active", granted);
  btn.title = granted ? "Notificaciones activadas" : "Activar notificaciones";
}

/* ══════════════════════════════════════
   NOTIFICACIONES (admin)
══════════════════════════════════════ */
function renderNotificaciones() {
  const pc = document.getElementById("page-content");

  function notifCard(n, i) {
    return `<div class="notif-card ${n.activa ? "notif-card-active" : ""}" data-i="${i}">
      <div class="notif-card-header">
        <div style="display:flex;align-items:center;gap:10px">
          <label class="notif-toggle">
            <input type="checkbox" class="notif-check" data-i="${i}" ${n.activa ? "checked" : ""}>
            <span class="notif-slider"></span>
          </label>
          <div>
            <div style="font-weight:700;font-size:14px">Recordatorio ${i + 1}</div>
            <div class="notif-status-lbl" style="font-size:12px;color:var(--gray-400)">${n.activa ? "Activo" : "Inactivo"}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="time" class="notif-time" data-i="${i}" value="${n.hora}"
            style="border:1px solid var(--gray-200);border-radius:var(--radius-md);padding:6px 10px;font-size:14px;font-weight:600;color:var(--gray-900)">
          <button class="btn-action btn-del-notif" data-i="${i}" title="Eliminar"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      <div style="margin-top:12px">
        <label style="font-size:12px;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px">Título</label>
        <input type="text" class="notif-titulo" data-i="${i}" value="${n.titulo}"
          maxlength="60" style="width:100%;border:1px solid var(--gray-200);border-radius:var(--radius-md);padding:8px 12px;font-size:13px">
        <label style="font-size:12px;font-weight:600;color:var(--gray-600);display:block;margin-top:10px;margin-bottom:4px">Mensaje</label>
        <input type="text" class="notif-mensaje" data-i="${i}" value="${n.mensaje}"
          maxlength="120" style="width:100%;border:1px solid var(--gray-200);border-radius:var(--radius-md);padding:8px 12px;font-size:13px">
      </div>
    </div>`;
  }

  const permGranted = "Notification" in window && Notification.permission === "granted";
  const permBanner = permGranted ? "" : `
    <div class="notif-perm-banner">
      <i class="ti ti-bell-off" style="font-size:20px;color:var(--red)"></i>
      <div>
        <div style="font-weight:600;font-size:13px">Las notificaciones no están activadas</div>
        <div style="font-size:12px;color:var(--gray-600)">Los usuarios deben activarlas desde la app. Tú también puedes activarlas aquí.</div>
      </div>
      <button class="btn-summary" id="btn-grant-notif" style="height:36px;flex-shrink:0"><i class="ti ti-bell"></i> Activar</button>
    </div>`;

  pc.innerHTML = `
    <div class="notif-manager">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;gap:12px">
        <div>
          <div class="chart-title" style="margin-bottom:4px">
            <i class="ti ti-bell" style="color:var(--green);margin-right:6px"></i>Configurar notificaciones
          </div>
          <p style="font-size:12px;color:var(--gray-400)">Los horarios configurados aquí se aplican para todos los usuarios.</p>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <button class="btn-summary" id="btn-add-notif" style="height:38px;white-space:nowrap"><i class="ti ti-plus"></i> Agregar recordatorio</button>
          <button class="btn-green" id="btn-save-notif" style="height:38px;white-space:nowrap"><i class="ti ti-device-floppy"></i> Guardar cambios</button>
        </div>
      </div>

      ${permBanner}

      <div id="notif-list" style="display:flex;flex-direction:column;gap:16px">
        ${NOTIF_SCHEDULE.map((n, i) => notifCard(n, i)).join("")}
      </div>

      <div style="margin-top:1.5rem;padding:1rem;background:var(--gray-50);border-radius:var(--radius-md);border:1px solid var(--gray-200)">
        <div style="font-weight:600;font-size:13px;margin-bottom:8px"><i class="ti ti-info-circle" style="color:var(--green)"></i> ¿Cómo funcionan?</div>
        <ul style="font-size:12px;color:var(--gray-600);padding-left:16px;margin:0;line-height:1.8">
          <li>Los usuarios deben abrir la app al menos una vez y aceptar las notificaciones.</li>
          <li>Una vez activadas, llegan aunque el navegador esté cerrado (excepto iOS Safari sin instalar).</li>
          <li>En iPhone/iPad con Safari: el usuario debe instalar la app en la pantalla de inicio.</li>
          <li>Los cambios en horarios se aplican la próxima vez que el usuario abra la app.</li>
        </ul>
      </div>

      <!-- Add notif modal -->
      <div id="add-notif-modal" class="modal-bg" style="display:none">
        <div class="modal-box" style="max-width:420px">
          <div class="modal-hdr"><h2>Agregar recordatorio</h2><button id="close-add-notif"><i class="ti ti-x"></i></button></div>
          <label>Hora</label>
          <input id="new-notif-hora" type="time" value="09:00"
            style="border:1px solid var(--gray-200);border-radius:var(--radius-md);padding:8px 12px;font-size:14px;font-weight:600;width:160px">
          <label style="margin-top:12px">Título</label>
          <input id="new-notif-titulo" type="text" placeholder="⏰ Reto 60 días · Kuale" maxlength="60">
          <label style="margin-top:12px">Mensaje</label>
          <input id="new-notif-mensaje" type="text" placeholder="¡No olvides registrar tus hábitos!" maxlength="120">
          <button class="btn-green" id="do-add-notif" style="margin-top:1.25rem"><i class="ti ti-plus"></i> Agregar</button>
          <div class="auth-err" id="add-notif-err" style="min-height:18px;margin-top:8px"></div>
        </div>
      </div>
    </div>`;

  /* Guardar — lee todos los campos en orden */
  document.getElementById("btn-save-notif").addEventListener("click", async () => {
    pc.querySelectorAll(".notif-card").forEach((card, idx) => {
      const i = parseInt(card.dataset.i);
      NOTIF_SCHEDULE[i].activa  = card.querySelector(".notif-check").checked;
      NOTIF_SCHEDULE[i].hora    = card.querySelector(".notif-time").value;
      NOTIF_SCHEDULE[i].titulo  = card.querySelector(".notif-titulo").value.trim() || NOTIF_SCHEDULE[i].titulo;
      NOTIF_SCHEDULE[i].mensaje = card.querySelector(".notif-mensaje").value.trim() || NOTIF_SCHEDULE[i].mensaje;
    });
    await saveNotifSchedule();
    sendScheduleToSW();
    showToast("✓ Notificaciones guardadas");
    renderNotificaciones();
  });

  /* Toggle visual */
  pc.querySelectorAll(".notif-check").forEach(chk => {
    chk.addEventListener("change", () => {
      const card = chk.closest(".notif-card");
      card.classList.toggle("notif-card-active", chk.checked);
      card.querySelector(".notif-status-lbl").textContent = chk.checked ? "Activo" : "Inactivo";
    });
  });

  /* Eliminar */
  pc.querySelectorAll(".btn-del-notif").forEach(btn => {
    btn.addEventListener("click", async () => {
      const i = parseInt(btn.dataset.i);
      if (!confirm(`¿Eliminar el recordatorio de las ${NOTIF_SCHEDULE[i].hora}?`)) return;
      NOTIF_SCHEDULE.splice(i, 1);
      await saveNotifSchedule();
      sendScheduleToSW();
      showToast("Recordatorio eliminado");
      renderNotificaciones();
    });
  });

  /* Agregar modal */
  const addModal = document.getElementById("add-notif-modal");
  document.getElementById("btn-add-notif").addEventListener("click", () => {
    document.getElementById("new-notif-hora").value    = "09:00";
    document.getElementById("new-notif-titulo").value  = "";
    document.getElementById("new-notif-mensaje").value = "";
    document.getElementById("add-notif-err").textContent = "";
    addModal.style.display = "flex";
  });
  document.getElementById("close-add-notif").addEventListener("click", () => { addModal.style.display = "none"; });
  addModal.addEventListener("click", e => { if (e.target === addModal) addModal.style.display = "none"; });

  document.getElementById("do-add-notif").addEventListener("click", async () => {
    const hora    = document.getElementById("new-notif-hora").value;
    const titulo  = document.getElementById("new-notif-titulo").value.trim() || "⏰ Reto 60 días · Kuale";
    const mensaje = document.getElementById("new-notif-mensaje").value.trim();
    const err     = document.getElementById("add-notif-err");
    if (!hora)    { err.textContent = "Elige una hora."; return; }
    if (!mensaje) { err.textContent = "Escribe un mensaje."; return; }
    NOTIF_SCHEDULE.push({ id: Date.now(), activa: true, hora, titulo, mensaje });
    await saveNotifSchedule();
    sendScheduleToSW();
    addModal.style.display = "none";
    showToast(`✓ Recordatorio a las ${hora} agregado`);
    renderNotificaciones();
  });

  /* Activar notificaciones */
  const grantBtn = document.getElementById("btn-grant-notif");
  if (grantBtn) {
    grantBtn.addEventListener("click", async () => {
      const granted = await requestNotifPermission();
      if (granted) { showToast("✓ Notificaciones activadas"); renderNotificaciones(); }
    });
  }
}
/* ── Toast ── */
function showToast(msg) {
  let t = document.getElementById("app-toast");
  if (!t) { t = document.createElement("div"); t.id = "app-toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

function getWeekDays() {
  const start = curWeek * WEEK_DAYS, days = [];
  for (let i = 0; i < WEEK_DAYS; i++) { const d = start + i; if (d < DAYS) days.push(d); }
  return days;
}

function calcStats() {
  const days = getWeekDays();
  let wDone = 0;
  days.forEach(d => HABITS.forEach((_, hi) => { if (gs(d, hi) === 1) wDone++; }));
  const wPct = Math.round(wDone / (days.length * HABITS.length) * 100);

  let perfect = 0, streak = 0, sActive = true, tDone = 0;
  for (let d = 0; d < DAYS; d++) {
    let allD = true, anyM = false;
    HABITS.forEach((_, hi) => {
      const s = gs(d, hi);
      if (s > 0) anyM = true;
      if (s !== 1) allD = false;
      if (s === 1) tDone++;
    });
    if (anyM && allD) perfect++;
    if (sActive) { if (anyM && allD) streak++; else if (anyM) { streak = 0; sActive = false; } }
  }
  const daysWithData = new Set(
    Object.keys(uData.data || {}).filter(k => (uData.data || {})[k] > 0).map(k => k.split("_")[0])
  ).size;
  const totalDenom = daysWithData * HABITS.length;
  const totalPct   = totalDenom > 0 ? Math.round(tDone / totalDenom * 100) : 0;
  return { wPct, perfect, streak, totalPct };
}

function renderTracker() {
  const days = getWeekDays();
  const st   = calcStats();
  const lastSaved = uData.lastSaved
    ? new Date(uData.lastSaved).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    : null;
  let html = "";

  html += `<div class="controls">
    <div class="week-nav">
      <button id="prev-week"><i class="ti ti-chevron-left"></i></button>
      <span class="week-label">Semana ${curWeek + 1}</span>
      <button id="next-week"><i class="ti ti-chevron-right"></i></button>
    </div>
    <div class="autosave-badge" id="autosave-badge">
      <i class="ti ti-check"></i>
      ${lastSaved ? `Guardado a las ${lastSaved}` : "Se guarda automáticamente"}
    </div>
    <button class="btn-summary" id="summary-btn"><i class="ti ti-chart-bar"></i> Ver mi resumen</button>
    <button class="btn-notify" id="notify-btn"><i class="ti ti-bell"></i></button>
  </div>`;

  html += `<div class="week-overview">`;
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const s = w * WEEK_DAYS; let marked = false;
    for (let d = s; d < Math.min(s + WEEK_DAYS, DAYS); d++)
      HABITS.forEach((_, hi) => { if (gs(d, hi) > 0) marked = true; });
    const cls = w === curWeek ? "active" : marked ? "has-data" : "";
    html += `<span class="week-pill ${cls}" data-w="${w}">Sem. ${w + 1}</span>`;
  }
  html += `</div>`;

  html += `<div class="stats-bar">
    <div class="stat-card"><div class="stat-num">${st.wPct}%</div><div class="stat-label">Esta semana</div></div>
    <div class="stat-card"><div class="stat-num">${st.perfect}</div><div class="stat-label">Días perfectos</div></div>
    <div class="stat-card"><div class="stat-num">${st.streak}d</div><div class="stat-label">Racha actual</div></div>
    <div class="stat-card"><div class="stat-num">${st.totalPct}%</div><div class="stat-label">Total general</div></div>
  </div>`;

  html += `<div class="table-wrap"><table>
    <thead><tr><th class="habit-col">Hábito</th>`;
  days.forEach(d => { html += `<th class="${d === 0 ? "today-col" : ""}">Día&nbsp;${d + 1}</th>`; });
  html += `<th>%</th></tr></thead><tbody>`;

  HABITS.forEach((h, hi) => {
    const daysRegistered = new Set(
      Object.keys(uData.data || {}).filter(k => (uData.data || {})[k] > 0).map(k => k.split("_")[0])
    );
    let done = 0;
    daysRegistered.forEach(dayStr => { if (gs(parseInt(dayStr), hi) === 1) done++; });
    const total = daysRegistered.size;
    const pct   = total > 0 ? Math.round(done / total * 100) : 0;
    const badge = h.isNew ? `<span class="new-badge">nuevo</span>` : "";
    html += `<tr><td class="habit-name"><span class="habit-icon">${h.icon}</span>${h.name}${badge}</td>`;
    days.forEach(d => {
      const s = gs(d, hi);
      html += `<td class="${d === 0 ? "today-col" : ""}">
        <button class="check-btn ${s === 1 ? "done" : s === 2 ? "fail" : ""}" data-d="${d}" data-h="${hi}">
          ${s === 1 ? "✓" : s === 2 ? "✗" : ""}
        </button></td>`;
    });
    html += `<td class="row-progress">
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      <div class="pct-label">${pct}%</div>
    </td></tr>`;
  });
  html += `</tbody></table></div>`;

  html += `<div class="legend-card">
    <div class="legend-title"><i class="ti ti-info-circle"></i> ¿Cómo registrar?</div>
    <div class="legend-steps">
      <div class="legend-step">
        <span class="check-btn done" style="pointer-events:none;width:28px;height:28px;font-size:14px">✓</span>
        <div><strong>1 clic</strong><br><span>Cumplido</span></div>
      </div>
      <div class="legend-step">
        <span class="check-btn fail" style="pointer-events:none;width:28px;height:28px;font-size:14px">✗</span>
        <div><strong>2 clics</strong><br><span>No cumplido</span></div>
      </div>
      <div class="legend-step">
        <span class="check-btn" style="pointer-events:none;width:28px;height:28px"></span>
        <div><strong>3 clics</strong><br><span>Borrar marca</span></div>
      </div>
    </div>
  </div>`;

  /* ── Mindfulness cards ── */
  function buildCardHtml(c, idx) {
    const linkBtn = c.link ? `<a href="${c.link}" target="_blank" rel="noopener" class="card-link-btn"><i class="ti ti-player-play"></i> Ver video</a>` : "";
    return `<div class="m-card"><div class="m-card-header"><div class="m-card-icon">${c.icon}</div>
      <div><div class="m-card-title">${c.title}</div><div class="m-card-time">${c.time}</div></div>
      </div><p>${c.desc}</p>${linkBtn}</div>`;
  }

  const VISIBLE_CARDS = 3;

  /* Mindfulness */
  const mVisible = MINDFULNESS_CARDS.slice(0, VISIBLE_CARDS);
  const mHidden  = MINDFULNESS_CARDS.slice(VISIBLE_CARDS);
  html += `<div class="mindfulness-section">
    <h2><i class="ti ti-brain"></i> Ejercicios de mindfulness (5 min)</h2>
    <p class="section-sub">Rota estos ejercicios cada día</p>
    <div class="cards-grid" id="mind-grid">
      ${mVisible.map((c,i) => buildCardHtml(c,i)).join("")}
    </div>
    ${mHidden.length > 0 ? `<div style="text-align:center;margin-top:1rem">
      <button class="btn-ver-mas" id="btn-ver-mas-mind"><i class="ti ti-chevron-down"></i> Ver más (${mHidden.length})</button>
    </div>` : ""}
  </div>`;

  /* Pausa Activa */
  const pVisible = PAUSA_CARDS.slice(0, VISIBLE_CARDS);
  const pHidden  = PAUSA_CARDS.slice(VISIBLE_CARDS);
  html += `<div class="mindfulness-section">
    <h2><i class="ti ti-run"></i> Ejercicios de Pausa Activa</h2>
    <p class="section-sub">Realiza esta rutina de 6 minutos para activar tu cuerpo durante la jornada</p>
    <div class="cards-grid" id="pausa-grid">
      ${pVisible.map((c,i) => buildCardHtml(c,i)).join("")}
    </div>
    ${pHidden.length > 0 ? `<div style="text-align:center;margin-top:1rem">
      <button class="btn-ver-mas" id="btn-ver-mas-pausa"><i class="ti ti-chevron-down"></i> Ver más (${pHidden.length})</button>
    </div>` : ""}
  </div>`;

  document.getElementById("page-content").innerHTML = html;

  /* Ver más buttons */
  function openCardsModal(title, cards) {
    const existing = document.getElementById("cards-modal");
    if (existing) existing.remove();
    const modal = document.createElement("div");
    modal.id = "cards-modal";
    modal.className = "modal-bg";
    modal.style.display = "flex";
    modal.innerHTML = `<div class="modal-box" style="max-width:680px">
      <div class="modal-hdr"><h2>${title}</h2><button id="close-cards-modal"><i class="ti ti-x"></i></button></div>
      <div class="cards-grid" style="margin-top:1rem">
        ${cards.map(c => {
          const linkBtn = c.link ? `<a href="${c.link}" target="_blank" rel="noopener" class="card-link-btn"><i class="ti ti-player-play"></i> Ver video</a>` : "";
          return `<div class="m-card"><div class="m-card-header"><div class="m-card-icon">${c.icon}</div>
            <div><div class="m-card-title">${c.title}</div><div class="m-card-time">${c.time}</div></div>
            </div><p>${c.desc}</p>${linkBtn}</div>`;
        }).join("")}
      </div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById("close-cards-modal").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
  }

  const btnMindMore = document.getElementById("btn-ver-mas-mind");
  if (btnMindMore) btnMindMore.addEventListener("click", () => openCardsModal("Más ejercicios de mindfulness", MINDFULNESS_CARDS.slice(3)));
  const btnPausaMore = document.getElementById("btn-ver-mas-pausa");
  if (btnPausaMore) btnPausaMore.addEventListener("click", () => openCardsModal("Más ejercicios de Pausa Activa", PAUSA_CARDS.slice(3)));

  document.getElementById("prev-week").addEventListener("click", () => { if (curWeek > 0) { curWeek--; renderTracker(); } });
  document.getElementById("next-week").addEventListener("click", () => { if (curWeek < TOTAL_WEEKS - 1) { curWeek++; renderTracker(); } });
  document.getElementById("summary-btn").addEventListener("click", openSummary);
  document.getElementById("notify-btn").addEventListener("click", requestNotification);
  updateNotifyBtn();

  document.querySelectorAll(".check-btn[data-d]").forEach(btn => {
    btn.addEventListener("click", async function () {
      cs(parseInt(this.dataset.d), parseInt(this.dataset.h));
      renderTracker();
      await autoSave();
    });
  });

  document.querySelectorAll(".week-pill").forEach(p => {
    p.addEventListener("click", function () { curWeek = parseInt(this.dataset.w); renderTracker(); });
  });
}

/* ─── Summary modal ─── */
function openSummary() {
  let tDone = 0, perfect = 0;
  for (let d = 0; d < DAYS; d++) {
    let allD = true, anyM = false;
    HABITS.forEach((_, hi) => {
      const s = gs(d, hi);
      if (s > 0) anyM = true; if (s !== 1) allD = false; if (s === 1) tDone++;
    });
    if (anyM && allD) perfect++;
  }
  const daysWithData = new Set(
    Object.keys(uData.data || {}).filter(k => (uData.data || {})[k] > 0).map(k => k.split("_")[0])
  ).size;
  const pct = daysWithData > 0 ? Math.round(tDone / (daysWithData * HABITS.length) * 100) : 0;

  let rows = "";
  HABITS.forEach((h, hi) => {
    let done = 0, daysCounted = new Set();
    for (let d = 0; d < DAYS; d++) {
      const s = gs(d, hi); if (s > 0) daysCounted.add(d); if (s === 1) done++;
    }
    const total = daysCounted.size;
    const p = total > 0 ? Math.round(done / total * 100) : 0;
    rows += `<li><span>${h.icon} ${h.name}</span>
      <span class="habit-pct${p < 50 && total > 0 ? " low" : ""}">${total > 0 ? p + "%" : "—"}</span></li>`;
  });

  document.getElementById("sum-content").innerHTML = `
    <div class="modal-stats">
      <div class="modal-stat"><div class="num">${pct}%</div><div class="lbl">Cumplimiento total</div></div>
      <div class="modal-stat"><div class="num">${perfect}</div><div class="lbl">Días perfectos</div></div>
      <div class="modal-stat"><div class="num">${daysWithData}</div><div class="lbl">Días registrados</div></div>
      <div class="modal-stat"><div class="num">${tDone}</div><div class="lbl">Hábitos cumplidos</div></div>
    </div>
    <ul class="modal-habit-list">${rows}</ul>`;
  document.getElementById("sum-modal").style.display = "flex";
}

/* ══════════════════════════════════════
   ADMIN DASHBOARD
══════════════════════════════════════ */
function getUserStats(ud) {
  const d = ud.data || {};
  let tDone = 0, perfect = 0, streak = 0, sActive = true;
  for (let day = 0; day < DAYS; day++) {
    let allD = true, anyM = false;
    HABITS.forEach((_, hi) => {
      const s = d[`${day}_${hi}`] || 0;
      if (s > 0) anyM = true; if (s !== 1) allD = false; if (s === 1) tDone++;
    });
    if (anyM && allD) perfect++;
    if (sActive) { if (anyM && allD) streak++; else if (anyM) { streak = 0; sActive = false; } }
  }
  const daysWithData = new Set(Object.keys(d).filter(k => d[k] > 0).map(k => k.split("_")[0])).size;
  const denom = daysWithData * HABITS.length;
  return { pct: denom > 0 ? Math.round(tDone / denom * 100) : 0, perfect, streak, daysWithData, joinDate: ud.joinDate || "—" };
}

async function renderAdmin() {
  const pc = document.getElementById("page-content");
  pc.innerHTML = `<div class="empty-admin"><i class="ti ti-loader" style="font-size:2rem;display:block;margin-bottom:.75rem;opacity:.4;animation:spin 1s linear infinite"></i>Cargando datos...</div>`;

  try {
    const ADMIN_EMAIL = "admin@kuale.com";
    const allUsers = (await getAllUserDocs()).filter(u => u.correo !== ADMIN_EMAIL);

    // Load progress for each user
    const usersWithProgress = await Promise.all(
      allUsers.map(async u => {
        const uid  = u.name; // u.name = doc id = uid de Firebase Auth
        const grid = await loadProgress(uid);
        return {
          ...u,
          uid,
          name: u.nombre || u.correo || uid, // nombre visible, con fallbacks
          data: grid
        };
      })
    );

    if (usersWithProgress.length === 0) {
      pc.innerHTML = `<div class="empty-admin">
        <i class="ti ti-users" style="font-size:3rem;display:block;margin-bottom:1rem;opacity:.3"></i>
        <p>Aún no hay usuarios registrados.</p>
      </div>`;
      return;
    }

    const stats      = usersWithProgress.map(u => ({ ...u, ...getUserStats(u) }));
    const avgPct     = Math.round(stats.reduce((a, s) => a + s.pct, 0) / stats.length);
    const avgDays    = Math.round(stats.reduce((a, s) => a + s.daysWithData, 0) / stats.length);
    const totalPerfect = stats.reduce((a, s) => a + s.perfect, 0);
    const top        = [...stats].sort((a, b) => b.pct - a.pct).slice(0, 5);
    const medals     = ["🥇","🥈","🥉","4°","5°"];
    const mColors    = ["#FFD700","#C0C0C0","#CD7F32","var(--gray-400)","var(--gray-400)"];

    let html = `<div class="admin-summary-grid">
      <div class="admin-card"><div class="num">${stats.length}</div><div class="lbl">Participantes</div></div>
      <div class="admin-card"><div class="num">${avgPct}%</div><div class="lbl">Cumplimiento promedio</div></div>
      <div class="admin-card"><div class="num">${avgDays}</div><div class="lbl">Días prom. registrados</div></div>
      <div class="admin-card"><div class="num">${totalPerfect}</div><div class="lbl">Días perfectos (total)</div></div>
    </div>`;

    /* Top */
    html += `<div class="top-section">
      <div class="chart-title" style="margin-bottom:12px">
        <i class="ti ti-trophy" style="color:var(--green);margin-right:6px"></i>Top participantes
      </div><div class="top-list">`;
    top.forEach((s, i) => {
      const statusCls = s.pct >= 70 ? "badge-green" : s.pct >= 40 ? "badge-gray" : "badge-red";
      html += `<div class="top-row ${i === 0 ? "top-first" : ""}">
        <span class="top-medal" style="color:${mColors[i]}">${medals[i]}</span>
        <div class="top-avatar">${s.name.charAt(0).toUpperCase()}</div>
        <div class="top-info">
          <button class="user-link top-name" data-uid="${s.uid}">${s.name}</button>
          <div class="top-meta">${s.daysWithData} días · ${s.perfect} perfectos · racha ${s.streak}d</div>
        </div>
        <div class="top-right">
          <div class="top-pct">${s.pct}%</div>
          <span class="badge ${statusCls}" style="font-size:10px">${s.pct >= 70 ? "En buen camino" : s.pct >= 40 ? "En progreso" : "Necesita apoyo"}</span>
        </div>
      </div>`;
    });
    html += `</div></div>`;

    /* Charts */
    const chartH = Math.max(180, stats.length * 44 + 60);
    html += `<div class="charts-row">
      <div class="chart-card"><div class="chart-title">Cumplimiento por usuario</div>
        <div style="position:relative;height:${chartH}px"><canvas id="chart-users"></canvas></div></div>
      <div class="chart-card"><div class="chart-title">Días registrados por usuario</div>
        <div style="position:relative;height:${chartH}px"><canvas id="chart-days"></canvas></div></div>
    </div>`;

    /* Table */
    html += `<div class="admin-table-section">
      <div class="chart-title">Detalle por usuario <span style="font-size:11px;font-weight:400;color:var(--gray-400)">— clic en nombre para ver progreso</span></div>
      <div class="table-wrap"><table class="users-table">
        <thead><tr>
          <th>Usuario</th><th>Se unió</th><th>Días registrados</th>
          <th>Cumplimiento</th><th>Racha</th><th>Días perfectos</th><th>Estado</th><th>Acciones</th>
        </tr></thead><tbody>`;

    stats.sort((a, b) => b.pct - a.pct).forEach(s => {
      const statusCls = s.pct >= 70 ? "badge-green" : s.pct >= 40 ? "badge-gray" : "badge-red";
      const statusTxt = s.pct >= 70 ? "En buen camino" : s.pct >= 40 ? "En progreso" : "Necesita apoyo";
      html += `<tr>
        <td><button class="user-link" data-uid="${s.uid}">${s.name}</button></td>
        <td>${s.joinDate}</td><td>${s.daysWithData} / 60</td>
        <td><div class="inline-bar"><div class="inline-bar-fill" style="width:${s.pct}%"></div></div>${s.pct}%</td>
        <td>${s.streak}d</td><td>${s.perfect}</td>
        <td><span class="badge ${statusCls}">${statusTxt}</span></td>
        <td class="td-actions">
          <button class="btn-action btn-edit" data-uid="${s.uid}"><i class="ti ti-lock"></i> Contraseña</button>
          <button class="btn-action btn-delete" data-uid="${s.uid}"><i class="ti ti-trash"></i></button>
        </td></tr>`;
    });
    html += `</tbody></table></div></div>`;

    /* Edit pass modal */
    html += `<div id="edit-pass-modal" class="modal-bg" style="display:none">
      <div class="modal-box" style="max-width:380px">
        <div class="modal-hdr"><h2>Cambiar contraseña</h2><button id="close-edit-pass"><i class="ti ti-x"></i></button></div>
        <p style="font-size:13px;color:var(--gray-600);margin-bottom:1rem">Usuario: <strong id="edit-pass-uname"></strong></p>
        <label>Nueva contraseña</label>
        <input id="ep-pass" type="password" placeholder="Mínimo 4 caracteres">
        <label style="margin-top:12px">Confirmar contraseña</label>
        <input id="ep-pass2" type="password" placeholder="Repite la contraseña">
        <button class="btn-green" id="do-edit-pass" style="margin-top:1.25rem">Guardar contraseña</button>
        <div class="auth-err" id="edit-pass-err" style="min-height:18px;margin-top:8px"></div>
      </div></div>`;

    pc.innerHTML = html;

    /* Store stats for detail modal */
    pc._statsData = stats;

    pc.querySelectorAll(".user-link").forEach(btn => {
      btn.addEventListener("click", () => {
        const s = stats.find(x => x.uid === btn.dataset.uid);
        if (s) openUserDetail(s);
      });
    });
    pc.querySelectorAll(".btn-edit").forEach(btn => btn.addEventListener("click", () => openEditPass(btn.dataset.uid)));
    pc.querySelectorAll(".btn-delete").forEach(btn => btn.addEventListener("click", () => deleteUser(btn.dataset.uid)));

    document.getElementById("close-edit-pass").addEventListener("click", () => {
      document.getElementById("edit-pass-modal").style.display = "none";
    });
    document.getElementById("edit-pass-modal").addEventListener("click", function(e) {
      if (e.target === this) this.style.display = "none";
    });
    document.getElementById("do-edit-pass").addEventListener("click", doEditPass);

    /* Charts */
    if (adminChart1) { adminChart1.destroy(); adminChart1 = null; }
    if (adminChart2) { adminChart2.destroy(); adminChart2 = null; }
    const sorted  = [...stats].sort((a, b) => b.pct - a.pct);
    const names   = sorted.map(s => s.name);
    const pcts    = sorted.map(s => s.pct);
    const daysArr = sorted.map(s => s.daysWithData);
    const colors  = pcts.map(p => p >= 70 ? "#ed1c24" : p >= 40 ? "#888780" : "#D85A30");

    adminChart1 = new Chart(document.getElementById("chart-users"), {
      type: "bar",
      data: { labels: names, datasets: [{ label: "%", data: pcts, backgroundColor: colors, borderRadius: 4 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { max: 100, ticks: { callback: v => v + "%" } }, y: { ticks: { font: { size: 11 } } } } }
    });
    adminChart2 = new Chart(document.getElementById("chart-days"), {
      type: "bar",
      data: { labels: names, datasets: [{ label: "Días", data: daysArr, backgroundColor: "#f5a0a3", borderRadius: 4 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { max: 60 }, y: { ticks: { font: { size: 11 } } } } }
    });

  } catch(e) {
    pc.innerHTML = `<div class="empty-admin"><p style="color:var(--red)">Error al cargar datos: ${e.message}</p></div>`;
    console.error(e);
  }
}

/* ── User detail modal ── */
function openUserDetail(s) {
  document.getElementById("ud-title").textContent = s.name;
  const statusCls = s.pct >= 70 ? "badge-green" : s.pct >= 40 ? "badge-gray" : "badge-red";
  const statusTxt = s.pct >= 70 ? "En buen camino" : s.pct >= 40 ? "En progreso" : "Necesita apoyo";
  const d = s.data || {};

  let weeksHtml = "";
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const startDay = w * WEEK_DAYS, days = [];
    for (let i = 0; i < WEEK_DAYS; i++) { const day = startDay + i; if (day < DAYS) days.push(day); }
    let wDone = 0, wPerfect = 0;
    const wDays = new Set();
    days.forEach(day => {
      let allD = true, anyM = false;
      HABITS.forEach((_, hi) => {
        const sv = d[`${day}_${hi}`] || 0;
        if (sv > 0) { anyM = true; wDays.add(day); }
        if (sv !== 1) allD = false;
        if (sv === 1) wDone++;
      });
      if (anyM && allD) wPerfect++;
    });
    const wDenom = wDays.size * HABITS.length;
    const wPct   = wDenom > 0 ? Math.round(wDone / wDenom * 100) : 0;
    const hasData = wDays.size > 0;

    let thead = `<tr><th class="wt-habit">Hábito</th>`;
    days.forEach(day => { thead += `<th class="wt-day">Día ${day + 1}</th>`; });
    thead += `<th class="wt-pct">%</th></tr>`;

    let tbody = "";
    HABITS.forEach((h, hi) => {
      let hDone = 0;
      days.forEach(day => { if ((d[`${day}_${hi}`] || 0) === 1) hDone++; });
      const hPct = wDays.size > 0 ? Math.round(hDone / wDays.size * 100) : null;
      tbody += `<tr><td class="wt-habit-name"><span class="habit-icon">${h.icon}</span>${h.name}</td>`;
      days.forEach(day => {
        const sv = d[`${day}_${hi}`] || 0;
        const cls = sv === 1 ? "wc-done" : sv === 2 ? "wc-fail" : "wc-empty";
        tbody += `<td class="wt-cell"><span class="${cls}">${sv === 1 ? "✓" : sv === 2 ? "✗" : ""}</span></td>`;
      });
      const pCls = hPct !== null && hPct < 50 ? "low" : "";
      tbody += `<td class="wt-pct-val ${pCls}">${hPct !== null ? hPct + "%" : "—"}</td></tr>`;
    });

    const pctColor = wPct >= 70 ? "var(--green)" : wPct >= 40 ? "var(--gray-600)" : "var(--red)";
    weeksHtml += `<div class="week-accordion ${w === 0 ? "open" : ""}">
      <button class="week-acc-header">
        <span class="wah-label"><i class="ti ti-chevron-right wah-icon"></i>Semana ${w + 1}
          <span style="font-size:11px;font-weight:400;color:var(--gray-400);margin-left:6px">Días ${startDay + 1}–${Math.min(startDay + WEEK_DAYS, DAYS)}</span>
        </span>
        <span class="wah-stats">${hasData
          ? `<span style="color:${pctColor};font-weight:600">${wPct}%</span>
             <span style="color:var(--gray-400);font-size:11px;margin-left:8px">${wDone} cumplidos · ${wPerfect} día${wPerfect !== 1 ? "s" : ""} perfecto${wPerfect !== 1 ? "s" : ""}</span>`
          : `<span style="color:var(--gray-400);font-size:11px">Sin datos</span>`}</span>
      </button>
      <div class="week-acc-body">
        <div class="wt-wrap"><table class="week-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>
      </div></div>`;
  }

  document.getElementById("ud-content").innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:1.25rem;flex-wrap:wrap">
      <div style="width:44px;height:44px;border-radius:50%;background:var(--green-light);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;color:var(--green-dark)">
        ${s.name.charAt(0).toUpperCase()}</div>
      <div><div style="font-weight:600;font-size:15px">${s.name}</div>
        <div style="font-size:12px;color:var(--gray-400)">Se unió el ${s.joinDate}</div></div>
      <span class="badge ${statusCls}" style="margin-left:auto">${statusTxt}</span>
    </div>
    <div class="modal-stats" style="margin-bottom:1.5rem">
      <div class="modal-stat"><div class="num">${s.pct}%</div><div class="lbl">Cumplimiento total</div></div>
      <div class="modal-stat"><div class="num">${s.perfect}</div><div class="lbl">Días perfectos</div></div>
      <div class="modal-stat"><div class="num">${s.daysWithData}/60</div><div class="lbl">Días registrados</div></div>
      <div class="modal-stat"><div class="num">${s.streak}d</div><div class="lbl">Racha actual</div></div>
    </div>
    <div style="font-size:13px;font-weight:600;margin-bottom:4px">Progreso por semana</div>
    <div class="ud-legend" style="margin-bottom:12px">
      <span class="wc-done ud-leg-dot"></span>Cumplido
      <span class="wc-fail ud-leg-dot" style="margin-left:10px"></span>No cumplido
      <span class="wc-empty ud-leg-dot" style="margin-left:10px"></span>Sin marcar
    </div>
    <div class="weeks-accordion">${weeksHtml}</div>`;

  document.querySelectorAll(".week-acc-header").forEach(btn => {
    btn.addEventListener("click", () => btn.closest(".week-accordion").classList.toggle("open"));
  });
  document.getElementById("user-detail-modal").style.display = "flex";
}

/* ── Delete user ── */
let _pendingDeleteName = null;
function deleteUser(uid) {
  _pendingDeleteName = uid;
  const pc = document.getElementById("page-content");
  const s  = pc._statsData ? pc._statsData.find(x => x.uid === uid) : null;
  document.getElementById("confirm-uname").textContent = s ? s.name : uid;
  document.getElementById("confirm-modal").style.display = "flex";
}

/* ── Edit password ── */
function openEditPass(uname) {
  document.getElementById("edit-pass-uname").textContent = uname;
  document.getElementById("ep-pass").value  = "";
  document.getElementById("ep-pass2").value = "";
  document.getElementById("edit-pass-err").textContent = "";
  document.getElementById("edit-pass-modal").dataset.uname = uname;
  document.getElementById("edit-pass-modal").style.display = "flex";
}

async function doEditPass() {
  const uname = document.getElementById("edit-pass-modal").dataset.uname;
  const p1    = document.getElementById("ep-pass").value;
  const p2    = document.getElementById("ep-pass2").value;
  const err   = document.getElementById("edit-pass-err");
  if (p1.length < 4) { err.textContent = "Mínimo 4 caracteres."; return; }
  if (p1 !== p2)     { err.textContent = "Las contraseñas no coinciden."; return; }
  try {
    // Firebase Admin SDK es necesario para cambiar contraseñas de otros usuarios.
    // Aquí guardamos la nota en Firestore para que el admin recuerde qué cambiar
    // desde la consola de Firebase, o se puede integrar una Cloud Function.
    await saveUser(uname, { passwordResetRequestedAt: new Date().toISOString() });
    err.style.color = "var(--green)";
    err.textContent = "✓ Solicitud registrada. Cambia la contraseña desde Firebase Console.";
    setTimeout(() => { document.getElementById("edit-pass-modal").style.display = "none"; }, 2000);
  } catch { err.textContent = "Error al guardar."; }
}

/* ══════════════════════════════════════
   GESTIONAR HÁBITOS (admin)
══════════════════════════════════════ */
function renderHabitos() {
  renderHabitosCards();
}
/* ══════════════════════════════════════
   GESTIONAR CARDS (admin)
══════════════════════════════════════ */
function buildCardManagerSection(containerId, title, icon, cards, onSave) {
  const pc = document.getElementById(containerId);

  function cardRow(c, i) {
    return `<tr>
      <td style="font-size:20px;text-align:center;width:50px">${c.icon}</td>
      <td style="padding:8px 12px">
        <div style="font-weight:600;font-size:13px">${c.title}</div>
        <div style="font-size:11px;color:var(--gray-400)">${c.time}</div>
        <div style="font-size:12px;color:var(--gray-600);margin-top:2px">${c.desc}</div>
        ${c.link ? `<a href="${c.link}" target="_blank" style="font-size:11px;color:var(--green)"><i class="ti ti-link"></i> ${c.link}</a>` : ""}
      </td>
      <td style="width:100px;text-align:center;white-space:nowrap;vertical-align:middle">
        <button class="btn-action btn-edit-card" data-i="${i}" title="Editar"><i class="ti ti-pencil"></i></button>
        <button class="btn-action btn-delete-card" data-i="${i}" title="Eliminar"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`;
  }

  pc.innerHTML = `
    <div class="hab-manager" style="margin-bottom:1.5rem">
      <div class="hab-header">
        <div>
          <div class="chart-title" style="margin-bottom:4px">
            <i class="${icon}" style="color:var(--green);margin-right:6px"></i>${title}
          </div>
          <p style="font-size:12px;color:var(--gray-400)">Los cambios se ven de inmediato para todos los usuarios.</p>
        </div>
        <button class="btn-summary btn-add-card" style="height:38px"><i class="ti ti-plus"></i> Agregar card</button>
      </div>
      <div class="table-wrap" style="margin-top:1rem">
        <table class="hab-table">
          <thead><tr>
            <th style="width:50px;text-align:center">Ícono</th>
            <th style="text-align:left;padding-left:12px">Card</th>
            <th style="width:100px;text-align:center">Acciones</th>
          </tr></thead>
          <tbody>${cards.map((c,i) => cardRow(c,i)).join("")}</tbody>
        </table>
      </div>
    </div>

    <!-- Add card modal -->
    <div class="card-add-modal modal-bg" style="display:none">
      <div class="modal-box" style="max-width:440px">
        <div class="modal-hdr"><h2>Agregar card</h2><button class="btn-close-card-modal"><i class="ti ti-x"></i></button></div>
        <label>Ícono (emoji)</label>
        <input class="inp-card-icon" type="text" placeholder="🧘" maxlength="4" style="width:70px;text-align:center;font-size:22px">
        <label style="margin-top:12px">Título</label>
        <input class="inp-card-title" type="text" placeholder="Ej: Meditación guiada" maxlength="60">
        <label style="margin-top:12px">Tiempo</label>
        <input class="inp-card-time" type="text" placeholder="Ej: 5 min" maxlength="20">
        <label style="margin-top:12px">Descripción</label>
        <textarea class="inp-card-desc" placeholder="Describe el ejercicio..." rows="3" style="width:100%;resize:vertical;border:1px solid var(--gray-200);border-radius:var(--radius-md);padding:8px 12px;font-size:13px;font-family:inherit"></textarea>
        <label style="margin-top:12px">Link de video (opcional)</label>
        <input class="inp-card-link" type="url" placeholder="https://youtube.com/...">
        <button class="btn-green btn-do-add-card" style="margin-top:1.25rem"><i class="ti ti-plus"></i> Agregar</button>
        <div class="auth-err card-add-err" style="min-height:18px;margin-top:8px"></div>
      </div>
    </div>

    <!-- Edit card modal -->
    <div class="card-edit-modal modal-bg" style="display:none">
      <div class="modal-box" style="max-width:440px">
        <div class="modal-hdr"><h2>Editar card</h2><button class="btn-close-card-edit-modal"><i class="ti ti-x"></i></button></div>
        <label>Ícono (emoji)</label>
        <input class="inp-edit-card-icon" type="text" maxlength="4" style="width:70px;text-align:center;font-size:22px">
        <label style="margin-top:12px">Título</label>
        <input class="inp-edit-card-title" type="text" maxlength="60">
        <label style="margin-top:12px">Tiempo</label>
        <input class="inp-edit-card-time" type="text" maxlength="20">
        <label style="margin-top:12px">Descripción</label>
        <textarea class="inp-edit-card-desc" rows="3" style="width:100%;resize:vertical;border:1px solid var(--gray-200);border-radius:var(--radius-md);padding:8px 12px;font-size:13px;font-family:inherit"></textarea>
        <label style="margin-top:12px">Link de video (opcional)</label>
        <input class="inp-edit-card-link" type="url" placeholder="https://youtube.com/...">
        <button class="btn-green btn-do-edit-card" style="margin-top:1.25rem"><i class="ti ti-check"></i> Guardar cambios</button>
        <div class="auth-err card-edit-err" style="min-height:18px;margin-top:8px"></div>
      </div>
    </div>`;

  const modal    = pc.querySelector(".card-add-modal");
  const addBtn   = pc.querySelector(".btn-add-card");
  const closeBtn = pc.querySelector(".btn-close-card-modal");
  const doAddBtn = pc.querySelector(".btn-do-add-card");
  const errEl    = pc.querySelector(".card-add-err");

  addBtn.addEventListener("click", () => {
    pc.querySelector(".inp-card-icon").value  = "";
    pc.querySelector(".inp-card-title").value = "";
    pc.querySelector(".inp-card-time").value  = "";
    pc.querySelector(".inp-card-desc").value  = "";
    pc.querySelector(".inp-card-link").value  = "";
    errEl.textContent = "";
    modal.style.display = "flex";
  });
  closeBtn.addEventListener("click", () => { modal.style.display = "none"; });
  modal.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });

  doAddBtn.addEventListener("click", async () => {
    const icon  = pc.querySelector(".inp-card-icon").value.trim();
    const title2 = pc.querySelector(".inp-card-title").value.trim();
    const time  = pc.querySelector(".inp-card-time").value.trim();
    const desc  = pc.querySelector(".inp-card-desc").value.trim();
    const link  = pc.querySelector(".inp-card-link").value.trim();
    if (!icon)  { errEl.textContent = "Agrega un emoji."; return; }
    if (!title2) { errEl.textContent = "Escribe un título."; return; }
    if (!desc)  { errEl.textContent = "Escribe una descripción."; return; }
    cards.push({ icon, title: title2, time, desc, link });
    await onSave();
    modal.style.display = "none";
    showToast(`✓ Card "${title2}" agregada`);
    buildCardManagerSection(containerId, title, icon, cards, onSave);
  });

  /* Edit card */
  const editModal    = pc.querySelector(".card-edit-modal");
  const closeEditBtn = pc.querySelector(".btn-close-card-edit-modal");
  const doEditBtn    = pc.querySelector(".btn-do-edit-card");
  const editErrEl    = pc.querySelector(".card-edit-err");
  let editingIndex   = -1;

  closeEditBtn.addEventListener("click", () => { editModal.style.display = "none"; });
  editModal.addEventListener("click", e => { if (e.target === editModal) editModal.style.display = "none"; });

  pc.querySelectorAll(".btn-edit-card").forEach(btn => {
    btn.addEventListener("click", () => {
      editingIndex = parseInt(btn.dataset.i);
      const c = cards[editingIndex];
      pc.querySelector(".inp-edit-card-icon").value  = c.icon  || "";
      pc.querySelector(".inp-edit-card-title").value = c.title || "";
      pc.querySelector(".inp-edit-card-time").value  = c.time  || "";
      pc.querySelector(".inp-edit-card-desc").value  = c.desc  || "";
      pc.querySelector(".inp-edit-card-link").value  = c.link  || "";
      editErrEl.textContent = "";
      editModal.style.display = "flex";
    });
  });

  doEditBtn.addEventListener("click", async () => {
    const icon   = pc.querySelector(".inp-edit-card-icon").value.trim();
    const title2 = pc.querySelector(".inp-edit-card-title").value.trim();
    const time   = pc.querySelector(".inp-edit-card-time").value.trim();
    const desc   = pc.querySelector(".inp-edit-card-desc").value.trim();
    const link   = pc.querySelector(".inp-edit-card-link").value.trim();
    if (!icon)   { editErrEl.textContent = "Agrega un emoji."; return; }
    if (!title2) { editErrEl.textContent = "Escribe un título."; return; }
    if (!desc)   { editErrEl.textContent = "Escribe una descripción."; return; }
    cards[editingIndex] = { icon, title: title2, time, desc, link };
    await onSave();
    editModal.style.display = "none";
    showToast(`✓ Card "${title2}" actualizada`);
    buildCardManagerSection(containerId, title, icon, cards, onSave);
  });

  pc.querySelectorAll(".btn-delete-card").forEach(btn => {
    btn.addEventListener("click", async () => {
      const i = parseInt(btn.dataset.i);
      const name = cards[i].title;
      if (!confirm(`¿Eliminar "${name}"?`)) return;
      cards.splice(i, 1);
      await onSave();
      showToast(`Card "${name}" eliminada`);
      buildCardManagerSection(containerId, title, icon, cards, onSave);
    });
  });
}

function renderHabitosCards() {
  const pc = document.getElementById("page-content");
  pc.innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:1.5rem;flex-wrap:wrap">
      <button class="btn-summary tab-cards-btn active" data-section="habitos" style="height:36px"><i class="ti ti-list-check"></i> Hábitos del reto</button>
      <button class="btn-summary tab-cards-btn" data-section="mindfulness" style="height:36px;background:var(--gray-100);color:var(--gray-700)"><i class="ti ti-brain"></i> Mindfulness</button>
      <button class="btn-summary tab-cards-btn" data-section="pausa" style="height:36px;background:var(--gray-100);color:var(--gray-700)"><i class="ti ti-run"></i> Pausa Activa</button>
    </div>
    <div id="cards-section-habitos"></div>
    <div id="cards-section-mindfulness" style="display:none"></div>
    <div id="cards-section-pausa" style="display:none"></div>`;

  // Render habits in first section (reuse existing renderHabitos logic inline)
  renderHabitosInContainer("cards-section-habitos");

  buildCardManagerSection(
    "cards-section-mindfulness",
    "Ejercicios de mindfulness (5 min)",
    "ti ti-brain",
    MINDFULNESS_CARDS,
    saveMindfulness
  );
  buildCardManagerSection(
    "cards-section-pausa",
    "Ejercicios de Pausa Activa",
    "ti ti-run",
    PAUSA_CARDS,
    savePausa
  );

  pc.querySelectorAll(".tab-cards-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      pc.querySelectorAll(".tab-cards-btn").forEach(b => {
        b.style.background = "var(--gray-100)"; b.style.color = "var(--gray-700)"; b.classList.remove("active");
      });
      btn.style.background = ""; btn.style.color = ""; btn.classList.add("active");
      ["habitos","mindfulness","pausa"].forEach(s => {
        document.getElementById(`cards-section-${s}`).style.display = btn.dataset.section === s ? "block" : "none";
      });
    });
  });
}

function renderHabitosInContainer(containerId) {
  const container = document.getElementById(containerId);
  const rows = HABITS.map((h, i) => `
    <tr>
      <td class="hab-td-icon">${h.icon}</td>
      <td class="hab-td-name">${h.name}</td>
      <td class="hab-td-actions">
        <button class="btn-action btn-hab-up" data-i="${i}" ${i === 0 ? "disabled" : ""}><i class="ti ti-chevron-up"></i></button>
        <button class="btn-action btn-hab-down" data-i="${i}" ${i === HABITS.length - 1 ? "disabled" : ""}><i class="ti ti-chevron-down"></i></button>
        <button class="btn-action btn-hab-edit" data-i="${i}" title="Editar"><i class="ti ti-pencil"></i></button>
        <button class="btn-action btn-hab-del" data-i="${i}"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`).join("");

  container.innerHTML = `
    <div class="hab-manager">
      <div class="hab-header">
        <div>
          <div class="chart-title" style="margin-bottom:4px">
            <i class="ti ti-list-check" style="color:var(--green);margin-right:6px"></i>Hábitos del reto
          </div>
          <p style="font-size:12px;color:var(--gray-400)">Los cambios se sincronizan para todos los usuarios en tiempo real.</p>
        </div>
        <button class="btn-summary" id="btn-add-habit" style="height:38px"><i class="ti ti-plus"></i> Agregar hábito</button>
      </div>
      <div class="table-wrap" style="margin-top:1rem">
        <table class="hab-table">
          <thead><tr>
            <th style="width:60px;text-align:center">Ícono</th>
            <th style="text-align:left;padding-left:14px">Nombre del hábito</th>
            <th style="width:130px;text-align:center">Acciones</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="hab-footer">
        <span style="font-size:12px;color:var(--gray-400)">${HABITS.length} hábito${HABITS.length !== 1 ? "s" : ""}</span>
        <button class="btn-action" id="btn-reset-habits" style="color:var(--gray-400)">
          <i class="ti ti-refresh"></i> Restaurar predeterminados
        </button>
      </div>
    </div>

    <div id="add-habit-modal" class="modal-bg" style="display:none">
      <div class="modal-box" style="max-width:400px">
        <div class="modal-hdr"><h2>Agregar hábito</h2><button id="close-add-habit"><i class="ti ti-x"></i></button></div>
        <label>Ícono (emoji)</label>
        <div class="emoji-picker-wrap">
          <input id="hab-icon" type="text" placeholder="Agrega un emoji: 🏋️" maxlength="4" style="width:80px;text-align:center;font-size:22px">
          <div class="emoji-suggestions">
            ${["🏋️","🚴","🥦","🍎","💤","🧴","📖","🎯","🏊","🤸","🧃","🦷","🌿","🎵","🧠","💪","🛌","🚿","✍️","🍵"]
              .map(e => `<button class="emoji-opt" data-e="${e}">${e}</button>`).join("")}
          </div>
        </div>
        <label style="margin-top:14px">Nombre del hábito</label>
        <input id="hab-name" type="text" placeholder="Ej: Leer 20 minutos" maxlength="60">
        <button class="btn-green" id="do-add-habit" style="margin-top:1.25rem"><i class="ti ti-plus"></i> Agregar</button>
        <div class="auth-err" id="add-habit-err" style="min-height:18px;margin-top:8px"></div>
      </div>
    </div>

    <div id="edit-habit-modal" class="modal-bg" style="display:none">
      <div class="modal-box" style="max-width:400px">
        <div class="modal-hdr"><h2>Editar hábito</h2><button id="close-edit-habit"><i class="ti ti-x"></i></button></div>
        <label>Ícono (emoji)</label>
        <div class="emoji-picker-wrap">
          <input id="edit-hab-icon" type="text" maxlength="4" style="width:80px;text-align:center;font-size:22px">
          <div class="emoji-suggestions">
            ${["🏋️","🚴","🥦","🍎","💤","🧴","📖","🎯","🏊","🤸","🧃","🦷","🌿","🎵","🧠","💪","🛌","🚿","✍️","🍵"]
              .map(e => `<button class="emoji-opt-edit" data-e="${e}">${e}</button>`).join("")}
          </div>
        </div>
        <label style="margin-top:14px">Nombre del hábito</label>
        <input id="edit-hab-name" type="text" maxlength="60">
        <button class="btn-green" id="do-edit-habit" style="margin-top:1.25rem"><i class="ti ti-check"></i> Guardar cambios</button>
        <div class="auth-err" id="edit-habit-err" style="min-height:18px;margin-top:8px"></div>
      </div>
    </div>`;

  document.getElementById("btn-add-habit").addEventListener("click", () => {
    document.getElementById("hab-icon").value = "";
    document.getElementById("hab-name").value = "";
    document.getElementById("add-habit-err").textContent = "";
    document.getElementById("add-habit-modal").style.display = "flex";
  });
  document.getElementById("close-add-habit").addEventListener("click", () => {
    document.getElementById("add-habit-modal").style.display = "none";
  });
  document.getElementById("add-habit-modal").addEventListener("click", function(e) {
    if (e.target === this) this.style.display = "none";
  });
  container.querySelectorAll(".emoji-opt").forEach(btn => {
    btn.addEventListener("click", () => { document.getElementById("hab-icon").value = btn.dataset.e; });
  });
  document.getElementById("do-add-habit").addEventListener("click", async () => {
    const icon = document.getElementById("hab-icon").value.trim();
    const name = document.getElementById("hab-name").value.trim();
    const err  = document.getElementById("add-habit-err");
    if (!icon) { err.textContent = "Elige o pega un emoji."; return; }
    if (!name || name.length < 3) { err.textContent = "Escribe un nombre válido."; return; }
    HABITS.push({ icon, name });
    await saveHabits();
    document.getElementById("add-habit-modal").style.display = "none";
    showToast(`✓ Hábito "${name}" agregado`);
    renderHabitosInContainer(containerId);
  });
  document.getElementById("close-edit-habit").addEventListener("click", () => {
    document.getElementById("edit-habit-modal").style.display = "none";
  });
  document.getElementById("edit-habit-modal").addEventListener("click", function(e) {
    if (e.target === this) this.style.display = "none";
  });
  container.querySelectorAll(".emoji-opt-edit").forEach(btn => {
    btn.addEventListener("click", () => { document.getElementById("edit-hab-icon").value = btn.dataset.e; });
  });
  container.querySelectorAll(".btn-hab-edit").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.i);
      document.getElementById("edit-hab-icon").value = HABITS[i].icon;
      document.getElementById("edit-hab-name").value = HABITS[i].name;
      document.getElementById("edit-habit-err").textContent = "";
      document.getElementById("edit-habit-modal").dataset.i = i;
      document.getElementById("edit-habit-modal").style.display = "flex";
    });
  });
  document.getElementById("do-edit-habit").addEventListener("click", async () => {
    const i    = parseInt(document.getElementById("edit-habit-modal").dataset.i);
    const icon = document.getElementById("edit-hab-icon").value.trim();
    const name = document.getElementById("edit-hab-name").value.trim();
    const err  = document.getElementById("edit-habit-err");
    if (!icon) { err.textContent = "Elige o pega un emoji."; return; }
    if (!name || name.length < 3) { err.textContent = "Escribe un nombre válido."; return; }
    HABITS[i] = { icon, name };
    await saveHabits();
    document.getElementById("edit-habit-modal").style.display = "none";
    showToast("✓ Hábito actualizado");
    renderHabitosInContainer(containerId);
  });
  container.querySelectorAll(".btn-hab-up").forEach(btn => {
    btn.addEventListener("click", async () => {
      const i = parseInt(btn.dataset.i);
      if (i === 0) return;
      [HABITS[i - 1], HABITS[i]] = [HABITS[i], HABITS[i - 1]];
      await saveHabits(); renderHabitosInContainer(containerId);
    });
  });
  container.querySelectorAll(".btn-hab-down").forEach(btn => {
    btn.addEventListener("click", async () => {
      const i = parseInt(btn.dataset.i);
      if (i === HABITS.length - 1) return;
      [HABITS[i], HABITS[i + 1]] = [HABITS[i + 1], HABITS[i]];
      await saveHabits(); renderHabitosInContainer(containerId);
    });
  });
  container.querySelectorAll(".btn-hab-del").forEach(btn => {
    btn.addEventListener("click", async () => {
      const i = parseInt(btn.dataset.i);
      if (HABITS.length <= 1) { showToast("Debe haber al menos 1 hábito."); return; }
      const name = HABITS[i].name;
      HABITS.splice(i, 1);
      await saveHabits();
      showToast(`Hábito "${name}" eliminado`);
      renderHabitosInContainer(containerId);
    });
  });
  document.getElementById("btn-reset-habits").addEventListener("click", async () => {
    if (!confirm("¿Restaurar los hábitos predeterminados?")) return;
    HABITS = DEFAULT_HABITS.map(h => ({ ...h }));
    await saveHabits();
    showToast("✓ Hábitos restaurados");
    renderHabitosInContainer(containerId);
  });
}

/* ══════════════════════════════════════
   SERVICE WORKER & NOTIFICACIONES
══════════════════════════════════════ */
let swRegistration = null;

async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register("sw.js");
    // Esperar a que el SW esté activo
    await navigator.serviceWorker.ready;
    // Enviar horarios al SW
    sendScheduleToSW();
    // Mostrar banner iOS si aplica
    checkIOSInstall();
  } catch(e) { console.warn("SW registration failed:", e); }
}

function sendScheduleToSW() {
  if (!swRegistration || !swRegistration.active) return;
  if (Notification.permission !== "granted") return;
  swRegistration.active.postMessage({
    type: "SCHEDULE_NOTIFICATIONS",
    notificaciones: NOTIF_SCHEDULE
  });
}

function cancelSWNotifications() {
  if (!swRegistration || !swRegistration.active) return;
  swRegistration.active.postMessage({ type: "CANCEL_NOTIFICATIONS" });
}

async function requestNotifPermission() {
  if (!("Notification" in window)) {
    showToast("Tu navegador no soporta notificaciones.");
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") {
    showToast("Notificaciones bloqueadas. Actívalas en la configuración del navegador.");
    return false;
  }
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

/* ── iOS install banner ── */
function checkIOSInstall() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  const dismissed = localStorage.getItem("ios-banner-dismissed");
  if (isIOS && !isInStandaloneMode && !dismissed) {
    const banner = document.getElementById("ios-install-banner");
    if (banner) banner.style.display = "block";
  }
}

/* ══════════════════════════════════════
   FIREBASE AUTH STATE
══════════════════════════════════════ */
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    // Usuario autenticado
    currentUid   = firebaseUser.uid;
    currentEmail = firebaseUser.email;
    curUser      = firebaseUser.displayName || firebaseUser.email;

    // Detectar admin por correo (ajusta según tu proyecto)
    const ADMIN_EMAIL = "admin@kuale.com"; 
    isAdmin = (firebaseUser.email === ADMIN_EMAIL);

    showLoading("Cargando...");
    await launchMain();
  } else {
    // No hay sesión activa
    currentUid = null; currentEmail = null; curUser = null; isAdmin = false;
    uData = { data: {}, joinDate: "", password: "" };
    hideLoading();
    document.getElementById("auth-screen").style.display = "flex";
    document.getElementById("main-screen").style.display = "none";
  }
});

/* ══════════════════════════════════════
   INIT1
══════════════════════════════════════ */
document.getElementById("login-btn").addEventListener("click", doLogin);
document.getElementById("email").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("password").focus(); });
document.getElementById("password").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
document.getElementById("logout-btn").addEventListener("click", doLogout);

// iOS install banner close
const iosBannerClose = document.getElementById("ios-banner-close");
if (iosBannerClose) {
  iosBannerClose.addEventListener("click", () => {
    document.getElementById("ios-install-banner").style.display = "none";
    localStorage.setItem("ios-banner-dismissed", "1");
  });
}

document.getElementById("toggle-register-btn").addEventListener("click", () => {
  const s        = document.getElementById("register-section");
  const loginBtn = document.getElementById("login-btn");
  const visible  = s.style.display !== "none";
  s.style.display        = visible ? "none"  : "block";
  loginBtn.style.display = visible ? "block" : "none";
  document.getElementById("toggle-register-btn").innerHTML = visible
    ? '<i class="ti ti-user-plus"></i> ¿Primera vez? Regístrate'
    : '<i class="ti ti-x"></i> Cancelar';
});
document.getElementById("register-btn").addEventListener("click", doRegister);

document.getElementById("close-modal").addEventListener("click", () => { document.getElementById("sum-modal").style.display = "none"; });
document.getElementById("sum-modal").addEventListener("click", function(e) { if (e.target === this) this.style.display = "none"; });

document.getElementById("recover-btn").addEventListener("click", () => { document.getElementById("recover-modal").style.display = "flex"; });
document.getElementById("close-recover").addEventListener("click", () => {
  document.getElementById("recover-modal").style.display = "none";
  document.getElementById("recover-err").textContent = "";
  document.getElementById("recover-err").style.color = "";
});
document.getElementById("recover-modal").addEventListener("click", function(e) {
  if (e.target === this) { this.style.display = "none"; document.getElementById("recover-err").textContent = ""; }
});
document.getElementById("do-recover").addEventListener("click", doRecover);

document.getElementById("close-ud").addEventListener("click", () => { document.getElementById("user-detail-modal").style.display = "none"; });
document.getElementById("user-detail-modal").addEventListener("click", function(e) { if (e.target === this) this.style.display = "none"; });

document.getElementById("confirm-cancel").addEventListener("click", () => {
  document.getElementById("confirm-modal").style.display = "none"; _pendingDeleteName = null;
});
document.getElementById("confirm-modal").addEventListener("click", function(e) {
  if (e.target === this) { this.style.display = "none"; _pendingDeleteName = null; }
});
document.getElementById("confirm-ok").addEventListener("click", async () => {
  if (!_pendingDeleteName) return;
  showLoading("Eliminando usuario...");
  try {
    await deleteUserDoc(_pendingDeleteName);
    _pendingDeleteName = null;
    document.getElementById("confirm-modal").style.display = "none";
    hideLoading();
    renderAdmin();
  } catch { hideLoading(); showToast("Error al eliminar usuario."); }
});