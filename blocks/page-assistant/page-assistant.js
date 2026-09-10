// page-assistant.js — a reusable, floating "ask this page" chat assistant that
// runs entirely on Chrome's built-in AI (Prompt API `LanguageModel` / Gemini
// Nano, plus the Summarizer API when available). No backend, no API key, no
// model download managed by us. Answers are grounded ONLY in the current page's
// text, which is extracted and handed to the on-device model.
//
// DESIGN CONTRACT (why it is safe on an EDS site):
//   * The bubble is only ever rendered when built-in AI is ACTUALLY available on
//     the device. If it is not, nothing is added to the page.
//   * All detection, CSS loading and mounting happen off the critical path — in
//     the delayed phase / on idle — so Lighthouse is unaffected.
//   * The floating UI is `position: fixed`, so it never causes layout shift.
//   * Nothing the user types ever leaves the device.
//
// TWO WAYS TO USE IT:
//   1. Authored — drop a `page-assistant` block on a page. `decorate(block)`
//      reads its config and mounts the assistant.
//   2. Global — call `autoMountByPath(patterns, config)` from `scripts.js` to
//      show it across many pages that match a URL regex, with no authoring.

import { readBlockConfig, loadCSS } from '../../scripts/aem.js';

// Singleton guard: only one assistant per page, no matter how many triggers fire
// (an authored block AND a global auto-mount, multiple matching patterns, etc.).
const MOUNT_FLAG = '__pageAssistantMounted';

const DEFAULT_CONFIG = {
  subtext: 'Answers are based on this page. Nothing you type leaves your device.',
  systemPrompt:
    'You are a helpful assistant embedded on a web page. Answer questions and write '
    + 'summaries based ONLY on the page content provided below. Be concise and factual. '
    + 'If the answer is not in the content, say you could not find it on this page. '
    + 'Do not use outside knowledge.',
  maxContextChars: 8000,
  position: 'bottom-right',
  summaryType: 'tldr',
  title: 'Page assistant',
  // Strict by default: only show when the model is readily available. When true,
  // also show when the model is "downloadable" (first use triggers a download).
  showWhenDownloadable: false,
};

// ---------------------------------------------------------------------------
// Built-in AI access
// ---------------------------------------------------------------------------

// Prompt API handle across the shipped shapes: `window.LanguageModel` (current)
// and the older `window.ai.languageModel`.
function languageModelApi() {
  return window.LanguageModel || (window.ai && window.ai.languageModel) || null;
}

function summarizerApi() {
  return window.Summarizer || (window.ai && window.ai.summarizer) || null;
}

// Cheap synchronous sniff — safe to call anywhere. Real availability needs the
// async probe below.
function builtinPresent() {
  return !!languageModelApi();
}

// Async availability probe. Returns { ok, state } where state is one of
// 'available' | 'downloadable' | 'unavailable'. Handles both the modern
// `availability()` and the older `capabilities()` API shapes.
async function probeAvailability() {
  const lm = languageModelApi();
  if (!lm) return { ok: false, state: 'unavailable' };
  try {
    let state;
    if (typeof lm.availability === 'function') {
      state = await lm.availability();
    } else if (typeof lm.capabilities === 'function') {
      const caps = await lm.capabilities();
      const map = { readily: 'available', 'after-download': 'downloadable', no: 'unavailable' };
      state = map[caps.available] || 'unavailable';
    }
    if (!state || state === 'unavailable') return { ok: false, state: 'unavailable' };
    return { ok: true, state };
  } catch (err) {
    return { ok: false, state: 'unavailable' };
  }
}

// Should we show the bubble for this availability state?
function shouldRender(state, config) {
  if (state === 'available') return true;
  if (state === 'downloadable') return !!config.showWhenDownloadable;
  return false;
}

// ---------------------------------------------------------------------------
// Page text extraction — the grounding context. Pulls readable main-content
// text, excluding the assistant's own UI and non-content chrome.
// ---------------------------------------------------------------------------
// Cache the full main-content text (static for the life of the page) so we
// clone-and-scan once and just re-slice per call.
let pageTextCache = null;

