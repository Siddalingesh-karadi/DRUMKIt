# ⌨️ TypeSpeak — Keyboard Sound & TTS Studio

> **Live Demo → [texttreader.netlify.app](https://texttreader.netlify.app/)**

An interactive, browser-based studio that combines a **visual mechanical keyboard** with a full-featured **Text-to-Speech (TTS)** engine — built with pure **HTML, CSS & JavaScript** (no frameworks, no dependencies, no audio files).

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎹 Visual Keyboard | Full QWERTY keyboard UI (including function keys & arrow keys) that lights up in sync with every keystroke |
| 🗣️ Text-to-Speech | Press **Ctrl + Enter** to speak the current line, selected text, or the entire document |
| ⏸️ Stop & Resume | Stop speech mid-sentence and resume exactly from where you left off |
| 🔁 Speak All | Dedicated "Speak All" button to read the entire text in one go |
| 🎵 Voice Selector | Choose between **Default**, **Male**, and **Female** voices (uses browser-native voices) |
| ⚡ Speed Control | YouTube-style playback speed dropdown — from **0.5x** up to **4x** |
| 📜 Spoken History | All spoken lines are logged with timestamps; click any entry to replay it |
| 🗑️ Per-Item Delete | Individual delete button on each history item with a smooth fade-out animation |
| 📊 Live Word & Char Count | Real-time word and character count badges in the editor header |
| 🌑 Dark Glassmorphic UI | Deep dark theme with cyan/purple accent gradients and glassmorphism header |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `Enter` | New line in the editor |
| `Ctrl + Enter` | **Speak** the current line / selected text → **Stop** if speaking → **Resume** from pause |
| Any typed key | Lights up & animates the matching key on the visual keyboard |
| Click a visual key | Inserts the character into the editor and animates the key |

---

## 🖥️ UI Panels

### 📝 Text Editor
- Monospace (`JetBrains Mono`) textarea with a glowing cyan caret
- Live word & character count
- **Speak All**, **Toggle Keyboard**, and **Clear** action buttons
- Speaking status bar with an animated green waveform while TTS is active
- Glowing border animation (`glow-pulse`) when speech is in progress

### 🎹 Visual Keyboard
- Full QWERTY layout: Esc, F1–F12, number row, letter rows, modifier keys, space bar, arrow keys
- Keys animate with a cyan glow + press-down effect on every real or virtual keypress
- Enter key turns **green** while TTS is speaking
- Toggle show/hide via the 🎹 Keyboard button

### 📜 Spoken History
- Last 50 spoken lines are stored (newest first)
- Each item shows the text, a timestamp, and a delete button
- Click the 🔊 icon or text to replay any line

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Structure | **HTML5** — semantic, accessible markup |
| Styling | **CSS3** — CSS variables, dark glassmorphic design, responsive grid, micro-animations |
| TTS Engine | **Web Speech API** (`SpeechSynthesis`) — no external API or internet needed for speech |
| Fonts | **JetBrains Mono** (editor/code) + **Outfit** (UI) via Google Fonts |
| Hosting | **Netlify** — continuous deployment from GitHub |

> 💡 No audio files. No npm. No build step. Just open `index.html`.

---

## 🚀 Getting Started

### Run Locally
Simply open `index.html` in any modern browser — no server required.

```bash
# Clone the repo
git clone https://github.com/<your-username>/Textreader.git

# Open directly
start index.html    # Windows
open index.html     # macOS
```

### Or visit the live site
🌐 **[texttreader.netlify.app](https://texttreader.netlify.app/)**

---

## 📁 Project Structure

```
Textreader/
├── index.html      # App shell — header, editor, keyboard, history panels
├── index.js        # All logic — TTS engine, keyboard events, history, UI helpers
├── styles.css      # Full design system — variables, components, animations
└── README.md
```

---

## 🗂️ JavaScript Architecture

The `index.js` is organized into clearly separated sections:

1. **Character Pronunciation Map** — Converts symbols/numbers to readable names for TTS
2. **TTS Engine** — `speakText()`, `speakRaw()`, `stopSpeaking()` with resume-from-position support
3. **Speed Control** — YouTube-style dropdown to change playback rate mid-speech
4. **Speak / Stop / Resume** — Smart `Ctrl+Enter` handler: speak → stop (save position) → resume
5. **UI Helpers** — Speaking status bar, wave animation, key highlight, word/char counters
6. **History** — Add, replay, delete, and cap at 50 entries
7. **Keyboard Event Handler** — Routes `Enter`, `Ctrl+Enter`, and all other keys
8. **Visual Keyboard Sync** — Animates keyboard keys on real keydown events
9. **Button Controls** — Speak All, Clear, Stop, Clear History
10. **Visual Keyboard Click** — Inserts characters via on-screen key clicks
11. **Init** — Focuses textarea, loads voices, sets default speed

---

## 🌐 Browser Compatibility

| Browser | TTS Support | Keyboard Visual |
|---|---|---|
| Chrome / Edge | ✅ Full | ✅ Full |
| Firefox | ✅ Full | ✅ Full |
| Safari | ✅ Full | ✅ Full |
| Mobile Chrome | ⚠️ Limited (OS-dependent voices) | ✅ Full |

> Speech synthesis behavior and available voices vary by OS and browser.

---

## ❤️ From PESITM
