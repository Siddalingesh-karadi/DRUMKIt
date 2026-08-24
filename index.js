/* ===================================================
   TypeSpeak – Main JavaScript
   TTS Studio
   =================================================== */

'use strict';

// ──────────────────────────────────────────────────────
// 1. CHARACTER PRONUNCIATION MAP
//    Used when text is a single character with no 
//    natural meaning — says the character name instead.
// ──────────────────────────────────────────────────────

const CHAR_NAMES = {
  'a':'ay', 'b':'bee', 'c':'see', 'd':'dee', 'e':'ee', 'f':'ef',
  'g':'gee', 'h':'aitch', 'i':'eye', 'j':'jay', 'k':'kay', 'l':'el',
  'm':'em', 'n':'en', 'o':'oh', 'p':'pee', 'q':'cue', 'r':'ar',
  's':'ess', 't':'tee', 'u':'you', 'v':'vee', 'w':'double-you',
  'x':'ex', 'y':'why', 'z':'zee',
  '0':'zero','1':'one','2':'two','3':'three','4':'four',
  '5':'five','6':'six','7':'seven','8':'eight','9':'nine',
  ' ':'space', '.':'dot', ',':'comma', '!':'exclamation mark',
  '?':'question mark', ':':'colon', ';':'semicolon', '-':'dash',
  '_':'underscore', '@':'at', '#':'hash', '$':'dollar', '%':'percent',
  '&':'and', '*':'asterisk', '(':'open paren', ')':'close paren',
  '+':'plus', '=':'equals', '/':'slash', '\\':'backslash',
  '<':'less than', '>':'greater than', '"':'quote', "'":"apostrophe",
  '`':'backtick', '~':'tilde', '^':'caret', '{':'open brace',
  '}':'close brace', '[':'open bracket', ']':'close bracket', '|':'pipe'
};

/**
 * Convert text to what should actually be spoken.
 * - Single chars → pronounce the character name
 * - Short all-non-letter strings → spell out each character
 * - Otherwise → pass through as-is for normal TTS
 */
function prepareTextForSpeech(text) {
  const t = text.trim();
  if (!t) return '';

  // Single character
  if (t.length === 1) {
    return CHAR_NAMES[t.toLowerCase()] || t;
  }

  // If every character is a non-letter (symbols/numbers only), spell it out
  if (/^[^a-zA-Z]+$/.test(t) && t.length <= 6) {
    return t.split('').map(ch => CHAR_NAMES[ch.toLowerCase()] || ch).join(', ');
  }

  return t;
}

// ──────────────────────────────────────────────────────
// 2. TEXT-TO-SPEECH ENGINE
// ──────────────────────────────────────────────────────

const synth = window.speechSynthesis;
let voices = [];
let currentVoiceType = 'default';
let currentUtterance = null;
let isSpeaking = false;

// Resume-from-stop state
let pausedText = null;      // the full original text being spoken
let pausedCharIndex = 0;    // last word-boundary char index tracked via onboundary

function pickVoice(type) {
  const all = synth.getVoices();
  if (!all.length) return null;
  const enVoices = all.filter(v => v.lang.startsWith('en'));
  const base = enVoices.length ? enVoices : all;
  switch (type) {
    case 'male':
      return base.find(v => /david|james|daniel|male|guy|fred|bruce/i.test(v.name))
          || base.find(v => v.lang === 'en-US') || base[0];
    case 'female':
      return base.find(v => /zira|samantha|victoria|karen|moira|fiona|google uk english female|female/i.test(v.name))
          || base.find(v => /google/i.test(v.name)) || base[0];
    default:
      return base.find(v => /google us english/i.test(v.name))
          || base.find(v => v.lang === 'en-US' && v.default)
          || base.find(v => v.lang === 'en-US') || base[0];
  }
}

function loadVoices() { voices = synth.getVoices(); }
synth.addEventListener('voiceschanged', loadVoices);
loadVoices();

// ──────────────────────────────────────────────────────
// 3. SPEED CONTROL — dropdown popup
// ──────────────────────────────────────────────────────

let currentRate = 1.0;