function extractPageText(maxChars) {
  if (pageTextCache == null) {
    const root = document.querySelector('main') || document.body;
    const clone = root.cloneNode(true);
    clone
      .querySelectorAll('.page-assistant, .page-assistant-root, script, style, noscript, nav, header, footer, aside, form')
      .forEach((node) => node.remove());
    pageTextCache = (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }
  return pageTextCache.slice(0, maxChars);
}

// ---------------------------------------------------------------------------
// Model session helpers
// ---------------------------------------------------------------------------

// Build the grounding system prompt: the base instructions plus the page text,
// injected ONCE so it isn't resent every turn (which would quickly exhaust the
// small on-device context window as the conversation grows).
function buildSystemPrompt(config) {
  const pageText = extractPageText(config.maxContextChars);
  return `${config.systemPrompt}\n\nPAGE CONTENT:\n${pageText}`;
}

// Shared download-progress monitor for every on-device model `create()` call.
function downloadMonitor(ctx) {
  return (m) => {
    m.addEventListener('downloadprogress', (e) => {
      const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
      if (ctx.onProgress) ctx.onProgress(pct);
    });
  };
}

// True only for an "unsupported option shape" error, so we don't mask a real
// quota/permission failure by blindly retrying with a different create() shape.
function isOptionShapeError(err) {
  if (!err) return false;
  if (err.name === 'TypeError') return true;
  const msg = `${err.name || ''} ${err.message || ''}`.toLowerCase();
  return msg.includes('initialprompts') || msg.includes('unexpected')
    || msg.includes('unknown') || msg.includes('unrecognized')
    || msg.includes('not supported') || msg.includes('not a valid');
}

// Lazily create (once) a persistent LanguageModel session seeded with the system
// prompt + page content. The session is kept across turns so the Prompt API
// retains conversation history, enabling coherent follow-up questions.
async function getLanguageSession(config, ctx) {
  if (ctx.baseSession) return ctx.baseSession;
  const lm = languageModelApi();
  const monitor = downloadMonitor(ctx);
  const signal = ctx.controller ? ctx.controller.signal : undefined;
  const systemPrompt = buildSystemPrompt(config);
  try {
    ctx.baseSession = await lm.create({
      initialPrompts: [{ role: 'system', content: systemPrompt }],
      monitor,
      signal,
    });
  } catch (err) {
    // Older builds took a `systemPrompt` string; only retry for that shape error.
    if (!isOptionShapeError(err)) throw err;
    ctx.baseSession = await lm.create({ systemPrompt, monitor, signal });
  }
  return ctx.baseSession;
}

// Did the session run out of context window? Deliberately narrow so unrelated
// errors don't trigger a conversation-destroying retry.
function isContextOverflow(err) {
  if (!err) return false;
  if (err.name === 'QuotaExceededError') return true;
  const msg = `${err.name || ''} ${err.message || ''}`.toLowerCase();
  return msg.includes('quota')
    || msg.includes('context window')
    || msg.includes('too large')
    || msg.includes('too long')
    || msg.includes('exceeds');
}

// Consume a streaming AI response. Chrome ships two shapes — cumulative (each
// chunk is the full text) and delta (each chunk is new) — so we detect once on
// the second chunk and lock it, rather than re-guessing per chunk (which
// corrupted output both ways).
async function consumeStream(stream, onDelta) {
  let text = '';
  let mode = null; // null (undecided) | 'cumulative' | 'delta'
  let seen = false;
  // eslint-disable-next-line no-restricted-syntax
  for await (const raw of stream) {
    const chunk = typeof raw === 'string' ? raw : String(raw == null ? '' : raw);
    if (!seen) {
      // Chunk #1 is the full text so far under both shapes.
      text = chunk;
      seen = true;
    } else if (mode === null) {
      // Chunk #2 decides: cumulative re-sends the whole prefix; delta doesn't.
      if (chunk.length >= text.length && chunk.startsWith(text)) {
        mode = 'cumulative';
        text = chunk;
      } else {
        mode = 'delta';
        text += chunk;
      }
    } else if (mode === 'cumulative') {
      text = chunk;
    } else {
      text += chunk;
    }
    onDelta(text);
  }
  return text;
}

// Stream one turn on the persistent session, so history accumulates and
// follow-up questions stay coherent.
async function streamTurn(session, question, controller, onDelta) {
  const stream = session.promptStreaming(question, { signal: controller.signal });
  return consumeStream(stream, onDelta);
}

// Stream a grounded chat answer. The AbortController is owned by runAndStream
// via `ctx.controller` so the Stop button can cancel.
async function runChat(question, config, ctx, onDelta) {
  const controller = ctx.controller || new AbortController();
  try {
    // Inside the try so an overflow on the first (largest) create is recovered.
    const session = await getLanguageSession(config, ctx);
    return await streamTurn(session, question, controller, onDelta);
  } catch (err) {
    // Overflow recovery: rebuild a fresh session (grounding intact) and retry once.
    if (controller.signal.aborted || !isContextOverflow(err)) throw err;
    if (ctx.baseSession && typeof ctx.baseSession.destroy === 'function') {
      try { ctx.baseSession.destroy(); } catch (e) { /* ignore */ }
    }
    ctx.baseSession = null;
    const fresh = await getLanguageSession(config, ctx);
    return streamTurn(fresh, question, controller, onDelta);
  }
}

// Summarise the page. Prefer the dedicated Summarizer API; fall back to the
// LanguageModel with a summarise instruction.
async function runSummary(config, ctx, onDelta) {
  const pageText = extractPageText(config.maxContextChars);
  const summarizer = summarizerApi();

  if (summarizer) {
    try {
      let state = 'available';
      if (typeof summarizer.availability === 'function') {
        state = await summarizer.availability();
      }
      // Honour `showWhenDownloadable`: don't trigger a download the site opted
      // out of — fall through to the already-available LanguageModel instead.
      const usable = state === 'available'
        || (state === 'downloadable' && config.showWhenDownloadable);
      if (usable) {
        const signal = ctx.controller ? ctx.controller.signal : undefined;
        const s = await summarizer.create({
          type: config.summaryType || 'tldr',
          format: 'plain-text',
          length: 'medium',
          monitor: downloadMonitor(ctx),
          signal,
        });
        if (typeof s.summarizeStreaming === 'function') {
          return consumeStream(s.summarizeStreaming(pageText, { signal }), onDelta);
        }
        const text = await s.summarize(pageText, { signal });
        onDelta(text);
        return text;
      }
    } catch (err) {
      // Fall through to the LanguageModel path.
    }
  }

  // Fallback: ask the Prompt API to summarise.
  return runChat('Summarise this page in a few clear sentences.', config, ctx, onDelta);
}

// ---------------------------------------------------------------------------
// Translation — Translator API + Language Detector API (both on-device). The
// target languages offered in the UI; source is auto-detected. BCP-47 codes.
// ---------------------------------------------------------------------------
const TRANSLATE_LANGUAGES = [
  { code: 'ar', name: 'Arabic' },
  { code: 'bn', name: 'Bengali' },
  { code: 'de', name: 'German' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'hi', name: 'Hindi' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
];

function translatorApi() {
  return window.Translator || (window.ai && window.ai.translator) || null;
}

function languageDetectorApi() {
  return window.LanguageDetector || (window.ai && window.ai.languageDetector) || null;
}

// Detect the language of a string; falls back to 'en' when detection is
// unavailable or inconclusive.
async function detectLanguage(text) {
  const detector = languageDetectorApi();
  if (!detector) return 'en';
  try {
    const det = await detector.create();
    const results = await det.detect(text);
    const top = Array.isArray(results) ? results[0] : null;
    return (top && top.detectedLanguage) || 'en';
  } catch (err) {
    return 'en';
  }
}

// Translate the last assistant answer into targetLanguage, streaming the result.
async function runTranslate(targetLanguage, config, ctx, onDelta) {
  const source = (ctx.lastAnswer || '').trim();
  if (!source) {
    throw new Error('Ask a question or summarise the page first, then translate the answer.');
  }
  const translator = translatorApi();
  if (!translator) throw new Error('Translation is not available in this browser.');

  const sourceLanguage = await detectLanguage(source);
  if (sourceLanguage === targetLanguage) {
    onDelta(source);
    return source;
  }

  let availability = 'available';
  if (typeof translator.availability === 'function') {
    availability = await translator.availability({ sourceLanguage, targetLanguage });
  }
  if (availability === 'unavailable') {
    throw new Error(`Translation ${sourceLanguage} → ${targetLanguage} isn’t supported on this device.`);
  }
  // Honour `showWhenDownloadable`: no non-downloading fallback exists here, so
  // surface a clear message rather than triggering the opted-out download.
  if (availability === 'downloadable' && !config.showWhenDownloadable) {
    throw new Error('Translation needs a one-time on-device model download, which is disabled for this page.');
  }

  const signal = ctx.controller ? ctx.controller.signal : undefined;
  const t = await translator.create({
    sourceLanguage,
    targetLanguage,
    monitor: downloadMonitor(ctx),
    signal,
  });

  if (typeof t.translateStreaming === 'function') {
    return consumeStream(t.translateStreaming(source, { signal }), onDelta);
  }
  const text = await t.translate(source, { signal });
  onDelta(text);
  return text;
}

// ---------------------------------------------------------------------------
// Minimal, dependency-free, XSS-safe Markdown → HTML renderer for chat answers.
// The model emits Markdown (**bold**, lists, `code`, headings); rendering it
// avoids showing raw `*` / `#` symbols. Everything is HTML-escaped first, and
// links are restricted to http(s) so model output can't inject markup.
// ---------------------------------------------------------------------------
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Sentinels that shield inline code spans from the emphasis/link passes, so
// `a_b_c` or `2**8` isn't mangled into spurious <em>/<strong> tags.
const CODE_OPEN = '\uE000';
const CODE_CLOSE = '\uE001';

// Input is already HTML-escaped by renderMarkdown, so `"`/`'` are entities and
// can't break out of the href attribute below.
function renderInline(text) {
  const codes = [];
  let out = text.replace(/`([^`]+)`/g, (m, code) => {
    codes.push(code);
    return `${CODE_OPEN}${codes.length - 1}${CODE_CLOSE}`;
  });
  out = out
    // Bold first, allowing a nested single `*`/`_` (italic) inside.
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__([\s\S]+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\s][^_]*?)_/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // Restore code spans last, untouched by emphasis/link processing.
  return out.replace(
    new RegExp(`${CODE_OPEN}(\\d+)${CODE_CLOSE}`, 'g'),
    (m, i) => `<code>${codes[Number(i)]}</code>`,
  );
}

function renderMarkdown(md) {
  const lines = escapeHtml(md).split('\n');
  const html = [];
  let inCode = false;
  let codeBuf = [];
  let listType = null;
  let paraBuf = [];

  const flushPara = () => {
    if (paraBuf.length) {
      html.push(`<p>${renderInline(paraBuf.join(' '))}</p>`);
      paraBuf = [];
    }
  };
  const flushList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${codeBuf.join('\n')}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        flushPara();
        flushList();
        inCode = true;
      }
      return;
    }
    if (inCode) {
      codeBuf.push(line);
      return;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      const level = Math.min(heading[1].length + 2, 6);
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      return;
    }

    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const type = ul ? 'ul' : 'ol';
      if (listType && listType !== type) flushList();
      if (!listType) {
        html.push(`<${type}>`);
        listType = type;
      }
      html.push(`<li>${renderInline((ul || ol)[1])}</li>`);
      return;
    }

    if (line.trim() === '') {
      flushPara();
      flushList();
      return;
    }

    flushList();
    paraBuf.push(line.trim());
  });

  if (inCode) html.push(`<pre><code>${codeBuf.join('\n')}</code></pre>`);
  flushPara();
  flushList();
  return html.join('');
}

// ---------------------------------------------------------------------------
// Action registry — extensible list of one-click actions in the panel header.
// Add new actions here (or push to it before mounting) and they render
// automatically.
// ---------------------------------------------------------------------------
const ACTIONS = [
  {
    id: 'summarise',
    label: 'Summarise this page',
    run: (config, ctx, onDelta) => runSummary(config, ctx, onDelta),
  },
];

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

// Inline, stroke-based SVG icons (currentColor) for a clean, professional look
// with no external icon dependency.
const ICONS = {
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  clear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Apply a custom accent colour, if the author set one. Sets the CSS custom
// properties the whole UI is themed from; the hover shade is derived with
// color-mix when not explicitly provided. Values are lightly sanitised (a CSS
// value can't break out of setProperty, but we drop obviously invalid chars).
function applyAccent(root, config) {
  const clean = (v) => (v ? String(v).replace(/[;{}<>]/g, '').trim() : '');
  const accent = clean(config.accent);
  if (!accent) return;
  root.style.setProperty('--pa-accent', accent);
  const hover = clean(config.accentHover);
  root.style.setProperty(
    '--pa-accent-hover',
    hover || `color-mix(in srgb, ${accent} 85%, #000)`,
  );
}

function buildUI(config, ctx) {
  const root = el('div', `page-assistant page-assistant-root page-assistant-${config.position}`);
  root.setAttribute('data-state', ctx.state);
  applyAccent(root, config);

  // Floating bubble button.
  const bubble = el('button', 'page-assistant-bubble');
  bubble.type = 'button';
  bubble.setAttribute('aria-label', `Open ${config.title}`);
  bubble.setAttribute('aria-expanded', 'false');
  bubble.innerHTML = `<span class="page-assistant-bubble-icon page-assistant-icon-chat">${ICONS.chat}</span><span class="page-assistant-bubble-icon page-assistant-icon-chevron">${ICONS.chevron}</span>`;

  // Panel.
  const panel = el('div', 'page-assistant-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', config.title);
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-hidden', 'true');

  const header = el('div', 'page-assistant-header');
  const heads = el('div', 'page-assistant-heads');
  const heading = el('h2', 'page-assistant-title', config.title);
  const subtext = el('p', 'page-assistant-subtext', config.subtext);
  heads.append(heading, subtext);
  const headerBtns = el('div', 'page-assistant-header-btns');
  const clearBtn = el('button', 'page-assistant-clear');
  clearBtn.type = 'button';
  clearBtn.title = 'Clear chat';
  clearBtn.setAttribute('aria-label', 'Clear chat');
  clearBtn.innerHTML = ICONS.clear;
  const closeBtn = el('button', 'page-assistant-close');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = ICONS.close;
  headerBtns.append(clearBtn, closeBtn);
  header.append(heads, headerBtns);

  const actionsRow = el('div', 'page-assistant-actions');
  ACTIONS.forEach((action) => {
    const btn = el('button', 'page-assistant-action', action.label);
    btn.type = 'button';
    btn.dataset.actionId = action.id;
    actionsRow.append(btn);
  });

  // Translate control — only when the on-device Translator API is present.
  let translateSelect = null;
  if (translatorApi()) {
    translateSelect = el('select', 'page-assistant-translate');
    translateSelect.setAttribute('aria-label', 'Translate the last answer');
    const placeholder = el('option', null, 'Translate answer to…');
    placeholder.value = '';
    translateSelect.append(placeholder);
    TRANSLATE_LANGUAGES.forEach((lang) => {
      const opt = el('option', null, lang.name);
      opt.value = lang.code;
      translateSelect.append(opt);
    });
    actionsRow.append(translateSelect);
  }

  const transcript = el('div', 'page-assistant-transcript');
  transcript.setAttribute('aria-live', 'polite');

  const form = el('form', 'page-assistant-input-row');
  const input = el('textarea', 'page-assistant-input');
  input.rows = 1;
  input.placeholder = 'Ask a question about this page…';
  input.setAttribute('aria-label', 'Ask a question about this page');
  const send = el('button', 'page-assistant-send');
  send.type = 'submit';
  send.setAttribute('aria-label', 'Send');
  send.innerHTML = ICONS.send;
  form.append(input, send);

  panel.append(header, transcript, actionsRow, form);
  root.append(bubble, panel);

  return {
    root,
    bubble,
    panel,
    transcript,
    form,
    input,
    send,
    closeBtn,
    clearBtn,
    actionsRow,
    translateSelect,
  };
}

// Set message content: assistant answers are rendered as Markdown; user text
// and status/error lines are plain to avoid any surprises.
function setContent(msg, text, markdown) {
  if (markdown) msg.innerHTML = renderMarkdown(text);
  else msg.textContent = text;
}

function addMessage(transcript, role, text, markdown) {
  const msg = el('div', `page-assistant-msg page-assistant-msg-${role}`);
  if (markdown) msg.classList.add('page-assistant-markdown');
  setContent(msg, text, markdown);
  transcript.append(msg);
  transcript.scrollTop = transcript.scrollHeight;
  return msg;
}

function setBusy(ui, busy) {
  ui.root.classList.toggle('page-assistant-busy', busy);
  // Send stays enabled while streaming and doubles as a Stop control so the user
  // can cancel a slow/stuck generation (see the submit handler).
  ui.send.classList.toggle('page-assistant-send-stop', busy);
  ui.send.setAttribute('aria-label', busy ? 'Stop generating' : 'Send');
  ui.send.innerHTML = busy ? ICONS.stop : ICONS.send;
  ui.clearBtn.disabled = busy;
  ui.actionsRow.querySelectorAll('button, select').forEach((b) => { b.disabled = busy; });
}

function wireUI(ui, config, ctx) {
  const isOpen = () => ui.root.classList.contains('page-assistant-open');
  const openPanel = () => {
    ui.root.classList.add('page-assistant-open');
    ui.panel.setAttribute('aria-hidden', 'false');
    ui.bubble.setAttribute('aria-expanded', 'true');
    ui.bubble.setAttribute('aria-label', `Close ${config.title}`);
    ui.input.focus();
  };
  const closePanel = () => {
    ui.root.classList.remove('page-assistant-open');
    ui.panel.setAttribute('aria-hidden', 'true');
    ui.bubble.setAttribute('aria-expanded', 'false');
    ui.bubble.setAttribute('aria-label', `Open ${config.title}`);
    ui.bubble.focus();
  };

  ui.bubble.addEventListener('click', () => {
    if (isOpen()) closePanel();
    else openPanel();
  });
  ui.closeBtn.addEventListener('click', closePanel);
  ui.panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  // Clear chat: empty the transcript, forget the last answer, and drop the base
  // session so the next question rebuilds it from a clean slate.
  ui.clearBtn.addEventListener('click', () => {
    if (ctx.busy) return;
    ui.transcript.replaceChildren();
    ctx.lastAnswer = '';
    if (ctx.baseSession && typeof ctx.baseSession.destroy === 'function') {
      try { ctx.baseSession.destroy(); } catch (err) { /* ignore */ }
    }
    ctx.baseSession = null;
    ui.input.focus();
  });

  // Progress feedback (e.g. one-time model preparation) surfaces as status text.
  ctx.onProgress = (pct) => {
    if (ctx.statusMsg) ctx.statusMsg.textContent = `Preparing on-device AI… ${pct}%`;
  };

  const runAndStream = async (runner, userLabel, opts = {}) => {
    const { track = true } = opts;
    if (ctx.busy) return;
    ctx.busy = true;
    ctx.controller = new AbortController();
    setBusy(ui, true);
    if (userLabel) addMessage(ui.transcript, 'user', userLabel);
    ctx.statusMsg = addMessage(ui.transcript, 'assistant', '');
    ctx.statusMsg.classList.add('page-assistant-status');
    ctx.statusMsg.innerHTML = '<span class="page-assistant-typing"><i></i><i></i><i></i></span>';

    // Coalesce renders to at most one per frame — re-rendering the whole answer
    // and forcing a scroll reflow on every chunk is O(n²) and janky.
    let finalText = '';
    let pending = null;
    let rafId = 0;
    let first = true;
    const paint = () => {
      rafId = 0;
      if (pending == null) return;
      const text = pending;
      pending = null;
      if (first) {
        ctx.statusMsg.classList.remove('page-assistant-status');
        ctx.statusMsg.classList.add('page-assistant-markdown');
        first = false;
      }
      setContent(ctx.statusMsg, text, true);
      ui.transcript.scrollTop = ui.transcript.scrollHeight;
    };
    const stopPaint = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } };

    try {
      await runner((text) => {
        finalText = text;
        pending = text;
        if (!rafId) rafId = requestAnimationFrame(paint);
      });
      stopPaint();
      // Final render of the complete answer.
      if (finalText) {
        if (first) {
          ctx.statusMsg.classList.remove('page-assistant-status');
          ctx.statusMsg.classList.add('page-assistant-markdown');
        }
        setContent(ctx.statusMsg, finalText, true);
        ui.transcript.scrollTop = ui.transcript.scrollHeight;
      }
      if (track && finalText.trim()) ctx.lastAnswer = finalText;
    } catch (err) {
      stopPaint();
      if (err && err.name === 'AbortError') {
        // Stopped by the user: keep whatever streamed, else a subtle note.
        if (finalText.trim()) {
          if (first) ctx.statusMsg.classList.add('page-assistant-markdown');
          setContent(ctx.statusMsg, finalText, true);
          if (track) ctx.lastAnswer = finalText;
        } else {
          ctx.statusMsg.classList.remove('page-assistant-markdown');
          ctx.statusMsg.textContent = 'Stopped.';
        }
      } else {
        ctx.statusMsg.classList.remove('page-assistant-markdown');
        ctx.statusMsg.textContent = `Sorry — ${err.message}`;
        ctx.statusMsg.classList.add('page-assistant-error');
      }
    } finally {
      ctx.busy = false;
      ctx.statusMsg = null;
      ctx.controller = null;
      setBusy(ui, false);
    }
  };

  ui.actionsRow.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action-id]');
    if (!btn) return;
    const action = ACTIONS.find((a) => a.id === btn.dataset.actionId);
    if (action) runAndStream((onDelta) => action.run(config, ctx, onDelta), action.label);
  });

  // Translate the last answer into the chosen language (source auto-detected).
  if (ui.translateSelect) {
    ui.translateSelect.addEventListener('change', (e) => {
      const targetLanguage = e.target.value;
      if (!targetLanguage) return;
      const lang = TRANSLATE_LANGUAGES.find((l) => l.code === targetLanguage);
      const name = (lang && lang.name) || targetLanguage;
      e.target.value = '';
      runAndStream(
        (onDelta) => runTranslate(targetLanguage, config, ctx, onDelta),
        `Translate answer → ${name}`,
        { track: false },
      );
    });
  }

  ui.form.addEventListener('submit', (e) => {
    e.preventDefault();
    // While streaming, the send button is a Stop control: cancel the in-flight
    // generation and leave any typed follow-up untouched (don't clear/discard it).
    if (ctx.busy) {
      if (ctx.controller) ctx.controller.abort();
      return;
    }
    const question = ui.input.value.trim();
    if (!question) return;
    ui.input.value = '';
    runAndStream((onDelta) => runChat(question, config, ctx, onDelta), question);
  });

  // Enter to send, Shift+Enter for newline. Ignored while streaming so a typed
  // follow-up is preserved rather than silently cleared (use Stop to cancel).
  ui.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (ctx.busy) return;
      ui.form.requestSubmit();
    }
  });
}

