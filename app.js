
/* SkillCensus - Firebase powered app */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const firebaseConfigured = FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.includes('YOUR_');
const fbApp = firebaseConfigured ? initializeApp(FIREBASE_CONFIG) : null;
const auth = fbApp ? getAuth(fbApp) : null;
const db = fbApp ? getFirestore(fbApp) : null;

// ===================== STATE =====================
let authUser = null;
let currentProfile = null;
let currentUser = null; // UI compatibility
let activeChatId = null;
let dashMapObj = null;
let fullMapObj = null;
let heroMapObj = null;
let allMarkers = [];
let fullMarkers = [];
let discoverPage = 0;
const DISCOVER_PER_PAGE = 6;
let notifications = [];
let TALENTS = [];
let conversations = [];
let myConnections = [];
let TRENDING = [];
let endorsementCounts = {};
let activeMessages = [];
let activeThreadUnsub = null;

const ROLE_LABELS = { talent: 'Talent Provider', seeker: 'Talent Seeker' };
const CAT_COLORS = {tech:'#00d4ff',trade:'#ff5733',health:'#00ff88',agri:'#f5c842',edu:'#c084fc',creative:'#f472b6'};

// ===================== FIREBASE HELPERS =====================
function requireFirebase() {
  if (!fbApp) {
    showToast('Firebase not configured. Update FIREBASE_CONFIG in app.js', 'error');
    return false;
  }
  return true;
}

function isAuthed() {
  return !!currentProfile && !!authUser;
}

function normalizeSkills(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return String(raw).split(',').map(s => s.trim()).filter(Boolean);
}

function getAvatarLetter(name) {
  if (!name) return 'U';
  const ch = String(name).trim()[0];
  return ch ? ch.toUpperCase() : 'U';
}

function profileToTalent(p) {
  const location = [p.district, p.state].filter(Boolean).join(', ') || 'India';
  return {
    id: p.id,
    name: p.name || 'Unnamed',
    emoji: p.emoji || getAvatarLetter(p.name),
    location,
    lat: p.lat,
    lng: p.lng,
    skills: normalizeSkills(p.skills),
    primary: p.primaryRole || (p.role === 'talent' ? 'Talent Provider' : 'Talent Seeker'),
    exp: (p.expYears ?? 0) + ' yrs',
    verify: p.verifyStatus || 'self',
    avail: p.avail || 'open',
    category: p.category || 'tech',
    bio: p.bio || '',
    views: p.views || 0,
    rating: p.rating || 5.0,
    phone: p.phone || ''
  };
}

function formatTime(ts) {
  if (!ts) return '';
  const d = ts instanceof Date ? ts : ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 60000) return 'now';
  if (diffMs < 3600000) return Math.floor(diffMs / 60000) + 'm';
  if (diffMs < 86400000) return Math.floor(diffMs / 3600000) + 'h';
  return d.toLocaleDateString([], {month:'short', day:'numeric'});
}
// ===================== PAGE MANAGEMENT =====================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active','page-transition'); p.style.display='none'; });
  const el = document.getElementById(id);
  el.style.display = id === 'authPage' ? 'flex' : id === 'dashPage' ? 'flex' : 'block';
  el.classList.add('active','page-transition');
  if (id === 'landingPage') initHeroMap();
  window.scrollTo(0,0);
}

function showAuthPage(tab) {
  showPage('authPage');
  switchAuthTab(tab);
}

function showDash() {
  showPage('dashPage');
  setTimeout(() => {
    initDashMap();
    renderTalentGrid();
    renderChatList();
    renderTrendingTable();
    renderConnections();
    updateProfileUI();
    animateOverviewStats();
    renderNotifList();
  }, 100);
}

function showDashSection(name, el) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById('sec-' + name);
  if (sec) sec.classList.add('active');
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  if (name === 'map') setTimeout(initFullMap, 150);
}

// ===================== AUTH =====================
let selectedRole = 'talent';
function selectRole(el) {
  document.querySelectorAll('.role-option').forEach(r => r.classList.remove('selected'));
  el.classList.add('selected');
  selectedRole = el.dataset.role;
  document.getElementById('skillCatGroup').style.display = selectedRole === 'talent' ? 'block' : 'none';
}

function switchAuthTab(tab) {
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('loginTab').classList.toggle('active', tab === 'login');
  document.getElementById('registerTab').classList.toggle('active', tab === 'register');
}

function showFieldError(inputId) {
  const el = document.getElementById(inputId);
  if (el) { el.classList.add('error'); setTimeout(()=>el.classList.remove('error'),600); }
}