const speedDisplay = document.getElementById('speed-display');
const speedDropdown = document.getElementById('speed-dropdown');

function setRate(val) {
  currentRate = val;
  const label = val === 1 ? 'Normal' : val + 'x';
  speedDisplay.childNodes[0].textContent = label + ' ';
  // Mark active option
  document.querySelectorAll('.speed-option').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.dataset.speed) === val);
  });
  // If currently speaking → stop and resume from current position with new rate
  if (isSpeaking && pausedText) {
    const resumeFrom = pausedText.substring(pausedCharIndex).trim();
    stopSpeaking(false); // stop without clearing paused state
    if (resumeFrom.length > 0) speakRaw(resumeFrom);
  }
}

// Toggle dropdown on speed display click
speedDisplay.addEventListener('click', (e) => {
  e.stopPropagation();
  speedDropdown.classList.toggle('open');
});

// Select a speed option
speedDropdown.addEventListener('click', (e) => {
  const opt = e.target.closest('.speed-option');
  if (!opt) return;
  setRate(parseFloat(opt.dataset.speed));
  speedDropdown.classList.remove('open');
  textarea.focus();
});

// Close dropdown when clicking anywhere else
document.addEventListener('click', () => {
  speedDropdown.classList.remove('open');
});

// ──────────────────────────────────────────────────────
// 4. SPEAK / STOP / RESUME
// ──────────────────────────────────────────────────────

/**
 * Internal: speak raw pre-processed text (no char name conversion).
 * Used for resume, where we already have processed text.
 */
function speakRaw(text) {
  if (!text || text.trim().length === 0) return;
  if (synth.speaking) synth.cancel();

  const chosenVoice = pickVoice(currentVoiceType);
  const utterance = new SpeechSynthesisUtterance(text.trim());
  if (chosenVoice) utterance.voice = chosenVoice;
  utterance.rate = currentRate;
  utterance.pitch = 1;
  utterance.volume = 1;

  currentUtterance = utterance;
  pausedText = text.trim();
  pausedCharIndex = 0;

  utterance.onboundary = (e) => {
    if (e.name === 'word') pausedCharIndex = e.charIndex;
  };

  utterance.onstart = () => {
    isSpeaking = true;
    showSpeakStatus(text.trim());
    highlightEnterKey(true);
  };

  utterance.onend = () => {
    isSpeaking = false;
    currentUtterance = null;
    pausedText = null;
    pausedCharIndex = 0;
    hideSpeakStatus();
    highlightEnterKey(false);
    addToHistory(text.trim());
  };

  utterance.onerror = (e) => {
    if (e.error === 'interrupted') return; // intentional cancel, don't clear paused state
    isSpeaking = false;
    currentUtterance = null;
    pausedText = null;
    pausedCharIndex = 0;
    hideSpeakStatus();
    highlightEnterKey(false);
    console.warn('Speech error:', e.error);
  };

  synth.speak(utterance);
}

/**
 * Public: speak text, applying character name conversion first.
 * Clears any paused/resume state.
 */
function speakText(text) {
  if (!text || text.trim().length === 0) return;
  pausedText = null;
  pausedCharIndex = 0;
  const processed = prepareTextForSpeech(text);
  speakRaw(processed);
}

/**
 * Stop speaking.
 * @param {boolean} savePosition – if true, saves position for resume
 */
function stopSpeaking(savePosition = false) {
  if (!savePosition) {
    pausedText = null;
    pausedCharIndex = 0;
  }
  // If saving: pausedText + pausedCharIndex are already up to date
  if (synth.speaking) synth.cancel();
  isSpeaking = false;
  currentUtterance = null;
  hideSpeakStatus();
  highlightEnterKey(false);
}

// ──────────────────────────────────────────────────────
// 5. UI HELPERS
// ──────────────────────────────────────────────────────

const speakStatus = document.getElementById('speak-status');
const speakTextDisplay = document.getElementById('speak-text-display');

function showSpeakStatus(text) {
  speakTextDisplay.textContent = text;
  speakStatus.classList.add('active');
  document.querySelector('.editor-panel').classList.add('speaking-border');
}