// ---------------------------------------------------------------------------
// Mount — shared by authored and global paths. Idempotent.
// ---------------------------------------------------------------------------

// Site-wide base config an integrator may set early (module scope) via
// `window.pageAssistantConfig`. Both authored blocks and the global auto-mount
// inherit it; per-page/per-call fields are layered on top (merge, not replace),
// so an authored block only needs to specify what it wants to change.
function globalBaseConfig() {
  const c = window.pageAssistantConfig;
  return c && typeof c === 'object' ? c : {};
}

// Normalise a partial config object against the defaults.
function normaliseConfig(partial) {
  const cfg = { ...DEFAULT_CONFIG, ...(partial || {}) };
  // Tolerate "8,000" and reject nonsensical values (0/negative) via the default.
  const n = parseInt(String(cfg.maxContextChars).replace(/[,\s_]/g, ''), 10);
  cfg.maxContextChars = Number.isFinite(n) && n >= 1 ? n : DEFAULT_CONFIG.maxContextChars;
  cfg.position = cfg.position === 'bottom-left' ? 'bottom-left' : 'bottom-right';
  if (typeof cfg.showWhenDownloadable === 'string') {
    cfg.showWhenDownloadable = /^(true|yes|on)$/i.test(cfg.showWhenDownloadable.trim());
  }
  return cfg;
}