function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function checkPwStrength(v) {
  const bar = document.getElementById('pwBar');
  const label = document.getElementById('pwLabel');
  if (!bar || !label) return;
  let score = 0;
  if (v.length >= 6) score++;
  if (v.length >= 10) score++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
  if (/[0-9]/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  const levels = [{w:'0%',c:'#555',t:''},{w:'20%',c:'#e04420',t:'Very Weak'},{w:'40%',c:'#ff8c00',t:'Weak'},{w:'60%',c:'#f5c842',t:'Fair'},{w:'80%',c:'#00a35c',t:'Strong'},{w:'100%',c:'#00ff88',t:'Very Strong'}];
  const l = levels[Math.min(score, 5)];
  bar.style.width = l.w; bar.style.background = l.c;
  label.textContent = l.t; label.style.color = l.c;
}

async function handleLogin() {
  if (!requireFirebase()) return;
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  if (!email) { showFieldError('loginEmail'); showToast('Please enter your email','error'); return; }
  if (!pass) { showFieldError('loginPass'); showToast('Please enter your password','error'); return; }

  try {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    authUser = res.user;
    await loadCurrentProfile();
    if (!currentProfile) { showToast('Profile not found. Please complete registration.', 'error'); return; }
    afterLogin();
  } catch (e) {
    showToast(e.message || 'Login failed', 'error');
  }
}

async function handleRegister() {
  if (!requireFirebase()) return;
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const state = document.getElementById('regState').value;
  const pass = document.getElementById('regPass').value;
  let valid = true;
  if (!name) { showFieldError('regName'); valid = false; }
  if (!email || !validateEmail(email)) { showFieldError('regEmail'); valid = false; }
  if (!state) { showFieldError('regState'); valid = false; }
  if (!pass || pass.length < 6) { showFieldError('regPass'); valid = false; }
  if (!valid) { showToast('Please fix the highlighted fields','error'); return; }

  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    authUser = res.user;
    await updateProfile(authUser, { displayName: name });

    const baseProfile = {
      id: authUser.uid,
      role: selectedRole,
      name,
      email,
      phone,
      emoji: getAvatarLetter(name),
      state,
      district: '',
      skills: [],
      primaryRole: selectedRole === 'talent' ? (document.getElementById('regCategory').value || 'Professional') : 'Talent Seeker',
      expYears: 0,
      verifyStatus: 'self',
      avail: 'open',
      category: document.getElementById('regCategory').value || 'tech',
      bio: '',
      rating: 5.0,
      views: 0,
      lat: null,
      lng: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'profiles', authUser.uid), baseProfile);
    await loadCurrentProfile();
    showToast('Welcome, ' + name + '! Account created.', 'success');
    afterLogin();
  } catch (e) {
    showToast(e.message || 'Registration failed', 'error');
  }
}

async function afterLogin() {
  if (!currentProfile) return;
  currentUser = profileToTalent(currentProfile);
  document.getElementById('sidebarName').textContent = currentProfile.name || '';
  document.getElementById('sidebarRole').textContent = ROLE_LABELS[currentProfile.role] || currentProfile.role;
  document.getElementById('sidebarAvatar').textContent = currentProfile.emoji || getAvatarLetter(currentProfile.name);
  document.getElementById('topbarUser').textContent = 'Welcome, ' + (currentProfile.name || '').split(' ')[0];
  showToast('Signed in as ' + (currentProfile.name || 'User'), 'success');
  await loadDashData();
  showDash();
}

async function logout() {
  if (!requireFirebase()) return;
  await signOut(auth);
  authUser = null;
  currentProfile = null;
  currentUser = null;
  showPage('landingPage');
  showToast('Signed out successfully','info');
}
// ===================== DATA LOADERS =====================
async function loadCurrentProfile() {
  if (!requireFirebase() || !authUser) return;
  const snap = await getDoc(doc(db, 'profiles', authUser.uid));
  currentProfile = snap.exists() ? snap.data() : null;
}

async function loadTalents() {
  if (!requireFirebase()) return;
  const qTal = query(collection(db, 'profiles'), where('role', '==', 'talent'));
  const snap = await getDocs(qTal);
  TALENTS = snap.docs.map(d => profileToTalent(d.data()));
  updateTrendingStats();
  renderTalentGrid();
  refreshDashMarkers();
  refreshFullMarkers();
}

async function loadConnections() {
  if (!requireFirebase() || !currentProfile) return;
  const qConn = query(collection(db, 'connections'), where('userId', '==', currentProfile.id));
  const snap = await getDocs(qConn);
  const targetIds = snap.docs
    .map(d => d.data())
    .filter(d => !d.deleted)
    .map(d => d.targetId);
  const profiles = await Promise.all(targetIds.map(id => getDoc(doc(db, 'profiles', id))));
  myConnections = profiles.filter(p => p.exists()).map(p => profileToTalent(p.data()));
  renderConnections();
}

async function loadThreads() {
  if (!requireFirebase() || !currentProfile) return;
  const q1 = query(collection(db, 'threads'), where('user1', '==', currentProfile.id));
  const q2 = query(collection(db, 'threads'), where('user2', '==', currentProfile.id));
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const threads = [...s1.docs, ...s2.docs].map(d => ({ id: d.id, ...d.data() }));
  const unique = new Map();
  threads.forEach(t => unique.set(t.id, t));
  const merged = Array.from(unique.values());

  const convs = [];
  for (const t of merged) {
    const otherId = t.user1 === currentProfile.id ? t.user2 : t.user1;
    const otherSnap = await getDoc(doc(db, 'profiles', otherId));
    const other = otherSnap.exists() ? otherSnap.data() : { name: 'Unknown' };

    const msgQ = query(collection(db, 'threads', t.id, 'messages'), orderBy('createdAt', 'desc'), limit(1));
    const msgSnap = await getDocs(msgQ);
    const last = msgSnap.docs[0]?.data();

    convs.push({
      id: t.id,
      userId: otherId,
      name: other.name || 'Unknown',
      emoji: other.emoji || getAvatarLetter(other.name),
      lastMsg: last?.type === 'contact' ? 'Contact Card' : (last?.body || ''),
      time: formatTime(last?.createdAt || t.updatedAt),
      unread: 0,
      online: false,
      messages: []
    });
  }

  conversations = convs;
  renderChatList();
}

