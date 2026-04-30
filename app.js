/* ═══════════════════════════════════════════
   AgriTech — app.js
   Firebase Auth + Firestore + Dashboard logic
   ═══════════════════════════════════════════ */

/* ──────────────────────────────────────────
   FIREBASE CONFIG — injected at build time
   ────────────────────────────────────────── */
const FIREBASE_CONFIG = {
  apiKey:            "__ENV_FIREBASE_API_KEY__",
  authDomain:        "__ENV_FIREBASE_AUTH_DOMAIN__",
  projectId:         "__ENV_FIREBASE_PROJECT_ID__",
  storageBucket:     "__ENV_FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__ENV_FIREBASE_MESSAGING_SENDER_ID__",
  appId:             "__ENV_FIREBASE_APP_ID__"
};

/* ──────────────────────────────────────────
   INIT FIREBASE
   ────────────────────────────────────────── */
let auth, db, googleProvider;
let firebaseReady = false;

function initFirebase() {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    auth           = firebase.auth();
    googleProvider = new firebase.auth.GoogleAuthProvider();
    firebaseReady  = true;

    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

    auth.onAuthStateChanged(user => {
      if (user && !currentUser) {
        currentUser = {
          name:  user.displayName || user.email.split('@')[0],
          fname: (user.displayName || user.email.split('@')[0]).split(' ')[0],
          lname: (user.displayName || '').split(' ').slice(1).join(' ') || '',
          email: user.email,
          phone: ''
        };
        loadDashboard();
        showPage('dashboard');
        loadUserProfile(user);
      }
    });
  } catch (e) {
    console.warn('Firebase init skipped (demo mode):', e.message);
  }
}

function getDB() {
  if (!db && firebaseReady) {
    db = firebase.firestore();
    db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
    db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
  }
  return db;
}

/* ──────────────────────────────────────────
   STATE
   ────────────────────────────────────────── */
let currentUser = null;

const TAB_INDEX = { home: 0, govconnect: 1, equipment: 2, insurance: 3, market: 4, weather: 5, settings: 6 };

const SEED_GOV = [
  { name: "PM-KISAN Samman Nidhi", category: "Income Support", desc: "₹6,000/year direct income support in 3 installments to all landholding farmer families.", status: "open", badge: "Central Govt" },
  { name: "Kisan Credit Card (KCC)", category: "Credit", desc: "Flexible credit for crop cultivation, post harvest, maintenance, allied activities. Low interest @ 4% p.a.", status: "open", badge: "NABARD" },
  { name: "PMFBY — Crop Insurance", category: "Insurance", desc: "Pradhan Mantri Fasal Bima Yojana — affordable crop insurance against natural calamities, pests & disease.", status: "open", badge: "Central Govt" },
  { name: "Soil Health Card Scheme", category: "Soil Testing", desc: "Free soil health card with crop-wise fertilizer recommendations to improve soil health & yields.", status: "open", badge: "Ministry of Agri" },
  { name: "PMKSN — Solar Pump Scheme", category: "Equipment Subsidy", desc: "Up to 60% subsidy on solar pumps for irrigation. Reduces electricity cost for farmers.", status: "open", badge: "State + Central" },
  { name: "eNAM — Electronic APMC", category: "Market Access", desc: "Online trading platform for agricultural commodities. Transparent price discovery across 1000+ mandis.", status: "open", badge: "Ministry of Agri" }
];

const SEED_EQUIPMENT = [
  { name: "Mahindra Arjun 605 Tractor", category: "Tractor", price: "₹7.5L", emi: "₹14,200/mo", desc: "60 HP, 4WD, perfect for medium farms. Available on 5-yr loan at 7% interest." },
  { name: "John Deere 5050E Tractor", category: "Tractor", price: "₹9.2L", emi: "₹17,400/mo", desc: "50 HP, ideal for wheat & paddy. Subsidised under state agricultural scheme." },
  { name: "Kubota PADDY MASTER Harvester", category: "Harvester", price: "₹12.8L", emi: "₹22,000/mo", desc: "Self-propelled paddy harvester. Rental also available at ₹1,800/hr." },
  { name: "Kirloskar Star-1 Water Pump", category: "Pump", price: "₹18,500", emi: "₹1,800/mo", desc: "5 HP diesel pump, ideal for drip & sprinkler irrigation. 60% subsidy under PM-KUSUM." },
  { name: "VST Shakti 130 Power Tiller", category: "Tiller", price: "₹1.2L", emi: "₹2,800/mo", desc: "13 HP, best for small/hilly farms. Available on 3-yr zero-interest EMI scheme." },
  { name: "Drone Sprayer (Rental)", category: "Drone", price: "₹800/acre", emi: "N/A", desc: "AI-guided pesticide drone spraying service. Book for your field — no purchase required." }
];