/**
 * Mount the floating assistant if (and only if) built-in AI is available.
 * Safe to call multiple times — only one assistant is ever created.
 * @param {object} partialConfig optional config overrides
 * @returns {Promise<boolean>} true if mounted, false if skipped
 */
export async function mountAssistant(partialConfig) {
  if (window[MOUNT_FLAG]) return false;
  if (!builtinPresent()) return false;

  const config = normaliseConfig(partialConfig);
  const { ok, state } = await probeAvailability();
  if (!ok || !shouldRender(state, config)) return false;

  // Claim the singleton only once we know we will actually render.
  if (window[MOUNT_FLAG]) return false;
  window[MOUNT_FLAG] = true;

  try {
    await loadCSS(`${window.hlx.codeBasePath}/blocks/page-assistant/page-assistant.css`);
    const ctx = { state, busy: false, baseSession: null };
    const ui = buildUI(config, ctx);
    wireUI(ui, config, ctx);
    document.body.append(ui.root);
    return true;
  } catch (err) {
    // Release the singleton claim on failure so a later trigger can retry.
    window[MOUNT_FLAG] = false;
    return false;
  }
}

/**
 * Global helper for scripts.js: mount the assistant on pages whose pathname
 * matches one of the given regex patterns. Runs on idle so it never touches the
 * critical path.
 * @param {Array<RegExp|string>} patterns regexes (or strings) tested against location.pathname
 * @param {object} [config] optional config overrides
 */