async function loadNotifications() {
  if (!requireFirebase() || !currentProfile) return;
  const qNot = query(collection(db, 'notifications'), where('userId', '==', currentProfile.id), orderBy('createdAt', 'desc'), limit(50));
  const snap = await getDocs(qNot);
  notifications = snap.docs.map(d => ({
    id: d.id,
    icon: d.data().icon || '!',
    text: d.data().text || '',
    time: formatTime(d.data().createdAt),
    read: !!d.data().read
  }));
  renderNotifList();
}

async function loadDashData() {
  await Promise.all([loadTalents(), loadConnections(), loadThreads(), loadNotifications()]);
  updateProfileUI();
  renderTrendingTable();
  animateOverviewStats();
}

// ===================== MAPS =====================
function initHeroMap() {
  const el = document.getElementById('heroMap');
  if (!el) return;
  if (heroMapObj) { heroMapObj.remove(); heroMapObj = null; }
  heroMapObj = L.map('heroMap', { zoomControl: false, attributionControl: false }).setView([20.5937, 78.9629], 4.4);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(heroMapObj);
  refreshHeroMarkers();
}

function initDashMap() {
  const el = document.getElementById('dashMap');
  if (!el) return;
  if (dashMapObj) { dashMapObj.remove(); dashMapObj = null; }
  dashMapObj = L.map('dashMap', { zoomControl: false, attributionControl: false }).setView([20.5937, 78.9629], 4.6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(dashMapObj);
  refreshDashMarkers();
}

function initFullMap() {
  const el = document.getElementById('fullMap');
  if (!el) return;
  if (fullMapObj) { fullMapObj.remove(); fullMapObj = null; }
  fullMapObj = L.map('fullMap', { zoomControl: true, attributionControl: false }).setView([20.5937, 78.9629], 4.6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(fullMapObj);
  refreshFullMarkers();
}

function addDashMarker(t, map, arr) {
  if (!t.lat || !t.lng) return;
  const color = CAT_COLORS[t.category] || '#00d4ff';
  const marker = L.circleMarker([t.lat, t.lng], {
    radius: 6,
    color,
    weight: 1,
    fillColor: color,
    fillOpacity: 0.7
  }).addTo(map).bindPopup('<strong>' + t.name + '</strong><br>' + t.primary);
  arr.push(marker);
}

function refreshHeroMarkers() {
  if (!heroMapObj) return;
}

function refreshDashMarkers() {
  if (!dashMapObj) return;
  allMarkers.forEach(m => dashMapObj.removeLayer(m));
  allMarkers = [];
  TALENTS.forEach(t => addDashMarker(t, dashMapObj, allMarkers));
}

function refreshFullMarkers() {
  if (!fullMapObj) return;
  fullMarkers.forEach(m => fullMapObj.removeLayer(m));
  fullMarkers = [];
  TALENTS.forEach(t => addDashMarker(t, fullMapObj, fullMarkers));
}
// ===================== OVERVIEW =====================
function animateOverviewStats() {
  const unreadMsg = conversations.reduce((a,c)=>a+(c.unread||0),0);
  const totalViews = currentProfile?.views || 0;
  const stats = [
    {id:'ov-views',val:totalViews},
    {id:'ov-req',val:0},
    {id:'ov-conn',val:myConnections.length},
    {id:'ov-msg',val:unreadMsg}
  ];
  stats.forEach(s => {
    let cur = 0;
    const tick = setInterval(() => {
      cur = Math.min(cur + Math.ceil(s.val / 20), s.val);
      const el = document.getElementById(s.id);
      if (el) el.textContent = cur;
      if (cur >= s.val) clearInterval(tick);
    }, 50);
  });
}

// ===================== TALENT GRID =====================
function filterTalents() {
  const q = (document.getElementById('discoverSearch').value || '').toLowerCase();
  const cat = document.getElementById('discoverCat').value;
  const avail = document.getElementById('discoverAvail').value;
  const sort = document.getElementById('discoverSort')?.value || 'relevant';
  let filtered = TALENTS.filter(t => {
    const matchQ = !q || t.name.toLowerCase().includes(q) || t.skills.some(s=>s.toLowerCase().includes(q)) || t.primary.toLowerCase().includes(q) || t.location.toLowerCase().includes(q);
    const matchCat = cat === 'all' || t.category === cat;
    const matchAvail = avail === 'all' || t.avail === avail;
    return matchQ && matchCat && matchAvail;
  });
  if (sort === 'rated') filtered.sort((a,b) => b.rating - a.rating);
  else if (sort === 'exp') filtered.sort((a,b) => parseInt(b.exp) - parseInt(a.exp));
  else if (sort === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name));
  document.getElementById('discoverCount').textContent = 'Showing ' + filtered.length + ' profiles';
  renderTalentGrid(filtered);
}

function renderTalentGrid(data = TALENTS) {
  const grid = document.getElementById('talentGrid');
  if (!grid) return;
  grid.innerHTML = '';
  data.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 't-card';
    card.style.animationDelay = `${i * 0.05}s`;
    card.innerHTML = `
      <div class="tc-head">
        <div class="tc-avatar">${t.emoji}</div>
        <div class="tc-info">
          <div class="tc-name">${t.name}</div>
          <div class="tc-role">${t.primary}</div>
          <div class="tc-loc">Location: ${t.location}</div>
        </div>
        <div class="tc-verify verify-${t.verify}">${t.verify==='gov'?'Govt':t.verify==='peer'?'Peer':'Self'}</div>
      </div>
      <div class="tc-skills">${t.skills.slice(0,4).map((s,idx)=>`<div class="s-pill${idx===0?' hot':''}">${s}</div>`).join('')}</div>
      <div class="tc-footer">
        <div class="tc-exp"><strong>${t.exp}</strong> experience</div>
        <div class="tc-avail"><div class="avail-dot avail-${t.avail}"></div>${t.avail==='open'?'Available':t.avail==='busy'?'Occupied':'Unavailable'}</div>
      </div>
      <div class="tc-actions">
        <button class="tc-btn" onclick="openTalentModal('${t.id}');event.stopPropagation()">View Profile</button>
        <button class="tc-btn primary" onclick="startChat('${t.id}');event.stopPropagation()">Message</button>
      </div>
    `;
    card.onclick = () => openTalentModal(t.id);
    grid.appendChild(card);
  });
}