function hideSpeakStatus() {
  speakStatus.classList.remove('active');
  document.querySelector('.editor-panel').classList.remove('speaking-border');
  speakTextDisplay.textContent = '';
}

function highlightEnterKey(active) {
  const enterKey = document.getElementById('key-enter');
  if (!enterKey) return;
  if (active) enterKey.classList.add('speaking');
  else enterKey.classList.remove('speaking');
}

function animateKey(keyValue) {
  const normalized = keyValue.length === 1 ? keyValue.toLowerCase() : keyValue;
  const keyEls = document.querySelectorAll(`[data-key="${CSS.escape(normalized)}"]`);
  keyEls.forEach(el => {
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 130);
  });
}

function updateCounts(text) {
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const chars = text.length;
  document.getElementById('word-count').textContent = `${words} word${words !== 1 ? 's' : ''}`;
  document.getElementById('char-count').textContent = `${chars} char${chars !== 1 ? 's' : ''}`;
}

// ──────────────────────────────────────────────────────
// 6. HISTORY (with per-item delete)
// ──────────────────────────────────────────────────────

const historyList = document.getElementById('history-list');

function addToHistory(text) {
  const emptyItem = historyList.querySelector('.history-empty');
  if (emptyItem) emptyItem.remove();

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const li = document.createElement('li');
  li.className = 'history-item';
  li.innerHTML = `
    <span class="hi-icon">🔊</span>
    <span class="hi-text">${escapeHtml(text)}</span>
    <span class="hi-time">${timeStr}</span>
    <button class="hi-delete" title="Delete" aria-label="Delete">✕</button>
  `;

  li.querySelector('.hi-text').addEventListener('click', () => speakText(text));
  li.querySelector('.hi-icon').addEventListener('click', () => speakText(text));
  li.querySelector('.hi-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    li.style.animation = 'fade-out 0.2s ease forwards';
    setTimeout(() => {
      li.remove();
      if (historyList.children.length === 0) {
        historyList.innerHTML = '<li class="history-empty">Spoken lines will appear here…</li>';
      }
    }, 200);
  });

  historyList.insertBefore(li, historyList.firstChild);
  while (historyList.children.length > 50) historyList.removeChild(historyList.lastChild);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ──────────────────────────────────────────────────────
// 7. MAIN KEYBOARD EVENT HANDLER
// ──────────────────────────────────────────────────────

const textarea = document.getElementById('text-input');

textarea.addEventListener('keydown', function (e) {
  const key = e.key;

  // ─── Enter → new line ──────────────────────────────
  if (key === 'Enter' && !e.ctrlKey) {
    animateKey('Enter');
    updateCounts(this.value);
    return;
  }

  // ─── Ctrl + Enter → Speak / Stop / Resume ──────────
  if (e.ctrlKey && key === 'Enter') {
    e.preventDefault();
    animateKey('Enter');

    // ① Currently speaking → STOP and save position for resume
    if (isSpeaking) {
      stopSpeaking(true); // save position
      return;
    }

    // ② Was stopped mid-way → RESUME from saved position
    if (pausedText !== null) {
      const resumeFrom = pausedText.substring(pausedCharIndex);
      if (resumeFrom.trim().length > 0) {
        // Reset paused state before resuming so onend can clear it properly
        const textToResume = resumeFrom.trim();
        pausedText = null;
        pausedCharIndex = 0;
        speakRaw(textToResume);
        return;
      }
      // Nothing left to resume, fall through to speak fresh
      pausedText = null;
      pausedCharIndex = 0;
    }

    // ③ Fresh speak — selected text first, then current line
    const selectedText = this.value.substring(this.selectionStart, this.selectionEnd).trim();
    if (selectedText.length > 0) {
      speakText(selectedText);
      return;
    }

    const cursorPos = this.selectionStart;
    const textBefore = this.value.substring(0, cursorPos);
    const lines = textBefore.split('\n');
    const currentLine = lines[lines.length - 1].trim();

    if (currentLine.length > 0) {
      speakText(currentLine);
    } else if (this.value.trim().length > 0) {
      speakText(this.value.trim());
    }

    return;
  }

  // ─── Regular key → just animate ────────────────────
  if (key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
    animateKey(key);
  } else if (!['Control', 'Alt', 'Meta', 'Shift', 'CapsLock'].includes(key)) {
    animateKey(key);
  }
});

