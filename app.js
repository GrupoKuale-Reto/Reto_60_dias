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
let USER_PHOTOS       = {}; // { "day": [{url, thumb, date, habitName}] }
const IMGBB_KEY = "45533b3f28084b0b3ac93329181fb6d9";
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

/* ── Fotos ── */
async function loadPhotos(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid, "progress", "photos"));
    USER_PHOTOS = snap.exists() ? (snap.data().photos || {}) : {};
  } catch { USER_PHOTOS = {}; }
}

async function savePhotos(uid) {
  await setDoc(doc(db, "users", uid, "progress", "photos"), { photos: USER_PHOTOS });
}

async function uploadToImgBB(file) {
  const b64 = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const form = new FormData();
  form.append("key", IMGBB_KEY);
  form.append("image", b64);
  const resp = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: form });
  const data = await resp.json();
  if (!data.success) throw new Error("imgBB error");
  return { url: data.data.url, thumb: data.data.thumb?.url || data.data.url };
}

/* ══════════════════════════════════════
   LOADING SCREEN
══════════════════════════════════════ */
function showLoading(msg = "Cargando...") {
  const el = document.getElementById("loading-screen");
  const ml = document.getElementById("loading-msg");
  if (el) el.style.display = "flex";
  if (ml) ml.textContent = msg;
}
function hideLoading() {
  const el = document.getElementById("loading-screen");
  if (el) el.style.display = "none";
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
    await loadPhotos(currentUid);
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
  const authScreen = document.getElementById("auth-screen");
  const mainScreen = document.getElementById("main-screen");
  const chip       = document.getElementById("user-chip");
  if (!authScreen || !mainScreen || !chip) {
    console.error("launchMain: elementos del DOM no encontrados. Verifica los IDs en index.html.");
    return;
  }
  authScreen.style.display = "none";
  mainScreen.style.display = "block";
  chip.textContent = isAdmin ? "Administrador" : curUser;
  chip.className   = isAdmin ? "admin-chip" : "user-chip";
  buildTabs();
  renderTab(isAdmin ? "admin" : "tracker");
  if (!isAdmin) {
    scheduleMidnightSave();
    /* Suscribir a OneSignal en segundo plano */
    setTimeout(() => subscribeToNotifications(), 3000);
  }
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
    : [{ id: "tracker", label: "Mi reto" }, { id: "galeria", label: "📷 Mi galería" }];
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
  else if (tab === "galeria")        renderGaleria();
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

/* ── Web Notifications — usa OneSignal en móvil, fallback nativo en desktop ── */
async function requestNotification() {
  if (isAdmin) return;

  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  /* Intentar OneSignal primero */
  if (window.OneSignal && window.OneSignal.Notifications) {
    try {
      await OneSignal.Notifications.requestPermission();
      if (OneSignal.Notifications.permission) {
        await OneSignal.login(currentUid);
        await updateNotifyBtn();
        showToast("✓ Notificaciones activadas en este dispositivo");
        return;
      } else {
        showToast("Permiso denegado. Actívalo en ajustes del navegador.");
        return;
      }
    } catch(e) {
      console.warn("OneSignal no disponible, usando fallback:", e.message);
      // Continúa al fallback nativo
    }
  }

  /* Fallback nativo — funciona en desktop y Chrome Android */
  if (!("Notification" in window)) {
    if (isMobile) {
      // iOS Safari sin PWA instalada
      showToast("Instala la app primero: Menú → Agregar a pantalla de inicio");
    } else {
      showToast("Tu navegador no soporta notificaciones.");
    }
    return;
  }

  if (Notification.permission === "denied") {
    showToast("Notificaciones bloqueadas. Actívalas en ajustes del navegador.");
    return;
  }

  const perm = await Notification.requestPermission();
  if (perm === "granted") {
    sendScheduleToSW();
    await updateNotifyBtn();
    showToast("✓ Notificaciones activadas");
  } else {
    showToast("Permiso denegado.");
  }
}

async function updateNotifyBtn() {
  const btn = document.getElementById("notify-btn");
  if (!btn) return;

  let active = false;
  // Verificar suscripcion real de OneSignal si esta disponible
  if (window.OneSignal && window.OneSignal.Notifications) {
    try {
      const optedIn = window.OneSignal.User?.PushSubscription?.optedIn;
      active = window.OneSignal.Notifications.permission === true && !!optedIn;
    } catch { active = false; }
  } else {
    // Fallback: permiso nativo del navegador
    active = "Notification" in window && Notification.permission === "granted";
  }

  btn.classList.toggle("notify-active", active);
  btn.title = active ? "Notificaciones activadas" : "Activar notificaciones";
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
        <div style="display:flex;gap:8px;flex-shrink:0;align-items:center">
          <button class="btn-summary" id="btn-add-notif" style="height:38px;white-space:nowrap;padding:0 12px"><i class="ti ti-plus"></i> Agregar</button>
          <button class="btn-green" id="btn-save-notif" style="height:38px;white-space:nowrap;width:auto;padding:0 12px;margin-top:0"><i class="ti ti-device-floppy"></i> Guardar</button>
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

    /* También enviar via OneSignal a todos los dispositivos móviles */
    const activas = NOTIF_SCHEDULE.filter(n => n.activa);
    for (const n of activas) {
      await sendPushNotification(n.titulo, n.mensaje, n.hora);
    }

    showToast("✓ Notificaciones guardadas y programadas para todos los dispositivos");
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
      const hasPhoto = USER_PHOTOS && USER_PHOTOS[`${d}_${hi}`];
      const camBtn = s === 1
        ? `<button class="cam-btn${hasPhoto ? " has-photo" : ""}" data-d="${d}" data-h="${hi}" title="${hasPhoto ? "Ver/cambiar foto" : "Agregar foto"}">
             ${hasPhoto ? "📷" : "<i class='ti ti-camera' style='font-size:10px'></i>"}
           </button>`
        : "";
      html += `<td class="${d === 0 ? "today-col" : ""}" style="position:relative">
        <button class="check-btn ${s === 1 ? "done" : s === 2 ? "fail" : ""}" data-d="${d}" data-h="${hi}">
          ${s === 1 ? "✓" : s === 2 ? "✗" : ""}
        </button>${camBtn}</td>`;
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
      const d = parseInt(this.dataset.d);
      const h = parseInt(this.dataset.h);
      cs(d, h);
      renderTracker();
      await autoSave();
    });
  });

  /* cámara — solo aparece en hábitos cumplidos */
  document.querySelectorAll(".cam-btn").forEach(btn => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const d = parseInt(this.dataset.d);
      const h = parseInt(this.dataset.h);
      askPhotoForDay(d, HABITS[h]?.name || "Hábito");
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
        const uid   = u.name; // u.name = doc id = uid de Firebase Auth
        const grid  = await loadProgress(uid);
        const pSnap = await getDoc(doc(db, "users", uid, "progress", "photos")).catch(() => null);
        const photos = pSnap && pSnap.exists() ? (pSnap.data().photos || {}) : {};
        return {
          ...u,
          uid,
          name: u.nombre || u.correo || uid,
          data: grid,
          photos
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

    const stats      = usersWithProgress.map(u => ({ ...u, ...getUserStats(u), photos: u.photos || {} }));
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
    <div class="weeks-accordion">${weeksHtml}</div>

    ${(() => {
      const allPhotos = [];
      Object.entries(s.photos || {}).forEach(([day, photos]) => {
        photos.forEach(p => allPhotos.push({ ...p, day: parseInt(day) }));
      });
      allPhotos.sort((a, b) => b.ts - a.ts);
      if (allPhotos.length === 0) return "";
      return `<div style="margin-top:1.5rem">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">
          <i class="ti ti-photo" style="color:var(--green)"></i> Fotos del reto (${allPhotos.length})
        </div>
        <div class="galeria-grid">
          ${allPhotos.map(p => `
            <div class="galeria-card">
              <div class="galeria-img-wrap">
                <img src="${p.thumb}" alt="${p.habitName}" loading="lazy" class="galeria-img admin-photo"
                  data-url="${p.url}" data-habit="${p.habitName}" data-day="${p.day}" data-date="${p.date}">
              </div>
              <div class="galeria-info">
                <div class="galeria-habit">${p.habitName}</div>
                <div class="galeria-meta">Día ${p.day + 1} · ${p.date}</div>
              </div>
            </div>`).join("")}
        </div>
      </div>`;
    })()}`;

  document.querySelectorAll(".week-acc-header").forEach(btn => {
    btn.addEventListener("click", () => btn.closest(".week-accordion").classList.toggle("open"));
  });
  document.querySelectorAll(".admin-photo").forEach(img => {
    img.addEventListener("click", () => openLightbox(img.dataset.url, img.dataset.habit, parseInt(img.dataset.day), img.dataset.date));
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
   FOTOS & GALERÍA
══════════════════════════════════════ */
function askPhotoForDay(day, habitName) {
  // Crear modal de pregunta
  const existing = document.getElementById("photo-ask-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "photo-ask-modal";
  modal.className = "modal-bg";
  modal.style.display = "flex";
  modal.innerHTML = `
    <div class="modal-box" style="max-width:340px;text-align:center">
      <div style="font-size:32px;margin-bottom:12px">📷</div>
      <h2 style="font-size:16px;font-weight:600;margin-bottom:8px">¡Hábito cumplido!</h2>
      <p style="font-size:13px;color:var(--gray-600);margin-bottom:1.5rem">
        ¿Quieres agregar una foto para recordar este momento?<br>
        <span style="font-size:11px;color:var(--gray-400)">${habitName} · Día ${day + 1}</span>
      </p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button id="photo-yes" class="btn-green" style="margin-top:0">
          <i class="ti ti-camera"></i> Sí, agregar foto
        </button>
        <button id="photo-no" style="height:38px;border:1px solid var(--gray-200);border-radius:var(--radius-md);background:transparent;color:var(--gray-600);font-size:13px;cursor:pointer">
          No, gracias
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  document.getElementById("photo-no").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
  document.getElementById("photo-yes").addEventListener("click", () => {
    modal.remove();
    openPhotoUpload(day, habitName);
  });
}

function openPhotoUpload(day, habitName) {
  const existing = document.getElementById("photo-upload-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "photo-upload-modal";
  modal.className = "modal-bg";
  modal.style.display = "flex";
  modal.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <div class="modal-hdr">
        <h2>Agregar foto</h2>
        <button id="close-photo-upload"><i class="ti ti-x"></i></button>
      </div>
      <p style="font-size:12px;color:var(--gray-400);margin-bottom:1rem">${habitName} · Día ${day + 1}</p>

      <div style="display:flex;gap:10px;margin-bottom:4px">
        <label style="flex:1;cursor:pointer">
          <div class="photo-opt-btn">
            <i class="ti ti-photo" style="font-size:1.5rem;display:block;margin-bottom:6px"></i>
            <div style="font-size:13px;font-weight:600">Galería</div>
            <div style="font-size:11px;color:var(--gray-400);margin-top:2px">Elige una foto</div>
          </div>
          <input type="file" id="photo-file-input" accept="image/*" style="display:none">
        </label>
        ${/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
          ? `<label style="flex:1;cursor:pointer">
              <div class="photo-opt-btn">
                <i class="ti ti-camera" style="font-size:1.5rem;display:block;margin-bottom:6px"></i>
                <div style="font-size:13px;font-weight:600">Cámara</div>
                <div style="font-size:11px;color:var(--gray-400);margin-top:2px">Tomar foto</div>
              </div>
              <input type="file" id="photo-camera-input" accept="image/*" capture="environment" style="display:none">
            </label>`
          : `<button type="button" id="photo-webcam-btn" style="flex:1;cursor:pointer;background:none;border:none;padding:0">
              <div class="photo-opt-btn">
                <i class="ti ti-camera" style="font-size:1.5rem;display:block;margin-bottom:6px"></i>
                <div style="font-size:13px;font-weight:600">Cámara</div>
                <div style="font-size:11px;color:var(--gray-400);margin-top:2px">Usar webcam</div>
              </div>
            </button>`
        }
      </div>
      <!-- Webcam para PC -->
      <div id="webcam-wrap" style="display:none;margin-top:12px;text-align:center">
        <video id="webcam-video" autoplay playsinline style="width:100%;max-height:200px;border-radius:var(--radius-md);background:#000"></video>
        <button type="button" id="webcam-capture-btn" class="btn-green" style="margin-top:8px">
          <i class="ti ti-camera"></i> Capturar foto
        </button>
        <canvas id="webcam-canvas" style="display:none"></canvas>
      </div>

      <div id="photo-preview-wrap" style="display:none;margin-top:1rem;text-align:center">
        <img id="photo-preview-img" style="max-width:100%;max-height:200px;border-radius:var(--radius-md);object-fit:cover">
      </div>

      <div id="photo-upload-err" class="auth-err" style="min-height:18px;margin-top:8px"></div>

      <button id="do-upload-photo" class="btn-green" style="margin-top:1rem;display:none">
        <i class="ti ti-upload"></i> Subir foto
      </button>
    </div>`;

  document.body.appendChild(modal);

  document.getElementById("close-photo-upload").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });

  let selectedFile = null;

  function handleFileSelect(file) {
    if (!file) return;
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById("photo-preview-img").src = ev.target.result;
      document.getElementById("photo-preview-wrap").style.display = "block";
      document.getElementById("do-upload-photo").style.display = "block";
    };
    reader.readAsDataURL(file);
  }

  document.getElementById("photo-file-input").addEventListener("change", e => handleFileSelect(e.target.files[0]));

  // Móvil: input con capture
  const camInput = document.getElementById("photo-camera-input");
  if (camInput) camInput.addEventListener("change", e => handleFileSelect(e.target.files[0]));

  // PC: webcam con getUserMedia
  const webcamBtn = document.getElementById("photo-webcam-btn");
  if (webcamBtn) {
    let stream = null;
    webcamBtn.addEventListener("click", async () => {
      const wrap = document.getElementById("webcam-wrap");
      if (wrap.style.display === "block") {
        // Apagar webcam
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        wrap.style.display = "none";
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        document.getElementById("webcam-video").srcObject = stream;
        wrap.style.display = "block";
      } catch(e) {
        document.getElementById("photo-upload-err").textContent = "No se pudo acceder a la cámara.";
      }
    });

    document.getElementById("webcam-capture-btn").addEventListener("click", () => {
      const video  = document.getElementById("webcam-video");
      const canvas = document.getElementById("webcam-canvas");
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) return;
        const file = new File([blob], "webcam.jpg", { type: "image/jpeg" });
        handleFileSelect(file);
        // Apagar webcam
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        document.getElementById("webcam-wrap").style.display = "none";
      }, "image/jpeg", 0.9);
    });

    // Apagar webcam al cerrar modal
    document.getElementById("close-photo-upload").addEventListener("click", () => {
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    });
  }

  document.getElementById("do-upload-photo").addEventListener("click", async () => {
    if (!selectedFile) return;
    const btn = document.getElementById("do-upload-photo");
    const err = document.getElementById("photo-upload-err");
    btn.disabled = true;
    btn.textContent = "Subiendo...";
    err.textContent = "";
    try {
      const { url, thumb } = await uploadToImgBB(selectedFile);
      const dayKey = String(day);
      if (!USER_PHOTOS[dayKey]) USER_PHOTOS[dayKey] = [];
      USER_PHOTOS[dayKey].push({
        url, thumb,
        habitName,
        date: new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }),
        ts: Date.now()
      });
      await savePhotos(currentUid);
      modal.remove();
      showToast("✓ Foto guardada en tu galería");
    } catch(e) {
      err.textContent = "Error al subir la foto. Intenta de nuevo.";
      btn.disabled = false;
      btn.innerHTML = '<i class="ti ti-upload"></i> Subir foto';
    }
  });
}

function renderGaleria() {
  const pc = document.getElementById("page-content");
  const allPhotos = [];

  Object.entries(USER_PHOTOS).forEach(([day, photos]) => {
    photos.forEach(p => allPhotos.push({ ...p, day: parseInt(day) }));
  });

  allPhotos.sort((a, b) => b.ts - a.ts);

  if (allPhotos.length === 0) {
    pc.innerHTML = `
      <div style="text-align:center;padding:4rem 1rem">
        <div style="font-size:4rem;margin-bottom:1rem">📷</div>
        <div style="font-size:16px;font-weight:600;color:var(--gray-900);margin-bottom:8px">Tu galería está vacía</div>
        <div style="font-size:13px;color:var(--gray-400)">Cuando marques un hábito como cumplido puedes agregar fotos para recordar el momento.</div>
      </div>`;
    return;
  }

  pc.innerHTML = `
    <div style="margin-bottom:1.25rem">
      <div style="font-size:17px;font-weight:600;color:var(--gray-900);margin-bottom:4px">
        <i class="ti ti-photo" style="color:var(--green);margin-right:6px"></i>Mi galería
      </div>
      <p style="font-size:13px;color:var(--gray-400)">${allPhotos.length} foto${allPhotos.length !== 1 ? "s" : ""} guardada${allPhotos.length !== 1 ? "s" : ""}</p>
    </div>
    <div class="galeria-grid">
      ${allPhotos.map((p, i) => `
        <div class="galeria-card" data-i="${i}">
          <div class="galeria-img-wrap">
            <img src="${p.thumb}" alt="${p.habitName}" loading="lazy" class="galeria-img">
            <button class="galeria-del-btn" data-day="${p.day}" data-ts="${p.ts}" title="Eliminar">
              <i class="ti ti-trash"></i>
            </button>
          </div>
          <div class="galeria-info">
            <div class="galeria-habit">${p.habitName}</div>
            <div class="galeria-meta">Día ${p.day + 1} · ${p.date}</div>
          </div>
        </div>`).join("")}
    </div>`;

  // Lightbox al hacer clic
  pc.querySelectorAll(".galeria-img").forEach((img, i) => {
    img.addEventListener("click", () => openLightbox(allPhotos[i].url, allPhotos[i].habitName, allPhotos[i].day, allPhotos[i].date));
  });

  // Eliminar foto
  pc.querySelectorAll(".galeria-del-btn").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const day = String(btn.dataset.day);
      const ts  = parseInt(btn.dataset.ts);
      if (!confirm("¿Eliminar esta foto?")) return;
      USER_PHOTOS[day] = (USER_PHOTOS[day] || []).filter(p => p.ts !== ts);
      if (USER_PHOTOS[day].length === 0) delete USER_PHOTOS[day];
      await savePhotos(currentUid);
      showToast("Foto eliminada");
      renderGaleria();
    });
  });
}

function openLightbox(url, habitName, day, date) {
  const existing = document.getElementById("lightbox-modal");
  if (existing) existing.remove();
  const modal = document.createElement("div");
  modal.id = "lightbox-modal";
  modal.className = "modal-bg";
  modal.style.display = "flex";
  modal.style.background = "rgba(0,0,0,.85)";
  modal.innerHTML = `
    <div style="max-width:90vw;max-height:90vh;position:relative;text-align:center">
      <img src="${url}" style="max-width:90vw;max-height:75vh;border-radius:var(--radius-lg);object-fit:contain">
      <div style="color:#fff;margin-top:12px;font-size:14px;font-weight:600">${habitName}</div>
      <div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:4px">Día ${day + 1} · ${date}</div>
      <button id="close-lightbox" style="position:absolute;top:-16px;right:-16px;width:32px;height:32px;border-radius:50%;background:#fff;border:none;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">✕</button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("close-lightbox").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

/* ══════════════════════════════════════
   SERVICE WORKER & NOTIFICACIONES
══════════════════════════════════════ */
let swRegistration = null;

async function registerSW() {
  checkIOSInstall();
  if (!("serviceWorker" in navigator)) return;
  try {
    // Worker en la raíz del dominio — grupokuale-reto.github.io/OneSignalSDKWorker.js
    swRegistration = await navigator.serviceWorker.register(
      "/OneSignalSDKWorker.js",
      { scope: "/" }
    );
    await navigator.serviceWorker.ready;
    sendScheduleToSW();
  } catch(e) { console.warn("SW registration error:", e); }
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
   FIREBASE AUTH STATE + INIT1
══════════════════════════════════════ */

/* Helper: espera a que el DOM esté listo (funciona aunque el evento ya haya disparado) */
function domReady() {
  return new Promise(resolve => {
    if (document.readyState !== "loading") resolve();
    else document.addEventListener("DOMContentLoaded", resolve, { once: true });
  });
}

/* ── Auth state ── */
onAuthStateChanged(auth, async (firebaseUser) => {
  await domReady(); // garantiza que el DOM existe antes de tocar elementos
  if (firebaseUser) {
    currentUid   = firebaseUser.uid;
    currentEmail = firebaseUser.email;
    curUser      = firebaseUser.displayName || firebaseUser.email;
    const ADMIN_EMAIL = "admin@kuale.com";
    isAdmin = (firebaseUser.email === ADMIN_EMAIL);
    showLoading("Cargando...");
    await launchMain();
  } else {
    currentUid = null; currentEmail = null; curUser = null; isAdmin = false;
    uData = { data: {}, joinDate: "", password: "" };
    hideLoading();
    document.getElementById("auth-screen").style.display = "flex";
    document.getElementById("main-screen").style.display = "none";
  }
});

/* ── Eventos de login/registro (se registran cuando el DOM ya existe) ── */
domReady().then(() => {
  document.getElementById("login-btn").addEventListener("click", doLogin);
  document.getElementById("email").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("password").focus(); });
  document.getElementById("password").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  document.getElementById("logout-btn").addEventListener("click", doLogout);

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
});
/* ══════════════════════════════════════
   ASISTENTE IA — Chat flotante
   Groq (llama-3.3-70b) + Tavily search
══════════════════════════════════════ */

const GROQ_KEY   = "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";
const TAVILY_KEY = "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";
const GROQ_MODEL = "llama-3.3-70b-versatile";

let chatHistory  = [];
let chatOpen     = false;

/* ── Inyectar HTML del chat al body ── */
function initChat() {
  if (document.getElementById("ai-chat-panel")) return;

  document.body.insertAdjacentHTML("beforeend", `
    <!-- Botón flotante -->
    <button id="chat-fab" title="Asistente IA del reto" aria-label="Abrir asistente">
      <i class="ti ti-message-chatbot" id="chat-fab-icon"></i>
    </button>

    <!-- Panel de chat -->
    <div id="ai-chat-panel" aria-label="Chat con asistente IA">
      <div id="chat-header">
        <div id="chat-header-left">
          <div id="chat-avatar"><i class="ti ti-robot"></i></div>
          <div>
            <div id="chat-title">Asistente Reto 60 días</div>
            <div id="chat-subtitle">Con búsqueda web · Powered by Groq</div>
          </div>
        </div>
        <div id="chat-header-right">
          <button id="chat-clear" title="Limpiar conversación"><i class="ti ti-trash"></i></button>
          <button id="chat-close" title="Cerrar"><i class="ti ti-x"></i></button>
        </div>
      </div>

      <div id="chat-messages">
        <div class="chat-msg ai">
          <div class="chat-bubble">
            <p>¡Hola! 👋 Soy tu asistente del <strong>Reto 60 días Kuale</strong>.</p>
            <p>Puedo ayudarte con consejos sobre tus hábitos, motivación, nutrición, ejercicio y más. También puedo buscar información actualizada en internet.</p>
            <p>¿En qué te puedo ayudar hoy?</p>
          </div>
        </div>
      </div>

      <div id="chat-suggestions">
        <button class="chat-chip" data-q="¿Cómo puedo mantener la motivación durante el reto?">💪 Motivación</button>
        <button class="chat-chip" data-q="Dame consejos para tomar 2 litros de agua al día">💧 Hidratación</button>
        <button class="chat-chip" data-q="¿Qué ejercicios rápidos puedo hacer en la oficina?">🏃 Ejercicio</button>
        <button class="chat-chip" data-q="¿Cómo mejorar mi calidad de sueño?">😴 Sueño</button>
        <button class="chat-chip" data-q="Busca las últimas tendencias en hábitos saludables">🔍 Buscar info</button>
      </div>

      <div id="chat-input-area">
        <textarea id="chat-input" placeholder="Escribe tu pregunta... (Enter para enviar)" rows="1"></textarea>
        <button id="chat-send"><i class="ti ti-send"></i></button>
      </div>
    </div>
  `);

  /* ── Marked.js CDN dinámico ── */
  if (!window.marked) {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js";
    document.head.appendChild(s);
  }

  /* ── Events ── */
  document.getElementById("chat-fab").addEventListener("click", toggleChat);
  document.getElementById("chat-close").addEventListener("click", toggleChat);
  document.getElementById("chat-send").addEventListener("click", sendChatMessage);
  document.getElementById("chat-clear").addEventListener("click", clearChat);

  document.getElementById("chat-input").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  });

  /* auto-resize textarea */
  document.getElementById("chat-input").addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
  });

  /* suggestion chips */
  document.querySelectorAll(".chat-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("chat-input").value = btn.dataset.q;
      sendChatMessage();
    });
  });
}