function renderConnections(data) {
  const grid = document.getElementById('connectionsGrid');
  if (!grid) return;
  const list = data || myConnections;
  grid.innerHTML = '';
  const countEl = document.getElementById('connCount');
  if (countEl) countEl.textContent = list.length + ' connection' + (list.length !== 1 ? 's' : '');
  list.forEach((t) => {
    const card = document.createElement('div');
    card.className = 't-card';
    card.innerHTML = `
      <div class="tc-head">
        <div class="tc-avatar">${t.emoji}</div>
        <div class="tc-info">
          <div class="tc-name">${t.name}</div>
          <div class="tc-role">${t.primary}</div>
          <div class="tc-loc">Location: ${t.location}</div>
        </div>
      </div>
      <div class="tc-skills">${t.skills.slice(0,3).map(s=>'<div class="s-pill">'+s+'</div>').join('')}</div>
      <div class="tc-actions">
        <button class="tc-btn primary" onclick="startChat('${t.id}');event.stopPropagation()">Message</button>
        <button class="tc-btn" onclick="removeConnection('${t.id}');event.stopPropagation()" style="color:var(--accent2);border-color:var(--accent2)">Remove</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function removeConnection(id) {
  if (!requireFirebase() || !currentProfile) return;
  const key = currentProfile.id + '_' + id;
  await setDoc(doc(db, 'connections', key), { deleted: true }, { merge: true });
  await loadConnections();
  showToast('Connection removed','info');
}

// ===================== TALENT MODAL =====================
async function openTalentModal(id) {
  const t = TALENTS.find(x => x.id === id);
  if (!t) return;
  document.getElementById('modalTitle').textContent = t.name;
  document.getElementById('modalBody').innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:3rem;margin-bottom:8px">${t.emoji}</div>
      <div style="font-family:var(--font-display);font-weight:900;font-size:1.4rem">${t.name}</div>
      <div style="font-size:0.72rem;color:var(--accent2);letter-spacing:0.08em;text-transform:uppercase;margin-top:4px">${t.primary}</div>
      <div style="font-size:0.72rem;color:var(--text2);margin-top:4px">Location: ${t.location}</div>
      <div class="tc-verify verify-${t.verify}" style="display:inline-block;margin-top:8px">${t.verify==='gov'?'Govt Verified':t.verify==='peer'?'Peer Verified':'Self Listed'}</div>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border);padding:14px 16px;margin-bottom:16px;font-size:0.8rem;line-height:1.8;color:var(--text2)">${t.bio}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="background:var(--surface2);border:1px solid var(--border);padding:12px;text-align:center">
        <div style="font-family:var(--font-display);font-weight:900;font-size:1.4rem;color:var(--accent)">${t.exp}</div>
        <div style="font-size:0.62rem;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase">Experience</div>
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);padding:12px;text-align:center">
        <div style="font-family:var(--font-display);font-weight:900;font-size:1.4rem;color:var(--gold)">${t.rating} *</div>
        <div style="font-size:0.62rem;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase">Rating</div>
      </div>
    </div>
    <div style="font-size:0.62rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--text3);margin-bottom:8px">Skills</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px">${t.skills.map(s=>`<div class="s-pill">${s}</div>`).join('')}</div>
    <div style="display:flex;gap:10px">
      <button class="tc-btn primary" style="flex:2" onclick="closeModal();startChat('${t.id}')">Send Message</button>
      <button class="tc-btn" style="flex:1" onclick="addConnection('${t.id}')">Connect</button>
    </div>
  `;
  openModal();
  await loadEndorsementsForTalent(id);
}

async function addConnection(id) {
  if (!requireFirebase() || !currentProfile) return;
  if (id === currentProfile.id) { showToast('You cannot connect with yourself','info'); return; }
  const key = currentProfile.id + '_' + id;
  await setDoc(doc(db, 'connections', key), {
    userId: currentProfile.id,
    targetId: id,
    createdAt: serverTimestamp()
  });
  await addDoc(collection(db, 'notifications'), {
    userId: id,
    icon: '!',
    text: (currentProfile.name || 'Someone') + ' connected with you',
    createdAt: serverTimestamp(),
    read: false
  });
  await loadConnections();
  showToast('Connection added!', 'success');
  closeModal();
}
// ===================== CHAT =====================
function renderChatList(filter = '') {
  const list = document.getElementById('chatList');
  if (!list) return;
  list.innerHTML = '';
  const filtered = filter ? conversations.filter(c => c.name.toLowerCase().includes(filter.toLowerCase())) : conversations;
  filtered.forEach(c => {
    const div = document.createElement('div');
    div.className = `chat-item${activeChatId === c.id ? ' active' : ''}`;
    div.onclick = () => openChat(c.id);
    div.innerHTML = `
      <div class="ci-avatar">${c.emoji}</div>
      <div class="ci-info">
        <div class="ci-name">${c.name}</div>
        <div class="ci-preview">${c.lastMsg || ''}</div>
      </div>
      <div class="ci-meta">
        <div class="ci-time">${c.time || ''}</div>
        ${c.unread ? `<div class="ci-unread">${c.unread}</div>` : ''}
      </div>
    `;
    list.appendChild(div);
  });
}

function filterChats(q) { renderChatList(q); }

async function ensureThreadWithUser(targetId) {
  if (!requireFirebase() || !currentProfile) return null;
  const pair = [currentProfile.id, targetId].sort().join('_');
  const qThread = query(collection(db, 'threads'), where('pairKey', '==', pair));
  const snap = await getDocs(qThread);
  if (!snap.empty) return snap.docs[0].id;

  const docRef = await addDoc(collection(db, 'threads'), {
    user1: currentProfile.id,
    user2: targetId,
    pairKey: pair,
    updatedAt: serverTimestamp()
  });

  await setDoc(doc(db, 'threadMembers', docRef.id + '_' + currentProfile.id), {
    threadId: docRef.id,
    userId: currentProfile.id,
    lastReadAt: serverTimestamp()
  });
  await setDoc(doc(db, 'threadMembers', docRef.id + '_' + targetId), {
    threadId: docRef.id,
    userId: targetId,
    lastReadAt: serverTimestamp()
  });

  return docRef.id;
}

async function startChat(talentId) {
  const threadId = await ensureThreadWithUser(talentId);
  if (!threadId) return;
  showDashSection('chat', document.querySelector('.sidebar-item:nth-child(4)'));
  await loadThreads();
  setTimeout(() => openChat(threadId), 100);
}

async function openChat(id) {
  activeChatId = id;
  renderChatList();

  const conv = conversations.find(c => c.id === id);
  if (!conv) return;

  const win = document.getElementById('chatWindow');
  win.innerHTML = `
    <div class="chat-window-header">
      <div class="chat-w-avatar">${conv.emoji}</div>
      <div>
        <div class="chat-w-name">${conv.name}</div>
        <div class="chat-w-status">${conv.online ? 'Online now' : 'Offline'}</div>
      </div>
      <div class="chat-w-actions">
        <button class="chat-action-btn" onclick="sendContactCard('${id}')" title="Share contact card">Contact</button>
        <button class="chat-action-btn" onclick="openTalentModal('${conv.userId}')" title="View profile">Profile</button>
      </div>
    </div>
    <div class="chat-messages" id="chatMsgs-${id}"></div>
    <div class="chat-input-area">
      <button class="chat-attach-btn" title="Attach file">Attach</button>
      <textarea class="chat-input" id="chatInput-${id}" placeholder="Type a message..." rows="1" onkeydown="handleChatKey(event,'${id}')"></textarea>
      <button class="chat-send-btn" onclick="sendMsg('${id}')">&gt;</button>
    </div>
  `;

  if (activeThreadUnsub) {
    activeThreadUnsub();
    activeThreadUnsub = null;
  }

  const msgQ = query(collection(db, 'threads', id, 'messages'), orderBy('createdAt', 'asc'));
  activeThreadUnsub = onSnapshot(msgQ, snap => {
    activeMessages = snap.docs.map(d => {
      const m = d.data();
      return {
        id: d.id,
        from: m.senderId === currentProfile.id ? 'me' : 'them',
        text: m.body,
        time: formatTime(m.createdAt),
        type: m.type,
        contact: m.payload || null
      };
    });
    renderMessages(id, conv);
  });

  await setDoc(doc(db, 'threadMembers', id + '_' + currentProfile.id), {
    threadId: id,
    userId: currentProfile.id,
    lastReadAt: serverTimestamp()
  }, { merge: true });
}

function renderMessages(id, conv) {
  const container = document.getElementById(`chatMsgs-${id}`);
  if (!container) return;
  container.innerHTML = `<div class="system-msg">Messages are end-to-end encrypted</div>`;
  activeMessages.forEach(m => {
    const wrap = document.createElement('div');
    wrap.className = `msg-wrap ${m.from === 'me' ? 'sent' : ''}`;
    if (m.type === 'contact' && m.contact) {
      wrap.innerHTML = `
        <div class="msg-avatar">${m.from === 'me' ? (currentProfile?.emoji || getAvatarLetter(currentProfile?.name)) : (conv?.emoji || getAvatarLetter(conv?.name))}</div>
        <div class="msg-content">
          <div class="contact-share-card">
            <div class="csc-label">Contact Card Shared</div>
            <div class="csc-name">${m.contact.name || ''}</div>
            <div class="csc-detail">Phone: ${m.contact.phone || ''}</div>
            <div class="csc-detail">Role: ${m.contact.role || ''}</div>
            ${m.from !== 'me' ? `<button class="csc-accept" onclick="acceptContact('${m.contact.name || ''}','${m.contact.phone || ''}')">Accept and Save Contact</button>` : ''}
          </div>
          <div class="msg-time">${m.time}</div>
        </div>
      `;
    } else {
      wrap.innerHTML = `
        <div class="msg-avatar">${m.from === 'me' ? (currentProfile?.emoji || getAvatarLetter(currentProfile?.name)) : (conv?.emoji || getAvatarLetter(conv?.name))}</div>
        <div class="msg-content">
          <div class="msg-bubble">${m.text || ''}</div>
          <div class="msg-time">${m.time}</div>
        </div>
      `;
    }
    container.appendChild(wrap);
  });
  container.scrollTop = container.scrollHeight;
}

function handleChatKey(e, id) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(id); }
}

