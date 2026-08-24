/* ===================================================
   TypeSpeak – Main JavaScript
   Keyboard Sound & TTS Studio
   =================================================== */

'use strict';

// ──────────────────────────────────────────────────────
// 1. WEB AUDIO ENGINE — Mechanical keyboard click synthesis
// ──────────────────────────────────────────────────────

let audioCtx = null;
let soundEnabled = true;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/**
 * Synthesises a mechanical keyboard click sound using the Web Audio API.
 * Layered white-noise burst + a short oscillator click for realism.
 */
function playKeyClick(type = 'normal') {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    // --- Noise burst (body of click) ---
    const bufferSize = ctx.sampleRate * 0.05;   // 50 ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // High-pass filter gives it the "click" character
    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = type === 'space' ? 600 : 1800;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noiseSource.connect(hpFilter);
    hpFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(now);
    noiseSource.stop(now + 0.05);

    // --- Short oscillator click (tactile snap) ---
    const osc = ctx.createOscillator();
    osc.type = 'square';
    const baseFreq = type === 'enter' ? 320 : type === 'space' ? 260 : 480;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.015);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.1, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);

  } catch (e) {
    console.warn('Audio error:', e);
  }
}

// ──────────────────────────────────────────────────────
// 2. TEXT-TO-SPEECH ENGINE
// ──────────────────────────────────────────────────────

const synth = window.speechSynthesis;
let voices = [];
let currentVoiceType = 'default'; // 'default' | 'male' | 'female' | 'uk'
let currentUtterance = null;
let isSpeaking = false;

/** Pick a voice from available voices by type */
function pickVoice(type) {
  const all = synth.getVoices();
  if (!all.length) return null;

  const enVoices = all.filter(v => v.lang.startsWith('en'));
  const base = enVoices.length ? enVoices : all;

  switch (type) {
    case 'male':
      return (
        base.find(v => /david|james|daniel|male|guy|fred|bruce/i.test(v.name)) ||
        base.find(v => v.lang === 'en-US') ||
        base[0]
      );
    case 'female':
      return (
        base.find(v => /zira|samantha|victoria|karen|moira|fiona|google uk english female|female/i.test(v.name)) ||
        base.find(v => /google/i.test(v.name)) ||
        base[0]
      );
    case 'uk':
      return (
        base.find(v => v.lang === 'en-GB') ||
        base.find(v => /british|uk|george|daniel/i.test(v.name)) ||
        base[0]
      );
    case 'default':
    default:
      return (
        base.find(v => /google us english/i.test(v.name)) ||
        base.find(v => v.lang === 'en-US' && v.default) ||
        base.find(v => v.lang === 'en-US') ||
        base[0]
      );
  }
}

/** Populate voices list when browser is ready */
function loadVoices() {
  voices = synth.getVoices();
}

synth.addEventListener('voiceschanged', loadVoices);
loadVoices();

/** Speak a given text string */
function speakText(text) {
  if (!text || text.trim().length === 0) return;

  // Cancel any currently speaking utterance
  if (synth.speaking) synth.cancel();

  const rateSlider = document.getElementById('rate-slider');
  const pitchSlider = document.getElementById('pitch-slider');

  const chosenVoice = pickVoice(currentVoiceType);

  const utterance = new SpeechSynthesisUtterance(text.trim());
  if (chosenVoice) utterance.voice = chosenVoice;
  utterance.rate = parseFloat(rateSlider.value);
  utterance.pitch = parseFloat(pitchSlider.value);
  utterance.volume = 1;

  currentUtterance = utterance;

  utterance.onstart = () => {
    isSpeaking = true;
    showSpeakStatus(text.trim());
    highlightEnterKey(true);
  };

  utterance.onend = () => {
    isSpeaking = false;
    hideSpeakStatus();
    highlightEnterKey(false);
    addToHistory(text.trim());
  };

  utterance.onerror = (e) => {
    isSpeaking = false;
    hideSpeakStatus();
    highlightEnterKey(false);
    console.warn('Speech error:', e.error);
  };

  synth.speak(utterance);
}

function stopSpeaking() {
  if (synth.speaking) {
    synth.cancel();
  }
  isSpeaking = false;
  hideSpeakStatus();
  highlightEnterKey(false);
}