const SEED_INSURANCE = [
  { crop: "Wheat (Rabi 2025-26)", area: "4 acres", premium: "₹1,240", sumInsured: "₹62,000", status: "Active", statusType: "good" },
  { crop: "Tomato (Kharif 2025)", area: "2 acres", premium: "₹680", sumInsured: "₹34,000", status: "Claim Filed", statusType: "warning" },
  { crop: "Mustard (Rabi 2024-25)", area: "3 acres", premium: "₹920", sumInsured: "₹46,000", status: "Settled ₹38,000", statusType: "blue" }
];

const SEED_WEATHER = {
  current: { temp: 28, desc: "Partly Cloudy", humidity: 62, wind: "12 km/h", rain: "2mm", uv: "6" },
  forecast: [
    { day: "Mon", icon: "☀️", high: 31, low: 18, rain: "0%" },
    { day: "Tue", icon: "🌤️", high: 29, low: 17, rain: "10%" },
    { day: "Wed", icon: "🌧️", high: 25, low: 16, rain: "70%" },
    { day: "Thu", icon: "⛈️", high: 23, low: 15, rain: "85%" },
    { day: "Fri", icon: "🌤️", high: 27, low: 16, rain: "15%" }
  ]
};

const SEED_MARKET = [
  { name: "Organic Wheat Flour", category: "Grains", price: "₹2,450", qty: "25 quintals", seller: "Rajesh Kumar, Punjab" },
  { name: "Basmati Rice (Premium)", category: "Grains", price: "₹6,800", qty: "15 quintals", seller: "Arun Verma, UP" },
  { name: "Fresh Tomatoes", category: "Vegetables", price: "₹1,200", qty: "8 quintals", seller: "Priya Sharma, Maharashtra" },
  { name: "NPK Fertilizer 20-20-20", category: "Fertilizers", price: "₹850", qty: "50 bags", seller: "AgriStore Plus" },
  { name: "Drip Irrigation Kit", category: "Equipment", price: "₹12,500", qty: "1 unit", seller: "IrriTech Solutions" },
  { name: "Hybrid Tomato Seeds", category: "Seeds", price: "₹450", qty: "100 packets", seller: "SeedCorp India" }
];

const SEED_ACTIVITIES = [
  { text: "PM-KISAN installment of ₹2,000 credited to your account", type: "green", time: "2h ago" },
  { text: "Wheat (Rabi) PMFBY enrolment confirmed — ₹1,240 premium paid", type: "blue", time: "5h ago" },
  { text: "New buyer posted ₹2,600/quintal for Wheat — check Sell & Logistics", type: "amber", time: "8h ago" },
  { text: "Equipment application for Tractor loan submitted successfully", type: "green", time: "1d ago" },
  { text: "Weather alert: Hailstorm risk Thursday — consider crop protection", type: "red", time: "1d ago" },
  { text: "KCC credit limit of ₹1,50,000 approved", type: "blue", time: "2d ago" }
];


/* ══════════════════════════════════════════
   PAGE NAVIGATION
══════════════════════════════════════════ */
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
  if (page === 'login' || page === 'register') resetRegSteps();
  if (page === 'dashboard') {
    loadDashboard();
    switchTab('home');
  }
}

