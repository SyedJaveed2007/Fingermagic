# ✨ FingerMagic — AR Finger Canvas & Gesture Keyboard

<div align="center">

![FingerMagic Banner](https://img.shields.io/badge/FingerMagic-AR%20Web%20Experience-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PC9zdmc+)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![MediaPipe](https://img.shields.io/badge/MediaPipe-0097A7?style=for-the-badge&logo=google&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

**A browser-based Augmented Reality experience powered by your front camera.**  
Draw on screen with your fingers, type in mid-air with a gesture keyboard,  
launch colorful floating words and stunning visual effects — all in real time.

[🌐 Live Demo](#) · [🐛 Report Bug](#) · [💡 Request Feature](#)

</div>

---

## 📸 Overview

FingerMagic turns your browser into an interactive AR canvas. Using **Google MediaPipe** hand-tracking technology, it detects your hand and fingertip position in real time through your webcam — no plugins, no downloads, no hardware required.

- **Draw** freehand artwork using 6 unique brush styles
- **Type** with a mid-air gesture keyboard (hover + pinch)
- **Emit** colorful animated keyword bursts
- **Trigger** spectacular visual effects with one click
- **Save** your creations as PNG images

---

## 🌟 Features

### ✏️ Drawing Engine
| Brush Style | Description |
|-------------|-------------|
| **Smooth** | Clean, precise lines |
| **Neon** | Glowing lines with inner highlight |
| **Rainbow** | Hue-shifting multicolor strokes |
| **Glitter** | Sparkling particle spray |
| **Fire** | Warm radial flame bursts |
| **Galaxy** | Deep-space star trails |

### ⌨️ Gesture Keyboard
- Full QWERTY layout rendered in the browser
- Hover your index finger over a key to highlight it
- **Pinch** (thumb meets index finger) to press the key
- Each keypress emits a colorful floating letter
- Hit **✨ Emit Words** to launch all typed text into the air

### 🎨 Drawing Tools
- 🖌️ Adjustable **brush size** (2–40px)
- 💧 Adjustable **opacity** (10–100%)
- 🎨 **Color picker** + 6 quick-palette swatches
- ⭕ **Shape stamps** — Circle, Star, Heart, Arrow
- 🧹 **Eraser** mode with gesture control

### 🎆 Visual Effects Panel
| Effect | Description |
|--------|-------------|
| 🎊 **Confetti** | Multicolor confetti explosion |
| 🎇 **Fireworks** | Triple-burst particle fireworks |
| 🌟 **Star Shower** | Emoji stars raining from the top |
| 🟩 **Matrix Rain** | Green Katakana matrix overlay |
| 🫧 **Bubbles** | Floating iridescent bubbles |

### 📷 Camera & Tracking
- Uses front-facing (selfie) camera
- Real-time **hand skeleton overlay** with joints & connectors
- **Pinch detection** between thumb and index finger
- Mirrored video for natural selfie experience
- Graceful fallback to **mouse/touch** when no hand is detected

### 💾 Export
- **Save Drawing** — exports canvas as `fingermagic-drawing.png`
- **Screenshot** — merges live camera feed + drawing into one image

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **HTML5 Canvas** | Drawing layer + camera overlay |
| **Vanilla CSS** | Glassmorphism UI, animations, gradients |
| **Vanilla JavaScript** | Application logic, FX engine |
| **MediaPipe Hands** | Real-time hand landmark detection |
| **MediaPipe Camera Utils** | Webcam frame capture pipeline |
| **Google Fonts (Outfit)** | Premium typography |

> 🚫 No frameworks. No build tools. No dependencies to install. Pure web platform.

---

## 🚀 Getting Started

### Option 1 — Open Directly (quickest)
Just double-click `index.html` to open in your browser.  
> ⚠️ Camera may be restricted on `file://` — use Option 2 for full features.

### Option 2 — Local Server (recommended)

**If you have Node.js:**
```bash
npx serve .
# → Open http://localhost:3000
```

**If you have Python:**
```bash
python -m http.server 3000
# → Open http://localhost:3000
```

**Windows only (no installs):**
```powershell
# Run serve.ps1 included in this project
powershell -ExecutionPolicy Bypass -File serve.ps1
# → Opens http://localhost:3456 automatically
```

---

## ☁️ Deploy to Vercel

### Method A — Drag & Drop (No CLI, No Git)
1. Visit **[vercel.com/new](https://vercel.com/new)**
2. Sign up free (GitHub / Google)
3. Drag this project folder onto the page
4. Click **Deploy**
5. 🎉 Live at `https://finger-magic-xxxx.vercel.app`

### Method B — Vercel CLI
```bash
npm install -g vercel
vercel          # follow prompts
vercel --prod   # promote to production
```

### Method C — GitHub Auto-Deploy
```bash
git init && git add . && git commit -m "🎨 Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/finger-magic.git
git push -u origin main
# Then connect the repo on vercel.com/new
```
Every `git push` auto-deploys. ✅

> 📋 The included `vercel.json` automatically sets `Permissions-Policy: camera=(self)`  
> so camera access works on the live HTTPS domain.

---

## 📁 Project Structure

```
finger-magic/
│
├── index.html       ← App shell: splash screen + UI layout
├── style.css        ← Full design system (glassmorphism, animations)
├── app.js           ← Core logic: hand tracking, drawing, FX, keyboard
├── vercel.json      ← Vercel config: static deploy + camera headers
├── serve.ps1        ← Zero-install local server (Windows PowerShell)
└── README.md        ← You are here
```

---

## 🎮 How to Use

### Drawing with Hand
1. Open the app and click **"🎬 Launch Experience"**
2. Allow camera access when prompted
3. Hold your hand in front of the camera
4. **Pinch** your thumb and index finger together to start drawing
5. Release to stop

### Typing in Mid-Air
1. Click **⌨️** in the left tool panel to switch to Keyboard mode
2. Move your index finger over any key to highlight it
3. **Pinch** to press that key
4. Typed characters appear in the display bar
5. Click **✨ Emit Words** to launch them as floating art

### Switching Modes
Use the left panel Mode buttons:
- ✏️ **Draw** — finger drawing
- ⌨️ **Keyboard** — gesture typing
- 🧹 **Erase** — wipe strokes
- 📝 **Text** — pinch to pop random words

---

## 🔐 Privacy

- **No data is sent anywhere.** The camera feed is processed entirely in your browser.
- MediaPipe runs 100% client-side via WebAssembly.
- Nothing is recorded or stored.

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Camera not working | Click the camera icon in browser address bar → Allow |
| Hand not detected | Ensure good lighting; keep hand clearly visible |
| MediaPipe not loading | Check internet connection (CDN scripts load from jsdelivr.net) |
| Blank/black screen | Open DevTools (F12) → Console → check for errors |
| Slow performance | Close other tabs; use Chrome for best performance |

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙌 Acknowledgements

- [MediaPipe](https://mediapipe.dev/) by Google — hand landmark detection
- [Outfit Font](https://fonts.google.com/specimen/Outfit) — Google Fonts
- [Vercel](https://vercel.com) — free static hosting

---

<div align="center">
  Made with ✨ using pure HTML, CSS & JavaScript<br/>
  <strong>No frameworks. No limits. Just magic.</strong>
</div>