function toggleChat() {
  chatOpen = !chatOpen;
  const panel = document.getElementById("ai-chat-panel");
  const icon  = document.getElementById("chat-fab-icon");
  panel.classList.toggle("open", chatOpen);
  icon.className = chatOpen ? "ti ti-x" : "ti ti-message-chatbot";
  if (chatOpen) {
    setTimeout(() => document.getElementById("chat-input").focus(), 300);
    document.getElementById("chat-suggestions").style.display =
      chatHistory.length === 0 ? "flex" : "none";
  }
}

function clearChat() {
  chatHistory = [];
  const msgs = document.getElementById("chat-messages");
  msgs.innerHTML = `<div class="chat-msg ai">
    <div class="chat-bubble"><p>Conversación reiniciada. ¿En qué te puedo ayudar? 😊</p></div>
  </div>`;
  document.getElementById("chat-suggestions").style.display = "flex";
}

/* ── Construir contexto del usuario ── */
function buildUserContext() {
  if (!curUser || isAdmin) return "";

  let tDone = 0, tMark = 0;
  for (let d = 0; d < DAYS; d++) {
    HABITS.forEach((_, hi) => {
      const s = gs(d, hi);
      if (s > 0) { tMark++; if (s === 1) tDone++; }
    });
  }
  const daysWithData = new Set(
    Object.keys(uData.data || {}).filter(k => (uData.data || {})[k] > 0).map(k => k.split("_")[0])
  ).size;
  const pct = tMark > 0 ? Math.round(tDone / tMark * 100) : 0;

  return `
CONTEXTO DEL USUARIO:
- Nombre: ${curUser}
- Días registrados: ${daysWithData}/60
- Cumplimiento general: ${pct}%
- Hábitos del reto: ${HABITS.map(h => `${h.icon} ${h.name}`).join(", ")}
- Semana actual: ${curWeek + 1} de ${TOTAL_WEEKS}
`;
}