textarea.addEventListener('input', function () {
  updateCounts(this.value);
  // If user starts typing new content, clear paused resume state
  if (!isSpeaking) {
    pausedText = null;
    pausedCharIndex = 0;
  }
});

// ──────────────────────────────────────────────────────
// 8. PHYSICAL KEYBOARD → KEYBOARD VISUAL
// ──────────────────────────────────────────────────────

document.addEventListener('keydown', function (e) {
  if (document.activeElement === textarea) return;
  const key = e.key;
  if (!['Control', 'Alt', 'Meta', 'Shift', 'CapsLock'].includes(key)) animateKey(key);
});

// ──────────────────────────────────────────────────────
// 9. BUTTON CONTROLS
// ──────────────────────────────────────────────────────

// Speak All — respects selection
document.getElementById('btn-speak-all').addEventListener('click', () => {
  const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd).trim();
  const text = selectedText.length > 0 ? selectedText : textarea.value.trim();
  if (text.length > 0) speakText(text);
});

// Clear
document.getElementById('btn-clear').addEventListener('click', () => {
  textarea.value = '';
  updateCounts('');
  stopSpeaking(false);
  textarea.focus();
});

// Stop
document.getElementById('btn-stop-speak').addEventListener('click', () => stopSpeaking(true));

// Clear history
document.getElementById('btn-clear-history').addEventListener('click', () => {
  historyList.innerHTML = '<li class="history-empty">Spoken lines will appear here…</li>';
});

// ──────────────────────────────────────────────────────
// 10. VISUAL KEYBOARD CLICK
// ──────────────────────────────────────────────────────

document.getElementById('keyboard-wrap').addEventListener('click', function (e) {
  const keyEl = e.target.closest('.key');
  if (!keyEl) return;
  const keyData = keyEl.dataset.key;
  if (!keyData) return;

  if (keyData.length === 1) {
    const start = textarea.selectionStart, end = textarea.selectionEnd;
    textarea.value = textarea.value.substring(0, start) + keyData + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + keyData.length;
    updateCounts(textarea.value);
  } else if (keyData === ' ') {
    const start = textarea.selectionStart;
    textarea.value = textarea.value.substring(0, start) + ' ' + textarea.value.substring(start);
    textarea.selectionStart = textarea.selectionEnd = start + 1;
    updateCounts(textarea.value);
  } else if (keyData === 'Backspace') {
    const start = textarea.selectionStart;
    if (start > 0) {
      textarea.value = textarea.value.substring(0, start - 1) + textarea.value.substring(start);
      textarea.selectionStart = textarea.selectionEnd = start - 1;
      updateCounts(textarea.value);
    }
  } else if (keyData === 'Enter') {
    const start = textarea.selectionStart, end = textarea.selectionEnd;
    textarea.value = textarea.value.substring(0, start) + '\n' + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + 1;
    updateCounts(textarea.value);
  }

  textarea.focus();
  animateKey(keyData);
});

// Keyboard toggle
document.getElementById('btn-toggle-keyboard').addEventListener('click', () => {
  const panel = document.getElementById('keyboard-panel');
  const btn = document.getElementById('btn-toggle-keyboard');
  const isHidden = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !isHidden);
  panel.classList.toggle('visible', isHidden);
  btn.classList.toggle('btn-primary', isHidden);
  textarea.focus();
});

// Voice pills
document.getElementById('voice-pills').addEventListener('click', (e) => {
  const pill = e.target.closest('.voice-pill');
  if (!pill) return;
  document.querySelectorAll('.voice-pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  currentVoiceType = pill.dataset.voiceType;
});

// ──────────────────────────────────────────────────────
// 11. INIT
// ──────────────────────────────────────────────────────

window.addEventListener('load', () => {
  textarea.focus();
  loadVoices();
  updateCounts('');
  setRate(1.0);
});