/**
 * True when an authored `page-assistant` block exists on the page — either still
 * pending decoration ([data-block-name]) or already mounted (.page-assistant-root).
 * The global auto-mount uses this to always defer to an authored instance.
 */
function authoredInstanceExists() {
  return !!document.querySelector('[data-block-name="page-assistant"], .page-assistant-root');
}

// Path matcher: a RegExp is used as-is; a string is an anchored glob (`*`/`?`),
// so `/blog/*` matches `/blog/x` but not `/catalog/blog`, and `/*` matches all.
function pathMatcher(pattern) {
  if (pattern instanceof RegExp) return pattern;
  const escaped = String(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const glob = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${glob}$`);
}

export function autoMountByPath(patterns, config) {
  try {
    const list = (patterns || []).map(pathMatcher);
    const path = window.location.pathname;
    if (!list.some((re) => re.test(path))) return;
    // Merge order for global pages: DEFAULT_CONFIG (in normaliseConfig)
    // <- window.pageAssistantConfig <- config passed here.
    const merged = { ...globalBaseConfig(), ...(config || {}) };
    const run = () => {
      // An authored block on this page always wins: skip the global mount so its
      // page-specific config takes precedence over the bulk configuration.
      if (window[MOUNT_FLAG] || authoredInstanceExists()) return;
      mountAssistant(merged).catch(() => { /* never break the page */ });
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 3000 });
    } else {
      window.setTimeout(run, 1200);
    }
  } catch (err) {
    // Never let the assistant break the page.
  }
}

/**
 * Authored block entry point. Reads config from the block, removes the authored
 * placeholder (the assistant renders as a floating overlay, not inline), and
 * mounts the shared assistant.
 * @param {Element} block the page-assistant block element
 */
export default async function decorate(block) {
  const raw = readBlockConfig(block);
  const str = (v) => (Array.isArray(v) ? v.join(', ') : `${v ?? ''}`).trim();
  const config = {
    subtext: str(raw.subtext) || undefined,
    systemPrompt: str(raw['system-prompt'] || raw.systemprompt) || undefined,
    maxContextChars: str(raw['max-context-chars'] || raw.maxcontextchars) || undefined,
    position: str(raw.position) || undefined,
    summaryType: str(raw['summary-type'] || raw.summarytype) || undefined,
    title: str(raw.title) || undefined,
    accent: str(raw.accent || raw['accent-color'] || raw.accentcolor) || undefined,
    accentHover: str(raw['accent-hover'] || raw.accenthover) || undefined,
    showWhenDownloadable: str(raw['show-when-downloadable'] || raw.showwhendownloadable) || undefined,
  };
  // Drop undefined keys so defaults apply cleanly.
  Object.keys(config).forEach((k) => config[k] === undefined && delete config[k]);

  // Merge order: DEFAULT_CONFIG (in normaliseConfig) <- site-wide base config
  // <- fields set on this authored block. Authored fields override the global
  // base per page; unset fields inherit it (merge, not full replace).
  const merged = { ...globalBaseConfig(), ...config };

  block.remove();
  await mountAssistant(merged);
}
