# ✈️ VoyageAI — AI-Powered Travel Planning Website

A fully functional 6-page travel planning web app that generates personalized trips using real open-source AI — no API keys needed. Includes real Google OAuth integration, interactive maps, and a live cost breakdown manager.

![Status](https://img.shields.io/badge/status-working-brightgreen) ![AI](https://img.shields.io/badge/AI-open--source-blue) ![No Backend](https://img.shields.io/badge/backend-none-purple)

---

## 🚀 Quick Start (30 seconds)

### Mac / Linux
```bash
cd voyageai
./start.sh
```

### Windows
```cmd
cd voyageai
start.bat
```

### Manual (any OS with Python)
```bash
cd voyageai
python3 -m http.server 8080
```
Then open **http://localhost:8080**

> **Important:** Use a local server (not `file://` double-click) — the browser needs it for `fetch()` calls to the AI API and Google sign-in.

### Share on your local network
```bash
python3 -m http.server 8080 --bind 0.0.0.0
```
Then anyone on your WiFi can visit `http://YOUR_COMPUTER_IP:8080`

---

## 🧠 How the AI Works (The Big Question)

**VoyageAI uses [Pollinations.ai](https://pollinations.ai)** — a free, open-source, anonymous wrapper around large language models including OpenAI GPT-family and Mistral. **No API key. No signup. No cost.**

When you click "Generate My Vacation," here's what happens:

1. Your 4 inputs (from city, trip type, budget, special requests) get combined into a detailed prompt.
2. The prompt is sent to `text.pollinations.ai` via a POST request.
3. The AI reads it and returns a structured JSON with a specific destination, 6 activities, hotel, flights, etc.
4. If that fails (rate limit / network), the code tries 3 other endpoints/models automatically.
5. If ALL AI attempts fail, a local smart-matcher takes over — still uses your special-request text via keyword scoring.

The special-requests textarea is the most important input — the AI reads it **directly** and will pick a different destination entirely if you mention "I want to snorkel coral reefs" vs. "I want Broadway and street food."

**Rate limits:** Anonymous tier is 1 request every 15 seconds. If you hit it, wait a moment or the local fallback kicks in automatically.

---

## 🔐 Setting Up Google Sign-In (Real OAuth — Optional)

Google Sign-In is **real OAuth** using Google Identity Services — it truly authenticates users with their Google accounts. It's optional (email login works without it).

### 5-minute setup:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials → OAuth 2.0 Client ID**
3. If prompted, configure the OAuth consent screen first (any app name works)
4. Choose **Web application** as the type
5. Under **Authorized JavaScript origins**, add the URLs you'll use:
   - `http://localhost:8080`
   - `http://127.0.0.1:8080`
   - (Add any other ports/domains you plan to use)
6. Click **Create** — copy the Client ID (it looks like `1234-abc.apps.googleusercontent.com`)
7. In VoyageAI, go to **Account page → Google Sign-In** and paste the Client ID
8. Click **Save & Enable** — the real Google button appears on the login page!

Now you (or anyone) can click the Google button, sign in with their Google account, and their real name/email/photo will be used.

---

## 🗺️ Interactive Map

The map on the Results page uses **[Leaflet](https://leafletjs.com)** (free, open-source) with **OpenStreetMap** tiles — no API key or billing required, unlike Google Maps.

**Features:**
- Pan, zoom, drag with mouse/touch
- Two markers: blue for departure (🛫), orange for destination (🛬)
- Dashed flight-path line between them
- Click markers to see popups
- Auto-fits bounds to show both cities

Cities are geocoded via the free **Nominatim** API (OpenStreetMap's geocoder). The map loads every time you view a trip's results.

---

## 📄 Pages

| # | Page | Route | What's New |
|---|------|-------|------------|
| 1 | Login | `#login` | Real Google OAuth button, email login, validation |
| 2 | Sign Up | `#signup` | Password strength meter, terms, auto-login after |
| 3 | Trip Planner | `#planner` | Real AI generation — reads your text input |
| 4 | Results | `#results` | **Interactive Leaflet map**, dynamic AI content |
| 5 | Cost Breakdown | `#costs` | **Working toggles** with live recalculation |
| 6 | **Account (NEW)** | `#account` | Profile editing, Google setup, clear data |
| — | My Trips | `#mytrips` | Fixed: only saves the specific trip you click |

---

## ✨ What Got Fixed from v1

| Issue | Fix |
|-------|-----|
| Google button just skipped login | Now uses real Google Identity Services OAuth with JWT decoding. The official Google-rendered button appears once you add a Client ID. |
| Planner ignored textarea text | Special requests are now the **most-weighted** part of the AI prompt. Local fallback also scores destinations by matching keywords from your text. |
| No account page | New `/account` page with profile editor, Google OAuth setup wizard, data management |
| Map wasn't interactive | Replaced static visual with real **Leaflet + OpenStreetMap** — pannable, zoomable, real geocoding |
| Save Trip saved everything | Fixed: only saves the currently-viewed trip object (deduped by unique ID). Button now shows "✓ Saved" state. |
| Toggles didn't work | Rebuilt with proper event delegation + keyboard accessibility. Every toggle click updates the price instantly. |
| No live cost recalc | All toggles trigger `recalculate()` which updates: category totals, grand total, savings banner, over-budget warning, budget meter, horizontal bars |
| Hardcoded destination pool | Now uses **Pollinations.ai** (free, open-source AI) as the primary generator. Picks between OpenAI GPT and Mistral models automatically. |

---

## 🗂️ File Structure

```
voyageai/
├── index.html              ← Main app (6 pages as SPA)
├── css/
│   ├── base.css            ← Design tokens, shared components
│   └── pages.css           ← Page-specific styles
├── js/
│   ├── app.js              ← State, routing, AI engine, Google OAuth
│   └── pages.js            ← Page controllers (planner, results, costs, etc.)
├── start.sh                ← Mac/Linux launcher
├── start.bat               ← Windows launcher
└── README.md               ← This file
```

**Total:** ~3,000 lines of code, zero dependencies to install, runs fully in-browser.

---

## 🎨 Design System

- **Brand:** VoyageAI
- **Fonts:** Playfair Display (serif headings) + DM Sans (body)
- **Palette:** Coral orange `#ff6b35` · Teal `#00d4aa` · Navy `#0a0e1a` · Cream `#f8f6f1`
- **Mood:** Luxury-travel editorial — warm, confident, distinctive (no generic AI-slop aesthetics)

---

## 💡 Troubleshooting

**"AI is taking forever / returning nothing"**
Pollinations has a 15-second anonymous rate limit. Wait 20 seconds and try again, or the local matcher will take over after all AI attempts fail (~35s timeout).

**"Google button doesn't appear"**
You need to: (1) add your Client ID in Account settings, (2) add your current URL (`http://localhost:8080`) to the Authorized JavaScript origins in Google Cloud Console, (3) reload the page.

**"Map shows 'Map unavailable'"**
Usually a network hiccup with Nominatim geocoding. Try refreshing. If persistent, check that `unpkg.com` (Leaflet CDN) isn't blocked by your network.

**"Sign-in with email doesn't persist"**
VoyageAI uses `localStorage` — if you're in private/incognito mode, data is wiped when you close the tab. Use a normal browser window.

**"It works on localhost but not when I share my IP"**
For Google OAuth specifically, you must add your local IP (e.g. `http://192.168.1.42:8080`) to the Authorized JavaScript origins in Google Cloud Console. Map and AI will work on any URL.

---

## 🔒 Privacy

- **No server.** Everything runs in your browser.
- **Data stays local.** User info, trips, settings → `localStorage`. No analytics, no tracking.
- **AI calls.** Only your trip-planning inputs (from city, budget, special requests) are sent to Pollinations.ai. No personal info (name, email) leaves your browser.
- **Map calls.** City names are sent to OpenStreetMap for geocoding. No user info.
- **Google OAuth.** Standard Google sign-in — they see what you've approved. No third-party observes it.

---

## 📚 Credits & Tech

- **AI:** [Pollinations.ai](https://pollinations.ai) — open-source AI inference
- **Maps:** [Leaflet](https://leafletjs.com) + [OpenStreetMap](https://www.openstreetmap.org)
- **Geocoding:** [Nominatim](https://nominatim.org)
- **Auth:** [Google Identity Services](https://developers.google.com/identity)
- **Fonts:** Google Fonts (Playfair Display, DM Sans)

---

## 📝 License

Educational use — built as part of an Applications of AI course project at NC State.

Enjoy planning your next adventure with VoyageAI! ✈️🌍