// ──────────────────────────────────────────────────────
// 3. UI HELPERS
// ──────────────────────────────────────────────────────

const speakStatus = document.getElementById('speak-status');
const speakTextDisplay = document.getElementById('speak-text-display');

function showSpeakStatus(text) {
  speakTextDisplay.textContent = '🗣 ' + text;
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

/** Animate keyboard key visually */
function animateKey(keyValue) {
  // Normalize to lowercase for letter keys
  const normalized = keyValue.length === 1 ? keyValue.toLowerCase() : keyValue;

  // Find matching key element(s)
  const keyEls = document.querySelectorAll(`[data-key="${CSS.escape(normalized)}"]`);
  keyEls.forEach(el => {
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 130);
  });
}

/** Update word / char counters */
function updateCounts(text) {
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const chars = text.length;
  document.getElementById('word-count').textContent = `${words} word${words !== 1 ? 's' : ''}`;
  document.getElementById('char-count').textContent = `${chars} char${chars !== 1 ? 's' : ''}`;
}

// ──────────────────────────────────────────────────────
// 4. HISTORY
// ──────────────────────────────────────────────────────

const historyList = document.getElementById('history-list');

function addToHistory(text) {
  // Remove empty placeholder
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
  `;

  // Click to re-speak
  li.addEventListener('click', () => speakText(text));

  // Prepend (newest at top)
  historyList.insertBefore(li, historyList.firstChild);

  // Cap at 50 items
  while (historyList.children.length > 50) {
    historyList.removeChild(historyList.lastChild);
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ──────────────────────────────────────────────────────
// 5. MAIN KEYBOARD EVENT HANDLER
// ──────────────────────────────────────────────────────

const textarea = document.getElementById('text-input');

textarea.addEventListener('keydown', function (e) {

  const key = e.key;

  // ─── Enter → insert newline (no speak) ───────────────
  if (key === 'Enter' && !e.ctrlKey) {
    // Default behavior: new line. Just play sound and animate.
    playKeyClick('enter');
    animateKey('Enter');
    // Let browser insert the newline naturally
    updateCounts(this.value);
    return;
  }

  // ─── Ctrl + Enter → speak current line ──────────────
  if (e.ctrlKey && key === 'Enter') {
    e.preventDefault();

    playKeyClick('enter');
    animateKey('Enter');

    // Get the text on the current line (up to cursor)
    const cursorPos = this.selectionStart;
    const textBefore = this.value.substring(0, cursorPos);

    // Find the last line
    const lines = textBefore.split('\n');
    const currentLine = lines[lines.length - 1].trim();

    if (currentLine.length > 0) {
      speakText(currentLine);
    } else if (this.value.trim().length > 0) {
      speakText(this.value.trim());
    }

    return;
  }

  // ─── Ctrl + A → speak all text ──────────────────────
  if (e.ctrlKey && (key === 'a' || key === 'A')) {
    // Let default select-all happen; but also speak if desired
    // Only speak if user pressed Ctrl+A with intent (non-default)
    // We'll leave default behavior; user can use the Speak All button
    return;
  }

  // ─── Space → click sound ─────────────────────────────
  if (key === ' ') {
    playKeyClick('space');
    animateKey(' ');
    updateCounts(this.value + ' ');
    return;
  }

  // ─── Backspace ─────────────────────────────────────
  if (key === 'Backspace') {
    playKeyClick('normal');
    animateKey('Backspace');
    // Let default backspace behavior happen; count updated on input event
    return;
  }

  // ─── Regular character keys ──────────────────────────
  if (key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
    playKeyClick('normal');
    animateKey(key);
  } else {
    // Non-character keys (Shift, Tab, etc.) - still animate, no sound for modifiers
    if (!['Control', 'Alt', 'Meta', 'Shift', 'CapsLock'].includes(key)) {
      playKeyClick('normal');
    }
    animateKey(key);
  }
});

// Update counts on every input change
textarea.addEventListener('input', function () {
  updateCounts(this.value);
});

// ──────────────────────────────────────────────────────
// 6. PHYSICAL KEYBOARD → KEYBOARD VISUAL (outside textarea)
// ──────────────────────────────────────────────────────

// Also animate keyboard keys even when textarea might not be focused
document.addEventListener('keydown', function (e) {
  // Prevent double-animation for textarea (it's handled above)
  if (document.activeElement === textarea) return;

  const key = e.key;
  if (!['Control', 'Alt', 'Meta', 'Shift', 'CapsLock'].includes(key)) {
    playKeyClick(key === 'Enter' ? 'enter' : key === ' ' ? 'space' : 'normal');
  }
  animateKey(key);
});

// ──────────────────────────────────────────────────────
// 7. BUTTON CONTROLS
// ──────────────────────────────────────────────────────

// Sound toggle
const soundToggleBtn = document.getElementById('sound-toggle');
soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggleBtn.textContent = soundEnabled ? '🔊' : '🔇';
  soundToggleBtn.classList.toggle('muted', !soundEnabled);
});

// Speak All button
document.getElementById('btn-speak-all').addEventListener('click', () => {
  const text = textarea.value.trim();
  if (text.length > 0) speakText(text);
});

// Clear button
document.getElementById('btn-clear').addEventListener('click', () => {
  textarea.value = '';
  updateCounts('');
  stopSpeaking();
  textarea.focus();
});

// Stop speaking button
document.getElementById('btn-stop-speak').addEventListener('click', () => {
  stopSpeaking();
});

// Clear history button
document.getElementById('btn-clear-history').addEventListener('click', () => {
  historyList.innerHTML = '<li class="history-empty">Spoken lines will appear here…</li>';
});

// Rate slider — update display and re-speak in real-time if speaking
const rateSlider = document.getElementById('rate-slider');
const rateVal = document.getElementById('rate-val');
rateSlider.addEventListener('input', () => {
  const v = parseFloat(rateSlider.value);
  rateVal.textContent = v.toFixed(1) + 'x';
  // If currently speaking, restart with new rate
  if (isSpeaking && currentUtterance) {
    const remaining = currentUtterance.text;
    speakText(remaining);
  }
});

// Pitch slider — update display and re-speak in real-time if speaking
const pitchSlider = document.getElementById('pitch-slider');
const pitchVal = document.getElementById('pitch-val');
pitchSlider.addEventListener('input', () => {
  const v = parseFloat(pitchSlider.value);
  pitchVal.textContent = v.toFixed(1);
  if (isSpeaking && currentUtterance) {
    const remaining = currentUtterance.text;
    speakText(remaining);
  }
});

// ──────────────────────────────────────────────────────
// 8. VISUAL KEYBOARD CLICK (mouse click on key)
// ──────────────────────────────────────────────────────

document.getElementById('keyboard-wrap').addEventListener('click', function (e) {
  const keyEl = e.target.closest('.key');
  if (!keyEl) return;

  const keyData = keyEl.dataset.key;
  if (!keyData) return;

  playKeyClick(keyData === 'Enter' ? 'enter' : keyData === ' ' ? 'space' : 'normal');

  // Insert the character into textarea if it's a typeable character
  if (keyData.length === 1) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
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
    // On-screen Enter = new line (Ctrl+Enter to speak)
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.substring(0, start) + '\n' + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + 1;
    updateCounts(textarea.value);
  }

  textarea.focus();
  animateKey(keyData);
});

// Keyboard toggle button
document.getElementById('btn-toggle-keyboard').addEventListener('click', () => {
  const panel = document.getElementById('keyboard-panel');
  const btn = document.getElementById('btn-toggle-keyboard');
  const isHidden = panel.classList.contains('hidden');
  if (isHidden) {
    panel.classList.remove('hidden');
    panel.classList.add('visible');
    btn.classList.add('btn-primary');
  } else {
    panel.classList.add('hidden');
    panel.classList.remove('visible');
    btn.classList.remove('btn-primary');
  }
  textarea.focus();
});

// Voice pill selection
document.getElementById('voice-pills').addEventListener('click', (e) => {
  const pill = e.target.closest('.voice-pill');
  if (!pill) return;
  document.querySelectorAll('.voice-pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  currentVoiceType = pill.dataset.voiceType;
});

// ──────────────────────────────────────────────────────
// 9. INIT
// ──────────────────────────────────────────────────────

// Focus textarea on load
window.addEventListener('load', () => {
  textarea.focus();
  loadVoices();
  updateCounts('');
});
