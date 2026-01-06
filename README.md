
# NOVELOS 

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-7.1.3-green.svg)
![Status](https://img.shields.io/badge/status-stable-success.svg)

**Novelos** redefines digital storytelling by fusing a distraction-free, horizontal "infinite spread" interface with a deeply integrated, context-aware AI engine.

### 🌟 Version 7.1.3 New Features
*   **Android Build:** Official support for mobile drafting via Capacitor.
*   **Performance:** Optimized editor memory usage for large manuscripts.
*   **Cross-Platform Sync:** Improved ZIP snapshot reliability between Noveli and Novelos.

---

## 🌟 Key Features

### 1. Hybrid Architecture
*   **Novelos Desktop:** The full "Command Center" for outlining, world-building, and drafting.
*   **Noveli (Portable):** Generates a single-file, offline HTML word processor (`Noveli.html`).
*   **Novelos Mobile:** Android APK for writing on tablets and phones.

### 2. Manuscript Mode
*   **Distraction-Free:** Horizontal "Infinite Spread" layout that mimics a book.
*   **Smart Tools:** Text-to-Speech with neural voices, typewriter sound engine.

### 3. Assembly Mode (The Structural Engine)
*   **Chapter Board:** Kanban-style outlining with a "Pacing Heatmap".
*   **Character Cast:** AI-generated profiles and photorealistic headshots.
*   **World Building Crucible:** Distill notes into a structured Codex.

---

## 🚀 Build Instructions

### Desktop (Windows/Mac/Linux)
```bash
npm install
npm run electron:build
```

### Android
```bash
npm install
npx cap add android
npm run mobile:build
```
