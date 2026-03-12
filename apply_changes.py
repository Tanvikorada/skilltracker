import re
import sys

def main():
    file_path = "c:/Users/Tanvi/OneDrive/Desktop/skilltracker/skilltracker.html"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 1. Replace auth buttons
    auth_old = """<button class="auth-submit" onclick="handleLogin()">Sign In →</button>
        <div class="auth-divider">or continue with</div>
        <button class="btn-ghost" style="width:100%;padding:11px;margin-bottom:8px" onclick="demoLogin('talent')">🎯 Demo as Talent Provider</button>
        <button class="btn-ghost" style="width:100%;padding:11px" onclick="demoLogin('seeker')">🔍 Demo as Talent Seeker</button>"""
    auth_new = """<button class="auth-submit" onclick="handleLogin()">Sign In →</button>
        <div class="auth-divider" id="demoDivider" style="display:none">or</div>
        <button class="btn-ghost" id="demoBtn" style="width:100%;padding:11px;margin-bottom:8px;display:none" onclick="loadSampleData()">🎯 Load Sample Data</button>"""
    content = content.replace(auth_old, auth_new)

    # 2. State & default arrays
    notifications_old = r"let notifications = \[\s*\{id:1.+?\}\,\s*\{id:2.+?\}\,\s*\{id:3.+?\}\,\s*\{id:4.+?\}\,\s*\];"
    content = re.sub(notifications_old, "let notifications = [];\nlet TALENTS = [];\nlet conversations = [];\nlet myConnections = [];\nlet TRENDING = [];\nlet allUsers = [];", content, flags=re.DOTALL)
    
    # 3. Persistence updates
    persist_old = """function persistState() {
  try {
    localStorage.setItem('sc_user', JSON.stringify(currentUser));
    localStorage.setItem('sc_convos', JSON.stringify(conversations));
    localStorage.setItem('sc_conns', JSON.stringify(myConnections.map(c=>c.id)));
    localStorage.setItem('sc_endorse', JSON.stringify(skillEndorsements));
    localStorage.setItem('sc_notifs', JSON.stringify(notifications));
  } catch(e) {}
}"""
    persist_new = """function persistState() {
  try {
    localStorage.setItem('sc_user', JSON.stringify(currentUser));
    localStorage.setItem('sc_convos', JSON.stringify(conversations));
    localStorage.setItem('sc_conns', JSON.stringify(myConnections.map(c=>c.id)));
    localStorage.setItem('sc_endorse', JSON.stringify(skillEndorsements));
    localStorage.setItem('sc_notifs', JSON.stringify(notifications));
    localStorage.setItem('sc_talents', JSON.stringify(TALENTS));
    localStorage.setItem('sc_all_users', JSON.stringify(allUsers));
  } catch(e) {}
}"""
    content = content.replace(persist_old, persist_new)
    
    restore_old = """function restoreState() {
  try {
    const u = localStorage.getItem('sc_user');
    if (u) currentUser = JSON.parse(u);
    const c = localStorage.getItem('sc_convos');
    if (c) conversations = JSON.parse(c);
    const cn = localStorage.getItem('sc_conns');
    if (cn) { const ids = JSON.parse(cn); myConnections = TALENTS.filter(t => ids.includes(t.id)); }
    const e = localStorage.getItem('sc_endorse');
    if (e) skillEndorsements = JSON.parse(e);
    const n = localStorage.getItem('sc_notifs');
    if (n) notifications = JSON.parse(n);
    const theme = localStorage.getItem('sc_theme');
    if (theme) { document.documentElement.setAttribute('data-theme', theme); updateThemeUI(theme); }
  } catch(e) {}
}"""
    restore_new = """function restoreState() {
  try {
    const au = localStorage.getItem('sc_all_users');
    if (au) allUsers = JSON.parse(au);
    const tal = localStorage.getItem('sc_talents');
    if (tal) TALENTS = JSON.parse(tal);
    
    if (TALENTS.length === 0) {
      const div = document.getElementById('demoDivider');
      const btn = document.getElementById('demoBtn');
      if(div) div.style.display = 'flex';
      if(btn) btn.style.display = 'block';
    }

    const u = localStorage.getItem('sc_user');
    if (u) currentUser = JSON.parse(u);
    const c = localStorage.getItem('sc_convos');
    if (c) conversations = JSON.parse(c);
    const cn = localStorage.getItem('sc_conns');
    if (cn) { const ids = JSON.parse(cn); myConnections = TALENTS.filter(t => ids.includes(t.id)); }
    const e = localStorage.getItem('sc_endorse');
    if (e) skillEndorsements = JSON.parse(e);
    const n = localStorage.getItem('sc_notifs');
    if (n) notifications = JSON.parse(n);
    const theme = localStorage.getItem('sc_theme');
    if (theme) { document.documentElement.setAttribute('data-theme', theme); updateThemeUI(theme); }
    
    updateTrendingStats();
  } catch(e) {}
}"""
    content = content.replace(restore_old, restore_new)

    # 4. Remove Hardcoded Data structures entirely, store it in loadSampleData
    sample_data_code = """
const CAT_COLORS = {tech:'#00d4ff',trade:'#ff5733',health:'#00ff88',agri:'#f5c842',edu:'#c084fc',creative:'#f472b6'};

function loadSampleData() {
  TALENTS = [
    {id:1,name:'Arjun Mehta',emoji:'👨‍💻',location:'Pune, Maharashtra',lat:18.5204,lng:73.8567,skills:['Rust','Systems Programming','Linux Kernel','Go'],primary:'Systems Developer',exp:'6 yrs',verify:'peer',avail:'open',category:'tech',bio:'Systems programmer with 6 years building low-latency infrastructure. Open to remote or Pune-based.',views:214,rating:4.9},
    {id:2,name:'Lakshmi Devi',emoji:'🧵',location:'Coimbatore, Tamil Nadu',lat:11.0168,lng:76.9558,skills:['Kanjivaram Silk','Embroidery','Zari Work','Pattern Design'],primary:'Master Weaver',exp:'22 yrs',verify:'gov',avail:'busy',category:'trade',bio:'22 years of Kanjivaram silk weaving. Government-certified master craftsperson.',views:88,rating:5.0},
    {id:3,name:'Ramesh Patil',emoji:'⚡',location:'Nagpur, Maharashtra',lat:21.1458,lng:79.0882,skills:['Industrial Wiring','PLC Systems','HVAC','Electrical Safety'],primary:'Certified Electrician',exp:'11 yrs',verify:'gov',avail:'open',category:'trade',bio:'ITI-certified electrician specializing in industrial and commercial projects.',views:176,rating:4.7},
    {id:4,name:'Priya Nair',emoji:'🩺',location:'Thrissur, Kerala',lat:10.5276,lng:76.2144,skills:['Phlebotomy','Haematology','Clinical Lab','Blood Banking'],primary:'Lab Technician',exp:'4 yrs',verify:'gov',avail:'open',category:'health',bio:'DMLT certified with hands-on experience in government hospital labs.',views:93,rating:4.8},
    {id:5,name:'Vikram Singh',emoji:'🔧',location:'Jaipur, Rajasthan',lat:26.9124,lng:75.7873,skills:['CNC Machining','Lathe','CAD/CAM','Precision Work'],primary:'CNC Machinist',exp:'9 yrs',verify:'peer',avail:'open',category:'trade',bio:'Precision machinist worked on aerospace component manufacturing.',views:142,rating:4.6},
    {id:6,name:'Sunita Kumari',emoji:'🌾',location:'Patna, Bihar',lat:25.5941,lng:85.1376,skills:['Organic Farming','Drip Irrigation','Soil Science','Crop Planning'],primary:'Agricultural Expert',exp:'15 yrs',verify:'self',avail:'open',category:'agri',bio:'Pioneered organic farming methods. Teaches sustainable agriculture to rural groups.',views:67,rating:4.5},
    {id:7,name:'Deepak Sharma',emoji:'☀️',location:'Indore, MP',lat:22.7196,lng:75.8577,skills:['Solar Install','Off-grid Systems','MPPT Controllers','Battery Banks'],primary:'Solar Technician',exp:'5 yrs',verify:'peer',avail:'open',category:'trade',bio:'Installed 300+ solar systems across MP and Rajasthan.',views:118,rating:4.7},
    {id:8,name:'Anjali Bose',emoji:'🎨',location:'Kolkata, West Bengal',lat:22.5726,lng:88.3639,skills:['UI/UX Design','Figma','Illustration','Motion Design'],primary:'UI/UX Designer',exp:'3 yrs',verify:'peer',avail:'busy',category:'creative',bio:'Product designer with fine arts background. Accessible, culturally-resonant design.',views:201,rating:4.9},
    {id:9,name:'Mohammed Irfan',emoji:'🏗️',location:'Hyderabad, Telangana',lat:17.3850,lng:78.4867,skills:['Structural Welding','MIG/TIG','Blueprint Reading','NDT Testing'],primary:'Senior Welder',exp:'14 yrs',verify:'gov',avail:'open',category:'trade',bio:'NDT Level-II certified structural welder. Bridges and industrial plants.',views:155,rating:4.8},
    {id:10,name:'Kavitha Rajan',emoji:'🧑‍🏫',location:'Chennai, Tamil Nadu',lat:13.0827,lng:80.2707,skills:['Special Education','Child Psychology','Tamil Medium','Learning Disabilities'],primary:'Special Educator',exp:'8 yrs',verify:'gov',avail:'open',category:'edu',bio:'Trained special educator for children with learning disabilities.',views:79,rating:5.0},
    {id:11,name:'Santosh Yadav',emoji:'🔩',location:'Lucknow, UP',lat:26.8467,lng:80.9462,skills:['Plumbing','Sanitation','Water Treatment','CPVC/UPVC'],primary:'Master Plumber',exp:'18 yrs',verify:'gov',avail:'no',category:'trade',bio:'18 years commercial and residential plumbing. Currently unavailable until April.',views:44,rating:4.5},
    {id:12,name:'Fatima Sheikh',emoji:'🧑‍⚕️',location:'Surat, Gujarat',lat:21.1702,lng:72.8311,skills:['ICU Nursing','Ventilator Op','Wound Management','Critical Care'],primary:'ICU Nurse',exp:'7 yrs',verify:'gov',avail:'open',category:'health',bio:'ICU nurse with ventilator operation certification. Available for placement.',views:130,rating:4.9},
  ];
  myConnections = [TALENTS[0], TALENTS[2], TALENTS[8]];
  allUsers = [
    {email: 'demo@demo.com', pass: 'demo123', name: 'Demo User', role: 'talent', emoji: '👤', state: 'Maharashtra', district: 'Mumbai', skills: [], bio: '', avail: 'open'}
  ];
  
  if(document.getElementById('demoDivider')) document.getElementById('demoDivider').style.display = 'none';
  if(document.getElementById('demoBtn')) document.getElementById('demoBtn').style.display = 'none';
  
  updateTrendingStats();
  persistState();
  showToast('Sample data loaded!', 'success');
  // Refresh page strictly visually
  if(currentUser) { showDash(); } else {
      initHeroMap();
  }
}
"""

    hardcoded_talents_regex = r"const TALENTS = \[.*?\];\n\nconst CAT_COLORS = \{.*?\};\n\nlet conversations = \[.*?\];\n\nlet myConnections = \[.*?\];"
    content = re.sub(hardcoded_talents_regex, sample_data_code, content, flags=re.DOTALL)
    
    # Check if anything failed (re.sub on hardcoded_talents didn't work) Replace specific segments.
    if sample_data_code not in content:
        # manual slice and replace
        p1 = content.find("const TALENTS = [")
        p2 = content.find("let myConnections = [")
        p2 = content.find(";", p2) + 1
        content = content[:p1] + sample_data_code + content[p2:]

    # 5. Handle auth logic
    login_old = """function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  if (!email) { showFieldError('loginEmail'); showToast('Please enter your email or phone','error'); return; }
  if (!pass) { showFieldError('loginPass'); showToast('Please enter your password','error'); return; }
  currentUser = { name: email.split('@')[0] || 'User', email, role: 'talent', emoji: '\\u{1F464}', state: 'Tamil Nadu', skills: ['Web Development','JavaScript','React'], bio: 'Skilled professional on SkillCensus.', avail: 'open', district: 'Chennai' };
  afterLogin();
}

function demoLogin(role) {
  if (role === 'talent') {
    currentUser = { name: 'Ravi Kumar', email: 'ravi@demo.com', role: 'talent', emoji: '\\u{1F9D1}\\u200D\\u{1F4BB}', state: 'Tamil Nadu', skills: ['Full Stack Dev','React','Node.js','Python'], bio: 'Full stack developer from Chennai with 4 years of experience.', avail: 'open', district: 'Chennai' };
  } else {
    currentUser = { name: 'Pradeep Menon', email: 'pradeep@co.com', role: 'seeker', emoji: '\\u{1F3E2}', state: 'Karnataka', skills: [], bio: 'Startup founder looking for skilled talent.', avail: 'open', district: 'Bengaluru' };
  }
  afterLogin();
}"""
    
    login_new = """function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  if (!email) { showFieldError('loginEmail'); showToast('Please enter your email or phone','error'); return; }
  if (!pass) { showFieldError('loginPass'); showToast('Please enter your password','error'); return; }
  
  const user = allUsers.find(u => u.email === email && u.pass === pass);
  if (!user) {
    showToast('Invalid credentials! (Try loading sample data and use demo@demo.com / demo123)', 'error');
    return;
  }
  
  // Create current session user reference that stays synced
  const talentProfile = TALENTS.find(t => t.email === email);
  if (talentProfile) {
      currentUser = talentProfile;
  } else {
      currentUser = user;
  }
  
  afterLogin();
}"""
    content = content.replace(login_old, login_new)
    
    # 6. handleRegister
    register_old = """  if (!valid) { showToast('Please fix the highlighted fields','error'); return; }
  currentUser = { name, email, phone, role: selectedRole, emoji: selectedRole==='talent'?'\\u{1F9D1}\\u200D\\u{1F527}':'\\u{1F3E2}', state, skills: [], bio: '', avail: 'open', district: '' };
  showToast('Welcome, '+name+'! Account created.','success');
  afterLogin();
}"""
    register_new = """  if (!valid) { showToast('Please fix the highlighted fields','error'); return; }
  
  if (allUsers.find(u => u.email === email)) {
      showToast('Email already in use', 'error'); return;
  }
  
  const newUserAuth = { name, email, phone, pass, role: selectedRole, emoji: selectedRole==='talent'?'\\u{1F9D1}\\u200D\\u{1F527}':'\\u{1F3E2}', state, skills: [], bio: '', avail: 'open', district: '', views:0, rating:5.0 };
  allUsers.push(newUserAuth);
  
  // Also add to public talents map if they are a talent
  const newProfile = {
      id: Date.now(),
      email: email,
      name: name,
      emoji: newUserAuth.emoji,
      location: state, // Initial broad location
      lat: 20.5937 + (Math.random()*4-2), // Approx central india bounds randomly for demo
      lng: 78.9629 + (Math.random()*4-2),
      skills: [],
      primary: selectedRole==='talent' ? (document.getElementById('regCategory').value || 'Professional') : 'Talent Seeker',
      exp: '0 yrs', verify: 'self', avail: 'open',
      category: 'tech', bio: '', views: 0, rating: 5.0,
      phone: phone
  };
  TALENTS.push(newProfile);
  currentUser = newProfile;
  
  persistState();
  showToast('Welcome, '+name+'! Account created.','success');
  afterLogin();
}"""
    content = content.replace(register_old, register_new)
    
    # 7. Update Stats in `animateOverviewStats()` and `startHeroCounter()`
    counter_old = """function startHeroCounter() {
  let v = 284391;
  setInterval(() => {
    v += Math.floor(Math.random() * 5);
    const el = document.getElementById('heroCount');
    if (el) el.textContent = v.toLocaleString('en-IN');
  }, 3000);
}"""
    counter_new = """function startHeroCounter() {
  setInterval(() => {
    const el = document.getElementById('heroCount');
    if (el) el.textContent = (TALENTS.length > 0 ? TALENTS.length.toLocaleString('en-IN') : '0');
  }, 1000);
}"""
    content = content.replace(counter_old, counter_new)

    stats_old = """function animateOverviewStats() {
  const stats = [{id:'ov-views',val:142},{id:'ov-req',val:7},{id:'ov-conn',val:18},{id:'ov-msg',val:3}];"""
    stats_new = """function animateOverviewStats() {
  const unreadMsg = conversations.reduce((a,c)=>a+(c.unread||0),0);
  const totalViews = currentUser?.views || 0;
  const stats = [
    {id:'ov-views',val:totalViews},
    {id:'ov-req',val:0},
    {id:'ov-conn',val:myConnections.length},
    {id:'ov-msg',val:unreadMsg}
  ];"""
    content = content.replace(stats_old, stats_new)
    
    # 8. Profile editing save back to TALENTS pool
    save_prof_old = """  currentUser.bio = document.getElementById('editBio').value.trim();
  currentUser.avail = document.getElementById('editAvail').value;
  document.getElementById('sidebarName').textContent = currentUser.name;"""
    save_prof_new = """  currentUser.bio = document.getElementById('editBio').value.trim();
  currentUser.avail = document.getElementById('editAvail').value;
  currentUser.location = (currentUser.district ? currentUser.district + ', ' : '') + (currentUser.state || 'India');
  
  // Sync to TALENTS pool
  if(currentUser.id) {
     const tIdx = TALENTS.findIndex(x => x.id === currentUser.id);
     if (tIdx >= 0) TALENTS[tIdx] = currentUser;
  }
  
  document.getElementById('sidebarName').textContent = currentUser.name;
  updateTrendingStats();"""
    content = content.replace(save_prof_old, save_prof_new)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
if __name__ == "__main__":
    main()
