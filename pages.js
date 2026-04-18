'use strict';

/* ============================================================
   VoyageAI — Page Controllers
   ============================================================ */

/* ══════ AUTH — Login & Signup ══════ */
const PageAuth = {
  init() {
    this.bindLogin();
    this.bindSignup();
    this.bindTabSwitching();
    this.showSetupNoticeIfNeeded();
  },

  bindTabSwitching() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.target;
        if (target) VoyageAI.navigate(target);
      });
    });
  },

  // Show "Set up Google Sign-In" notice if no client ID configured
  showSetupNoticeIfNeeded() {
    const hasClientId = !!VoyageAI.settings.googleClientId;
    document.querySelectorAll('.google-setup-notice').forEach(el => {
      el.style.display = hasClientId ? 'none' : '';
    });
    // Also hide the GSI container if no client id
    document.querySelectorAll('.google-signin-slot').forEach(el => {
      el.style.display = hasClientId ? '' : 'none';
    });
  },

  bindLogin() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const pass  = document.getElementById('login-pass').value;
      if (!email || !pass) return toast('Please fill in all fields', 'error');
      if (!email.includes('@')) return toast('Please enter a valid email', 'error');
      const nameParts = email.split('@')[0].split('.');
      const user = {
        email, name: nameParts.map(n => n[0].toUpperCase() + n.slice(1)).join(' '),
        initials: (nameParts[0][0] + (nameParts[1]?.[0] || email[1] || '')).toUpperCase(),
        provider: 'email', joined: new Date().toISOString()
      };
      VoyageAI.saveUser(user);
      this.updateUserUI(user);
      toast('Welcome back! 👋', 'success');
      setTimeout(() => VoyageAI.navigate('planner'), 500);
    });

    document.getElementById('login-pass-toggle')?.addEventListener('click', () => {
      const input = document.getElementById('login-pass');
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  },

  bindSignup() {
    const form = document.getElementById('signup-form');
    if (!form) return;

    document.getElementById('signup-pass')?.addEventListener('input', function() {
      const val = this.value;
      let level = 0;
      if (val.length >= 6) level = 1;
      if (val.length >= 8 && /[A-Z]/.test(val)) level = 2;
      if (val.length >= 10 && /[A-Z]/.test(val) && /[0-9!@#$%]/.test(val)) level = 3;
      const segs = document.querySelectorAll('.strength-bar-seg');
      const classes = ['','weak','medium','strong'];
      const labels  = ['','Weak password','Medium — add symbols','Strong password ✓'];
      segs.forEach((s, i) => {
        s.classList.remove('weak','medium','strong');
        if (i < level) s.classList.add(classes[level]);
      });
      const txt = document.getElementById('strength-text');
      if (txt) { txt.textContent = val ? labels[level] : ''; txt.className = 'strength-text ' + (classes[level] || ''); }
    });

    document.getElementById('terms-box')?.addEventListener('click', () => {
      document.getElementById('terms-check').classList.toggle('checked');
    });

    document.getElementById('signup-pass-toggle')?.addEventListener('click', () => {
      const input = document.getElementById('signup-pass');
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const fname = document.getElementById('signup-fname').value.trim();
      const lname = document.getElementById('signup-lname').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const pass  = document.getElementById('signup-pass').value;
      const terms = document.getElementById('terms-check').classList.contains('checked');
      if (!fname || !email || !pass) return toast('Please fill in required fields', 'error');
      if (!email.includes('@')) return toast('Please enter a valid email', 'error');
      if (pass.length < 6) return toast('Password must be at least 6 characters', 'error');
      if (!terms) return toast('Please accept the Terms of Service', 'error');

      const user = {
        email, name: `${fname} ${lname}`.trim(),
        initials: (fname[0] + (lname[0] || '')).toUpperCase(),
        provider: 'email', joined: new Date().toISOString()
      };
      VoyageAI.saveUser(user);
      this.updateUserUI(user);
      toast(`Account created! Welcome, ${fname}! 🎉`, 'success');
      setTimeout(() => VoyageAI.navigate('planner'), 700);
    });
  },

  updateUserUI(user) {
    document.querySelectorAll('.user-avatar').forEach(el => {
      if (user.picture) {
        el.style.backgroundImage = `url(${user.picture})`;
        el.textContent = '';
      } else {
        el.style.backgroundImage = '';
        el.textContent = user.initials;
      }
    });
    document.querySelectorAll('.user-name').forEach(el =>
      el.textContent = user.name.split(' ')[0]
    );
  }
};


/* ══════ PLANNER ══════ */
const PagePlanner = {
  inited: false,

  init() {
    if (!this.inited) {
      this.bindTripTypes();
      this.bindBudget();
      this.bindFrom();
      this.bindSuggestionTags();
      this.bindExtrasTextarea();
      this.bindGenerate();
      this.inited = true;
    }
    this.restorePrefs();
    this.syncSummary();
  },

  restorePrefs() {
    const p = VoyageAI.tripPrefs;
    const fromEl = document.getElementById('from-input');
    if (fromEl && p.from) fromEl.value = p.from;
    const budgetEl = document.getElementById('budget-input');
    if (budgetEl && p.budget) budgetEl.value = p.budget;
    const extrasEl = document.getElementById('extras-textarea');
    if (extrasEl && p.extrasText) extrasEl.value = p.extrasText;
    document.querySelectorAll('.trip-type-card').forEach(c =>
      c.classList.toggle('selected', c.dataset.type === p.tripType)
    );
    document.querySelectorAll('.preset-pill').forEach(pill =>
      pill.classList.toggle('active', pill.dataset.val === p.budget)
    );
    document.querySelectorAll('.suggestion-tag').forEach(t =>
      t.classList.toggle('active', p.extras.includes(t.dataset.tag))
    );
  },

  bindTripTypes() {
    document.querySelectorAll('.trip-type-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.trip-type-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        VoyageAI.tripPrefs.tripType = card.dataset.type;
        this.syncSummary();
      });
    });
  },

  bindBudget() {
    document.querySelectorAll('.preset-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const budgetEl = document.getElementById('budget-input');
        if (budgetEl) {
          budgetEl.value = pill.dataset.val;
          VoyageAI.tripPrefs.budget = pill.dataset.val;
        }
        this.syncSummary();
      });
    });
    document.getElementById('budget-input')?.addEventListener('input', e => {
      VoyageAI.tripPrefs.budget = e.target.value;
      document.querySelectorAll('.preset-pill').forEach(p =>
        p.classList.toggle('active', p.dataset.val === e.target.value)
      );
      this.syncSummary();
    });
  },

  bindFrom() {
    document.getElementById('from-input')?.addEventListener('input', e => {
      VoyageAI.tripPrefs.from = e.target.value;
      this.syncSummary();
    });
  },

  bindSuggestionTags() {
    document.querySelectorAll('.suggestion-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const tagText = tag.dataset.tag;
        tag.classList.toggle('active');
        if (tag.classList.contains('active')) {
          if (!VoyageAI.tripPrefs.extras.includes(tagText)) VoyageAI.tripPrefs.extras.push(tagText);
        } else {
          VoyageAI.tripPrefs.extras = VoyageAI.tripPrefs.extras.filter(t => t !== tagText);
        }
        this.syncSummary();
      });
    });
  },

  bindExtrasTextarea() {
    const el = document.getElementById('extras-textarea');
    if (!el) return;
    el.addEventListener('input', e => {
      VoyageAI.tripPrefs.extrasText = e.target.value;
      this.syncSummary();
    });
  },

  syncSummary() {
    const p = VoyageAI.tripPrefs;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('summary-from', p.from || '—');
    set('summary-type', p.tripType ? ({ beach:'🏖️ Beach', mountains:'🏔️ Mountains', city:'🌆 City' }[p.tripType] || '—') : '—');
    set('summary-budget', p.budget ? `$${p.budget}` : '—');
    const extrasCount = p.extras.length + (p.extrasText?.trim() ? 1 : 0);
    set('summary-extras', extrasCount > 0 ? (p.extrasText?.trim() ? `${p.extras.length} tags + custom text` : `${p.extras.length} tags`) : '—');
  },

  bindGenerate() {
    document.getElementById('btn-generate')?.addEventListener('click', () => this.generate());
  },

  async generate() {
    const p = VoyageAI.tripPrefs;
    p.from       = document.getElementById('from-input')?.value.trim() || '';
    p.budget     = document.getElementById('budget-input')?.value.trim() || '';
    p.extrasText = document.getElementById('extras-textarea')?.value.trim() || '';
    if (!p.from)     return toast('Please enter your departure city', 'error');
    if (!p.tripType) return toast('Please select a trip type', 'error');
    if (!p.budget)   return toast('Please enter your budget', 'error');
    localStorage.setItem('vai_prefs', JSON.stringify(p));

    const btn = document.getElementById('btn-generate');
    btn.disabled = true;

    const overlay = document.getElementById('ai-loading-overlay');
    overlay.classList.remove('hidden');
    const msgEl = document.getElementById('ai-loading-msg');
    const messages = [
      'Reading your special requests…',
      'Calling the AI (free open-source model)…',
      'Searching for the perfect destination…',
      'Optimizing for your budget…',
      'Crafting personalized activities…',
      'Finalizing your trip…'
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (msgEl && i < messages.length) { msgEl.textContent = messages[i++]; }
    }, 700);

    try {
      const result = await VoyageAI.generateTrip(p);
      clearInterval(interval);
      if (!result) {
        overlay.classList.add('hidden');
        btn.disabled = false;
        return toast('Something went wrong. Please try again.', 'error');
      }

      const trip = {
        id: `trip_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        destination: result,
        prefs: { ...p },
        nights: 4,
        savedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        _source: result._source,
      };

      // Init cost breakdown items
      const activities = (result.activities || []).slice(0, 6);
      trip.costItems = [
        { id:'flight-out', cat:'flights', emoji:'🛫', name:`${result.airline} — Outbound`, detail:`${p.from} → ${result.destination} · Nonstop`, badge:'Best Value', badgeClass:'badge-green', price: Math.round((result.estimatedFlightCost || 200)/2), on: true },
        { id:'flight-ret', cat:'flights', emoji:'🛬', name:`${result.airline} — Return`, detail:`${result.destination} → ${p.from} · Nonstop`, badge:'Scheduled', badgeClass:'badge-blue', price: Math.round((result.estimatedFlightCost || 200)/2), on: true },
        { id:'hotel', cat:'hotel', emoji:'🏨', name: result.hotelName, detail:`${result.hotelType} · ${trip.nights} nights`, badge:'AI Top Pick', badgeClass:'badge-green', price: (result.estimatedHotelPerNight || 80) * trip.nights, on: true },
        ...activities.map((a, i) => ({
          id: 'act_' + i, cat: 'activities', emoji: a.emoji, name: a.name, detail: a.detail,
          badge: i < 3 ? 'Matches requests' : 'Popular', badgeClass: i < 3 ? 'badge-green' : 'badge-orange',
          price: a.price || 0, on: i < 4
        })),
        { id:'food', cat:'misc', emoji:'☕', name:'Food & Coffee (est.)', detail:`${trip.nights} days × ~$35/day`, badge:'', badgeClass:'', price: trip.nights * 35, on: true },
        { id:'trans', cat:'misc', emoji:'🚕', name:'Local Transport (est.)', detail:'Taxis and transfers', badge:'', badgeClass:'', price: 40, on: true }
      ];

      VoyageAI.currentTrip = trip;

      setTimeout(() => {
        overlay.classList.add('hidden');
        btn.disabled = false;
        const sourceLabel = result._source?.startsWith('ai-') ? '🤖 Generated by AI' :
                            '🎯 Smart-matched locally';
        toast(`✨ ${result.destination}! ${sourceLabel}`, 'success', 4500);
        VoyageAI.navigate('results');
      }, 500);
    } catch (err) {
      clearInterval(interval);
      overlay.classList.add('hidden');
      btn.disabled = false;
      console.error('Generation error:', err);
      toast(`Error: ${err.message}`, 'error', 5000);
    }
  }
};


/* ══════ RESULTS ══════ */
const PageResults = {
  mapInstance: null,
  mapMarkers: [],

  render(trip) {
    if (!trip) return;
    const d = trip.destination;

    // Hero
    this.setText('result-dest-name', d.destination || d.name);
    this.setText('result-dest-country', `${d.flag || ''} ${d.region || ''}${d.region ? ', ' : ''}${d.country || ''} · ${trip.nights + 1} Days`);
    this.setText('result-why', d.whyPerfect || '');
    this.setText('result-match', (d.matchScore || 90) + '%');
    this.setText('result-ai-badge',
      `✦ ${d._source?.startsWith('ai-') ? 'AI Generated' : 'Smart-Matched'} · ${({ beach:'Beach', mountains:'Mountains', city:'City' }[trip.prefs.tripType] || 'Trip')} · $${trip.prefs.budget} Budget`);

    const tagsEl = document.getElementById('result-dest-tags');
    if (tagsEl) {
      const tags = Array.isArray(d.destinationTags) ? d.destinationTags : [];
      tagsEl.innerHTML = tags.map(t => `<div class="dest-tag">${t}</div>`).join('');
    }

    // Illustration
    const illus = document.getElementById('dest-illustration');
    if (illus) {
      const sky = illus.querySelector('.illus-sky');
      const ocean = illus.querySelector('.illus-ocean');
      const emojiEl = illus.querySelector('.illus-emoji');
      const caption = illus.querySelector('.illus-caption');
      if (sky) sky.style.background = d.skyColorCSS || 'linear-gradient(180deg,#1a7ab0 0%,#4fb3d4 60%,#80cedc 100%)';
      if (ocean) ocean.style.background = d.oceanColorCSS || 'linear-gradient(180deg,#1e88b8 0%,#1565a0 100%)';
      if (emojiEl) emojiEl.textContent = d.emoji || '🏖️';
      if (caption) caption.textContent = `📸 ${d.destination || d.name}, ${d.country || ''}`;
    }

    // Info cards
    this.setText('ic-flight', `$${d.estimatedFlightCost || 0} r/t`);
    this.setText('ic-flight-sub', `${d.airline || ''} · ${d.flightCode || d.flightTimeLabel || ''}`);
    this.setText('ic-hotel', `$${d.estimatedHotelPerNight || 0}/night`);
    this.setText('ic-hotel-sub', d.hotelName || '');
    this.setText('ic-weather', d.tempLabel || '');
    this.setText('ic-weather-sub', d.weatherDesc || 'Typical for season');
    this.setText('ic-rating', `${d.rating || 4.5} / 5.0`);
    this.setText('ic-reviews', `Based on ${(d.reviewCount || 5000).toLocaleString()} reviews`);

    // Activities grid
    const grid = document.getElementById('activities-grid');
    if (grid) {
      const acts = Array.isArray(d.activities) ? d.activities : [];
      grid.innerHTML = acts.map((a, idx) => {
        const colors = ['rgba(13,110,253,0.15)','rgba(25,135,84,0.15)','rgba(220,53,69,0.15)','rgba(111,66,193,0.15)','rgba(253,126,20,0.15)','rgba(32,201,151,0.15)'];
        return `
          <div class="activity-card">
            <div class="activity-banner" style="background:${a.color || colors[idx % 6]}">${a.emoji || '🎯'}</div>
            <div class="activity-body">
              <div class="activity-name">${a.name}</div>
              <div class="activity-meta">${a.detail || ''}</div>
              <div class="activity-price">${a.price > 0 ? '$' + a.price + ' / person' : 'Free'}</div>
            </div>
          </div>`;
      }).join('');
    }

    // Budget donut
    const totalEstimate = (d.estimatedFlightCost || 0) + (d.estimatedHotelPerNight || 0) * trip.nights
                          + (d.activities || []).slice(0, 4).reduce((s, a) => s + (a.price || 0), 0) + trip.nights * 35 + 40;
    const budget = parseInt(trip.prefs.budget) || 1000;
    const pct = Math.min(Math.round((totalEstimate / budget) * 100), 100);
    const donut = document.getElementById('budget-donut');
    if (donut) donut.style.background = `conic-gradient(var(--orange) 0% ${pct}%, var(--cream-dark) ${pct}% 100%)`;
    this.setText('donut-pct', pct + '%');
    this.setText('budget-total-display', `$${totalEstimate}`);
    this.setText('budget-total-sub', `of $${budget} budget · $${budget - totalEstimate} ${budget-totalEstimate>=0?'left':'over'}`);

    // Budget breakdown
    const bkEl = document.getElementById('budget-breakdown');
    if (bkEl) {
      bkEl.innerHTML = [
        { dot:'#ff6b35', cat:'Flights', amt: d.estimatedFlightCost || 0 },
        { dot:'#4285F4', cat:`Hotel (${trip.nights} nts)`, amt: (d.estimatedHotelPerNight || 0) * trip.nights },
        { dot:'#00d4aa', cat:'Activities', amt: (d.activities || []).slice(0, 4).reduce((s, a) => s + (a.price || 0), 0) },
        { dot:'#ffd166', cat:'Food / Misc', amt: trip.nights * 35 + 40 }
      ].map(r => `
        <div class="budget-line">
          <div class="bl-cat"><div class="bl-dot" style="background:${r.dot}"></div>${r.cat}</div>
          <div class="bl-amt">$${r.amt}</div>
        </div>`).join('');
    }

    // Recommendations
    const recsEl = document.getElementById('recommendations-list');
    if (recsEl) {
      const recs = Array.isArray(d.recommendations) ? d.recommendations : [];
      recsEl.innerHTML = recs.map(r => `
        <div class="rec-row">
          <div class="rec-emoji">${r.emoji || '⭐'}</div>
          <div>
            <div class="rec-name">${r.name || ''}</div>
            <div class="rec-desc">${r.desc || ''}</div>
            <span class="rec-chip ${r.chipClass || 'chip-teal'}">${r.chip || 'Recommended'}</span>
          </div>
        </div>`).join('');
    }

    // Interactive Leaflet map
    this.renderMap(trip.prefs.from, d.destination + ', ' + (d.country || ''));

    // Update Save button state (based on whether THIS specific trip is already saved)
    this.updateSaveButton();

    // Bind action buttons (once only)
    this.bindActions();
  },

  updateSaveButton() {
    const btn = document.getElementById('btn-save-trip');
    if (!btn || !VoyageAI.currentTrip) return;
    const isSaved = VoyageAI.isTripSaved(VoyageAI.currentTrip.id);
    btn.dataset.saved = isSaved ? 'true' : 'false';
    btn.innerHTML = isSaved ? '✓ Saved to My Trips' : '💾 Save This Trip';
    btn.classList.toggle('btn-save-state', true);
  },

  bindActions() {
    const saveBtn = document.getElementById('btn-save-trip');
    if (saveBtn && !saveBtn.dataset.bound) {
      saveBtn.dataset.bound = '1';
      saveBtn.addEventListener('click', () => {
        if (!VoyageAI.currentTrip) return;
        // Fix: only save the exact current trip (deduped by ID internally)
        const wasSaved = VoyageAI.isTripSaved(VoyageAI.currentTrip.id);
        VoyageAI.saveCurrentTrip(VoyageAI.currentTrip);
        this.updateSaveButton();
        toast(wasSaved ? 'Trip updated ✓' : `Trip to ${VoyageAI.currentTrip.destination.destination} saved ✓`, 'success');
      });
    }

    const costsBtn = document.getElementById('btn-view-costs');
    if (costsBtn && !costsBtn.dataset.bound) {
      costsBtn.dataset.bound = '1';
      costsBtn.addEventListener('click', () => VoyageAI.navigate('costs'));
    }

    const regenBtn = document.getElementById('btn-regen');
    if (regenBtn && !regenBtn.dataset.bound) {
      regenBtn.dataset.bound = '1';
      regenBtn.addEventListener('click', async () => {
        VoyageAI.navigate('planner');
        setTimeout(() => PagePlanner.generate(), 100);
      });
    }
  },

  async renderMap(fromCity, destCity) {
    const container = document.getElementById('leaflet-map');
    if (!container) return;

    // Tear down previous instance
    if (this.mapInstance) {
      try { this.mapInstance.remove(); } catch (e) {}
      this.mapInstance = null;
      this.mapMarkers = [];
    }
    container.innerHTML = `<div class="leaflet-map-loading"><div class="spinner"></div><div>Loading interactive map…</div></div>`;

    if (!window.L) {
      container.innerHTML = `<div class="leaflet-map-loading"><div style="font-size:12px;color:var(--text-muted);font-weight:600">Map library unavailable</div></div>`;
      return;
    }

    try {
      // Geocode both cities via Nominatim (free OSM service)
      const [fromCoords, destCoords] = await Promise.all([
        this.geocode(fromCity),
        this.geocode(destCity)
      ]);

      container.innerHTML = '';
      const map = L.map(container, {
        zoomControl: true, scrollWheelZoom: true, dragging: true,
      });
      this.mapInstance = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '© OpenStreetMap'
      }).addTo(map);

      // Add markers
      if (fromCoords) {
        const blueIcon = L.divIcon({
          className: 'leaflet-marker-wrap',
          html: `<div class="leaflet-custom-marker blue"><span>🛫</span></div>`,
          iconSize: [28, 28], iconAnchor: [14, 28]
        });
        const m1 = L.marker(fromCoords, { icon: blueIcon })
          .addTo(map)
          .bindPopup(`<b>Departure</b><br>${fromCity}`);
        this.mapMarkers.push(m1);
      }
      if (destCoords) {
        const orangeIcon = L.divIcon({
          className: 'leaflet-marker-wrap',
          html: `<div class="leaflet-custom-marker"><span>🛬</span></div>`,
          iconSize: [28, 28], iconAnchor: [14, 28]
        });
        const m2 = L.marker(destCoords, { icon: orangeIcon })
          .addTo(map)
          .bindPopup(`<b>Destination</b><br>${destCity}`)
          .openPopup();
        this.mapMarkers.push(m2);
      }

      // Flight path + fit bounds
      if (fromCoords && destCoords) {
        L.polyline([fromCoords, destCoords], {
          color: '#ff6b35', weight: 3, dashArray: '8 6', opacity: 0.8
        }).addTo(map);
        map.fitBounds([fromCoords, destCoords], { padding: [40, 40] });
      } else if (destCoords) {
        map.setView(destCoords, 7);
      } else if (fromCoords) {
        map.setView(fromCoords, 5);
      } else {
        map.setView([30, 0], 2);
      }

      // Fix layout bug on SPAs
      setTimeout(() => map.invalidateSize(), 200);
    } catch (err) {
      console.error('Map error:', err);
      container.innerHTML = `<div class="leaflet-map-loading"><div style="font-size:12px;color:var(--text-muted);font-weight:600">Map unavailable — check your internet connection</div></div>`;
    }
  },

  async geocode(query) {
    if (!query) return null;
    try {
      const url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(query) + '&format=json&limit=1';
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (!data || !data.length) return null;
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    } catch (e) { return null; }
  },

  setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
};


/* ══════ COST BREAKDOWN ══════ */
const PageCosts = {
  render(trip) {
    if (!trip || !trip.costItems) return;
    const d = trip.destination;

    this.setText('costs-trip-ref', `${d.destination}, ${d.country} · ${trip.nights + 1} Days · 1 Traveler`);
    this.renderCategories();
    this.recalculate();
    this.bindExportButton();
  },

  renderCategories() {
    const trip = VoyageAI.currentTrip;
    if (!trip) return;
    const d = trip.destination;
    const items = trip.costItems;
    const activityCount = items.filter(i => i.cat === 'activities').length;

    const cats = [
      { id:'cat-flights',    label:'Flights',        subLabel:'1 roundtrip', iconBg:'rgba(255,107,53,0.12)', iconEmoji:'✈️', color:'var(--orange)', alt:`<div class="alt-row"><span class="alt-label">Cheaper Alt:</span><div class="alt-opt">Spirit · $${Math.round((d.estimatedFlightCost || 200)*0.45)} (1 stop)</div><div class="alt-opt">Frontier · $${Math.round((d.estimatedFlightCost || 200)*0.48)} (nonstop)</div></div>` },
      { id:'cat-hotel',      label:'Accommodation',  subLabel:`${trip.nights} nights`, iconBg:'rgba(66,133,244,0.12)', iconEmoji:'🏨', color:'var(--blue-accent)', alt:`<div class="alt-row"><span class="alt-label">Alternatives:</span><div class="alt-opt">AirBnB · $${Math.round((d.estimatedHotelPerNight || 80)*0.65*trip.nights)}</div><div class="alt-opt">Hostel · $${Math.round((d.estimatedHotelPerNight || 80)*0.3*trip.nights)}</div></div>` },
      { id:'cat-activities', label:'Activities',     subLabel:'', iconBg:'rgba(0,212,170,0.12)', iconEmoji:'🎉', color:'var(--teal-dark)', alt:'' },
      { id:'cat-misc',       label:'Food & Misc',    subLabel:'Estimated daily spend', iconBg:'rgba(255,209,102,0.25)', iconEmoji:'🍽️', color:'#c8920a', alt:'' }
    ];

    cats.forEach(cat => {
      const el = document.getElementById(cat.id);
      if (!el) return;
      const catKey = cat.id.replace('cat-', '');
      const catItems = items.filter(i => i.cat === catKey);

      el.querySelector('.cost-cat-name').textContent = cat.label;
      el.querySelector('.cost-cat-icon').style.background = cat.iconBg;
      el.querySelector('.cost-cat-icon').textContent = cat.iconEmoji;

      const subLabelEl = el.querySelector('.cost-cat-sub');
      if (catKey === 'activities') {
        const onCount = catItems.filter(i => i.on).length;
        subLabelEl.textContent = `${onCount} of ${activityCount} selected`;
      } else {
        subLabelEl.textContent = cat.subLabel;
      }

      const itemsContainer = el.querySelector('.items-container');
      if (!itemsContainer) return;
      itemsContainer.innerHTML = catItems.map(item => `
        <div class="cost-item ${item.on ? '' : 'off'}" data-item-id="${item.id}">
          <div class="toggle-switch ${item.on ? 'on' : ''}" data-toggle-id="${item.id}" role="switch" aria-checked="${item.on}" tabindex="0"></div>
          <div class="cost-item-emoji">${item.emoji}</div>
          <div class="cost-item-info">
            <div class="cost-item-name">${item.name}</div>
            <div class="cost-item-detail">${item.detail}</div>
            ${item.badge ? `<span class="cost-item-badge ${item.badgeClass}">${item.badge}</span>` : ''}
          </div>
          <div class="cost-item-price ${item.on ? '' : 'struck'}">${item.price === 0 ? 'Free' : '$' + item.price}</div>
        </div>
      `).join('') + (cat.alt || '');

      // Bind toggle click handlers — CRITICAL: proper event delegation
      itemsContainer.querySelectorAll('.toggle-switch').forEach(tog => {
        const handler = () => {
          const id = tog.dataset.toggleId;
          const item = items.find(i => i.id === id);
          if (!item) return;
          item.on = !item.on;
          // Update this specific toggle & item row immediately (faster than full re-render)
          tog.classList.toggle('on', item.on);
          tog.setAttribute('aria-checked', item.on);
          const row = tog.closest('.cost-item');
          if (row) row.classList.toggle('off', !item.on);
          const priceEl = row?.querySelector('.cost-item-price');
          if (priceEl) priceEl.classList.toggle('struck', !item.on);
          // Update category total (subLabel for activities, total in header)
          this.updateCategoryTotals();
          this.recalculate();
        };
        tog.addEventListener('click', handler);
        tog.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handler(); }
        });
      });
    });

    this.updateCategoryTotals();
  },

  updateCategoryTotals() {
    const items = VoyageAI.currentTrip?.costItems || [];
    const activityCount = items.filter(i => i.cat === 'activities').length;
    ['flights','hotel','activities','misc'].forEach(catKey => {
      const el = document.getElementById('cat-' + catKey);
      if (!el) return;
      const catItems = items.filter(i => i.cat === catKey);
      const total = catItems.filter(i => i.on).reduce((s, i) => s + i.price, 0);
      const color = { flights:'var(--orange)', hotel:'var(--blue-accent)', activities:'var(--teal-dark)', misc:'#c8920a' }[catKey];
      const totalEl = el.querySelector('.cost-cat-total');
      if (totalEl) {
        totalEl.textContent = `$${total}`;
        totalEl.style.color = color;
      }
      if (catKey === 'activities') {
        const onCount = catItems.filter(i => i.on).length;
        el.querySelector('.cost-cat-sub').textContent = `${onCount} of ${activityCount} selected`;
      }
    });
  },

  // ── LIVE RECALCULATION — called on every toggle ──
  recalculate() {
    const trip = VoyageAI.currentTrip;
    if (!trip) return;
    const items = trip.costItems;
    const on = items.filter(i => i.on).reduce((s, i) => s + i.price, 0);
    const off = items.filter(i => !i.on).reduce((s, i) => s + i.price, 0);
    const budget = parseInt(trip.prefs.budget) || 1000;
    const remaining = budget - on;
    const overBudget = remaining < 0;

    // Side totals
    this.setText('costs-total-display', `$${on}`);
    this.setText('costs-savings', off > 0 ? `-$${off} off` : '$0');
    this.setText('costs-grand-total', `$${on}`);
    const grandEl = document.getElementById('costs-grand-total');
    if (grandEl) grandEl.classList.toggle('over', overBudget);

    // Header stats
    this.setText('ch-total', `$${on}`);
    const chUnder = document.getElementById('ch-under');
    if (chUnder) {
      chUnder.textContent = overBudget ? `$${Math.abs(remaining)} OVER` : `$${remaining}`;
      chUnder.classList.toggle('over-budget', overBudget);
    }
    this.setText('ch-count', items.filter(i => i.on).length + '');

    // Banners
    const savingsBanner = document.getElementById('savings-banner');
    const overBanner = document.getElementById('over-banner');
    const removedCount = items.filter(i => !i.on).length;
    if (savingsBanner && overBanner) {
      if (overBudget) {
        savingsBanner.classList.add('hidden');
        overBanner.classList.remove('hidden');
        overBanner.querySelector('.savings-text').textContent = `You're $${Math.abs(remaining)} over budget — try removing some items.`;
      } else if (off > 0) {
        savingsBanner.classList.remove('hidden');
        overBanner.classList.add('hidden');
        savingsBanner.querySelector('.savings-text').textContent = `You saved $${off} by removing ${removedCount} item${removedCount === 1 ? '' : 's'}! $${remaining} under budget.`;
      } else {
        savingsBanner.classList.add('hidden');
        overBanner.classList.add('hidden');
      }
    }

    // Meter
    const pct = Math.min(Math.round((on / budget) * 100), 100);
    const meterFill = document.getElementById('meter-fill');
    if (meterFill) {
      meterFill.style.width = pct + '%';
      meterFill.classList.toggle('over', overBudget);
    }
    this.setText('meter-label-used', `$${on} / $${budget}`);

    // Horizontal bars
    const barsEl = document.getElementById('cost-bars');
    if (barsEl) {
      const cats = [
        { key:'flights',    label:'✈️ Flights',     color:'#ff6b35' },
        { key:'hotel',      label:'🏨 Hotel',       color:'#4285F4' },
        { key:'activities', label:'🎉 Activities',  color:'#00d4aa' },
        { key:'misc',       label:'🍽️ Food / Misc', color:'#ffd166' }
      ];
      const total = on || 1;
      barsEl.innerHTML = cats.map(cat => {
        const amt = items.filter(i => i.cat === cat.key && i.on).reduce((s, i) => s + i.price, 0);
        const pct = Math.round((amt/total)*100);
        return `
          <div class="bar-chart-row">
            <div class="bar-row-top"><div class="bar-cat">${cat.label}</div><div class="bar-amt">$${amt}</div></div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${cat.color}"></div></div>
          </div>`;
      }).join('');
    }

    // Keep currentTrip in sync so save reflects current state
    if (VoyageAI.isTripSaved(trip.id)) {
      VoyageAI.saveCurrentTrip(trip);
    }
  },

  bindExportButton() {
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn && !exportBtn.dataset.bound) {
      exportBtn.dataset.bound = '1';
      exportBtn.addEventListener('click', () => {
        const trip = VoyageAI.currentTrip;
        if (!trip) return;
        const items = trip.costItems;
        let text = `VoyageAI Itinerary — ${trip.destination.destination}\n`;
        text += '='.repeat(40) + '\n\n';
        text += `Destination: ${trip.destination.destination}, ${trip.destination.country}\n`;
        text += `Duration: ${trip.nights + 1} days\n`;
        text += `Budget: $${trip.prefs.budget}\n\n`;
        ['flights','hotel','activities','misc'].forEach(cat => {
          const catItems = items.filter(i => i.cat === cat && i.on);
          if (catItems.length === 0) return;
          text += `${cat.toUpperCase()}:\n`;
          catItems.forEach(i => text += `  - ${i.name}: $${i.price}\n`);
          text += '\n';
        });
        const total = items.filter(i => i.on).reduce((s,i) => s + i.price, 0);
        text += `TOTAL: $${total}\n`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VoyageAI-${trip.destination.destination}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Itinerary exported!', 'success');
      });
    }
    const bookBtn = document.getElementById('btn-book-now');
    if (bookBtn && !bookBtn.dataset.bound) {
      bookBtn.dataset.bound = '1';
      bookBtn.addEventListener('click', () => {
        toast('Booking partner redirect (Demo mode)', 'info');
      });
    }
  },

  setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
};