async function sendMsg(id) {
  if (!requireFirebase() || !currentProfile) return;
  const input = document.getElementById('chatInput-'+id);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  await addDoc(collection(db, 'threads', id, 'messages'), {
    senderId: currentProfile.id,
    body: text,
    type: 'text',
    createdAt: serverTimestamp()
  });
  input.value = '';

  const thread = conversations.find(c => c.id === id);
  if (thread?.userId) {
    await addDoc(collection(db, 'notifications'), {
      userId: thread.userId,
      icon: '!',
      text: (currentProfile.name || 'Someone') + ' sent you a message',
      createdAt: serverTimestamp(),
      read: false
    });
  }
}

async function sendContactCard(id) {
  if (!requireFirebase() || !currentProfile) return;
  const payload = {
    name: currentProfile.name,
    phone: currentProfile.phone || 'N/A',
    role: currentProfile.role === 'talent' ? 'Talent Provider' : 'Talent Seeker'
  };
  await addDoc(collection(db, 'threads', id, 'messages'), {
    senderId: currentProfile.id,
    type: 'contact',
    body: 'Contact Card',
    payload,
    createdAt: serverTimestamp()
  });
  showToast('Contact card shared!', 'success');
}

function acceptContact(name, phone) {
  showToast('Saved: ' + name + ' ' + phone, 'success');
}
// ===================== PROFILE =====================
function updateProfileUI() {
  if (!currentProfile) return;
  const talentView = profileToTalent(currentProfile);
  document.getElementById('profileAvatar').textContent = talentView.emoji;
  document.getElementById('profileName').textContent = talentView.name;
  document.getElementById('profileRole').textContent = ROLE_LABELS[currentProfile.role] || currentProfile.role;
  document.getElementById('profileLoc').textContent = 'Location: ' + (currentProfile.district || '-') + ', ' + (currentProfile.state || '-');
  document.getElementById('editName').value = currentProfile.name || '';
  document.getElementById('editPhone').value = currentProfile.phone || '';
  document.getElementById('editDistrict').value = currentProfile.district || '';
  document.getElementById('editSkills').value = (currentProfile.skills || []).join(', ');
  document.getElementById('editBio').value = currentProfile.bio || '';
  document.getElementById('editAvail').value = currentProfile.avail || 'open';
  const latEl = document.getElementById('editLat');
  const lngEl = document.getElementById('editLng');
  if (latEl) latEl.value = currentProfile.lat ?? '';
  if (lngEl) lngEl.value = currentProfile.lng ?? '';

  const tagsEl = document.getElementById('profileSkillTags');
  tagsEl.innerHTML = (currentProfile.skills || []).map(s => '<div class="s-pill">'+s+'</div>').join('') || '<div style="color:var(--text3);font-size:0.75rem">No skills added yet</div>';
  const pct = getProfileCompletion();
  const cw = document.getElementById('completionWrap');
  if (cw) {
    const color = pct >= 80 ? 'var(--accent3)' : pct >= 50 ? 'var(--gold)' : 'var(--accent2)';
    cw.innerHTML = '<div class="completion-pct" style="color:'+color+'">'+pct+'% Complete</div>' +
      '<div style="height:4px;background:var(--border);margin-top:6px"><div style="height:100%;width:'+pct+'%;background:'+color+';transition:width 0.6s"></div></div>' +
      (pct < 80 ? '<div class="completion-text" style="margin-top:6px">Complete your profile to get discovered</div>' : '<div class="completion-text" style="margin-top:6px;color:var(--accent3)">Profile is well completed!</div>');
  }
}

