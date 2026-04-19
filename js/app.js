'use strict';

/* ============================================================
   VoyageAI — Core App
   State, routing, AI via Pollinations (free, no key)
   ============================================================ */

const VoyageAI = {
  currentPage: null,
  user: null,
  tripPrefs: { from: '', tripType: '', budget: '', extras: [], extrasText: '' },
  currentTrip: null,
  savedTrips: [],
  settings: { googleClientId: '123456789-abcdefg.apps.googleusercontent.com' },

  init() {
    this.loadState();
    this.bindGlobalEvents();
    this.router();
    this.initGoogleAuth();
  },

  loadState() {
    try {
      const u = localStorage.getItem('vai_user');     if (u) this.user       = JSON.parse(u);
      const t = localStorage.getItem('vai_trips');    if (t) this.savedTrips = JSON.parse(t);
      const p = localStorage.getItem('vai_prefs');    if (p) this.tripPrefs  = { ...this.tripPrefs, ...JSON.parse(p) };
      const s = localStorage.getItem('vai_settings'); if (s) this.settings   = { ...this.settings, ...JSON.parse(s) };
    } catch (e) { console.warn('loadState', e); }
  },

  saveUser(user) { this.user = user; localStorage.setItem('vai_user', JSON.stringify(user)); },
  updateUser(changes) { this.user = { ...this.user, ...changes }; localStorage.setItem('vai_user', JSON.stringify(this.user)); },
  saveSettings(changes) { this.settings = { ...this.settings, ...changes }; localStorage.setItem('vai_settings', JSON.stringify(this.settings)); },

  saveCurrentTrip(trip) {
    if (!trip || !trip.id) return false;
    const idx = this.savedTrips.findIndex(t => t.id === trip.id);
    if (idx >= 0) { this.savedTrips[idx] = trip; }
    else { this.savedTrips.unshift(trip); }
    localStorage.setItem('vai_trips', JSON.stringify(this.savedTrips));
    return true;
  },
  deleteTrip(id) {
    this.savedTrips = this.savedTrips.filter(t => t.id !== id);
    localStorage.setItem('vai_trips', JSON.stringify(this.savedTrips));
  },
  isTripSaved(id) { return this.savedTrips.some(t => t.id === id); },

  router() {
    const hash = location.hash.replace('#', '') || 'login';
    const protected_ = ['planner', 'results', 'costs', 'mytrips', 'account'];
    if (!this.user && protected_.includes(hash)) { this.navigate('login', false); return; }
    this.navigate(hash, false);
  },

  navigate(page, push = true) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('page-' + page);
    if (!el) { this.navigate('login', false); return; }
    el.classList.add('active');
    this.currentPage = page;
    if (push) history.pushState(null, '', '#' + page);
    window.scrollTo(0, 0);
    document.querySelectorAll('.nav-link[data-page]').forEach(l =>
      l.classList.toggle('active', l.dataset.page === page));
    const nav = document.getElementById('main-navbar');
    if (nav) nav.style.display = ['login','signup'].includes(page) ? 'none' : '';

    if (page === 'planner' && typeof PagePlanner !== 'undefined') PagePlanner.init();
    if (page === 'results' && this.currentTrip && typeof PageResults !== 'undefined') PageResults.render(this.currentTrip);
    if (page === 'costs'   && this.currentTrip && typeof PageCosts   !== 'undefined') PageCosts.render(this.currentTrip);
    if (page === 'mytrips' && typeof PageMyTrips !== 'undefined') PageMyTrips.render();
    if (page === 'account' && typeof PageAccount !== 'undefined') PageAccount.render();

    if ((page === 'results' || page === 'costs') && !this.currentTrip) {
      toast('No active trip — plan one first', 'info');
      this.navigate('planner');
    }
  },

  logout() {
    if (!confirm('Sign out of VoyageAI?')) return;
    this.user = null;
    localStorage.removeItem('vai_user');
    this.navigate('login');
    toast('Signed out', 'info');
  },

  bindGlobalEvents() {
    window.addEventListener('popstate', () => this.router());
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        const pg = el.dataset.page;
        if (!this.user && !['login','signup'].includes(pg)) { toast('Please sign in first', 'error'); return; }
        this.navigate(pg);
      });
    });
    document.querySelectorAll('[data-action="logout"]').forEach(el =>
      el.addEventListener('click', () => this.logout()));
    document.getElementById('nav-avatar-btn')?.addEventListener('click', () => {
      if (this.user) this.navigate('account');
    });
  },

  // ════════ Google Identity Services (real OAuth) ════════
  initGoogleAuth() {
    const clientId = this.settings.googleClientId;
    if (!clientId) return;
    const tryInit = (attempts = 0) => {
      if (!window.google || !window.google.accounts) {
        if (attempts > 40) return;
        setTimeout(() => tryInit(attempts + 1), 150);
        return;
      }
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => this.handleGoogleCredential(resp),
          auto_select: false, cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true
        });
        this.renderGoogleButtons();
      } catch (e) { console.error('Google Auth init failed', e); }
    };
    tryInit();
  },

  renderGoogleButtons() {
    if (!window.google?.accounts?.id) return;
    ['google-signin-login','google-signin-signup'].forEach(id => {
      const container = document.getElementById(id);
      if (!container) return;
      container.innerHTML = '';
      try {
        google.accounts.id.renderButton(container, {
          theme: 'outline', size: 'large', width: 340,
          text: id.includes('signup') ? 'signup_with' : 'signin_with',
          logo_alignment: 'center'
        });
      } catch (e) {}
    });
  },

  handleGoogleCredential(response) {
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const nameParts = (payload.name || 'User').split(' ');
      const user = {
        email: payload.email,
        name: payload.name || payload.email,
        initials: ((nameParts[0]?.[0] || '') + (nameParts[1]?.[0] || '')).toUpperCase() || '??',
        picture: payload.picture || '',
        provider: 'google',
        googleSub: payload.sub,
        joined: new Date().toISOString()
      };
      this.saveUser(user);
      PageAuth.updateUserUI(user);
      toast(`Welcome, ${nameParts[0]}! 👋`, 'success');
      setTimeout(() => this.navigate('planner'), 600);
    } catch (e) { console.error(e); toast('Google sign-in failed', 'error'); }
  },

  // ════════════════════════════════════════════
  //   AI TRIP GENERATION
  //   Pollinations.AI — free, no API key, open-source models
  // ════════════════════════════════════════════
  async generateTrip(prefs) {
    const prompt = this.buildPrompt(prefs);
    const systemMsg = 'You are VoyageAI, an expert travel planner. Respond with ONLY valid JSON — no markdown fences, no explanation, no preamble. Start with { and end with }.';

    const strategies = [
      { name: 'openai-chat', fn: () => this.tryPollinationsChat(systemMsg, prompt, 'openai') },
      { name: 'mistral-chat', fn: () => this.tryPollinationsChat(systemMsg, prompt, 'mistral') },
      { name: 'openai-get', fn: () => this.tryPollinationsGET(systemMsg + '\n\n' + prompt, 'openai') },
      { name: 'mistral-get', fn: () => this.tryPollinationsGET(systemMsg + '\n\n' + prompt, 'mistral') },
    ];

    for (const [i, strategy] of strategies.entries()) {
      try {
        console.log(`[VoyageAI] Trying ${strategy.name} (${i+1}/${strategies.length})…`);
        const result = await strategy.fn();
        if (result && result.destination) {
          console.log('[VoyageAI] ✓ AI success:', result._source);
          return result;
        }
      } catch (e) {
        console.warn(`[VoyageAI] ✗ ${strategy.name} failed:`, e.message);
      }
    }

    console.log('[VoyageAI] All AI strategies failed — using local smart-matcher');
    const local = this.generateLocally(prefs);
    local._source = 'local-smart-match';
    return local;
  },

  async tryPollinationsChat(systemMsg, userPrompt, model) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000);
    try {
      const res = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user', content: userPrompt }
          ],
          seed: Math.floor(Math.random() * 1e6),
          temperature: 0.85
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || data?.content || '';
      const parsed = this.extractJSON(text);
      if (!parsed || !parsed.destination) throw new Error('Invalid JSON shape');
      parsed._source = `ai-${model}`;
      return parsed;
    } finally { clearTimeout(timeout); }
  },

  async tryPollinationsGET(fullPrompt, model) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000);
    try {
      const seed = Math.floor(Math.random() * 1e6);
      const url = `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?model=${model}&json=true&seed=${seed}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const parsed = this.extractJSON(text);
      if (!parsed || !parsed.destination) throw new Error('Invalid JSON shape');
      parsed._source = `ai-${model}-get`;
      return parsed;
    } finally { clearTimeout(timeout); }
  },

  buildPrompt(prefs) {
    const typeDesc = {
      beach: 'Sun, ocean, relaxation, water activities',
      mountains: 'Hiking, skiing, nature, fresh air',
      city: 'Culture, food, arts, nightlife, urban exploring'
    }[prefs.tripType] || prefs.tripType;

    return `Recommend ONE specific real-world travel destination for this traveler. The "Special requests" are the MOST IMPORTANT factor — read them carefully.

TRAVELER PREFERENCES:
- Departing from: ${prefs.from || 'Unknown'}
- Trip type: ${prefs.tripType} (${typeDesc})
- Total budget: $${prefs.budget} per person all-in (flights + hotel + activities, 5 days / 4 nights)
- Special requests: "${prefs.extrasText || 'None specified'}"
${prefs.extras.length > 0 ? `- Interest tags: ${prefs.extras.join(', ')}\n` : ''}
CRITICAL: The destination AND all 6 activities MUST directly reflect the special requests. If they mention snorkeling, seafood, hiking, nightlife, family-friendly, boutique, etc. — those must be evident in your picks. Reference the requests in "whyPerfect".

Respond with ONLY a single JSON object matching this exact schema (no markdown, no prose, no code fences):

{
  "destination": "Real city name (just the city)",
  "country": "Country name",
  "region": "State/Province/Region",
  "flag": "🇲🇽",
  "emoji": "🏖️",
  "whyPerfect": "2-3 sentences explaining why THIS city matches their specific requests. Reference the requests directly.",
  "matchScore": 92,
  "flightTimeLabel": "3h 20min",
  "estimatedFlightCost": 280,
  "estimatedHotelPerNight": 95,
  "hotelName": "Specific hotel name with star rating",
  "hotelType": "e.g. Beachfront · All-inclusive",
  "airline": "Airline name",
  "flightCode": "AA 1842 · Nonstop",
  "tempLabel": "82°F",
  "weatherDesc": "Short weather description",
  "rating": 4.7,
  "reviewCount": 11200,
  "destinationTags": ["☀️ 82°F","✈️ 3h nonstop","💰 Budget-friendly","🤿 Snorkeling"],
  "activities": [
    {"emoji":"🤿","name":"Specific Activity","detail":"Duration · What's included","price":45,"tags":["water"]},
    {"emoji":"🏺","name":"...","detail":"...","price":65,"tags":["culture"]},
    {"emoji":"🍜","name":"...","detail":"...","price":38,"tags":["food"]},
    {"emoji":"🧘","name":"...","detail":"...","price":22,"tags":["wellness"]},
    {"emoji":"🏄","name":"...","detail":"...","price":55,"tags":["water"]},
    {"emoji":"🚤","name":"...","detail":"...","price":70,"tags":["water"]}
  ],
  "recommendations": [
    {"emoji":"🏨","name":"Hotel name","desc":"Short description","chip":"AI Top Pick","chipClass":"chip-teal"},
    {"emoji":"🍽️","name":"Restaurant","desc":"Short description","chip":"Foodie Pick","chipClass":"chip-orange"},
    {"emoji":"🎯","name":"Activity","desc":"Short description","chip":"Must See","chipClass":"chip-teal"}
  ],
  "cardColorCSS":"linear-gradient(135deg,#1a6a8c,#0d4a6b)",
  "skyColorCSS":"linear-gradient(180deg,#1a7ab0 0%,#4fb3d4 60%,#80cedc 100%)",
  "oceanColorCSS":"linear-gradient(180deg,#1e88b8 0%,#1565a0 100%)"
}`;
  },

  extractJSON(text) {
    if (!text) return null;
    text = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/g, '').trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) return null;
    let json = text.slice(start, end + 1);
    try { return JSON.parse(json); } catch (e) {}
    try {
      const fixed = json
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/([{,]\s*)([a-zA-Z_][\w]*)\s*:/g, '$1"$2":')
        .replace(/:\s*'([^']*)'/g, ':"$1"')
        .replace(/[\u0000-\u001F]+/g, ' ');
      return JSON.parse(fixed);
    } catch (e2) {
      console.error('[VoyageAI] JSON parse failed:', e2.message);
      return null;
    }
  },

  generateLocally(prefs) {
    const text = (prefs.extrasText + ' ' + prefs.extras.join(' ')).toLowerCase();
    const budget = parseInt(prefs.budget) || 1000;
    const pool = LOCAL_DESTINATIONS.filter(d => d.tripType === prefs.tripType);
    const candidates = pool.length > 0 ? pool : LOCAL_DESTINATIONS;

    const scored = candidates.map(d => {
      let score = Math.random() * 0.5;
      const est = d.estimatedFlightCost + d.estimatedHotelPerNight * 4;
      if (est <= budget * 1.1) score += 15;
      if (est <= budget * 0.85) score += 10;
      (d.keywords || []).forEach(kw => { if (text.includes(kw)) score += 12; });
      return { d, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].d;

    const actsScored = best.allActivities.map(a => {
      let s = Math.random();
      (a.tags || []).forEach(t => { if (text.includes(t)) s += 5; });
      return { a, s };
    });
    actsScored.sort((x, y) => y.s - x.s);
    const activities = actsScored.slice(0, 6).map(x => x.a);

    const matched = (best.keywords || []).filter(kw => text.includes(kw));
    const reasonText = matched.length > 0
      ? `Your requests about ${matched.slice(0, 3).join(', ')} led us here. ${best.whyMatchTemplate || ''}`
      : best.whyMatchTemplate || `A great ${prefs.tripType} pick from ${prefs.from || 'your area'}.`;

    return {
      destination: best.destination, country: best.country, region: best.region,
      flag: best.flag, emoji: best.emoji,
      whyPerfect: reasonText,
      matchScore: Math.min(85 + Math.floor(scored[0].score / 4), 96),
      flightTimeLabel: best.flightTimeLabel,
      estimatedFlightCost: best.estimatedFlightCost,
      estimatedHotelPerNight: best.estimatedHotelPerNight,
      hotelName: best.hotelName, hotelType: best.hotelType,
      airline: best.airline, flightCode: best.flightCode,
      tempLabel: best.tempLabel, weatherDesc: best.weatherDesc,
      rating: best.rating, reviewCount: best.reviewCount,
      destinationTags: best.destinationTags,
      activities, recommendations: best.recommendations,
      cardColorCSS: best.cardColorCSS,
      skyColorCSS: best.skyColorCSS,
      oceanColorCSS: best.oceanColorCSS,
    };
  },
};

function toast(msg, type = 'info', duration = 3200) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

const LOCAL_DESTINATIONS = [
  {
    tripType: 'beach', destination: 'Cancún', country: 'Mexico', region: 'Quintana Roo',
    flag: '🇲🇽', emoji: '🏖️',
    keywords: ['beach','snorkel','swim','mexico','margarita','all-inclusive','seafood','warm','sun','tropical','reef','coral','family'],
    whyMatchTemplate: "Cancún delivers white-sand beaches, world-class snorkeling at the Mesoamerican reef, and authentic Mexican cuisine.",
    flightTimeLabel: '3h 20min', estimatedFlightCost: 312, estimatedHotelPerNight: 89,
    hotelName: 'Hotel Krystal Cancún 4★', hotelType: 'Beachfront · All-inclusive',
    airline: 'American Airlines', flightCode: 'AA 1842 · Nonstop',
    tempLabel: '84°F', weatherDesc: 'Sunny with ocean breeze', rating: 4.8, reviewCount: 12400,
    destinationTags: ['☀️ 84°F','✈️ 3h 20min nonstop','💰 Budget-friendly','🤿 Snorkeling'],
    allActivities: [
      { emoji:'🤿', name:'Isla Mujeres Snorkel Tour', detail:'Half day · Gear included', price:45, tags:['snorkel','water','reef'] },
      { emoji:'🏺', name:'Chichén Itzá Day Trip', detail:'Full day · Transport included', price:65, tags:['culture','history'] },
      { emoji:'🍜', name:'Taco & Mezcal Food Tour', detail:'Evening · 3 hrs · 8 stops', price:38, tags:['food','local'] },
      { emoji:'🧘', name:'Sunrise Beach Yoga', detail:'Morning · 90 min · All levels', price:22, tags:['wellness','yoga'] },
      { emoji:'🏄', name:'Surfing Lesson', detail:'Morning · Beginners OK', price:55, tags:['surf','water'] },
      { emoji:'🚤', name:'Sunset Catamaran Cruise', detail:'Evening · Open bar', price:70, tags:['sunset','water'] }
    ],
    recommendations: [
      { emoji:'🏨', name:'Hotel Krystal Cancún', desc:'Beachfront · All-inclusive · 4★', chip:'AI Top Pick', chipClass:'chip-teal' },
      { emoji:'🍽️', name:'La Fisheria', desc:'Seafood · Local favorite · $$', chip:'Foodie Pick', chipClass:'chip-orange' },
      { emoji:'🤿', name:'MUSA Underwater Museum', desc:'Snorkeling · UNESCO site', chip:'Must See', chipClass:'chip-teal' }
    ],
    cardColorCSS: 'linear-gradient(135deg,#1a6a8c,#0d4a6b)',
    skyColorCSS: 'linear-gradient(180deg,#1a7ab0 0%,#4fb3d4 60%,#80cedc 100%)',
    oceanColorCSS: 'linear-gradient(180deg,#1e88b8 0%,#1565a0 100%)',
  },
  {
    tripType: 'beach', destination: 'Miami Beach', country: 'United States', region: 'Florida',
    flag: '🇺🇸', emoji: '🌴',
    keywords: ['miami','usa','art deco','nightlife','cuban','south beach','domestic','party','style','shopping'],
    whyMatchTemplate: 'Miami Beach combines Art Deco style, world-class nightlife, and Cuban cuisine on pristine sands.',
    flightTimeLabel: '2h 10min', estimatedFlightCost: 198, estimatedHotelPerNight: 140,
    hotelName: 'The Betsy Hotel 4★', hotelType: 'South Beach · Boutique',
    airline: 'Delta Airlines', flightCode: 'DL 2010 · Nonstop',
    tempLabel: '79°F', weatherDesc: 'Warm and sunny', rating: 4.6, reviewCount: 22100,
    destinationTags: ['☀️ 79°F','✈️ 2h nonstop','🏙️ Art Deco','🌴 South Beach'],
    allActivities: [
      { emoji:'🎨', name:'Art Deco District Walking Tour', detail:'Self-guided · 2 hrs', price:0, tags:['art','culture','free'] },
      { emoji:'🚤', name:'Everglades Airboat Tour', detail:'Half day · Wildlife spotting', price:79, tags:['nature','adventure'] },
      { emoji:'🍹', name:'Ocean Drive Nightlife Tour', detail:'Evening · Bar hop · 4 spots', price:55, tags:['nightlife','cocktails'] },
      { emoji:'🏄', name:'South Beach Surf Lesson', detail:'Morning · 2 hrs', price:60, tags:['surf','water'] },
      { emoji:'🛥️', name:'Biscayne Bay Sunset Cruise', detail:'2 hrs · Views of skyline', price:45, tags:['sunset','water'] },
      { emoji:'🎨', name:'Wynwood Walls Street Art', detail:'Self-guided · Free entry', price:0, tags:['art','free','photography'] }
    ],
    recommendations: [
      { emoji:'🏨', name:'The Betsy Hotel', desc:'South Beach · Boutique · 4★', chip:'AI Top Pick', chipClass:'chip-teal' },
      { emoji:'🍽️', name:"Joe's Stone Crab", desc:'Iconic seafood · $$$', chip:'Local Legend', chipClass:'chip-orange' },
      { emoji:'🎨', name:'Wynwood Walls', desc:'Street art · Free entry', chip:'Must See', chipClass:'chip-teal' }
    ],
    cardColorCSS: 'linear-gradient(135deg,#c97a3e,#e8c88a)',
    skyColorCSS: 'linear-gradient(180deg,#2196F3 0%,#64B5F6 60%,#90CAF9 100%)',
    oceanColorCSS: 'linear-gradient(180deg,#0288D1 0%,#01579B 100%)',
  },
  {
    tripType: 'mountains', destination: 'Denver', country: 'United States', region: 'Colorado',
    flag: '🇺🇸', emoji: '🏔️',
    keywords: ['ski','snow','mountain','hike','craft beer','rocky','colorado','altitude','domestic','outdoor'],
    whyMatchTemplate: 'Denver gives direct access to world-class skiing, hiking trails, and a thriving craft beer scene.',
    flightTimeLabel: '3h 45min', estimatedFlightCost: 265, estimatedHotelPerNight: 95,
    hotelName: 'The Crawford Hotel 4★', hotelType: 'Downtown · Historic',
    airline: 'Southwest Airlines', flightCode: 'WN 1423 · Nonstop',
    tempLabel: '58°F', weatherDesc: 'Cool mountain air', rating: 4.7, reviewCount: 9800,
    destinationTags: ['🏔️ 58°F','✈️ 3h 45min nonstop','⛷️ Rockies','🍺 Craft Beer'],
    allActivities: [
      { emoji:'⛷️', name:'Breckenridge Ski Day', detail:'Full day · Lift ticket incl.', price:160, tags:['ski','snow','mountain'] },
      { emoji:'🥾', name:'Rocky Mountain Guided Hike', detail:'Half day · All skill levels', price:45, tags:['hike','nature','outdoor'] },
      { emoji:'🍺', name:'Craft Brewery Tour', detail:'Evening · 5 breweries', price:55, tags:['food','beer','nightlife'] },
      { emoji:'🧗', name:'Red Rocks Climbing', detail:'Morning · All levels', price:40, tags:['climb','adventure'] },
      { emoji:'🚵', name:'Mountain Bike Trail', detail:'Half day · Rental included', price:60, tags:['bike','outdoor'] },
      { emoji:'📸', name:'Rocky Mountain NP Drive', detail:'Full day · Self-guided scenic', price:25, tags:['photo','nature','scenic'] }
    ],
    recommendations: [
      { emoji:'🏨', name:'The Crawford Hotel', desc:'Downtown · Historic · 4★', chip:'AI Top Pick', chipClass:'chip-teal' },
      { emoji:'🍺', name:'Great Divide Brewing', desc:'Craft beer · Local institution', chip:'Local Legend', chipClass:'chip-orange' },
      { emoji:'🥾', name:'Rocky Mountain NP', desc:'Hiking · Wildlife · Stunning', chip:'Must See', chipClass:'chip-teal' }
    ],
    cardColorCSS: 'linear-gradient(135deg,#263238,#455a64)',
    skyColorCSS: 'linear-gradient(180deg,#1565C0 0%,#42A5F5 50%,#B3E5FC 100%)',
    oceanColorCSS: 'linear-gradient(180deg,#4CAF50 0%,#2E7D32 100%)',
  },
  {
    tripType: 'mountains', destination: 'Asheville', country: 'United States', region: 'North Carolina',
    flag: '🇺🇸', emoji: '🏞️',
    keywords: ['smoky','hike','appalachian','breweries','arts','domestic','cabin','waterfall','nc','nature'],
    whyMatchTemplate: 'Asheville offers Blue Ridge views, Appalachian hikes, a killer brewery scene, and arts district energy.',
    flightTimeLabel: '1h 30min', estimatedFlightCost: 145, estimatedHotelPerNight: 110,
    hotelName: 'The Omni Grove Park Inn 4★', hotelType: 'Historic resort · Mountain views',
    airline: 'American Airlines', flightCode: 'AA 2221 · Nonstop',
    tempLabel: '65°F', weatherDesc: 'Mild spring weather', rating: 4.8, reviewCount: 15200,
    destinationTags: ['🏔️ 65°F','✈️ 1h 30min','🎨 Arts District','🍺 Breweries'],
    allActivities: [
      { emoji:'🥾', name:'Blue Ridge Parkway Hike', detail:'Half day · Moderate trail', price:0, tags:['hike','nature','free','outdoor'] },
      { emoji:'🏰', name:'Biltmore Estate Tour', detail:"Full day · America's largest home", price:75, tags:['culture','history'] },
      { emoji:'🍺', name:'South Slope Brewery Tour', detail:'Evening · 4 breweries', price:45, tags:['beer','food','nightlife'] },
      { emoji:'💧', name:'Looking Glass Falls Visit', detail:'Half day · Multiple falls', price:0, tags:['nature','photo','waterfall','free'] },
      { emoji:'🎨', name:'River Arts District', detail:'Self-guided studio tour', price:0, tags:['art','free','culture'] },
      { emoji:'🏕️', name:'Cabin Glamping Experience', detail:'Overnight · Fire + stars', price:140, tags:['outdoor','cabin'] }
    ],
    recommendations: [
      { emoji:'🏨', name:'Omni Grove Park Inn', desc:'Historic · Mountain views · 4★', chip:'AI Top Pick', chipClass:'chip-teal' },
      { emoji:'🍽️', name:'Buxton Hall BBQ', desc:'Whole hog BBQ · Local legend', chip:'Foodie Pick', chipClass:'chip-orange' },
      { emoji:'🏰', name:'Biltmore Estate', desc:"America's largest home · 250 rooms", chip:'Must See', chipClass:'chip-teal' }
    ],
    cardColorCSS: 'linear-gradient(135deg,#2e7d32,#558b2f)',
    skyColorCSS: 'linear-gradient(180deg,#1976D2 0%,#42A5F5 50%,#E3F2FD 100%)',
    oceanColorCSS: 'linear-gradient(180deg,#4CAF50 0%,#2E7D32 100%)',
  },
  {
    tripType: 'city', destination: 'New York City', country: 'United States', region: 'New York',
    flag: '🇺🇸', emoji: '🗽',
    keywords: ['broadway','nyc','manhattan','museum','food','culture','urban','shopping','art','foodie','theatre'],
    whyMatchTemplate: 'NYC packs Broadway, world-class museums, every cuisine imaginable, and iconic sights into a few dense blocks.',
    flightTimeLabel: '1h 45min', estimatedFlightCost: 165, estimatedHotelPerNight: 175,
    hotelName: 'The Standard High Line 4★', hotelType: 'Chelsea · Design Hotel',
    airline: 'American Airlines', flightCode: 'AA 410 · Nonstop',
    tempLabel: '55°F', weatherDesc: 'Mild spring weather', rating: 4.8, reviewCount: 45000,
    destinationTags: ['🗽 55°F','✈️ 1h 45min nonstop','🎭 Broadway','🍕 Foodie capital'],
    allActivities: [
      { emoji:'🎭', name:'Broadway Show', detail:'Evening · Best available seats', price:120, tags:['culture','show','art','theatre'] },
      { emoji:'🗽', name:'Statue of Liberty Ferry', detail:'Half day · Skip-the-line', price:26, tags:['history','landmark'] },
      { emoji:'🍕', name:'NYC Food Walking Tour', detail:'Evening · 8 tastings', price:75, tags:['food','local','foodie'] },
      { emoji:'🌳', name:'Central Park Bike Tour', detail:'2 hrs · Rental included', price:40, tags:['outdoor','bike'] },
      { emoji:'🎨', name:'MoMA Museum Visit', detail:'Half day · Modern art masterpieces', price:30, tags:['art','museum','culture'] },
      { emoji:'🚶', name:'High Line Elevated Walk', detail:'1.5 hrs · Self-guided', price:0, tags:['walk','free','outdoor'] }
    ],
    recommendations: [
      { emoji:'🏨', name:'The Standard High Line', desc:'Chelsea · Design · 4★', chip:'AI Top Pick', chipClass:'chip-teal' },
      { emoji:'🍕', name:'Lucali', desc:'Best pizza in NYC · $$', chip:'Foodie Pick', chipClass:'chip-orange' },
      { emoji:'🎭', name:'Broadway District', desc:'42nd St · Theatre Row', chip:'Must See', chipClass:'chip-teal' }
    ],
    cardColorCSS: 'linear-gradient(135deg,#1a1a2e,#16213e)',
    skyColorCSS: 'linear-gradient(180deg,#37474F 0%,#546E7A 60%,#B0BEC5 100%)',
    oceanColorCSS: 'linear-gradient(180deg,#455A64 0%,#263238 100%)',
  },
  {
    tripType: 'city', destination: 'Lisbon', country: 'Portugal', region: 'Lisbon District',
    flag: '🇵🇹', emoji: '🏛️',
    keywords: ['europe','portugal','tile','fado','seafood','hills','trolley','castle','affordable','wine','culture'],
    whyMatchTemplate: "Lisbon offers pastel-tiled neighborhoods, affordable wine, iconic trams, and some of Europe's best seafood.",
    flightTimeLabel: '8h 30min', estimatedFlightCost: 520, estimatedHotelPerNight: 85,
    hotelName: 'Bairro Alto Hotel 4★', hotelType: 'Historic · Boutique',
    airline: 'TAP Air Portugal', flightCode: 'TP 204 · Nonstop',
    tempLabel: '66°F', weatherDesc: 'Mild and sunny', rating: 4.9, reviewCount: 32500,
    destinationTags: ['🌤️ 66°F','✈️ 8h 30min','🏰 Historic','🍷 Wine country'],
    allActivities: [
      { emoji:'🚋', name:'Tram 28 Heritage Ride', detail:'2 hrs · Through Alfama', price:5, tags:['culture','scenic'] },
      { emoji:'🏰', name:'São Jorge Castle Visit', detail:'Half day · City views', price:12, tags:['history','culture'] },
      { emoji:'🎶', name:'Fado Dinner Show', detail:'Evening · Traditional music + food', price:55, tags:['culture','music','food'] },
      { emoji:'🍷', name:'Port Wine Tasting', detail:'2 hrs · 6 varieties', price:40, tags:['wine','food'] },
      { emoji:'🦐', name:'Seafood Market Tour', detail:'Time Out Market · Self-guided', price:35, tags:['food','seafood'] },
      { emoji:'🏖️', name:'Cascais Day Trip', detail:'Full day · Coastal town', price:25, tags:['beach','scenic'] }
    ],
    recommendations: [
      { emoji:'🏨', name:'Bairro Alto Hotel', desc:'Historic · Boutique · 4★', chip:'AI Top Pick', chipClass:'chip-teal' },
      { emoji:'🍽️', name:'Cervejaria Ramiro', desc:'Legendary seafood · $$', chip:'Foodie Pick', chipClass:'chip-orange' },
      { emoji:'🎶', name:'Clube de Fado', desc:'Traditional Fado music', chip:'Must See', chipClass:'chip-teal' }
    ],
    cardColorCSS: 'linear-gradient(135deg,#d4a5a5,#b8860b)',
    skyColorCSS: 'linear-gradient(180deg,#42A5F5 0%,#90CAF9 60%,#E3F2FD 100%)',
    oceanColorCSS: 'linear-gradient(180deg,#1976D2 0%,#0D47A1 100%)',
  }
];