/* ══════ MY TRIPS ══════ */
const PageMyTrips = {
  render() {
    const grid = document.getElementById('trips-grid');
    if (!grid) return;
    if (VoyageAI.savedTrips.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">✈️</div>
          <h3>No saved trips yet</h3>
          <p style="margin-bottom:20px">Plan your first trip with VoyageAI</p>
          <button class="btn btn-primary" onclick="VoyageAI.navigate('planner')">Start Planning</button>
        </div>
      `;
      return;
    }
    grid.innerHTML = VoyageAI.savedTrips.map(trip => {
      const d = trip.destination;
      return `
        <div class="trip-card" data-trip-id="${trip.id}">
          <div class="trip-card-banner" style="background:${d.cardColorCSS || 'linear-gradient(135deg,#0d1b4b,#1a3a6b)'}">${d.emoji || '✈️'}
            <button class="trip-card-delete" data-del="${trip.id}">✕</button>
          </div>
          <div class="trip-card-body">
            <div class="trip-card-name">${d.destination || d.name}</div>
            <div class="trip-card-meta">${d.country || ''} · ${(trip.nights || 4) + 1} days · ${new Date(trip.savedAt).toLocaleDateString()}</div>
            <div class="trip-card-price">$${trip.costItems?.filter(i=>i.on).reduce((s,i)=>s+i.price,0) || 0} estimated</div>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.trip-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.dataset.del) return;
        const tripId = card.dataset.tripId;
        const trip = VoyageAI.savedTrips.find(t => t.id === tripId);
        if (trip) {
          VoyageAI.currentTrip = trip;
          VoyageAI.navigate('results');
        }
      });
    });
    grid.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Delete this trip?')) return;
        VoyageAI.deleteTrip(btn.dataset.del);
        toast('Trip deleted', 'info');
        this.render();
      });
    });
  }
};