async function saveProfile() {
  if (!requireFirebase() || !currentProfile) return;
  const updated = {
    name: document.getElementById('editName').value.trim() || currentProfile.name,
    phone: document.getElementById('editPhone').value.trim() || currentProfile.phone,
    district: document.getElementById('editDistrict').value.trim(),
    skills: normalizeSkills(document.getElementById('editSkills').value),
    bio: document.getElementById('editBio').value.trim(),
    avail: document.getElementById('editAvail').value,
    lat: document.getElementById('editLat')?.value ? parseFloat(document.getElementById('editLat').value) : currentProfile.lat,
    lng: document.getElementById('editLng')?.value ? parseFloat(document.getElementById('editLng').value) : currentProfile.lng,
    updatedAt: serverTimestamp()
  };

  await updateDoc(doc(db, 'profiles', currentProfile.id), updated);
  await loadCurrentProfile();
  await loadTalents();
  updateProfileUI();
  showToast('Profile updated successfully!', 'success');
}

function getProfileCompletion() {
  if (!currentProfile) return 0;
  let s = 0, t = 5;
  if (currentProfile.name) s++;
  if (currentProfile.district) s++;
  if (currentProfile.skills && currentProfile.skills.length) s++;
  if (currentProfile.bio) s++;
  if (currentProfile.avail) s++;
  return Math.round((s/t)*100);
}