/* ── Tavily search ── */
async function tavilySearch(query) {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query,
        search_depth: "basic",
        max_results: 4,
        include_answer: true,
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results = (data.results || []).map(r =>
      `**${r.title}**\n${r.content?.slice(0, 300)}...\nFuente: ${r.url}`
    ).join("\n\n");
    return data.answer
      ? `Respuesta directa: ${data.answer}\n\nFuentes:\n${results}`
      : results;
  } catch {
    return null;
  }
}

/* ── Decidir si necesita búsqueda web ── */
function needsWebSearch(text) {
  const triggers = [
    "busca", "buscar", "búsqueda", "últimas", "reciente", "actual",
    "hoy", "noticia", "tendencia", "estudio", "investigación",
    "qué dice", "según", "información sobre", "datos de"
  ];
  const lower = text.toLowerCase();
  return triggers.some(t => lower.includes(t));
}

/* ── Enviar mensaje ── */
async function sendChatMessage() {
  const input = document.getElementById("chat-input");
  const text  = input.value.trim();
  if (!text) return;

  input.value = "";
  input.style.height = "auto";
  document.getElementById("chat-suggestions").style.display = "none";

  appendMessage("user", text);
  chatHistory.push({ role: "user", content: text });

  const typingId = appendTyping();

  try {
    let webContext = "";
    if (needsWebSearch(text)) {
      const searchQuery = text.replace(/busca|buscar|búsqueda/gi, "").trim();
      const results = await tavilySearch(searchQuery || text);
      if (results) {
        webContext = `\n\nINFORMACIÓN WEB ENCONTRADA:\n${results}\n\nUsa esta información para enriquecer tu respuesta y cita las fuentes.`;
      }
    }

    const systemPrompt = `Eres el asistente IA oficial del **Reto 60 días de Buenos Hábitos de Grupo Kuale**. 
Eres un experto en bienestar, salud, hábitos, nutrición, ejercicio y productividad.
Tu objetivo es motivar, guiar y apoyar a los empleados de Grupo Kuale en su reto de 60 días.

REGLAS:
- Responde SIEMPRE en español
- Usa Markdown para formatear: **negritas**, listas, encabezados cuando sea útil
- Sé motivador, positivo y práctico
- Da consejos concretos y accionables
- Si el usuario comparte su progreso, felicítalo y anímalo
- Mantén el contexto del reto de 60 días siempre presente
- Máximo 400 palabras por respuesta (excepto si piden algo muy detallado)
- Si usas información web, cita las fuentes al final

${buildUserContext()}${webContext}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.slice(-10) // últimos 10 mensajes para contexto
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
        stream: false
      })
    });

    removeTyping(typingId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data   = await res.json();
    const reply  = data.choices?.[0]?.message?.content || "No obtuve respuesta.";
    chatHistory.push({ role: "assistant", content: reply });
    appendMessage("ai", reply);

  } catch (e) {
    removeTyping(typingId);
    appendMessage("ai", `❌ **Error:** ${e.message}\n\nVerifica tu conexión a internet e intenta de nuevo.`);
  }
}

/* ── Helpers de UI ── */
function renderMarkdown(text) {
  if (window.marked) {
    window.marked.setOptions({ breaks: true, gfm: true });
    return window.marked.parse(text);
  }
  /* fallback básico si marked no cargó aún */
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n/g, "<br>");
}

function appendMessage(role, text) {
  const msgs = document.getElementById("chat-messages");
  const div  = document.createElement("div");
  div.className = `chat-msg ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";

  if (role === "ai") {
    bubble.innerHTML = renderMarkdown(text);
  } else {
    bubble.textContent = text;
  }

  div.appendChild(bubble);
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendTyping() {
  const msgs = document.getElementById("chat-messages");
  const id   = "typing-" + Date.now();
  msgs.insertAdjacentHTML("beforeend", `
    <div class="chat-msg ai" id="${id}">
      <div class="chat-bubble typing-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>`);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

/* ── Inicializar cuando el DOM esté listo ── */
document.addEventListener("DOMContentLoaded", () => {
  initChat();
  initOneSignal();
});
/* ══════════════════════════════════════
   ONESIGNAL — Notificaciones push reales
   App ID: 36858566-60a8-475a-a21e-732b348c717a
══════════════════════════════════════ */

const OS_APP_ID  = "36858566-60a8-475a-a21e-732b348c717a";
const OS_API_KEY = "os_v2_app_g2cykztavbdvviq6omvtjddrpkyem7pguoguzxn5xlpcyzpc2nnshpxgvvmaui6vipjol3eqobwongmjkjkstayl2pqm22vvv6otrja";

/* ── OneSignal init manejado por index.html ── */
function initOneSignal() {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  // OneSignal puede fallar con AbortError en modo incógnito o iframes con sandbox
  // No es un error crítico — la app sigue funcionando sin push en esos contextos
  window.OneSignalDeferred.push(async (OS) => {
    try {
      // Init ya fue llamado desde index.html; este push es solo para capturar errores
    } catch(e) {
      if (e.name === "AbortError" || e.message?.includes("storage")) {
        console.warn("OneSignal: push notifications no disponibles en este contexto (incógnito/iframe).");
      } else {
        console.warn("OneSignal init error:", e);
      }
    }
  });
}

/* ── Suscribir usuario a notificaciones (OneSignal v16) ── */
async function subscribeToNotifications() {
  try {
    const doSubscribe = async (OS) => {
      await OS.Notifications.requestPermission();
      if (OS.Notifications.permission) {
        await OS.login(currentUid); // UID único de Firebase, evita 409 Conflict
        showToast("✓ Notificaciones activadas en este dispositivo");
        updateNotifyBtn();
      } else {
        showToast("Permiso denegado. Actívalo en ajustes del navegador.");
      }
    };
    if (window.OneSignal && window.OneSignal.Notifications) {
      await doSubscribe(window.OneSignal);
    } else {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(doSubscribe);
    }
  } catch(e) {
    console.error("OneSignal:", e);
    showToast("Error al activar notificaciones.");
  }
}

/* ── Enviar notificación masiva (solo admin) ── */
async function sendPushNotification(title, message, scheduledTime = null) {
  const body = {
    app_id: OS_APP_ID,
    headings: { es: title, en: title },
    contents: { es: message, en: message },
    included_segments: ["All"],
    small_icon: "logo-icon.png",
    large_icon: "logo-icon.png",
    url: window.location.href,
  };

  /* Si tiene hora programada (formato "HH:MM") */
  if (scheduledTime) {
    const [hh, mm] = scheduledTime.split(":").map(Number);
    const sendAt = new Date();
    sendAt.setHours(hh, mm, 0, 0);
    if (sendAt <= new Date()) sendAt.setDate(sendAt.getDate() + 1);
    body.send_after = sendAt.toUTCString();
    body.delayed_option = "timezone";
    body.delivery_time_of_day = scheduledTime;
  }

  try {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${OS_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.id) {
      return { ok: true, id: data.id, recipients: data.recipients };
    } else {
      return { ok: false, error: data.errors?.[0] || "Error desconocido" };
    }
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

/* ── Renderizar sección de notificaciones en panel admin ── */
async function renderNotifAdmin() {
  const pc = document.getElementById("page-content");

  /* Obtener notificaciones enviadas previamente */
  let historial = [];
  try {
    const snap = await getDoc(doc(db, "config", "notif_history"));
    if (snap.exists()) historial = snap.data().items || [];
  } catch {}

  pc.innerHTML = `
    <div class="hab-manager">
      <div class="hab-header">
        <div>
          <div class="chart-title" style="margin-bottom:4px">
            <i class="ti ti-bell" style="color:var(--green);margin-right:6px"></i>
            Enviar notificación push
          </div>
          <p style="font-size:12px;color:var(--gray-400)">
            Se envía a todos los usuarios que tengan notificaciones activadas en su dispositivo.
          </p>
        </div>
      </div>

      <div style="margin-top:1.25rem;display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:12px;font-weight:500;color:var(--gray-600);display:block;margin-bottom:5px">Título</label>
          <input id="notif-title" type="text" value="⏰ Reto 60 días · Kuale"
            style="width:100%;height:40px;padding:0 12px;border:1px solid var(--gray-200);border-radius:var(--radius-md);font-size:14px;outline:none">
        </div>
        <div>
          <label style="font-size:12px;font-weight:500;color:var(--gray-600);display:block;margin-bottom:5px">Mensaje</label>
          <textarea id="notif-msg" rows="3"
            style="width:100%;padding:10px 12px;border:1px solid var(--gray-200);border-radius:var(--radius-md);font-size:14px;outline:none;resize:vertical;font-family:inherit">¡No olvides registrar tus hábitos de hoy! Tienes hasta las 11:59 PM. 💪</textarea>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
          <div>
            <label style="font-size:12px;font-weight:500;color:var(--gray-600);display:block;margin-bottom:5px">
              Hora de envío <span style="font-weight:400;color:var(--gray-400)">(dejar vacío = enviar ahora)</span>
            </label>
            <input id="notif-time" type="time" value="20:00"
              style="height:40px;padding:0 12px;border:1px solid var(--gray-200);border-radius:var(--radius-md);font-size:14px;outline:none">
          </div>
          <div style="display:flex;gap:8px">
            <button id="btn-send-now" class="btn-summary" style="height:40px">
              <i class="ti ti-send"></i> Enviar ahora
            </button>
            <button id="btn-send-scheduled" class="btn-summary" style="height:40px;border-color:var(--gray-400);color:var(--gray-600)">
              <i class="ti ti-clock"></i> Programar hora
            </button>
          </div>
        </div>
        <div id="notif-result" style="min-height:20px;font-size:13px"></div>
      </div>

      <!-- Plantillas rápidas -->
      <div style="margin-top:1.5rem">
        <div class="chart-title" style="margin-bottom:10px">Mensajes rápidos</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${[
            { t: "⏰ Recordatorio diario", m: "¡No olvides registrar tus hábitos de hoy! Tienes hasta las 11:59 PM. 💪" },
            { t: "🏆 ¡Motivación!", m: "¡Vas muy bien en el Reto 60 días! Cada hábito cuenta. ¡Sigue adelante!" },
            { t: "📊 Revisa tu progreso", m: "¿Ya viste cuánto has avanzado? Entra a la app y revisa tu resumen del reto." },
            { t: "🌟 ¡Mitad del reto!", m: "¡Ya llegaste a la mitad del Reto 60 días! El esfuerzo vale la pena. ¡No pares!" },
          ].map(p => `<button class="notif-template chat-chip" data-title="${p.t}" data-msg="${p.m}">${p.t}</button>`).join("")}
        </div>
      </div>

      <!-- Historial -->
      ${historial.length > 0 ? `
        <div style="margin-top:1.5rem">
          <div class="chart-title" style="margin-bottom:10px">Últimas notificaciones enviadas</div>
          <div class="table-wrap">
            <table class="hab-table">
              <thead><tr>
                <th style="text-align:left;padding-left:14px">Título</th>
                <th style="text-align:left;padding-left:8px">Mensaje</th>
                <th>Enviada</th>
                <th>Tipo</th>
              </tr></thead>
              <tbody>
                ${historial.slice(-10).reverse().map(h => `
                  <tr>
                    <td style="padding-left:14px;font-weight:500">${h.title}</td>
                    <td style="padding-left:8px;font-size:12px;color:var(--gray-600)">${h.msg.slice(0,60)}...</td>
                    <td style="text-align:center;font-size:12px">${h.sentAt}</td>
                    <td style="text-align:center"><span class="badge ${h.scheduled ? "badge-gray" : "badge-green"}">${h.scheduled ? "Programada" : "Inmediata"}</span></td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>` : ""}
    </div>`;

  /* Plantillas rápidas */
  pc.querySelectorAll(".notif-template").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("notif-title").value = btn.dataset.title;
      document.getElementById("notif-msg").value   = btn.dataset.msg;
    });
  });

  /* Enviar ahora */
  document.getElementById("btn-send-now").addEventListener("click", async function() {
    await doSendNotif(false);
  });

  /* Programar */
  document.getElementById("btn-send-scheduled").addEventListener("click", async function() {
    await doSendNotif(true);
  });
}

async function doSendNotif(scheduled) {
  const title   = document.getElementById("notif-title").value.trim();
  const msg     = document.getElementById("notif-msg").value.trim();
  const time    = document.getElementById("notif-time").value;
  const result  = document.getElementById("notif-result");

  if (!title || !msg) { result.style.color = "var(--red)"; result.textContent = "Escribe título y mensaje."; return; }

  const sendBtn = document.getElementById(scheduled ? "btn-send-scheduled" : "btn-send-now");
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<i class="ti ti-loader"></i> Enviando...';
  result.textContent = "";

  const res = await sendPushNotification(title, msg, scheduled ? time : null);

  sendBtn.disabled = false;
  sendBtn.innerHTML = scheduled
    ? '<i class="ti ti-clock"></i> Programar hora'
    : '<i class="ti ti-send"></i> Enviar ahora';

  if (res.ok) {
    result.style.color = "var(--green)";
    result.textContent = scheduled
      ? `✓ Programada para las ${time} — llegará a ${res.recipients || "todos"} dispositivos`
      : `✓ Enviada a ${res.recipients || "todos"} dispositivos`;

    /* Guardar en historial */
    try {
      const snap = await getDoc(doc(db, "config", "notif_history"));
      const items = snap.exists() ? (snap.data().items || []) : [];
      items.push({
        title,
        msg,
        sentAt: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
        scheduled,
      });
      await setDoc(doc(db, "config", "notif_history"), { items: items.slice(-50) });
    } catch {}
  } else {
    result.style.color = "var(--red)";
    result.textContent = `✗ Error: ${res.error}`;
  }
}