function scrollToSection(selector) {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function toggleMobileNav() {
  const nav = document.getElementById('mobile-nav');
  nav.classList.toggle('open');
}

function toggleSidebar() {
  const sb = document.querySelector('.sidebar');
  sb.classList.toggle('open');
  const overlay = document.querySelector('.sidebar-overlay');
  if (sb.classList.contains('open')) {
    overlay.style.display = 'block';
  } else {
    overlay.style.display = 'none';
  }
}


/* ══════════════════════════════════════════
   DASHBOARD TAB SWITCHING
══════════════════════════════════════════ */
function switchTab(tab) {
  document.querySelectorAll('[id^="tab-"]').forEach(t => t.style.display = 'none');
  const el = document.getElementById('tab-' + tab);
  if (el) el.style.display = 'block';

  const items = document.querySelectorAll('.nav-item');
  items.forEach(n => n.classList.remove('active'));
  const idx = TAB_INDEX[tab];
  if (idx !== undefined && items[idx]) items[idx].classList.add('active');

  if (tab === 'govconnect') renderGovConnect();
  if (tab === 'equipment')  renderEquipment();
  if (tab === 'insurance')  renderInsurance();
  if (tab === 'weather')    renderWeather();
  if (tab === 'market')     renderMarketplace();

  const sb = document.querySelector('.sidebar');
  if (sb && sb.classList.contains('open')) toggleSidebar();
}


/* ══════════════════════════════════════════
   FIREBASE AUTH
══════════════════════════════════════════ */
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('login-btn');
  errEl.style.display = 'none';

  if (!email || !pass) {
    errEl.textContent = 'Please enter your email and password.';
    errEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Signing in...';
  btn.disabled = true;
  btn.style.opacity = '0.7';

  if (firebaseReady) {
    try {
      const cred = await auth.signInWithEmailAndPassword(email, pass);
      currentUser = {
        name:  cred.user.displayName || email.split('@')[0],
        fname: (cred.user.displayName || email.split('@')[0]).split(' ')[0],
        lname: (cred.user.displayName || '').split(' ').slice(1).join(' ') || '',
        email: cred.user.email,
        phone: ''
      };
      loadDashboard();
      showPage('dashboard');
      setTimeout(() => loadUserProfile(cred.user), 100);
    } catch (err) {
      errEl.textContent = getAuthError(err.code);
      errEl.style.display = 'block';
      btn.textContent = 'Sign In';
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  } else {
    /* Demo mode */
    currentUser = { email, name: email.split('@')[0], fname: email.split('@')[0], lname: '', phone: '' };
    loadDashboard();
    showPage('dashboard');
    showToast('Signed in (Demo mode)');
  }

  btn.textContent = 'Sign In';
  btn.disabled = false;
  btn.style.opacity = '1';
}

async function doGoogleLogin() {
  if (!firebaseReady) {
    showToast('Google login requires Firebase configuration.');
    return;
  }
  try {
    const result = await auth.signInWithPopup(googleProvider);
    currentUser = {
      name:  result.user.displayName || result.user.email.split('@')[0],
      fname: (result.user.displayName || result.user.email.split('@')[0]).split(' ')[0],
      lname: (result.user.displayName || '').split(' ').slice(1).join(' ') || '',
      email: result.user.email,
      phone: ''
    };
    loadDashboard();
    showPage('dashboard');
    setTimeout(() => loadUserProfile(result.user), 100);
  } catch (err) {
    showToast('Google sign-in failed: ' + err.message);
  }
}

async function doRegister() {
  const fname   = document.getElementById('r-fname').value.trim();
  const lname   = document.getElementById('r-lname').value.trim();
  const email   = document.getElementById('r-email').value.trim();
  const pass    = document.getElementById('r-pass').value;

  const userData = {
    fname, lname,
    name:        fname + (lname ? ' ' + lname : ''),
    email,
    phone:       document.getElementById('r-phone').value || '',
    dob:         document.getElementById('r-dob').value || '',
    state:       document.getElementById('r-state').value || '',
    farmType:    document.getElementById('r-farmtype').value || '',
    farmSize:    document.getElementById('r-farmsize').value || '',
    irrigation:  document.getElementById('r-irrigation').value || '',
    crops:       document.getElementById('r-crops').value || '',
    goals:       document.getElementById('r-goals').value || '',
    createdAt:   new Date().toISOString()
  };

  if (firebaseReady) {
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      await getDB().collection('users').doc(cred.user.uid).set(userData);
      await cred.user.updateProfile({ displayName: userData.name });
      currentUser = userData;
      loadDashboard();
      showPage('dashboard');
      showToast('Welcome to AgriTech, ' + fname + '! 🌱');
    } catch (err) {
      showToast('Registration failed: ' + err.message);
    }
  } else {
    /* Demo mode */
    currentUser = userData;
    loadDashboard();
    showPage('dashboard');
    showToast('Welcome to AgriTech, ' + fname + '! 🌱 (Demo mode)');
  }
}

async function doSignOut() {
  if (firebaseReady) {
    await auth.signOut();
  }
  currentUser = null;
  showPage('landing');
  showToast('Signed out successfully.');
}

async function loadUserProfile(firebaseUser) {
  const database = getDB();
  if (!database) return;
  try {
    const doc = await database.collection('users').doc(firebaseUser.uid).get();
    if (doc.exists) {
      Object.assign(currentUser, doc.data());
      loadDashboard();
    }
  } catch (e) { /* offline */ }
}

function getAuthError(code) {
  const map = {
    'auth/user-not-found':        'No account found with that email.',
    'auth/wrong-password':        'Incorrect password. Please try again.',
    'auth/invalid-email':         'Please enter a valid email address.',
    'auth/too-many-requests':     'Too many attempts. Please try again later.',
    'auth/email-already-in-use':  'An account with this email already exists.',
    'auth/weak-password':         'Password should be at least 6 characters.'
  };
  return map[code] || 'Authentication failed. Please try again.';
}


/* ══════════════════════════════════════════
   REGISTRATION STEPS
══════════════════════════════════════════ */
function regNext1() {
  const fname = document.getElementById('r-fname').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const pass  = document.getElementById('r-pass').value;
  const pass2 = document.getElementById('r-pass2').value;
  const errEl = document.getElementById('reg-error1');

  if (!fname || !email || pass.length < 8) {
    errEl.textContent = 'Please fill all required fields. Password must be at least 8 characters.';
    errEl.style.display = 'block';
    return;
  }
  if (pass !== pass2) {
    errEl.textContent = 'Passwords do not match.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  setRegStep(2);
}

function regNext2() {
  setRegStep(3);
}

function regBack(to) {
  setRegStep(to);
}

function setRegStep(step) {
  [1, 2, 3].forEach(n => {
    document.getElementById('reg-step' + n).style.display = n === step ? 'block' : 'none';
    const dot = document.getElementById('sd' + n);
    dot.className = 'step-dot' + (n < step ? ' done' : n === step ? ' active' : '');
  });
}

function resetRegSteps() {
  setRegStep(1);
  ['reg-error1', 'reg-error2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}


/* ══════════════════════════════════════════
   DASHBOARD INIT
══════════════════════════════════════════ */
function loadDashboard() {
  if (!currentUser) return;

  const initials = (currentUser.fname ? currentUser.fname[0].toUpperCase() : '?') +
                   (currentUser.lname ? currentUser.lname[0].toUpperCase() : '');

  ['sb-avatar', 'top-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = initials;
  });

  const sbName = document.getElementById('sb-name');
  if (sbName) sbName.textContent = currentUser.name || currentUser.email;

  // Settings fields
  const setName = document.getElementById('set-name');
  const setEmail = document.getElementById('set-email');
  const setPhone = document.getElementById('set-phone');
  const setLoc = document.getElementById('set-location');
  if (setName) setName.value = currentUser.name || '';
  if (setEmail) setEmail.value = currentUser.email || '';
  if (setPhone) setPhone.value = currentUser.phone || '';
  if (setLoc) setLoc.value = currentUser.state || '';

  // Greeting
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';
  const greetEl = document.getElementById('dash-greeting');
  if (greetEl) greetEl.textContent = greeting + ', ' + (currentUser.fname || 'Farmer');

  renderActivities();
}


/* ══════════════════════════════════════════
   RENDER ACTIVITIES
══════════════════════════════════════════ */
function renderActivities() {
  const listEl = document.getElementById('activity-list');
  if (!listEl) return;

  listEl.innerHTML = SEED_ACTIVITIES.map(a => `
    <div class="activity-item">
      <div class="activity-dot dot-${a.type}"></div>
      <div class="activity-text">${a.text}</div>
      <div class="activity-time">${a.time}</div>
    </div>
  `).join('');
}


/* ══════════════════════════════════════════
   GOV CONNECT
══════════════════════════════════════════ */
function renderGovConnect() {
  const grid = document.getElementById('govconnect-grid');
  if (!grid) return;
  grid.innerHTML = SEED_GOV.map(s => `
    <div class="market-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div class="market-category">${s.category}</div>
        <span style="font-size:11px;font-weight:600;color:var(--primary);background:var(--primary-bg);padding:3px 10px;border-radius:999px">${s.badge}</span>
      </div>
      <div class="market-name">${s.name}</div>
      <div style="font-size:13px;color:var(--text3);margin:8px 0 16px;line-height:1.6">${s.desc}</div>
      <button class="btn-primary" style="width:100%;justify-content:center;padding:10px" onclick="showToast('Application for ${s.name} submitted! ✓')">Apply Now</button>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════
   EQUIPMENT
══════════════════════════════════════════ */
function renderEquipment() {
  const grid = document.getElementById('equipment-grid');
  if (!grid) return;
  grid.innerHTML = SEED_EQUIPMENT.map(e => `
    <div class="market-card">
      <div class="market-category">${e.category}</div>
      <div class="market-name">${e.name}</div>
      <div style="font-size:13px;color:var(--text3);margin:8px 0 12px;line-height:1.6">${e.desc}</div>
      <div class="market-info">
        <div class="market-price">${e.price}</div>
        <div style="font-size:12px;color:var(--text3)">EMI: ${e.emi}</div>
      </div>
      <button class="btn-outline" style="width:100%;justify-content:center;margin-top:12px;padding:10px" onclick="showToast('Loan enquiry for ${e.name} submitted! Team will call you. ✓')">Apply for Loan / Rent</button>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════
   CROP INSURANCE
══════════════════════════════════════════ */
function renderInsurance() {
  const el = document.getElementById('insurance-content');
  if (!el) return;
  el.innerHTML = `
    <div style="margin-bottom:24px">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;color:var(--text)">My Active Policies</h3>
      <div class="reports-grid">
        ${SEED_INSURANCE.map(ins => `
          <div class="report-card">
            <h3>${ins.crop}</h3>
            <div class="report-row"><span class="report-label">Area Insured</span><span class="report-value">${ins.area}</span></div>
            <div class="report-row"><span class="report-label">Premium Paid</span><span class="report-value">${ins.premium}</span></div>
            <div class="report-row"><span class="report-label">Sum Insured</span><span class="report-value">${ins.sumInsured}</span></div>
            <div class="report-row"><span class="report-label">Status</span>
              <span class="crop-health health-${ins.statusType}" style="padding:3px 12px;border-radius:999px;font-size:12px">${ins.status}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function openInsuranceEnrol() {
  document.getElementById('insurance-modal').classList.add('open');
}

function closeInsuranceModal() {
  document.getElementById('insurance-modal').classList.remove('open');
}

function submitInsurance() {
  const crop   = document.getElementById('ins-crop').value.trim();
  const area   = document.getElementById('ins-area').value;
  const season = document.getElementById('ins-season').value;
  if (!crop || !area) { showToast('Please fill in crop name and area.'); return; }

  const premium = Math.round(area * 310);
  const sumIns  = area * 15500;

  SEED_INSURANCE.unshift({
    crop: `${crop} (${season})`,
    area: `${area} acres`,
    premium: `₹${premium.toLocaleString('en-IN')}`,
    sumInsured: `₹${sumIns.toLocaleString('en-IN')}`,
    status: 'Pending',
    statusType: 'warning'
  });

  closeInsuranceModal();
  renderInsurance();
  showToast(`PMFBY enrolment for ${crop} submitted! 🛡️`);

  document.getElementById('ins-crop').value = '';
  document.getElementById('ins-area').value = '';
}


/* ══════════════════════════════════════════
   WEATHER
══════════════════════════════════════════ */
function renderWeather() {
  const w = SEED_WEATHER;

  const currentEl = document.getElementById('weather-current');
  if (currentEl) {
    currentEl.innerHTML = `
      <div>
        <div class="weather-temp">${w.current.temp}°C</div>
        <div class="weather-desc">${w.current.desc}</div>
        <div class="weather-location">📍 ${currentUser?.state || 'Your Location'}</div>
      </div>
      <div class="weather-details">
        <div class="weather-detail">
          <div class="weather-detail-val">${w.current.humidity}%</div>
          <div class="weather-detail-label">Humidity</div>
        </div>
        <div class="weather-detail">
          <div class="weather-detail-val">${w.current.wind}</div>
          <div class="weather-detail-label">Wind</div>
        </div>
        <div class="weather-detail">
          <div class="weather-detail-val">${w.current.rain}</div>
          <div class="weather-detail-label">Rainfall</div>
        </div>
        <div class="weather-detail">
          <div class="weather-detail-val">${w.current.uv}</div>
          <div class="weather-detail-label">UV Index</div>
        </div>
      </div>
    `;
  }

  const forecastEl = document.getElementById('weather-forecast');
  if (forecastEl) {
    forecastEl.innerHTML = w.forecast.map(f => `
      <div class="forecast-card">
        <div class="forecast-day">${f.day}</div>
        <div class="forecast-icon">${f.icon}</div>
        <div class="forecast-temp">${f.high}°C</div>
        <div class="forecast-range">${f.low}° / ${f.high}° · Rain ${f.rain}</div>
      </div>
    `).join('');
  }
}


/* ══════════════════════════════════════════
   MARKETPLACE
══════════════════════════════════════════ */
let marketListings = [...SEED_MARKET];

function renderMarketplace() {
  const grid = document.getElementById('market-listings');
  if (!grid) return;

  if (!marketListings.length) {
    grid.innerHTML = '<div class="empty-state">No listings yet. Be the first to list your produce!</div>';
    return;
  }

  grid.innerHTML = marketListings.map(item => `
    <div class="market-card">
      <div class="market-category">${item.category}</div>
      <div class="market-name">${item.name}</div>
      <div class="market-seller">${item.seller}</div>
      <div class="market-info">
        <div class="market-price">${item.price}</div>
        <div class="market-qty">${item.qty}</div>
      </div>
    </div>
  `).join('');
}

function openAddListing() {
  document.getElementById('listing-modal').classList.add('open');
}

function closeListingModal() {
  document.getElementById('listing-modal').classList.remove('open');
}

function addListing() {
  const name     = document.getElementById('lst-name').value.trim();
  const price    = document.getElementById('lst-price').value;
  const qty      = document.getElementById('lst-qty').value;
  const category = document.getElementById('lst-category').value;

  if (!name || !price) {
    showToast('Please fill in the product name and price.');
    return;
  }

  const listing = {
    name,
    category,
    price: '₹' + parseInt(price).toLocaleString('en-IN'),
    qty: qty + ' quintals',
    seller: currentUser ? currentUser.name : 'You'
  };

  marketListings.unshift(listing);

  /* Save to Firestore */
  if (firebaseReady && auth.currentUser) {
    try {
      getDB().collection('marketplace').add({
        ...listing,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
    } catch (e) { /* offline */ }
  }

  renderMarketplace();
  closeListingModal();
  showToast('Listing published: ' + name + ' 🌾');

  // Clear form
  ['lst-name', 'lst-price', 'lst-qty'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}


/* ══════════════════════════════════════════
   DISEASE DETECTION (Simulated AI)
══════════════════════════════════════════ */
function handleDiseaseUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  const zone = document.getElementById('upload-zone');
  zone.innerHTML = `
    <div style="color:var(--primary);font-size:24px;margin-bottom:8px">🔬</div>
    <h3>Analyzing "${file.name}"...</h3>
    <p>AI model processing your image</p>
    <div style="width:200px;height:4px;background:var(--border);border-radius:2px;margin:16px auto 0;overflow:hidden">
      <div style="width:0%;height:100%;background:var(--primary);border-radius:2px;animation:progressBar 2s ease forwards"></div>
    </div>
    <style>@keyframes progressBar{to{width:100%}}</style>
  `;

  setTimeout(() => {
    const results = [
      { icon: "🦠", label: "Disease Detected", val: "Early Blight (Alternaria solani)", bg: "var(--red-bg)" },
      { icon: "📊", label: "Confidence", val: "94.7%", bg: "var(--primary-bg)" },
      { icon: "🌡️", label: "Severity", val: "Moderate — Stage 2 of 5", bg: "var(--amber-bg)" },
      { icon: "💊", label: "Treatment", val: "Apply Mancozeb 75% WP @ 2.5g/L, spray at 10-day intervals", bg: "var(--secondary-bg)" },
      { icon: "🛡️", label: "Prevention", val: "Use resistant varieties, crop rotation, proper spacing for air circulation", bg: "var(--teal-bg)" }
    ];

    zone.innerHTML = `
      <div style="color:var(--primary);font-size:24px;margin-bottom:8px">✅</div>
      <h3>Analysis Complete</h3>
      <p>Image: ${file.name}</p>
    `;

    const resultEl = document.getElementById('disease-result');
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <h3>Diagnosis Report</h3>
      ${results.map(r => `
        <div class="disease-finding">
          <div class="finding-icon" style="background:${r.bg}">${r.icon}</div>
          <div class="finding-text">
            <div class="finding-label">${r.label}</div>
            <div class="finding-val">${r.val}</div>
          </div>
        </div>
      `).join('')}
    `;

    showToast('Disease analysis complete — Early Blight detected.');
  }, 2500);
}


/* ══════════════════════════════════════════
   REPORTS
══════════════════════════════════════════ */
function renderReports() {
  const el = document.getElementById('reports-content');
  if (!el) return;

  el.innerHTML = `
    <div class="report-card">
      <h3>📊 Yield Summary</h3>
      <div class="report-row"><span class="report-label">Total Active Crops</span><span class="report-value">5</span></div>
      <div class="report-row"><span class="report-label">Avg Yield Forecast</span><span class="report-value">+18% vs last season</span></div>
      <div class="report-row"><span class="report-label">Best Performing</span><span class="report-value">Wheat (HD-2967)</span></div>
      <div class="report-row"><span class="report-label">Needs Attention</span><span class="report-value">Tomato (low moisture)</span></div>
    </div>
    <div class="report-card">
      <h3>💧 Water Usage</h3>
      <div class="report-row"><span class="report-label">This Month</span><span class="report-value">42,500 L</span></div>
      <div class="report-row"><span class="report-label">vs Last Month</span><span class="report-value">−12% ↓</span></div>
      <div class="report-row"><span class="report-label">Optimal Target</span><span class="report-value">38,000 L</span></div>
      <div class="report-row"><span class="report-label">Irrigation Efficiency</span><span class="report-value">87%</span></div>
    </div>
    <div class="report-card">
      <h3>🌡️ Soil Health</h3>
      <div class="report-row"><span class="report-label">pH Level</span><span class="report-value">6.8 (Optimal)</span></div>
      <div class="report-row"><span class="report-label">Nitrogen (N)</span><span class="report-value">Medium — 280 kg/ha</span></div>
      <div class="report-row"><span class="report-label">Phosphorus (P)</span><span class="report-value">High — 35 kg/ha</span></div>
      <div class="report-row"><span class="report-label">Potassium (K)</span><span class="report-value">Medium — 190 kg/ha</span></div>
    </div>
    <div class="report-card">
      <h3>💰 Financial Overview</h3>
      <div class="report-row"><span class="report-label">Input Costs (YTD)</span><span class="report-value">₹1,85,000</span></div>
      <div class="report-row"><span class="report-label">Revenue (YTD)</span><span class="report-value">₹4,20,000</span></div>
      <div class="report-row"><span class="report-label">Net Profit</span><span class="report-value">₹2,35,000</span></div>
      <div class="report-row"><span class="report-label">ROI</span><span class="report-value">127%</span></div>
    </div>
  `;
}


/* ══════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════ */
function saveSettings() {
  const name  = document.getElementById('set-name').value;
  const phone = document.getElementById('set-phone').value;
  const loc   = document.getElementById('set-location').value;

  if (currentUser) {
    currentUser.name  = name;
    currentUser.phone = phone;
    currentUser.state = loc;
  }

  if (firebaseReady && auth.currentUser) {
    getDB().collection('users').doc(auth.currentUser.uid).update({ name, phone, state: loc })
      .then(() => showToast('Settings saved successfully. ✓'))
      .catch(() => showToast('Settings saved locally.'));
  } else {
    showToast('Settings saved. ✓');
  }

  loadDashboard();
}


/* ══════════════════════════════════════════
   TOAST NOTIFICATION
══════════════════════════════════════════ */
function showToast(msg) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-msg');
  msgEl.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}


/* ══════════════════════════════════════════
   MODALS
══════════════════════════════════════════ */
function closeModal() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}


/* ══════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════ */
function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}


/* ══════════════════════════════════════════
   NAV SCROLL EFFECT
══════════════════════════════════════════ */
function initNavScroll() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      nav.style.background = 'rgba(255,255,255,0.96)';
      nav.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
    } else {
      nav.style.background = 'rgba(255,255,255,0.92)';
      nav.style.boxShadow = 'none';
    }
  }, { passive: true });
}


/* ══════════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════════ */
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const active = document.activeElement;
      if (active && active.id === 'login-pass') doLogin();
    }
    if (e.key === 'Escape') {
      closeModal();
      closeListingModal();
      document.getElementById('mobile-nav')?.classList.remove('open');
    }
  });
}


/* ══════════════════════════════════════════
   BOOT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  initScrollReveal();
  initNavScroll();
  initKeyboard();
});