function updateTrendingStats() {
  const counts = {};
  TALENTS.forEach(t => (t.skills || []).forEach(s => {
      const qs = s.toLowerCase();
      counts[qs] = (counts[qs] || 0) + 1;
  }));
  TRENDING = Object.entries(counts)
      .sort((a,b) => b[1] - a[1]).slice(0, 8)
      .map(entry => ({ skill: entry[0].charAt(0).toUpperCase() + entry[0].slice(1), cat: 'Auto', count: entry[1] * 120 + Math.floor(Math.random()*50), pct: Math.min(100, entry[1]*30) }));
  renderTrendingTable();
}

function renderTrendingTable() {
  const tbody = document.getElementById('trendingTbody');
  if (!tbody) return;
  if (TRENDING.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:20px">No skills registered yet. Be the first!</td></tr>';
      return;
  }
  tbody.innerHTML = TRENDING.map((r, i) => `
    <tr>
      <td style="color:var(--text3);font-weight:700">${String(i+1).padStart(2,'0')}</td>
      <td style="font-family:var(--font-display);font-weight:700">${r.skill}</td>
      <td><span class="s-pill">${r.cat}</span></td>
      <td style="color:var(--accent);font-family:var(--font-display);font-weight:700">${r.count.toLocaleString('en-IN')}</td>
      <td style="width:120px"><div class="trend-bar" style="width:${r.pct}%"></div></td>
    </tr>
  `).join('');
}

// ===================== NOTIFICATIONS =====================
function toggleNotifPanel() {
  const p = document.getElementById('notifPanel');
  p.classList.toggle('open');
}

function renderNotifList() {
  const list = document.getElementById('notifList');
  if (!list) return;
  const unread = notifications.filter(n=>!n.read).length;
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
  if (notifications.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3);font-size:0.75rem">No notifications</div>';
    return;
  }
  list.innerHTML = notifications.map(n => '<div class="notif-item'+(n.read?'':' unread')+'" onclick="markNotifRead(\''+n.id+'\')">' +
    '<span class="ni-icon">'+n.icon+'</span>' +
    '<span class="ni-text">'+n.text+'</span>' +
    '<span class="ni-time">'+n.time+'</span></div>').join('');
}

async function markNotifRead(id) {
  if (!requireFirebase()) return;
  await updateDoc(doc(db, 'notifications', id), { read: true });
  const n = notifications.find(x=>x.id===id);
  if (n) { n.read = true; renderNotifList(); }
}

async function clearNotifs() {
  if (!requireFirebase() || !currentProfile) return;
  const qNot = query(collection(db, 'notifications'), where('userId', '==', currentProfile.id));
  const snap = await getDocs(qNot);
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })));
  notifications = [];
  renderNotifList();
  showToast('Notifications cleared','info');
}

// ===================== ENDORSEMENTS =====================
async function endorseSkill(talentId, skill) {
  if (!requireFirebase() || !currentProfile) return;
  if (talentId === currentProfile.id) { showToast('You cannot endorse yourself','info'); return; }
  const key = currentProfile.id + '_' + talentId + '_' + skill;
  const ref = doc(db, 'endorsements', key);
  const existing = await getDoc(ref);
  if (existing.exists()) { showToast('Already endorsed this skill','info'); return; }
  await setDoc(ref, {
    endorserId: currentProfile.id,
    targetId: talentId,
    skill,
    createdAt: serverTimestamp()
  });
  await loadEndorsementsForTalent(talentId);
  showToast('Endorsed "'+skill+'"!','success');
}

function getEndorseCount(talentId, skill) {
  const key = talentId + ':' + skill;
  return endorsementCounts[key] || 0;
}