/* ══════ ACCOUNT PAGE ══════ */
const PageAccount = {
  render() {
    const u = VoyageAI.user;
    if (!u) return;

    // Avatar
    const avatar = document.getElementById('account-avatar');
    if (avatar) {
      if (u.picture) {
        avatar.style.backgroundImage = `url(${u.picture})`;
        avatar.textContent = '';
      } else {
        avatar.style.backgroundImage = '';
        avatar.textContent = u.initials;
      }
    }

    // Info
    this.setText('account-name', u.name);
    this.setText('account-email', u.email);
    const joined = u.joined ? new Date(u.joined).toLocaleDateString(undefined, { month:'long', year:'numeric' }) : '';
    this.setText('account-joined', 'Joined ' + joined);
    this.setText('account-trips-count', VoyageAI.savedTrips.length + '');
    this.setText('account-provider', u.provider === 'google' ? '🌐 Google Account' : '✉️ Email Account');

    // Profile form
    document.getElementById('profile-name').value = u.name || '';
    document.getElementById('profile-email').value = u.email || '';

    // Google Client ID
    document.getElementById('google-client-id-input').value = VoyageAI.settings.googleClientId || '';
    const googleStatus = document.getElementById('google-status');
    if (googleStatus) {
      googleStatus.innerHTML = VoyageAI.settings.googleClientId
        ? '<span class="account-status-ok">● Google Sign-In Active</span>'
        : '<span class="account-status-warn">● Not configured</span>';
    }

    // Bind handlers once
    this.bindProfileSave();
    this.bindGoogleSetup();
    this.bindLogoutBtn();
    this.bindClearData();
  },

  bindProfileSave() {
    const btn = document.getElementById('save-profile-btn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const name = document.getElementById('profile-name').value.trim();
      const email = document.getElementById('profile-email').value.trim();
      if (!name || !email) return toast('Name and email required', 'error');
      if (!email.includes('@')) return toast('Invalid email', 'error');
      const nameParts = name.split(' ');
      VoyageAI.updateUser({
        name, email,
        initials: (nameParts[0]?.[0] || '') + (nameParts[1]?.[0] || '')
      });
      PageAuth.updateUserUI(VoyageAI.user);
      this.render();
      toast('Profile updated ✓', 'success');
    });
  },

  bindGoogleSetup() {
    const btn = document.getElementById('save-google-btn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const clientId = document.getElementById('google-client-id-input').value.trim();
      VoyageAI.saveSettings({ googleClientId: clientId });
      if (clientId) {
        VoyageAI.initGoogleAuth();
        toast('Google Sign-In configured ✓', 'success');
      } else {
        toast('Google Sign-In disabled', 'info');
      }
      this.render();
    });
  },

  bindLogoutBtn() {
    const btn = document.getElementById('account-logout-btn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => VoyageAI.logout());
  },

  bindClearData() {
    const btn = document.getElementById('clear-data-btn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      if (!confirm('Delete ALL your data including saved trips, preferences, and settings? This cannot be undone.')) return;
      localStorage.clear();
      toast('All data cleared', 'info');
      setTimeout(() => location.reload(), 800);
    });
  },

  setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
};


/* ══════ Boot ══════ */
document.addEventListener('DOMContentLoaded', () => {
  VoyageAI.init();
  PageAuth.init();
  if (VoyageAI.user) PageAuth.updateUserUI(VoyageAI.user);
});