async function loadEndorsementsForTalent(talentId) {
  if (!requireFirebase()) return;
  const qEnd = query(collection(db, 'endorsements'), where('targetId', '==', talentId));
  const snap = await getDocs(qEnd);
  endorsementCounts = endorsementCounts || {};
  snap.docs.forEach(d => {
    const e = d.data();
    const key = talentId + ':' + e.skill;
    endorsementCounts[key] = (endorsementCounts[key] || 0) + 1;
  });
}

// ===================== MODAL =====================
function openModal() { document.getElementById('modalBg').classList.add('open'); }
function closeModal() { document.getElementById('modalBg').classList.remove('open'); }
document.getElementById('modalBg')?.addEventListener('click', e => {
  if (e.target === document.getElementById('modalBg')) closeModal();
});

// ===================== TOAST =====================
function showToast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: 'OK', error: 'ERR', info: 'i' };
  t.innerHTML = `<span style="font-size:1rem">${icons[type]||'i'}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(20px)'; t.style.transition='all 0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ===================== PARTICLES =====================
function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const colors = ['#00d4ff', '#ff5733', '#00ff88'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random()*3)]};left:${Math.random()*100}%;opacity:${Math.random()*0.4+0.1};animation-duration:${Math.random()*20+15}s;animation-delay:-${Math.random()*20}s;`;
    container.appendChild(p);
  }
}

// ===================== HERO COUNTER =====================
function startHeroCounter() {
  setInterval(() => {
    const el = document.getElementById('heroCount');
    if (el) el.textContent = (TALENTS.length > 0 ? TALENTS.length.toLocaleString('en-IN') : '0');
  }, 1000);
}

// ===================== THEME TOGGLE =====================
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next === 'dark' ? '' : 'light');
  if (next === 'dark') document.documentElement.removeAttribute('data-theme');
  localStorage.setItem('sc_theme', next === 'dark' ? '' : 'light');
  updateThemeUI(next === 'dark' ? '' : 'light');
}

function updateThemeUI(theme) {
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (icon) icon.textContent = theme === 'light' ? 'L' : 'D';
  if (label) label.textContent = theme === 'light' ? 'Light Mode' : 'Dark Mode';
}

// ===================== CONNECTIONS FILTER =====================
function filterConnections() {
  const q = (document.getElementById('connSearch')?.value || '').toLowerCase();
  const filtered = myConnections.filter(t => !q || t.name.toLowerCase().includes(q) || t.skills.some(s=>s.toLowerCase().includes(q)) || t.location.toLowerCase().includes(q));
  renderConnections(filtered);
}

// ===================== EXPORT PROFILE =====================
function exportProfile() {
  if (!currentProfile) { showToast('Please sign in first','error'); return; }
  const data = JSON.stringify(currentProfile, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'skillcensus_profile.json';
  a.click(); URL.revokeObjectURL(url);
  showToast('Profile exported as JSON','success');
}

// ===================== LOCATION =====================
function useMyLocation() {
  if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    const latEl = document.getElementById('editLat');
    const lngEl = document.getElementById('editLng');
    if (latEl) latEl.value = latitude.toFixed(6);
    if (lngEl) lngEl.value = longitude.toFixed(6);
    showToast('Location captured. Save profile to update map.', 'success');
  }, () => showToast('Unable to access location', 'error'), { enableHighAccuracy: true, timeout: 8000 });
}

// ===================== DEMO DATA =====================
function loadSampleData() {
  showToast('Demo data removed. Create real accounts to populate the network.', 'info');
}

// ===================== KEYBOARD SHORTCUTS =====================
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      document.getElementById('notifPanel')?.classList.remove('open');
      document.getElementById('mobileMenu')?.classList.remove('open');
    }
  });
}

// ===================== INIT =====================
window.addEventListener('DOMContentLoaded', async () => {
  initParticles();
  startHeroCounter();
  initKeyboardShortcuts();
  setTimeout(initHeroMap, 300);

  const theme = localStorage.getItem('sc_theme');
  if (theme) { document.documentElement.setAttribute('data-theme', theme); updateThemeUI(theme); }

  if (!requireFirebase()) {
    if (document.getElementById('demoDivider')) document.getElementById('demoDivider').style.display = 'none';
    if (document.getElementById('demoBtn')) document.getElementById('demoBtn').style.display = 'none';
    return;
  }

  onAuthStateChanged(auth, async user => {
    authUser = user || null;
    if (authUser) {
      await loadCurrentProfile();
      if (currentProfile) {
        await loadDashData();
        showDash();
      }
    }
  });
});

// expose handlers for inline HTML
window.showAuthPage = showAuthPage;
window.showPage = showPage;
window.switchAuthTab = switchAuthTab;
window.selectRole = selectRole;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showDashSection = showDashSection;
window.toggleNotifPanel = toggleNotifPanel;
window.clearNotifs = clearNotifs;
window.filterConnections = filterConnections;
window.filterTalents = filterTalents;
window.filterChats = filterChats;
window.openTalentModal = openTalentModal;
window.startChat = startChat;
window.sendMsg = sendMsg;
window.sendContactCard = sendContactCard;
window.handleChatKey = handleChatKey;
window.saveProfile = saveProfile;
window.exportProfile = exportProfile;
window.useMyLocation = useMyLocation;
window.logout = logout;
window.loadSampleData = loadSampleData;
window.toggleTheme = toggleTheme;
