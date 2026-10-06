/* 德州陪练 · 界面与流程 */
(function () {
  'use strict';
  const E = window.PokerEngine, C = window.PokerCoach, AI = window.PokerAI, N = window.PokerNarrate;

  /* ---------- 常量 ---------- */
  const HERO = 0;
  const BUYIN = 2000;
  const BLINDS = { sb: 10, bb: 20 };
  const RELIEF = 2000;
  const DAILY = 500;
  const STORAGE_KEY = 'dezhou-peilian:v1';
  const DEBUG = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const BOT_POOL = [
    { name: '老王', style: 'tag' }, { name: '小李', style: 'lag' }, { name: '阿强', style: 'balanced' },
    { name: '美玲', style: 'rock' }, { name: '大刀', style: 'station' }, { name: '阿花', style: 'lag' },
    { name: '老陈', style: 'tag' }, { name: '小雨', style: 'balanced' }, { name: '彪哥', style: 'station' }, { name: '阿杰', style: 'rock' },
  ];
  const STYLE_HUE = { tag: 'oklch(42% 0.12 25)', lag: 'oklch(48% 0.13 60)', rock: 'oklch(42% 0.1 250)', station: 'oklch(44% 0.11 300)', balanced: 'oklch(42% 0.09 190)' };
  const POS_SHORT = { BTN: '庄', SB: '小盲', BB: '大盲', UTG: '枪口', HJ: '中位', CO: '关煞', 'BTN/SB': '庄·小盲', 'UTG+1': '枪口+1', MP: '中位', 'CO-1': '关煞前' };
  const LEVEL_TITLES = [[1, '新手'], [3, '常客'], [6, '牌手'], [10, '老手'], [14, '高手'], [18, '牌王']];
  const UNLOCKS = [
    { level: 3, type: 'felt', id: 'blue', name: '蓝色桌布' },
    { level: 4, type: 'back', id: 'ocean', name: '海蓝牌背' },
    { level: 6, type: 'felt', id: 'red', name: '红色桌布' },
    { level: 8, type: 'back', id: 'forest', name: '墨绿牌背' },
    { level: 10, type: 'felt', id: 'purple', name: '紫色桌布' },
  ];
  const ACHIEVEMENTS = [
    { id: 'first-win', name: '首胜', desc: '第一次赢下底池', reward: 200 },
    { id: 'flush', name: '一手同花', desc: '用同花赢下摊牌', reward: 300 },
    { id: 'full-house', name: '葫芦', desc: '用葫芦赢下摊牌', reward: 400 },
    { id: 'quads', name: '四条', desc: '用四条赢下摊牌', reward: 800 },
    { id: 'straight-flush', name: '同花顺', desc: '用同花顺赢下摊牌', reward: 1500 },
    { id: 'royal', name: '皇家同花顺', desc: '拿到皇家同花顺并赢下摊牌', reward: 5000 },
    { id: 'steal', name: '偷盲成功', desc: '在庄位或关煞位翻牌前加注，所有人弃牌', reward: 150 },
    { id: 'bluff', name: '诈唬成功', desc: '河牌圈下注或加注，对手全弃牌，而你连一对都没有', reward: 300 },
    { id: 'allin-win', name: '全下获胜', desc: '全下并赢下摊牌', reward: 300 },
    { id: 'big-pot', name: '大底池', desc: '赢下超过 100 个大盲（2,000）的底池', reward: 500 },
    { id: 'streak3', name: '三连胜', desc: '连续赢下三手', reward: 300 },
    { id: 'double', name: '翻倍离场', desc: '离开牌桌时筹码超过买入的两倍', reward: 500 },
    { id: 'dealer10', name: '发牌员十连对', desc: '发牌员模式连续答对 10 题', reward: 400 },
    { id: 'dealer50', name: '发牌员上岗', desc: '发牌员模式累计答对 50 题', reward: 800 },
    { id: 'river-hit', name: '河牌逆转', desc: '河牌补中同花或顺子并赢下摊牌', reward: 300 },
    { id: 'coach20', name: '听劝', desc: '连续 20 次行动和教练建议一致', reward: 300 },
    { id: 'hands100', name: '一百手', desc: '打满 100 手牌', reward: 500 },
    { id: 'hands500', name: '五百手', desc: '打满 500 手牌', reward: 1500 },
    { id: 'signin7', name: '一周不落', desc: '连续签到 7 天', reward: 700 },
  ];
  const MISSION_POOL = [
    { id: 'hands', ns: [10, 15], text: n => '打 ' + n + ' 手牌', reward: 200 },
    { id: 'wins', ns: [3, 4], text: n => '赢下 ' + n + ' 手', reward: 300 },
    { id: 'showdown', ns: [1, 2], text: n => '摊牌赢 ' + n + ' 次', reward: 300 },
    { id: 'dealer', ns: [5, 8], text: n => '发牌员模式答对 ' + n + ' 题', reward: 300 },
    { id: 'steal', ns: [1, 2], text: n => '翻牌前加注让所有人弃牌 ' + n + ' 次', reward: 250 },
    { id: 'bighand', ns: [1], text: () => '用同花或更大的牌型赢一次摊牌', reward: 400 },
    { id: 'coach', ns: [8, 12], text: n => '开着教练模式，按建议行动 ' + n + ' 次', reward: 200 },
    { id: 'vpip', ns: [5, 8], text: n => '翻牌前主动跟注或加注 ' + n + ' 次', reward: 150 },
  ];

  const DEFAULT_PROFILE = () => ({
    bankroll: 10000, xp: 0, achievements: {}, lastDaily: null, signinStreak: 0,
    stats: { hands: 0, wins: 0, showdownWins: 0, vpipHands: 0, biggestPot: 0, bestHand: null, bestHandScore: 0, dealerCorrect: 0, dealerTotal: 0, dealerStreak: 0, dealerBest: 0, bustCount: 0, streak: 0, bestStreak: 0, chipsWon: 0, coachAgree: 0, coachTotal: 0, coachStreak: 0 },
    settings: { coach: true, dealer: false, opponents: 5, fourColor: false, sound: true, speed: 'normal', autoNext: true, felt: 'green', back: 'classic', showBots: true, heroTimer: true, autoAct: false },
    daily: null,
    lastTable: null,
    session: null,
  });

  /* ---------- 工具 ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const fmt = n => Math.round(n).toLocaleString('zh-CN');
  const signed = n => (n >= 0 ? '+' : '') + fmt(n);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    }
    if (children) for (const c of [].concat(children)) if (c != null) node.append(c);
    return node;
  }
  function dateStr(d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  const today = () => dateStr(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dateStr(d); };
  function seededRng(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const speedFactor = () => ({ slow: 1.6, normal: 1, fast: 0.4 })[profile.settings.speed] || 1;
  const T = ms => Math.round(ms * speedFactor());
  const CLOSE_ICON = '<svg class="icon" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  /* ---------- 存储 ---------- */
  let profile = DEFAULT_PROFILE();
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const base = DEFAULT_PROFILE();
        profile = Object.assign(base, saved, {
          stats: Object.assign(base.stats, saved.stats || {}),
          settings: Object.assign(base.settings, saved.settings || {}),
          achievements: saved.achievements || {},
        });
      }
    } catch (e) { profile = DEFAULT_PROFILE(); }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch (e) { /* 忽略 */ }
  }

  /* ---------- 等级与成就 ---------- */
  function xpForLevel(level) { return level <= 1 ? 0 : 50 * (level - 1) * level; }
  function levelFromXp(xp) { let level = 1; while (xpForLevel(level + 1) <= xp && level < 40) level++; return level; }
  function levelTitle(level) { let title = '新手'; for (const [min, name] of LEVEL_TITLES) if (level >= min) title = name; return title; }
  function isUnlocked(type, id) {
    if ((type === 'felt' && id === 'green') || (type === 'back' && id === 'classic')) return true;
    const u = UNLOCKS.find(x => x.type === type && x.id === id);
    return !!u && levelFromXp(profile.xp) >= u.level;
  }
  function nextUnlockText(level) {
    const next = UNLOCKS.find(u => u.level > level);
    return next ? '升到 ' + next.level + ' 级解锁' + next.name : '所有桌布和牌背都已解锁';
  }
  function unlock(id) {
    if (profile.achievements[id]) return false;
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (!a) return false;
    profile.achievements[id] = today();
    profile.bankroll += a.reward;
    save();
    toast('成就 · ' + a.name + ' · 奖励 ' + fmt(a.reward) + ' 筹码', true);
    return true;
  }
  function addXp(n) {
    const before = levelFromXp(profile.xp);
    profile.xp += n;
    const after = levelFromXp(profile.xp);
    if (after > before) toast('升到 ' + after + ' 级 · ' + levelTitle(after) + '。' + nextUnlockText(after), true);
  }

  /* ---------- 每日任务与签到 ---------- */
  function ensureDaily() {
    const d = today();
    if (profile.daily && profile.daily.date === d) return;
    const rng = seededRng('mission-' + d);
    const pool = MISSION_POOL.slice();
    const missions = [];
    while (missions.length < 3 && pool.length) {
      const m = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      const n = m.ns[Math.floor(rng() * m.ns.length)];
      missions.push({ id: m.id, n, progress: 0, done: false, reward: m.reward, text: m.text(n) });
    }
    profile.daily = { date: d, missions };
    save();
  }
  function mission(id, inc) {
    if (!profile.daily) return;
    for (const m of profile.daily.missions) {
      if (m.id !== id || m.done) continue;
      m.progress = Math.min(m.n, m.progress + (inc || 1));
      if (m.progress >= m.n) {
        m.done = true;
        profile.bankroll += m.reward;
        toast('今日任务完成 · ' + m.text + ' · +' + fmt(m.reward), true);
      }
    }
    save();
  }
  function dailyBonus() {
    const d = today();
    if (profile.lastDaily === d) { profile.signinStreak = Math.max(1, profile.signinStreak || 0); return; }
    profile.signinStreak = profile.lastDaily === yesterday() ? (profile.signinStreak || 0) + 1 : 1;
    profile.lastDaily = d;
    const bonus = Math.min(1000, DAILY + 100 * (profile.signinStreak - 1));
    profile.bankroll += bonus;
    profile.todayBonus = bonus;
    save();
    if (profile.signinStreak >= 7) unlock('signin7');
  }

  /* ---------- 音效 ---------- */
  const Sound = (() => {
    let ctx = null;
    function ensure() {
      if (!profile.settings.sound) return null;
      try { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) { return null; }
      return ctx;
    }
    function tone(freq, dur, type, gain, when) {
      const c = ensure(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      const t = c.currentTime + (when || 0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain || 0.08, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    }
    function noise(dur, gain) {
      const c = ensure(); if (!c) return;
      const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = c.createBufferSource(); s.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800;
      const g = c.createGain(); g.gain.value = gain || 0.05;
      s.connect(f).connect(g).connect(c.destination); s.start();
    }
    return {
      deal() { noise(0.06, 0.04); },
      chip() { tone(1900, 0.05, 'triangle', 0.05); tone(2600, 0.04, 'triangle', 0.03, 0.03); },
      check() { tone(220, 0.06, 'square', 0.04); tone(220, 0.06, 'square', 0.04, 0.1); },
      fold() { noise(0.05, 0.02); },
      win() { tone(660, 0.12, 'sine', 0.07); tone(880, 0.14, 'sine', 0.07, 0.11); tone(1320, 0.2, 'sine', 0.06, 0.22); },
      turn() { tone(988, 0.09, 'sine', 0.05); tone(1319, 0.12, 'sine', 0.04, 0.09); },
      tap() { tone(1200, 0.04, 'sine', 0.03); },
      unlock() { ensure(); },
    };
  })();

  /* ---------- 牌的渲染 ---------- */
  const SUIT_CLASS = { s: 'spade', h: 'heart', d: 'diamond', c: 'club' };
  function cardEl(card, opts) {
    opts = opts || {};
    const node = el('div', { class: 'card' });
    if (!card || opts.back) { node.classList.add('back'); node.append(el('span')); return node; }
    const suit = card[1];
    node.classList.add(SUIT_CLASS[suit]);
    if (suit === 'h' || suit === 'd') node.classList.add('red');
    node.dataset.card = card;
    node.setAttribute('aria-label', C.cardText(card));
    node.append(el('div', { class: 'face' }, [
      el('div', null, [el('div', { class: 'rank', text: card[0] === 'T' ? '10' : card[0] }), el('div', { class: 'suit-sm', text: C.SUIT_SYMBOLS[suit] })]),
      el('div', { class: 'suit-big', text: C.SUIT_SYMBOLS[suit] }),
    ]));
    return node;
  }

  /* ---------- 浮层 ---------- */
  const overlayHost = $('#overlay-host');
  function closeOverlays() { overlayHost.innerHTML = ''; }
  function openSheet(contentNode, opts) {
    opts = opts || {};
    closeOverlays();
    const scrim = el('div', { class: 'scrim' + (opts.center ? ' center' : '') });
    const sheet = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' });
    sheet.append(contentNode);
    scrim.append(sheet);
    scrim.addEventListener('click', e => { if (e.target === scrim && !opts.sticky) { closeOverlays(); if (opts.onClose) opts.onClose(); } });
    sheet.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { closeOverlays(); if (opts.onClose) opts.onClose(); }));
    overlayHost.append(scrim);
    const first = sheet.querySelector('button:not([data-close])');
    if (first && opts.focus !== false) first.focus({ preventScroll: true });
    return sheet;
  }
  function sheetHead(title) {
    return el('div', { class: 'sheet-head' }, [el('h2', { text: title }), el('button', { type: 'button', class: 'btn-icon', 'data-close': '', 'aria-label': '关闭', html: CLOSE_ICON })]);
  }
  function fromTemplate(id) {
    const frag = document.getElementById(id).content.cloneNode(true);
    const wrap = el('div');
    wrap.style.display = 'contents';
    wrap.append(frag);
    return wrap;
  }
  const toastWrap = $('#toast-wrap');
  function toast(text, gold) {
    const t = el('div', { class: 'toast' + (gold ? ' gold' : ''), text });
    toastWrap.append(t);
    setTimeout(() => { t.style.transition = 'opacity 300ms'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, gold ? 3800 : 2400);
  }

  /* ---------- 大厅 ---------- */
  const lobby = $('#lobby'), tableScreen = $('#table');
  function renderLobby() {
    const level = levelFromXp(profile.xp);
    $('#bank-amount').textContent = fmt(profile.bankroll);
    $('#level-no').textContent = level;
    $('#level-title').textContent = levelTitle(level);
    $('#level-no-2').textContent = level;
    $('#level-title-2').textContent = levelTitle(level);
    const cur = xpForLevel(level), next = xpForLevel(level + 1);
    $('#level-xp').textContent = fmt(profile.xp - cur) + ' / ' + fmt(next - cur);
    $('#level-bar').style.transform = 'scaleX(' + Math.min(1, (profile.xp - cur) / (next - cur)) + ')';
    $('#level-next').textContent = nextUnlockText(level);
    const last = $('#bank-last');
    if (profile.lastTable) {
      const t = profile.lastTable;
      last.hidden = false;
      last.innerHTML = '';
      last.append('上次牌桌：打了 ', el('strong', { text: fmt(t.hands) + ' 手' }), '，结果 ', el('strong', { text: signed(t.net) }), t.biggestPot ? '，最大底池 ' + fmt(t.biggestPot) : '');
    } else last.hidden = true;
    const fan = $('#lobby-fan');
    if (!fan.childElementCount) { fan.append(cardEl('As'), cardEl('Ah')); }
    const signin = $('#today-signin');
    signin.textContent = profile.todayBonus ? '签到 +' + fmt(profile.todayBonus) + ' · 连续 ' + profile.signinStreak + ' 天' : '连续签到 ' + (profile.signinStreak || 0) + ' 天';
    const ml = $('#missions');
    ml.innerHTML = '';
    if (profile.daily) profile.daily.missions.forEach(m => {
      ml.append(el('li', { class: 'mission' + (m.done ? ' done' : '') }, [
        el('span', { class: 'mission-text', text: m.text }),
        el('span', { class: 'mission-reward num', text: m.done ? '已完成' : '+' + fmt(m.reward) }),
        el('div', { class: 'bar' }, el('span', { style: 'transform: scaleX(' + Math.min(1, m.progress / m.n) + ')' })),
        el('span', { class: 'mission-progress', text: Math.min(m.progress, m.n) + ' / ' + m.n }),
      ]));
    });
    $$('#opp-seg button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.n) === profile.settings.opponents)));
    $('#toggle-coach').setAttribute('aria-checked', String(profile.settings.coach));
    $('#toggle-dealer').setAttribute('aria-checked', String(profile.settings.dealer));
    const start = $('#btn-start'), relief = $('#btn-relief'), note = $('#start-note');
    if (profile.session) {
      start.textContent = '回到牌桌 · 桌上 ' + fmt(profile.session.players[HERO].chips);
      start.disabled = false;
      relief.hidden = false;
      relief.textContent = '结算离开';
      note.textContent = '上一局还在进行中，可以继续，也可以把桌上筹码结算回余额。';
    } else {
      start.textContent = '坐下 · 买入 ' + fmt(BUYIN);
      start.disabled = profile.bankroll < BUYIN;
      relief.hidden = profile.bankroll >= BUYIN;
      relief.textContent = '领取救济金 ' + fmt(RELIEF);
      note.textContent = profile.bankroll < BUYIN
        ? '余额不够买入。领一笔救济金重新开始，破产次数会记入统计。'
        : '盲注 10 / 20，无限注现金桌。离开牌桌时筹码结算回余额。';
    }
  }
  function applyTheme() {
    document.documentElement.dataset.felt = isUnlocked('felt', profile.settings.felt) ? profile.settings.felt : 'green';
    document.documentElement.dataset.back = isUnlocked('back', profile.settings.back) ? profile.settings.back : 'classic';
    document.body.classList.toggle('four-color', !!profile.settings.fourColor);
  }

  $('#opp-seg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    profile.settings.opponents = Number(b.dataset.n); save(); renderLobby();
  });
  $$('#lobby [data-setting][role="switch"]').forEach(sw => sw.addEventListener('click', () => {
    const key = sw.dataset.setting;
    profile.settings[key] = !profile.settings[key]; save(); renderLobby();
    if (session) renderAll();
  }));
  $$('[data-open]').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.open)));
  $('#btn-start').addEventListener('click', () => {
    Sound.unlock();
    if (profile.session) resumeTable(); else sitDown();
  });
  $('#btn-relief').addEventListener('click', () => {
    if (profile.session) { cashOutSaved(); return; }
    profile.bankroll += RELIEF; profile.stats.bustCount++; save(); renderLobby();
    toast('救济金 +' + fmt(RELIEF) + ' 已入账');
  });

  /* ---------- 面板：规则 / 成就 / 统计 / 设置 ---------- */
  function openPanel(kind) {
    if (kind === 'rules') return openRules();
    if (kind === 'achievements') return openAchievements();
    if (kind === 'stats') return openStats();
    if (kind === 'settings') return openSettings();
  }
  const RANK_EXAMPLES = [
    ['皇家同花顺', ['As', 'Ks', 'Qs', 'Js', 'Ts'], '同花色的 10 J Q K A'],
    ['同花顺', ['9h', '8h', '7h', '6h', '5h'], '同花色的五张连牌'],
    ['四条', ['Qc', 'Qd', 'Qh', 'Qs', '7d'], '四张同点数'],
    ['葫芦', ['Kc', 'Kd', 'Kh', '9s', '9d'], '三条加一对，先比三条'],
    ['同花', ['Ad', 'Jd', '8d', '5d', '3d'], '五张同花色，比最大的牌'],
    ['顺子', ['Tc', '9d', '8h', '7s', '6c'], '五张连牌，A 可以当最大也可以当最小'],
    ['三条', ['8c', '8d', '8h', 'Ks', '4d'], '三张同点数'],
    ['两对', ['Ac', 'Ad', '9h', '9s', '5d'], '先比大的对子，再比小的，再比踢脚'],
    ['一对', ['Jc', 'Jd', 'Ah', '7s', '3d'], '两张同点数，再比剩下三张'],
    ['高牌', ['Ac', 'Qd', '9h', '6s', '2d'], '什么都没凑成，比最大的牌'],
  ];
  function positionDiagram() {
    const cx = 180, cy = 112, rx = 130, ry = 72;
    const seats = [[90, '庄'], [150, '小盲'], [210, '大盲'], [270, '枪口'], [330, '中位'], [30, '关煞']];
    const pt = (deg, kx, ky) => { const a = deg * Math.PI / 180; return [cx + rx * (kx || 1) * Math.cos(a), cy + ry * (ky || 1) * Math.sin(a)]; };
    let s = '<svg viewBox="0 0 360 232" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="六人桌位置图">';
    s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="var(--color-felt)" stroke="var(--color-rail)" stroke-width="8"/>';
    s += '<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/></marker></defs>';
    const a1 = pt(225, 0.8, 0.72), a2 = pt(258, 0.8, 0.72);
    s += '<path d="M' + a1[0].toFixed(1) + ' ' + a1[1].toFixed(1) + ' A' + (rx * 0.8).toFixed(1) + ' ' + (ry * 0.72).toFixed(1) + ' 0 0 1 ' + a2[0].toFixed(1) + ' ' + a2[1].toFixed(1) + '" fill="none" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#arrow)"/>';
    s += '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="11" fill="oklch(85% 0.04 160 / 0.8)">顺时针发牌、叫牌</text>';
    for (const [deg, label] of seats) {
      const [x, y] = pt(deg);
      const btn = label === '庄';
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="19" fill="' + (btn ? 'var(--color-card)' : 'var(--color-paper-3)') + '" stroke="' + (btn ? 'var(--color-accent)' : 'var(--color-paper-4)') + '" stroke-width="2"/>';
      s += '<text x="' + x.toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + (btn ? 'var(--color-card-ink)' : 'var(--color-ink)') + '">' + label + '</text>';
    }
    s += '<text x="' + cx + '" y="16" text-anchor="middle" font-size="10" fill="var(--color-accent)">翻牌前从枪口开始</text>';
    s += '<text x="8" y="206" text-anchor="start" font-size="10" fill="var(--color-accent)">翻牌后从小盲开始</text>';
    s += '<text x="' + cx + '" y="224" text-anchor="middle" font-size="10" fill="var(--color-muted)">庄家永远最后行动</text>';
    s += '</svg>';
    return s;
  }
  function openRules(tab) {
    const node = fromTemplate('tpl-rules');
    const rows = $('#rank-rows', node);
    RANK_EXAMPLES.forEach(([name, cards, desc]) => {
      rows.append(el('tr', null, [el('td', { text: name }), el('td', null, el('div', { class: 'mini-cards' }, cards.map(c => cardEl(c)))), el('td', { text: desc })]));
    });
    $('#position-diagram', node).innerHTML = positionDiagram();
    const select = id => {
      $$('[data-tab]', node).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === id)));
      $$('[data-panel]', node).forEach(p => { p.hidden = p.dataset.panel !== id; });
    };
    node.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) select(t.dataset.tab); });
    if (tab) select(tab);
    openSheet(node);
  }
  function openAchievements() {
    const node = fromTemplate('tpl-achievements');
    const got = Object.keys(profile.achievements).length;
    $('#achv-summary', node).textContent = '已达成 ' + got + ' / ' + ACHIEVEMENTS.length + '，每个成就奖励一次筹码。';
    const grid = $('#achv-grid', node);
    ACHIEVEMENTS.forEach(a => {
      const date = profile.achievements[a.id];
      grid.append(el('div', { class: 'achv' + (date ? '' : ' locked') }, [
        el('strong', { text: a.name }), el('small', { text: a.desc }),
        el('span', { class: 'reward', text: date ? '已达成 · ' + date : '+' + fmt(a.reward) }),
      ]));
    });
    openSheet(node);
  }
  function openStats() {
    const node = fromTemplate('tpl-stats');
    const s = profile.stats;
    const pct = (a, b) => (b ? Math.round(a / b * 100) + '%' : '—');
    const items = [
      ['手数', fmt(s.hands)], ['赢下的手数', fmt(s.wins)], ['胜率', pct(s.wins, s.hands)],
      ['摊牌获胜', fmt(s.showdownWins)], ['入池率', pct(s.vpipHands, s.hands)], ['最大底池', fmt(s.biggestPot)],
      ['累计赢得', fmt(s.chipsWon)], ['最佳牌型', s.bestHand || '—'], ['最长连胜', fmt(s.bestStreak)],
      ['与建议一致', s.coachTotal ? pct(s.coachAgree, s.coachTotal) : '—'],
      ['发牌员答题', s.dealerTotal ? fmt(s.dealerCorrect) + ' / ' + fmt(s.dealerTotal) : '—'], ['发牌员正确率', pct(s.dealerCorrect, s.dealerTotal)], ['发牌员最长连对', fmt(s.dealerBest)],
      ['连续签到', fmt(profile.signinStreak || 0) + ' 天'], ['破产次数', fmt(s.bustCount)], ['经验', fmt(profile.xp)],
    ];
    const grid = $('#stat-grid', node);
    items.forEach(([k, v]) => grid.append(el('div', { class: 'stat' }, [el('small', { text: k }), el('span', { class: 'num', text: v })])));
    openSheet(node);
  }
  function openSettings() {
    const node = fromTemplate('tpl-settings');
    const list = $('#settings-list', node);
    const sw = (key, label, small) => {
      const b = el('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(!!profile.settings[key]) }, [
        el('span', { class: 'switch-label' }, [document.createTextNode(label), small ? el('small', { text: small }) : null]), el('span', { class: 'switch-track' }),
      ]);
      b.addEventListener('click', () => { profile.settings[key] = !profile.settings[key]; b.setAttribute('aria-checked', String(profile.settings[key])); save(); applyTheme(); renderLobby(); if (session) renderAll(); });
      return b;
    };
    const seg = (key, label, options, small) => {
      const group = el('div', { class: 'seg' });
      options.forEach(([val, name]) => {
        const b = el('button', { type: 'button', text: name, 'aria-pressed': String(profile.settings[key] === val) });
        b.addEventListener('click', () => { profile.settings[key] = val; save(); $$('button', group).forEach(x => x.setAttribute('aria-pressed', String(x === b))); applyTheme(); renderLobby(); if (session) renderAll(); });
        group.append(b);
      });
      return el('div', { class: 'setting-row' }, [el('span', null, [document.createTextNode(label), small ? el('small', { text: small }) : null]), group]);
    };
    const swatches = (key, type, label, options) => {
      const row = el('div', { class: 'swatches' });
      options.forEach(([id, name]) => {
        const unlocked = isUnlocked(type, id);
        const u = UNLOCKS.find(x => x.type === type && x.id === id);
        const b = el('button', { type: 'button', class: 'swatch ' + id, 'aria-label': name + (unlocked ? '' : '（' + u.level + ' 级解锁）'), title: name + (unlocked ? '' : ' · ' + u.level + ' 级解锁'), 'aria-pressed': String(profile.settings[key] === id) });
        if (!unlocked) b.disabled = true;
        b.addEventListener('click', () => { profile.settings[key] = id; save(); $$('button', row).forEach(x => x.setAttribute('aria-pressed', String(x === b))); applyTheme(); });
        row.append(b);
      });
      return el('div', { class: 'setting-row' }, [el('span', null, [document.createTextNode(label), el('small', { text: '升级解锁更多' })]), row]);
    };
    list.append(
      sw('coach', '教练模式', '解释每个动作，标出每个人还差多少，给出建议和理由'),
      sw('dealer', '发牌员模式', '关键节点先问你：谁出盲注、谁先行动、最少加注到多少、下一步做什么、谁赢'),
      sw('showBots', '对手摊牌时亮牌', '关掉后只亮赢家的牌，更接近线下'),
      sw('fourColor', '四色牌', '方块蓝色、梅花绿色，更容易看出同花'),
      sw('sound', '音效'),
      sw('autoNext', '一手结束后自动开下一手'),
      sw('heroTimer', '轮到你时显示 30 秒倒计时', '和线下一样给自己一点压力'),
      sw('autoAct', '倒计时结束自动过牌或弃牌', '关掉的话时间到了也可以继续想'),
      seg('speed', '对手速度', [['slow', '慢'], ['normal', '正常'], ['fast', '快']]),
      seg('opponents', '对手人数', [[2, '2'], [3, '3'], [4, '4'], [5, '5']], '下一次坐下时生效'),
      swatches('felt', 'felt', '桌布', [['green', '绿'], ['blue', '蓝'], ['red', '红'], ['purple', '紫']]),
      swatches('back', 'back', '牌背', [['classic', '经典'], ['ocean', '海蓝'], ['forest', '墨绿']]),
    );
    const reset = $('#btn-reset', node);
    let armed = false;
    reset.addEventListener('click', () => {
      if (!armed) { armed = true; reset.textContent = '再点一次确认清空'; setTimeout(() => { armed = false; reset.textContent = '清空全部数据'; }, 4000); return; }
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* 忽略 */ }
      if (session) { session.token.cancelled = true; closeQuiz(); session = null; }
      profile = DEFAULT_PROFILE(); ensureDaily(); dailyBonus(); save(); applyTheme(); closeOverlays(); showLobby();
      toast('已清空，重新开始');
    });
    openSheet(node);
  }

  /* ---------- 牌桌：会话 ---------- */
  let session = null;
  const seatsHost = $('#seats'), betsHost = $('#bets'), tableWrap = $('#table-wrap');
  const seatEls = [], betEls = [];

  function botStack() { return 1500 + 100 * Math.floor(Math.random() * 16); }
  function pickBots(n) {
    const pool = BOT_POOL.slice();
    const out = [];
    while (out.length < n && pool.length) {
      const b = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      out.push({ name: b.name, style: b.style, chips: botStack() });
    }
    return out;
  }
  function sitDown() {
    if (profile.bankroll < BUYIN) return;
    profile.bankroll -= BUYIN;
    const players = [{ name: '你', chips: BUYIN, isHuman: true }].concat(pickBots(profile.settings.opponents));
    const game = new E.Game({ players, blinds: BLINDS, rng: secureRandom });
    beginSession(game, { buyIn: BUYIN, hands: 0, wins: 0, biggestPot: 0, coachAgree: 0, coachTotal: 0 });
    saveSession(-1);
  }
  function resumeTable() {
    const s = profile.session;
    const game = new E.Game({ players: s.players, blinds: BLINDS, button: s.button, rng: secureRandom });
    game.handNo = s.handNo || 0;
    beginSession(game, s.stats || { buyIn: BUYIN, hands: 0, wins: 0, biggestPot: 0, coachAgree: 0, coachTotal: 0 });
  }
  function cashOutSaved() {
    const s = profile.session;
    if (!s) return;
    profile.bankroll += s.players[HERO].chips;
    profile.session = null; save(); renderLobby();
    toast('已结算 ' + fmt(s.players[HERO].chips) + ' 回余额');
  }
  function saveSession(buttonBefore) {
    const g = session.game;
    profile.session = { button: buttonBefore, handNo: g.handNo, stats: session.stats, players: g.players.map(p => ({ name: p.name, chips: p.chips, isHuman: p.isHuman, style: p.style })) };
    save();
  }
  function beginSession(game, stats) {
    session = { game, token: { cancelled: false }, log: [], hand: null, stats, quizPending: false, quizHide: false, animating: false, loopActive: false, hideBets: false, rec: null };
    buildSeats();
    showTable();
    renderAll();
    startNextHand();
  }
  function showTable() { lobby.hidden = true; tableScreen.hidden = false; layoutSeats(); }
  function showLobby() { tableScreen.hidden = true; lobby.hidden = false; renderLobby(); }

  function leaveTable() {
    if (!session) return;
    const g = session.game, st = session.stats;
    session.token.cancelled = true;
    stopHeroTimer();
    closeOverlays();
    closeQuiz();
    if (g.phase === 'betting' || g.phase === 'between') fastForward();
    const chips = g.players[HERO].chips;
    profile.bankroll += chips;
    const net = chips - st.buyIn;
    if (chips >= st.buyIn * 2) unlock('double');
    profile.lastTable = { date: today(), hands: st.hands, wins: st.wins, net, biggestPot: st.biggestPot, coachAgree: st.coachAgree, coachTotal: st.coachTotal };
    profile.session = null;
    save();
    session = null;
    showLobby();
    if (st.hands > 0) showTableSummary(profile.lastTable, chips);
    else toast('结算 ' + fmt(chips) + ' 回余额');
  }
  function fastForward() {
    const g = session.game;
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'idle' && guard++ < 300) {
      if (g.phase === 'betting') {
        if (g.toAct === HERO) { const legal = g.legalActions(HERO); g.act(HERO, { type: legal.check ? 'check' : 'fold' }); }
        else g.act(g.toAct, AI.decide(g, g.toAct));
      } else g.advance();
    }
  }
  function showTableSummary(t, chips) {
    const rows = [['手数', fmt(t.hands)], ['赢下', fmt(t.wins) + ' 手'], ['结算回余额', fmt(chips)], ['净结果', signed(t.net)], ['最大底池', fmt(t.biggestPot)]];
    if (t.coachTotal) rows.push(['与教练建议一致', Math.round(t.coachAgree / t.coachTotal * 100) + '%（' + t.coachAgree + ' / ' + t.coachTotal + '）']);
    const node = el('div', { class: 'result' }, [
      el('h2', { class: 'result-title' + (t.net > 0 ? ' win' : ''), text: t.net > 0 ? '这次赚了 ' + signed(t.net) : t.net < 0 ? '这次亏了 ' + fmt(-t.net) : '这次打平' }),
      el('div', { class: 'result-lines' }, rows.map(([k, v]) => el('div', { class: 'row' }, [el('span', { text: k }), el('span', { class: 'num', text: v })]))),
      el('div', { class: 'result-foot' }, [el('button', { type: 'button', class: 'btn btn-primary', text: '好', onclick: closeOverlays })]),
    ]);
    openSheet(node, { center: true });
  }

  /* ---------- 座位布局 ---------- */
  function buildSeats() {
    seatsHost.innerHTML = ''; betsHost.innerHTML = '';
    seatEls.length = 0; betEls.length = 0;
    session.game.players.forEach((p, i) => {
      const avatar = el('div', { class: 'avatar', text: p.name.slice(0, 1) });
      avatar.insertAdjacentHTML('beforeend', '<svg class="ring" viewBox="0 0 36 36" aria-hidden="true"><circle class="track" cx="18" cy="18" r="16" pathLength="100"/><circle class="fill" cx="18" cy="18" r="16" pathLength="100"/></svg>');
      if (i !== HERO && STYLE_HUE[p.style]) avatar.style.setProperty('--avatar-bg', STYLE_HUE[p.style]);
      const seat = el('div', { class: 'seat' + (i === HERO ? ' hero' : ''), 'data-seat': i }, [
        el('div', { class: 'seat-cards' }),
        el('div', { class: 'seat-box' }, [
          el('span', { class: 'seat-pos' }),
          el('div', { class: 'seat-main' }, [avatar, el('div', { class: 'seat-text' }, [el('div', { class: 'seat-name', text: p.name }), el('div', { class: 'seat-chips num' })])]),
          el('div', { class: 'seat-status' }),
        ]),
      ]);
      seat.addEventListener('click', () => onSeatClick(i));
      seatsHost.append(seat);
      seatEls.push(seat);
      const bet = el('div', { class: 'bet' }, [el('div', { class: 'chip-stack' }), el('span', { class: 'num' })]);
      bet.hidden = true;
      betsHost.append(bet);
      betEls.push(bet);
    });
    layoutSeats();
  }
  function seatGeometry(i) {
    const n = session ? session.game.players.length : 1;
    const rect = tableWrap.getBoundingClientRect();
    const felt = $('.felt', tableWrap).getBoundingClientRect();
    const theta = (Math.PI / 2) + i * (2 * Math.PI / n);
    return { cx: rect.width / 2, cy: rect.height / 2, rx: felt.width / 2, ry: felt.height / 2, cos: Math.cos(theta), sin: Math.sin(theta) };
  }
  function layoutSeats() {
    if (!session || tableScreen.hidden) return;
    session.game.players.forEach((p, i) => {
      const g = seatGeometry(i);
      const seat = seatEls[i];
      seat.style.left = (g.cx + g.rx * g.cos) + 'px';
      seat.style.top = (g.cy + g.ry * g.sin) + 'px';
      seat.style.flexDirection = g.sin < -0.2 ? 'column-reverse' : 'column';
      const bet = betEls[i];
      bet.style.left = (g.cx + g.rx * 0.6 * g.cos) + 'px';
      bet.style.top = (g.cy + g.ry * 0.62 * g.sin) + 'px';
    });
    placeDealerButton();
  }
  function placeDealerButton() {
    const g = session.game, btn = $('#dealer-btn');
    if (g.button < 0) { btn.hidden = true; return; }
    const geo = seatGeometry(g.button);
    const theta = (Math.PI / 2) + g.button * (2 * Math.PI / g.players.length) + 0.42;
    btn.hidden = false;
    btn.style.left = (geo.cx + geo.rx * 0.8 * Math.cos(theta)) + 'px';
    btn.style.top = (geo.cy + geo.ry * 0.78 * Math.sin(theta)) + 'px';
  }
  new ResizeObserver(() => layoutSeats()).observe(tableWrap);

  /* ---------- 渲染 ---------- */
  function renderAll() {
    if (!session) return;
    renderSeats();
    renderBets();
    renderBoard();
    renderPot();
    renderHero();
    renderFlow();
    renderActions();
    placeDealerButton();
  }
  function actionLabel(a) {
    if (!a) return '';
    switch (a.type) {
      case 'sb': return '小盲 ' + fmt(a.amount);
      case 'bb': return '大盲 ' + fmt(a.amount);
      case 'fold': return '弃牌';
      case 'check': return '过牌';
      case 'call': return '跟注 ' + fmt(a.amount);
      case 'bet': return '下注 ' + fmt(a.amount);
      case 'raise': return '加注到 ' + fmt(a.amount);
    }
    return '';
  }
  function seatStatus(p) {
    const g = session.game;
    if (p.out) return ['', ''];
    if (p.folded) return ['弃牌', 'fold'];
    const last = actionLabel(p.lastAction);
    if (p.allIn) return ['全下', 'allin'];
    if (g.phase === 'betting') {
      if (g.toAct === p.seat) {
        if (session.quizPending && session.quizHide) return ['', ''];
        if (p.seat !== HERO) return ['思考中', 'act'];
        if (session.heroDeadline) { const left = Math.max(0, Math.ceil((session.heroDeadline - Date.now()) / 1000)); return [left > 0 ? '轮到你 · ' + left + ' 秒' : '轮到你 · 时间到', 'act']; }
        return ['轮到你', 'act'];
      }
      if (p.bet < g.currentBet) return profile.settings.coach ? ['还差 ' + fmt(g.currentBet - p.bet), 'need'] : [last, ''];
      if (p.acted) return ['✓ ' + (last || '已跟平'), 'ok'];
      return profile.settings.coach ? ['待表态', 'need'] : [last, ''];
    }
    return [last, p.lastAction && (p.lastAction.type === 'raise' || p.lastAction.type === 'bet') ? 'act' : ''];
  }
  function renderSeats() {
    const g = session.game;
    const pos = g.positions();
    g.players.forEach((p, i) => {
      const seat = seatEls[i];
      seat.classList.toggle('folded', p.folded);
      seat.classList.toggle('out', p.out);
      const active = g.phase === 'betting' && g.toAct === i && !(session.quizPending && session.quizHide);
      seat.classList.toggle('active', active);
      // 计时环只在思考时长确定后才开始（botTurn / startHeroTimer 里加 thinking）
      if (!active) seat.classList.remove('thinking');
      $('.seat-chips', seat).textContent = p.chips === 0 && !p.out ? '全下' : fmt(p.chips);
      const posEl = $('.seat-pos', seat);
      let label = pos[i];
      // 问“谁出小盲”时先别把答案写在座位上
      if (session.hideBets && label !== 'BTN' && label !== 'BTN/SB') label = '';
      posEl.textContent = label ? (POS_SHORT[label] || label) : '';
      posEl.hidden = !label;
      posEl.classList.toggle('is-btn', label === 'BTN' || label === 'BTN/SB');
      posEl.classList.toggle('is-blind', label === 'SB' || label === 'BB');
      const [text, cls] = session.hideBets ? ['', ''] : seatStatus(p);
      const st = $('.seat-status', seat);
      st.textContent = text;
      st.className = 'seat-status ' + cls;
      const cardsEl = $('.seat-cards', seat);
      const showFace = p.revealed && p.cards.length === 2;
      const key = (p.cards.length ? (showFace ? p.cards.join('') : 'back') : 'none') + (p.folded ? 'f' : '');
      if (cardsEl.dataset.key !== key) {
        cardsEl.dataset.key = key;
        cardsEl.innerHTML = '';
        if (i !== HERO && p.cards.length === 2 && !p.folded) p.cards.forEach(c => cardsEl.append(cardEl(showFace ? c : null)));
      }
      if (showFace && g.result && g.phase === 'done') {
        const best = p.hand ? p.hand.cards : [];
        $$('.card', cardsEl).forEach((c, k) => c.classList.toggle('best', best.includes(p.cards[k]) && g.result.winners.includes(i)));
      }
    });
  }
  function chipColor(amount) {
    if (amount >= 1000) return 'var(--chip-1000)';
    if (amount >= 500) return 'var(--chip-500)';
    if (amount >= 100) return 'var(--chip-100)';
    if (amount >= 25) return 'var(--chip-25)';
    return 'var(--chip-5)';
  }
  function renderBets() {
    const g = session.game;
    g.players.forEach((p, i) => {
      const bet = betEls[i];
      if (p.bet > 0 && !session.hideBets) {
        bet.hidden = false;
        $('.num', bet).textContent = fmt(p.bet);
        const stack = $('.chip-stack', bet);
        const count = Math.min(4, 1 + Math.floor(Math.log10(Math.max(1, p.bet / 10))));
        if (stack.dataset.amt !== String(p.bet)) {
          stack.dataset.amt = String(p.bet);
          stack.innerHTML = '';
          for (let k = 0; k < count; k++) { const c = el('div', { class: 'chip' }); c.style.top = (-3 * k) + 'px'; c.style.setProperty('--chip-color', chipColor(p.bet)); stack.append(c); }
        }
      } else bet.hidden = true;
    });
  }
  function heroBestFive() {
    const g = session.game, p = g.players[HERO];
    if (!profile.settings.coach || p.folded || p.out || p.cards.length < 2 || g.board.length < 3 || g.phase === 'done') return new Set();
    return new Set(C.bestFive(p.cards, g.board));
  }
  function renderBoard() {
    const g = session.game;
    const board = $('#board');
    const key = g.board.join('');
    if (board.dataset.key !== key) {
      board.dataset.key = key;
      board.innerHTML = '';
      g.board.forEach(c => board.append(cardEl(c)));
    }
    const mine = heroBestFive();
    const bestCards = new Set();
    if (g.phase === 'done' && g.result && !g.result.uncontested) g.result.winners.forEach(w => (g.players[w].hand ? g.players[w].hand.cards : []).forEach(c => bestCards.add(c)));
    $$('.card', board).forEach((cEl, k) => { cEl.classList.toggle('best', bestCards.has(g.board[k])); cEl.classList.toggle('mine', mine.has(g.board[k])); });
    const order = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    let cur = g.street || 'preflop';
    if (g.phase === 'done' && g.result && !g.result.uncontested) cur = 'showdown';
    const idx = order.indexOf(cur);
    $$('#tracker li').forEach((li, k) => { li.classList.toggle('done', k < idx || (g.phase === 'done' && k <= idx)); li.classList.toggle('current', k === idx && g.phase !== 'done'); });
  }
  function renderPot() {
    const g = session.game;
    $('#pot-amount').textContent = fmt(g.phase === 'done' ? 0 : g.potTotal());
  }
  function renderHero() {
    const g = session.game, p = g.players[HERO];
    const host = $('#hero-cards');
    const key = p.cards.join('') + (p.folded ? 'f' : '');
    if (host.dataset.key !== key) {
      host.dataset.key = key;
      host.innerHTML = '';
      if (p.cards.length === 2) p.cards.forEach(c => { const n = cardEl(c); if (p.folded) n.classList.add('dim'); host.append(n); });
      else host.append(cardEl(null), cardEl(null));
    }
    const mine = heroBestFive();
    const won = g.phase === 'done' && g.result && g.result.winners.includes(HERO) && p.hand && !g.result.uncontested;
    $$('.card', host).forEach((cEl, k) => { cEl.classList.toggle('best', !!won && p.hand.cards.includes(p.cards[k])); cEl.classList.toggle('mine', mine.has(p.cards[k])); });
    const title = $('#readout-title'), sub = $('#readout-sub');
    if (p.cards.length === 2 && !p.out) {
      const r = C.readout(p.cards, g.board);
      title.textContent = r.title;
      sub.textContent = p.folded ? '已弃牌' : (profile.settings.coach ? r.sub : '');
    } else { title.textContent = p.out ? '没有筹码了' : '等待发牌'; sub.textContent = ''; }
    const chip = $('#coach-chip');
    const mineTurn = g.phase === 'betting' && g.toAct === HERO && !session.quizPending && !session.animating && !quiz && !session.hideBets;
    if (profile.settings.coach && mineTurn) {
      const rec = C.recommend(g, HERO);
      session.rec = rec;
      $('#coach-chip-text').textContent = rec ? rec.title : '建议';
      chip.hidden = !rec;
    } else { chip.hidden = true; session.rec = null; }
  }
  function renderFlow() {
    const g = session.game;
    const s = C.situation(g, HERO);
    $('#flow-street').textContent = s.street || (g.phase === 'done' ? '结束' : '准备');
    $('#flow-text').textContent = session.hideBets ? '第 ' + g.handNo + ' 手 · 庄家按钮在 ' + (g.button === HERO ? '你' : g.players[g.button].name) : (s.line || (g.phase === 'idle' ? '准备开始' : ''));
    $('#flow-why').textContent = profile.settings.coach ? s.why : '';
  }

  /* ---------- 动作区 ---------- */
  const actionsEl = $('#actions'), waitingNote = $('#waiting-note'), raisePanel = $('#raise-panel');
  let raiseState = null;
  function renderActions() {
    const g = session.game, p = g.players[HERO];
    const mine = g.phase === 'betting' && g.toAct === HERO && !session.quizPending && !session.animating && !quiz && !session.hideBets;
    actionsEl.hidden = !mine;
    if (!mine) {
      raisePanel.hidden = true; raiseState = null;
      waitingNote.hidden = false;
      if (session.quizPending || quiz) waitingNote.textContent = '先回答牌桌上的问题';
      else if (g.phase === 'betting') waitingNote.textContent = p.folded ? '你已弃牌，看他们打完这手' : '等待 ' + g.players[g.toAct].name + ' 行动';
      else if (g.phase === 'done') waitingNote.textContent = '这手牌结束';
      else waitingNote.textContent = p.out ? '你没有筹码了' : '发牌员整理底池';
      return;
    }
    waitingNote.hidden = true;
    const legal = g.legalActions(HERO);
    const hints = profile.settings.coach ? C.hints(g, HERO) : {};
    const cc = $('#act-check-call'), raise = $('#act-raise');
    const lbl = (text, key) => '<span class="lbl">' + text + '<kbd>' + key + '</kbd></span>';
    $('#act-fold').innerHTML = lbl('弃牌', 'F');
    if (legal.check) cc.innerHTML = lbl('过牌', 'C');
    else cc.innerHTML = lbl(legal.callIsAllIn ? '跟注全下' : '跟注', 'C') + '<small>' + fmt(legal.toCall) + '</small>';
    if (legal.raise) {
      const verb = g.currentBet === 0 ? '下注' : '加注';
      raise.disabled = false;
      raise.innerHTML = legal.raise.min === legal.raise.max ? lbl('全下', 'R') + '<small>' + fmt(legal.raise.max) + '</small>' : lbl(verb, 'R') + '<small>至少 ' + fmt(legal.raise.min) + '</small>';
    } else { raise.disabled = true; raise.innerHTML = lbl('加注', 'R') + '<small>不可用</small>'; }
    $('#hint-fold').textContent = hints.fold || '';
    $('#hint-check-call').textContent = hints.check || hints.call || '';
    $('#hint-raise').textContent = hints.raise || '';
    if (raiseState) updateRaisePanel();
  }

  $('#act-fold').addEventListener('click', () => heroAct({ type: 'fold' }));
  $('#act-check-call').addEventListener('click', () => {
    const legal = session && session.game.legalActions(HERO);
    if (!legal) return;
    heroAct({ type: legal.check ? 'check' : 'call' });
  });
  $('#act-raise').addEventListener('click', () => {
    const legal = session && session.game.legalActions(HERO);
    if (!legal || !legal.raise) return;
    if (legal.raise.min === legal.raise.max) { heroAct({ type: 'raise', amount: legal.raise.max }); return; }
    openRaisePanel();
  });
  function openRaisePanel() {
    const g = session.game, legal = g.legalActions(HERO);
    const rec = session.rec;
    const start = rec && rec.action === 'raise' ? rec.amount : legal.raise.min;
    raiseState = { min: legal.raise.min, max: legal.raise.max, amount: Math.min(legal.raise.max, Math.max(legal.raise.min, start)), pot: g.potTotal(), toCall: legal.toCall };
    raisePanel.hidden = false;
    const slider = $('#raise-slider');
    slider.min = raiseState.min; slider.max = raiseState.max; slider.step = g.sb;
    $('#raise-note').textContent = '底池 ' + fmt(raiseState.pot + raiseState.toCall) + (rec && rec.action === 'raise' ? ' · 建议 ' + fmt(rec.amount) : '');
    updateRaisePanel();
    $('#raise-confirm').focus({ preventScroll: true });
  }
  function updateRaisePanel() {
    if (!raiseState) return;
    const g = session.game;
    raiseState.amount = Math.min(raiseState.max, Math.max(raiseState.min, raiseState.amount));
    $('#raise-slider').value = raiseState.amount;
    $('#raise-amount').textContent = fmt(raiseState.amount);
    const allIn = raiseState.amount >= raiseState.max;
    $('#raise-verb').textContent = allIn ? '全下' : (g.currentBet === 0 ? '下注' : '加注到');
    $('#raise-confirm').textContent = (allIn ? '全下 ' : (g.currentBet === 0 ? '下注 ' : '加注到 ')) + fmt(raiseState.amount);
  }
  function presetAmount(kind) {
    const s = raiseState, g = session.game;
    const potAfterCall = s.pot + s.toCall;
    const by = f => g.currentBet + Math.round(potAfterCall * f / g.sb) * g.sb;
    if (kind === 'min') return s.min;
    if (kind === 'half') return by(0.5);
    if (kind === 'threeq') return by(0.75);
    if (kind === 'pot') return by(1);
    return s.max;
  }
  $('#raise-presets').addEventListener('click', e => {
    const b = e.target.closest('[data-preset]'); if (!b || !raiseState) return;
    raiseState.amount = presetAmount(b.dataset.preset); updateRaisePanel(); Sound.tap();
  });
  $('#raise-slider').addEventListener('input', e => { if (!raiseState) return; raiseState.amount = Number(e.target.value); updateRaisePanel(); });
  $('#raise-minus').addEventListener('click', () => { if (!raiseState) return; raiseState.amount -= session.game.bb; updateRaisePanel(); });
  $('#raise-plus').addEventListener('click', () => { if (!raiseState) return; raiseState.amount += session.game.bb; updateRaisePanel(); });
  $('#raise-cancel').addEventListener('click', () => { raisePanel.hidden = true; raiseState = null; });
  $('#raise-confirm').addEventListener('click', () => { if (!raiseState) return; const amt = raiseState.amount; raisePanel.hidden = true; raiseState = null; heroAct({ type: 'raise', amount: amt }); });

  $('#coach-chip').addEventListener('click', () => {
    const rec = session && session.rec; if (!rec) return;
    const node = el('div', { class: 'result' }, [
      sheetHead(rec.title),
      el('ul', null, rec.reasons.map(r => el('li', { text: r }))),
      el('p', { text: '建议只是常见打法的参考，最后怎么打由你决定。' }),
      el('div', { class: 'result-foot' }, [
        el('button', { type: 'button', class: 'btn btn-primary', text: '照建议做', onclick: () => { closeOverlays(); heroAct(rec.action === 'raise' ? { type: 'raise', amount: rec.amount } : { type: rec.action }); } }),
        el('button', { type: 'button', class: 'btn btn-ghost', text: '我自己决定', onclick: closeOverlays }),
      ]),
    ]);
    openSheet(node);
  });

  document.addEventListener('keydown', e => {
    if (!session || tableScreen.hidden) return;
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'range') return;
    if (e.key === 'Escape') { if (raiseState) { raisePanel.hidden = true; raiseState = null; } else closeOverlays(); return; }
    const g = session.game;
    if (g.phase !== 'betting' || g.toAct !== HERO || session.quizPending || session.animating) return;
    const legal = g.legalActions(HERO);
    const k = e.key.toLowerCase();
    if (k === 'f') heroAct({ type: 'fold' });
    else if (k === 'c') heroAct({ type: legal.check ? 'check' : 'call' });
    else if (k === 'r' && legal.raise) { if (!raiseState) $('#act-raise').click(); }
    else if (k === 'enter' && raiseState) $('#raise-confirm').click();
    else if ((k === 'arrowup' || k === 'arrowright') && raiseState) { raiseState.amount += g.bb; updateRaisePanel(); }
    else if ((k === 'arrowdown' || k === 'arrowleft') && raiseState) { raiseState.amount -= g.bb; updateRaisePanel(); }
  });

  function sameAction(recAction, actual) {
    const a = actual === 'allin' ? 'raise' : actual;
    return recAction === a;
  }
  async function heroAct(action) {
    if (!session) return;
    const g = session.game;
    if (g.phase !== 'betting' || g.toAct !== HERO || session.quizPending || session.animating || session.loopActive || quiz || session.hideBets) return;
    const legal = g.legalActions(HERO);
    if (action.type === 'check' && !legal.check) return;
    if (action.type === 'raise' && !legal.raise) return;
    Sound.unlock();
    const hand = session.hand, st = profile.stats;
    if (g.street === 'preflop' && (action.type === 'call' || action.type === 'raise')) hand.vpip = true;
    if (action.type === 'raise') { hand.heroRaised.push(g.street); if (g.street === 'river') hand.heroRiverAggr = true; }
    if (action.type === 'raise' && action.amount >= legal.raise.max) hand.heroAllIn = true;
    if (action.type === 'call' && legal.callIsAllIn) hand.heroAllIn = true;
    if (profile.settings.coach) {
      const rec = session.rec || C.recommend(g, HERO);
      if (rec) {
        const agree = sameAction(rec.action, action.type);
        const actual = action.type === 'fold' ? '弃牌' : action.type === 'check' ? '过牌' : action.type === 'call' ? '跟注' : (g.currentBet === 0 ? '下注 ' : '加注到 ') + fmt(action.amount || 0);
        hand.decisions.push({ street: C.STREET_NAMES[g.street], rec: rec.title.replace(/^建议/, ''), actual, agree });
        st.coachTotal++; session.stats.coachTotal++;
        if (agree) { st.coachAgree++; session.stats.coachAgree++; st.coachStreak = (st.coachStreak || 0) + 1; mission('coach', 1); if (st.coachStreak >= 20) unlock('coach20'); }
        else st.coachStreak = 0;
      }
    }
    const token = session.token;
    let events;
    try { events = g.act(HERO, action); } catch (err) { toast(err.message); return; }
    stopHeroTimer();
    actionsEl.hidden = true; raisePanel.hidden = true; raiseState = null;
    await applyEvents(events, token);
    if (token.cancelled) return;
    runLoop(token);
  }

  /* 轮到你时的倒计时：只是显示，开了“超时自动行动”才会替你过牌或弃牌 */
  const HERO_SECONDS = 30;
  let heroTick = null;
  function startHeroTimer() {
    stopHeroTimer();
    if (!profile.settings.heroTimer || !session) return;
    session.heroDeadline = Date.now() + HERO_SECONDS * 1000;
    seatEls[HERO].style.setProperty('--think-ms', HERO_SECONDS * 1000 + 'ms');
    seatEls[HERO].classList.add('thinking');
    heroTick = setInterval(() => {
      if (!session || !session.heroDeadline) { stopHeroTimer(); return; }
      renderSeats();
      if (Date.now() >= session.heroDeadline) {
        stopHeroTimer();
        session.heroDeadline = null;
        if (profile.settings.autoAct) {
          const g = session.game;
          if (g.phase === 'betting' && g.toAct === HERO && !quiz) { const legal = g.legalActions(HERO); toast(legal.check ? '时间到，替你过牌' : '时间到，替你弃牌'); heroAct({ type: legal.check ? 'check' : 'fold' }); }
        } else renderSeats();
      }
    }, 500);
  }
  function stopHeroTimer() {
    if (heroTick) { clearInterval(heroTick); heroTick = null; }
    if (session) session.heroDeadline = null;
    if (seatEls[HERO]) seatEls[HERO].classList.remove('thinking');
  }

  /* ---------- 流程 ---------- */
  function newHandRecord() {
    return { vpip: false, heroRaised: [], heroRiverAggr: false, heroAllIn: false, heroTurnCat: null, startChips: session.game.players[HERO].chips, decisions: [], askedMinRaise: false, deck: null };
  }
  async function startNextHand() {
    const g = session.game, token = session.token;
    g.players.forEach((p, i) => { if (i !== HERO && p.chips <= 0) log(g.rebuy(i, botStack())); });
    if (g.players[HERO].chips <= 0) { showBustSheet(); return; }
    saveSession(g.button);
    session.hand = newHandRecord();
    session.quizPending = false; session.quizHide = false;
    seatEls.forEach(s => s.classList.remove('winner'));
    const events = g.startHand();
    if (events.some(e => e.type === 'need-players')) { toast('人数不够'); return; }
    commitDeck();
    if (profile.settings.dealer) {
      session.hideBets = true;
      await applyEvents([events[0]], token);
      if (token.cancelled) return;
      await askQuiz('blinds');
      session.hideBets = false;
      if (token.cancelled) return;
      await applyEvents(events.slice(1), token);
    } else {
      await applyEvents(events, token);
    }
    if (token.cancelled) return;
    runLoop(token);
  }
  let loopSeq = 0;
  async function runLoop(token) {
    if (!session || session.loopActive || token.cancelled) return;
    const id = ++loopSeq;
    session.loopActive = true;
    if (DEBUG) console.log('[loop]', id, 'start · phase', session.game.phase, '· toAct', session.game.toAct);
    try { await runLoopInner(token); } finally { if (session) session.loopActive = false; if (DEBUG) console.log('[loop]', id, 'end'); }
  }
  async function runLoopInner(token) {
    const g = session.game;
    while (!token.cancelled) {
      if (g.phase === 'betting') {
        if (session.quizPending) {
          await askQuiz('first-to-act');
          if (token.cancelled) return;
          session.quizPending = false; session.quizHide = false;
          renderAll();
        }
        const seat = g.toAct;
        if (seat === HERO) { startHeroTimer(); renderAll(); Sound.turn(); return; }
        const events = await botTurn(seat, token);
        if (token.cancelled) return;
        if (profile.settings.dealer && !session.hand.askedMinRaise && g.phase === 'betting' && events.some(e => e.type === 'action' && e.action === 'raise' && e.full)) {
          session.hand.askedMinRaise = true;
          await askQuiz('min-raise');
          if (token.cancelled) return;
          renderAll();
        }
        continue;
      }
      if (g.phase === 'between') {
        const step = g.nextStep();
        if (profile.settings.dealer && step) {
          if (step.kind === 'showdown') {
            revealForShowdown();
            renderAll();
            await wait(T(500));
            await askQuiz('winner');
          } else {
            await askQuiz('next-step');
          }
          if (token.cancelled) return;
        } else {
          await wait(T(step && step.kind === 'showdown' ? 800 : 650));
          if (token.cancelled) return;
        }
        const events = g.advance();
        await applyEvents(events, token);
        if (token.cancelled) return;
        continue;
      }
      if (g.phase === 'done') { await handEnd(token); return; }
      return;
    }
  }
  /* 对手思考时间：按决定的分量、面对的压力和性格变化，偶尔长考。
   * 只和他要做的决定有关，和你的牌无关。 */
  function thinkTime(g, seat, d) {
    const p = g.players[seat];
    const style = AI.STYLES[p.style] || AI.STYLES.balanced;
    const legal = g.legalActions(seat);
    const toCall = legal ? legal.toCall : 0;
    let ms = 3000 + Math.random() * 3000;
    ms *= { fold: 0.8, check: 0.85, call: 1.0, raise: 1.3, allin: 1.6 }[d.type] || 1;
    if (toCall >= g.bb * 3) ms += 1000;
    if (toCall >= g.bb * 10) ms += 1500;
    if (g.street !== 'preflop') ms += 600;
    if (style.id === 'rock') ms += 700;
    if (style.id === 'lag') ms -= 400;
    if (d.type === 'fold' && g.street === 'preflop' && toCall <= g.bb) ms *= 0.55;
    if (Math.random() < 0.08) ms += 5000 + Math.random() * 4000;
    ms *= Math.sqrt(d.delay || 1);
    return T(Math.round(Math.max(1600, Math.min(16000, ms))));
  }

  /* ---------- 公平性：加密级随机洗牌 + 牌堆指纹 ---------- */
  function secureRandom() {
    if (window.crypto && crypto.getRandomValues) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; }
    return Math.random();
  }
  function randomHex(n) { let s = ''; while (s.length < n) s += Math.floor(secureRandom() * 16).toString(16); return s; }
  async function sha256Hex(str) {
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* 退回简单哈希 */ }
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return 'fnv-' + (h >>> 0).toString(16).padStart(8, '0');
  }
  function logLine(text, tone) {
    const line = { text, tone: tone || 'note' };
    session.log.push(line);
    const logEl = $('#log-list');
    if (logEl) { logEl.append(el('div', { class: 'log-line ' + line.tone, text: line.text })); logEl.scrollTop = logEl.scrollHeight; }
  }
  async function commitDeck() {
    const g = session.game, hand = session.hand;
    const order = g.shuffled ? g.shuffled.slice().reverse() : [];
    const salt = randomHex(8);
    hand.deck = { order, salt, fp: null, commitment: salt + ':' + order.join(' ') };
    hand.deck.fp = await sha256Hex(hand.deck.commitment);
    if (session && session.hand === hand) logLine('牌堆指纹 ' + hand.deck.fp.slice(0, 12) + '（这手结束后公开整副牌顺序，可核对）', 'note');
  }
  function openDeckSheet(deck, players) {
    const n = players;
    const groups = [];
    const seq = deck.order.slice();
    let i = 0;
    const take = k => seq.slice(i, i += k);
    groups.push(['底牌，按发牌顺序每人一张发两轮', take(n * 2)]);
    groups.push(['烧牌', take(1)]); groups.push(['翻牌', take(3)]);
    groups.push(['烧牌', take(1)]); groups.push(['转牌', take(1)]);
    groups.push(['烧牌', take(1)]); groups.push(['河牌', take(1)]);
    groups.push(['没用到的牌', seq.slice(i)]);
    const node = el('div', { class: 'result' }, [
      sheetHead('这手牌的牌堆'),
      el('p', { text: '开局前记录的指纹：' }),
      el('p', { class: 'mono', text: deck.fp }),
      el('p', { text: '指纹 = SHA-256（随机盐 + 整副牌顺序）。盐：' + deck.salt + '。下面是洗好后的整副牌，从牌堆顶开始。你可以把下面的字符串自己算一次 SHA-256，和指纹对比。' }),
      el('p', { class: 'mono small', text: deck.commitment }),
    ]);
    groups.forEach(([label, cards]) => {
      if (!cards.length) return;
      node.append(el('div', { class: 'deck-group' }, [el('span', { class: 'deck-label', text: label }), el('div', { class: 'mini-cards wrap' }, cards.map(c => cardEl(c)))]));
    });
    node.append(el('div', { class: 'result-foot' }, [el('button', { type: 'button', class: 'btn btn-primary', text: '好', onclick: closeOverlays })]));
    openSheet(node);
  }
  async function botTurn(seat, token) {
    const g = session.game;
    const d = AI.decide(g, seat);
    const think = thinkTime(g, seat, d);
    seatEls[seat].style.setProperty('--think-ms', think + 'ms');
    renderAll();
    seatEls[seat].classList.add('thinking');
    await wait(think);
    seatEls[seat].classList.remove('thinking');
    if (token.cancelled) return [];
    let events;
    try { events = g.act(seat, d); } catch (err) { events = g.act(seat, { type: g.legalActions(seat).check ? 'check' : 'fold' }); }
    await applyEvents(events, token);
    return events;
  }
  function revealForShowdown() {
    const g = session.game;
    g.players.forEach(p => { if (g.inHand(p)) p.revealed = true; });
  }

  /* ---------- 事件呈现 ---------- */
  function log(ev) {
    const lines = N.narrate(ev, session.game, HERO);
    for (const line of lines) {
      session.log.push(line);
      if (session.log.length > 400) session.log.shift();
      const logEl = $('#log-list');
      if (logEl) { logEl.append(el('div', { class: 'log-line ' + line.tone, text: line.text })); logEl.scrollTop = logEl.scrollHeight; }
    }
  }
  function showBanner(text, ms) {
    const host = $('#banner-host');
    host.innerHTML = '';
    const b = el('div', { class: 'banner', text });
    host.append(b);
    setTimeout(() => { if (b.parentNode) b.remove(); }, ms || 1400);
  }
  function centerOf(elm) {
    const r = elm.getBoundingClientRect(), w = tableWrap.getBoundingClientRect();
    return { x: r.left + r.width / 2 - w.left, y: r.top + r.height / 2 - w.top };
  }
  function viewportCenter(elm) { const r = elm.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function animateDeal(cards) {
    if (reduced()) return;
    const from = viewportCenter($('#dealer-btn'));
    const anims = cards.map((c, k) => {
      const to = viewportCenter(c);
      const end = getComputedStyle(c).transform;
      return c.animate(
        [{ transform: 'translate(' + (from.x - to.x) + 'px, ' + (from.y - to.y) + 'px) scale(0.5)', opacity: 0.2 }, { transform: end === 'none' ? 'none' : end, opacity: 1 }],
        { duration: T(380), delay: k * T(55), easing: EASE, fill: 'backwards' },
      ).finished.catch(() => {});
    });
    await Promise.all(anims);
  }
  async function animateBoard(cards) {
    if (reduced()) return;
    const anims = cards.map((c, k) => c.animate(
      [{ transform: 'translateY(-14px) scale(0.85)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: T(380), delay: k * T(110), easing: EASE, fill: 'backwards' },
    ).finished.catch(() => {}));
    await Promise.all(anims);
  }
  async function animateBetsToPot() {
    const target = centerOf($('#pot'));
    const moving = betEls.filter(b => !b.hidden);
    if (!moving.length) return;
    Sound.chip();
    if (reduced()) { moving.forEach(b => { b.hidden = true; }); return; }
    const anims = moving.map(b => {
      const from = centerOf(b);
      return b.animate([{ transform: 'translate(-50%, -50%)' }, { transform: 'translate(calc(-50% + ' + (target.x - from.x) + 'px), calc(-50% + ' + (target.y - from.y) + 'px))', opacity: 0.2 }], { duration: T(420), easing: EASE, fill: 'forwards' }).finished.catch(() => {});
    });
    await Promise.all(anims);
    moving.forEach(b => { b.hidden = true; b.getAnimations().forEach(a => a.cancel()); });
  }
  async function flyPot(seat, amount) {
    const from = centerOf($('#pot')), to = centerOf($('.seat-box', seatEls[seat]));
    const f = el('div', { class: 'fly' }, [el('div', { class: 'chip' }), el('span', { class: 'num', text: '+' + fmt(amount) })]);
    f.style.left = from.x + 'px'; f.style.top = from.y + 'px';
    $('.chip', f).style.setProperty('--chip-color', chipColor(amount));
    tableWrap.append(f);
    try {
      await f.animate([{ transform: 'translate(-50%, -50%)' }, { transform: 'translate(calc(-50% + ' + (to.x - from.x) + 'px), calc(-50% + ' + (to.y - from.y) + 'px))' }], { duration: T(reduced() ? 120 : 650), easing: EASE, fill: 'forwards' }).finished;
    } catch (e) { /* 忽略 */ }
    f.remove();
  }

  async function applyEvents(events, token) {
    session.animating = true;
    try { await applyEventsInner(events, token); } finally { if (session) session.animating = false; }
    if (!token.cancelled) renderAll();
  }
  async function applyEventsInner(events, token) {
    const g = session.game;
    for (const ev of events) {
      if (token.cancelled) return;
      log(ev);
      switch (ev.type) {
        case 'hand-start':
          renderAll();
          if (profile.settings.coach && ev.button === HERO) showBanner('这一手你是庄家：翻牌后你最后行动', 1800);
          await wait(T(350));
          break;
        case 'blind':
          Sound.chip();
          renderSeats(); renderBets(); renderPot();
          await wait(T(260));
          break;
        case 'deal-hole': {
          Sound.deal();
          renderSeats(); renderHero();
          await animateDeal($$('#hero-cards .card').concat($$('.seat-cards .card')));
          await wait(T(120));
          break;
        }
        case 'street':
          if (ev.first >= 0 && profile.settings.dealer) { session.quizPending = true; session.quizHide = true; }
          if (ev.street !== 'preflop' && ev.first >= 0 && profile.settings.coach && !profile.settings.dealer) {
            showBanner(C.STREET_NAMES[ev.street] + '：从庄家左边第一位 ' + (ev.first === HERO ? '你' : g.players[ev.first].name) + ' 开始', 1500);
          }
          if (ev.skipped) showBanner('能行动的人不足两位，直接发牌', 1200);
          renderFlow(); renderBoard();
          break;
        case 'turn':
          renderAll();
          break;
        case 'action': {
          if (ev.action === 'fold') Sound.fold(); else if (ev.action === 'check') Sound.check(); else Sound.chip();
          renderSeats(); renderBets(); renderPot();
          if (ev.seat === HERO) renderHero();
          await wait(T(ev.seat === HERO ? 150 : 320));
          break;
        }
        case 'round-end': {
          await animateBetsToPot();
          renderAll();
          if (profile.settings.coach && !ev.uncontested) {
            const next = g.nextStep();
            const map = { 'deal-flop': '发翻牌', 'deal-turn': '发转牌', 'deal-river': '发河牌', 'showdown': '摊牌' };
            if (next && map[next.kind]) showBanner('这一轮结束：所有人下注相等，接下来' + map[next.kind], 1500);
          }
          await wait(T(ev.uncontested ? 250 : 500));
          break;
        }
        case 'all-in-showdown':
          revealForShowdown();
          renderSeats();
          showBanner('全部全下，先亮牌再发完公共牌', 1600);
          await wait(T(900));
          break;
        case 'deal-board': {
          Sound.deal();
          renderBoard();
          await animateBoard($$('#board .card').slice(-ev.cards.length));
          renderHero(); renderFlow();
          await wait(T(200));
          break;
        }
        case 'showdown': {
          if (!profile.settings.showBots) {
            const winners = new Set();
            g.previewShowdown().forEach(pot => pot.winners.forEach(w => winners.add(w)));
            g.players.forEach((p, i) => { if (i !== HERO && !winners.has(i)) p.revealed = false; });
          }
          renderSeats();
          await wait(T(700));
          break;
        }
        case 'returned':
          renderSeats();
          await wait(T(350));
          break;
        case 'award': {
          seatEls[ev.seat].classList.add('winner');
          await flyPot(ev.seat, ev.amount);
          renderSeats();
          if (ev.seat === HERO) Sound.win(); else Sound.chip();
          break;
        }
        case 'hand-end':
          renderAll();
          break;
        default:
          break;
      }
    }
  }

  /* ---------- 一手结束：奖励与结果 ---------- */
  function trackTurnCat() {
    const g = session.game, p = g.players[HERO];
    if (g.street === 'turn' && g.board.length === 4 && !p.folded && p.cards.length === 2) session.hand.heroTurnCat = E.evaluate(p.cards.concat(g.board)).cat;
  }
  async function handEnd(token) {
    const g = session.game, p = g.players[HERO], s = profile.stats, hand = session.hand, res = g.result, ss = session.stats;
    let xp = 10;
    const heroWon = res.winners.includes(HERO);
    const won = res.pots.reduce((sum, pot) => sum + (pot.shares && pot.shares[HERO] ? pot.shares[HERO] : 0), 0);
    const netChange = p.chips - hand.startChips;
    s.hands++; ss.hands++;
    mission('hands', 1);
    if (hand.vpip) { s.vpipHands++; mission('vpip', 1); }
    const earned = [];
    const pos = g.positions()[HERO];
    const potTotal = res.pots.reduce((sum, pot) => sum + pot.amount, 0);
    if (heroWon) {
      s.wins++; ss.wins++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); xp += 25;
      s.chipsWon += Math.max(0, won);
      s.biggestPot = Math.max(s.biggestPot, potTotal); ss.biggestPot = Math.max(ss.biggestPot, potTotal);
      mission('wins', 1);
      if (unlock('first-win')) earned.push('first-win');
      if (potTotal > 100 * g.bb && unlock('big-pot')) earned.push('big-pot');
      if (s.streak >= 3 && unlock('streak3')) earned.push('streak3');
      if (!res.uncontested) {
        s.showdownWins++; xp += 25;
        mission('showdown', 1);
        const h = p.hand || E.evaluate(p.cards.concat(g.board));
        if (h.score > (s.bestHandScore || 0)) { s.bestHandScore = h.score; s.bestHand = h.label; }
        const map = { [E.CAT.FLUSH]: 'flush', [E.CAT.FULL_HOUSE]: 'full-house', [E.CAT.QUADS]: 'quads', [E.CAT.STRAIGHT_FLUSH]: 'straight-flush' };
        if (map[h.cat] && unlock(map[h.cat])) earned.push(map[h.cat]);
        if (h.cat >= E.CAT.FLUSH) mission('bighand', 1);
        if (h.royal && unlock('royal')) earned.push('royal');
        if (hand.heroAllIn && unlock('allin-win')) earned.push('allin-win');
        if ((h.cat === E.CAT.FLUSH || h.cat === E.CAT.STRAIGHT) && hand.heroTurnCat != null && hand.heroTurnCat < E.CAT.STRAIGHT && unlock('river-hit')) earned.push('river-hit');
      } else {
        if (res.street === 'preflop' && g.preflopAggressor === HERO) {
          mission('steal', 1);
          if ((pos === 'BTN' || pos === 'CO' || pos === 'BTN/SB') && unlock('steal')) earned.push('steal');
        }
        if (res.street === 'river' && hand.heroRiverAggr && g.board.length === 5) {
          const h = E.evaluate(p.cards.concat(g.board));
          if (h.cat === E.CAT.HIGH && unlock('bluff')) earned.push('bluff');
        }
      }
    } else {
      s.streak = 0;
      if (!res.uncontested && !p.folded && p.cards.length === 2 && g.board.length === 5) {
        const h = E.evaluate(p.cards.concat(g.board));
        if (h.score > (s.bestHandScore || 0)) { s.bestHandScore = h.score; s.bestHand = h.label; }
      }
    }
    if (s.hands >= 100 && unlock('hands100')) earned.push('hands100');
    if (s.hands >= 500 && unlock('hands500')) earned.push('hands500');
    addXp(xp);
    save();
    await wait(T(900));
    if (token.cancelled) return;
    showResultSheet({ heroWon, won, netChange, xp, earned });
  }

  function showResultSheet(info) {
    const g = session.game, res = g.result, token = session.token, hero = g.players[HERO];
    const nameOf = s => (s === HERO ? '你' : g.players[s].name);
    const winnersText = res.winners.map(nameOf).join('、');
    let title, cls = '';
    if (info.heroWon) { title = res.winners.length > 1 ? '平分底池 ' + signed(info.won) : '你赢了 ' + signed(info.won); cls = 'win'; }
    else title = winnersText + ' 赢了';
    let sub;
    if (res.uncontested) sub = info.heroWon ? '其他人都弃牌了，你不用亮牌。' : (hero.folded ? '你弃牌后，' : '') + '其他人都弃牌，底池直接归他。';
    else {
      const w = g.players[res.winners[0]];
      sub = '赢的牌型：' + (w.hand ? w.hand.label : '') + (res.pots.length > 1 ? '，这手有边池。' : '。');
    }
    const node = el('div', { class: 'result' }, [el('h2', { class: 'result-title ' + cls, text: title }), el('p', { class: 'result-sub', text: sub })]);
    if (g.board.length) {
      const best = new Set();
      if (!res.uncontested) res.winners.forEach(w => (g.players[w].hand ? g.players[w].hand.cards : []).forEach(c => best.add(c)));
      node.append(el('div', { class: 'result-board' }, [el('span', { class: 'result-board-label', text: '公共牌' })].concat(g.board.map(c => { const n = cardEl(c); if (best.has(c)) n.classList.add('best'); return n; }))));
    }
    if (!res.uncontested && res.reveals.length) {
      node.append(el('div', { class: 'reveals' }, res.reveals.map(r => {
        const win = res.winners.includes(r.seat);
        return el('div', { class: 'reveal' + (win ? ' win' : '') }, [
          el('span', { class: 'reveal-name', text: nameOf(r.seat) }),
          el('div', { class: 'reveal-cards' }, r.cards.map(c => { const n = cardEl(c); if (win && r.hand.cards.includes(c)) n.classList.add('best'); return n; })),
          el('span', { class: 'reveal-hand', text: r.hand.label }),
        ]);
      })));
    }
    const lines = [['底池合计', fmt(res.pots.reduce((a, p) => a + p.amount, 0))], ['你的筹码变化', signed(info.netChange)], ['经验', '+' + info.xp]];
    node.append(el('div', { class: 'result-lines' }, lines.map(([k, v]) => el('div', { class: 'row' }, [el('span', { text: k }), el('span', { class: 'num', text: v })]))));
    const deck = session.hand.deck;
    if (deck && deck.fp) {
      const playersN = g.players.filter(p => !p.out).length;
      node.append(el('div', { class: 'row fair-row' }, [
        el('span', { text: '牌堆指纹 ' + deck.fp.slice(0, 12) }),
        el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: '核对整副牌', onclick: () => openDeckSheet(deck, playersN) }),
      ]));
    }
    const decisions = session.hand.decisions;
    if (profile.settings.coach && decisions.length) {
      const diffs = decisions.filter(d => !d.agree);
      const review = el('div', { class: 'review' }, [el('div', { class: 'review-title', text: diffs.length ? '本手有 ' + diffs.length + ' 次和建议不同' : '本手 ' + decisions.length + ' 次行动都和建议一致' })]);
      diffs.slice(0, 4).forEach(d => review.append(el('div', { class: 'review-line diff', text: d.street + '：建议' + d.rec + '，你选了' + d.actual })));
      node.append(review);
    }
    info.earned.forEach(id => {
      const a = ACHIEVEMENTS.find(x => x.id === id);
      node.append(el('div', { class: 'achv-pop' }, [el('div', null, [el('strong', { text: '成就 · ' + a.name }), el('small', { text: a.desc + ' · 奖励 ' + fmt(a.reward) })])]));
    });
    const next = el('button', { type: 'button', class: 'btn btn-primary', text: '下一手' });
    const leave = el('button', { type: 'button', class: 'btn btn-ghost', text: '离开牌桌' });
    const countdown = el('span', { class: 'countdown' });
    node.append(el('div', { class: 'result-foot' }, [el('div', { style: 'display:flex;gap:8px;align-items:center' }, [next, countdown]), leave]));
    let timer = null, left = 6;
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const go = () => { stop(); closeOverlays(); if (token.cancelled) return; startNextHand(); };
    next.addEventListener('click', go);
    leave.addEventListener('click', () => { stop(); leaveTable(); });
    openSheet(node, { sticky: true, onClose: stop });
    if (profile.settings.autoNext) {
      countdown.textContent = left + ' 秒后自动开始';
      timer = setInterval(() => { left--; if (left <= 0) { go(); return; } countdown.textContent = left + ' 秒后自动开始'; }, 1000);
    }
  }

  function showBustSheet() {
    const canBuy = profile.bankroll >= BUYIN;
    const node = el('div', { class: 'result' }, [
      el('h2', { class: 'result-title', text: '筹码打光了' }),
      el('p', { class: 'result-sub', text: canBuy ? '余额还有 ' + fmt(profile.bankroll) + '，可以再买入 ' + fmt(BUYIN) + ' 继续。' : '余额不够再买入。回大厅可以领一笔救济金。' }),
      el('div', { class: 'result-foot' }, [
        canBuy ? el('button', { type: 'button', class: 'btn btn-primary', text: '再买入 ' + fmt(BUYIN), onclick: () => { profile.bankroll -= BUYIN; profile.stats.bustCount++; session.stats.buyIn += BUYIN; session.game.rebuy(HERO, BUYIN); save(); closeOverlays(); startNextHand(); } }) : null,
        el('button', { type: 'button', class: 'btn btn-ghost', text: '回大厅', onclick: () => { profile.stats.bustCount++; leaveTable(); } }),
      ]),
    ]);
    openSheet(node, { sticky: true });
  }

  /* ---------- 发牌员模式提问 ---------- */
  let quiz = null;
  function askQuiz(kind) {
    return new Promise(resolve => {
      const g = session.game;
      const q = C.dealerQuestion(g, kind, HERO);
      if (DEBUG) console.log('[quiz]', kind, '· answer', q && q.answer);
      if (!q) { resolve(); return; }
      quiz = { q, resolve, wrong: 0 };
      renderQuiz();
      renderActions();
      if (q.type === 'seat') seatEls.forEach(s => s.classList.add('pick'));
    });
  }
  function renderQuiz(feedback, cls) {
    const host = $('#quiz-host');
    host.innerHTML = '';
    if (!quiz) return;
    const q = quiz.q;
    const bar = el('div', { class: 'quiz-bar', role: 'dialog' }, [
      el('div', { class: 'quiz-tag', text: '发牌员模式 · 第 ' + (profile.stats.dealerTotal + 1) + ' 题' }),
      el('p', { class: 'quiz-prompt', text: q.prompt }),
    ]);
    if (q.type === 'choice') bar.append(el('div', { class: 'quiz-options' }, q.options.map(o => el('button', { type: 'button', class: 'btn btn-sm', text: o.label, onclick: () => answerQuiz(o.id) }))));
    else bar.append(el('div', { class: 'quiz-options' }, [el('button', { type: 'button', class: 'btn btn-sm', text: '是我', onclick: () => answerQuiz(HERO) })]));
    if (feedback) bar.append(el('p', { class: 'quiz-feedback ' + (cls || ''), text: feedback }));
    bar.append(el('div', { class: 'quiz-foot' }, [
      el('span', { text: '连对 ' + profile.stats.dealerStreak + ' · 正确率 ' + (profile.stats.dealerTotal ? Math.round(profile.stats.dealerCorrect / profile.stats.dealerTotal * 100) + '%' : '—') }),
      el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: '跳过', onclick: () => finishQuiz(false, true) }),
    ]));
    host.append(bar);
  }
  function onSeatClick(seat) { if (quiz && quiz.q.type === 'seat' && !quiz.locked) answerQuiz(seat); }
  function answerQuiz(answer) {
    if (!quiz || quiz.locked) return;
    const q = quiz.q;
    const correct = Array.isArray(q.answer) ? q.answer.includes(answer) : q.answer === answer;
    const s = profile.stats;
    if (correct) {
      const firstTry = quiz.wrong === 0;
      s.dealerTotal++;
      if (firstTry) { s.dealerCorrect++; s.dealerStreak++; s.dealerBest = Math.max(s.dealerBest, s.dealerStreak); addXp(5); mission('dealer', 1); }
      else s.dealerStreak = 0;
      save();
      if (s.dealerStreak >= 10) unlock('dealer10');
      if (s.dealerCorrect >= 50) unlock('dealer50');
      quiz.locked = true;
      renderQuiz((firstTry ? '对。' : '对了。') + q.explain, 'ok');
      Sound.tap();
      const current = quiz;
      setTimeout(() => { if (quiz === current) finishQuiz(true); }, T(firstTry ? 1600 : 2800));
      return;
    }
    quiz.wrong++;
    Sound.fold();
    if (quiz.wrong >= 2) {
      s.dealerTotal++; s.dealerStreak = 0; save();
      quiz.locked = true;
      renderQuiz('不对。' + q.explain, 'bad');
      const current = quiz;
      setTimeout(() => { if (quiz === current) finishQuiz(false); }, T(3400));
    } else {
      const hints = {
        'first-to-act': session.game.street === 'preflop' ? '再想想：翻牌前从大盲的左边数。' : '再想想：翻牌后从庄家的左边数，跳过弃牌和全下的人。',
        'next-step': '再想想：数一数公共牌有几张，还有几个人没弃牌。',
        'winner': '再想想：每个人用两张底牌加五张公共牌凑最大的五张。',
        'blinds': session.game.headsUp() ? '再想想：单挑时庄家自己出小盲。' : '再想想：从庄家按钮往左手边数第一位。',
        'min-raise': '再想想：上一次加了多少，再加注就至少再加这么多。',
      };
      renderQuiz(hints[q.kind] || '再想想。', 'bad');
    }
  }
  function finishQuiz(ok, skipped) {
    if (!quiz) return;
    if (skipped) { profile.stats.dealerStreak = 0; save(); }
    const resolve = quiz.resolve;
    quiz = null;
    $('#quiz-host').innerHTML = '';
    seatEls.forEach(s => s.classList.remove('pick'));
    resolve(ok);
  }
  function closeQuiz() { if (quiz) { const r = quiz.resolve; quiz = null; $('#quiz-host').innerHTML = ''; seatEls.forEach(s => s.classList.remove('pick')); r(false); } }

  /* ---------- 发牌员记录抽屉 ---------- */
  function openLog() {
    closeOverlays();
    const drawer = el('aside', { class: 'drawer', role: 'dialog', 'aria-label': '发牌员记录' }, [
      el('div', { class: 'drawer-head' }, [el('h2', { text: '发牌员记录' }), el('button', { type: 'button', class: 'btn-icon', 'aria-label': '关闭', onclick: closeOverlays, html: CLOSE_ICON })]),
      el('div', { class: 'log', id: 'log-list' }),
    ]);
    const list = $('.log', drawer);
    if (!session.log.length) list.append(el('div', { class: 'log-line', text: '还没有记录' }));
    session.log.forEach(line => list.append(el('div', { class: 'log-line ' + line.tone, text: line.text })));
    const scrim = el('div', { class: 'scrim' });
    scrim.style.alignItems = 'stretch'; scrim.style.justifyContent = 'flex-end';
    scrim.addEventListener('click', e => { if (e.target === scrim) closeOverlays(); });
    scrim.append(drawer);
    overlayHost.append(scrim);
    list.scrollTop = list.scrollHeight;
  }
  $('#btn-log').addEventListener('click', openLog);
  $('#btn-settings-table').addEventListener('click', openSettings);
  $('#btn-leave').addEventListener('click', () => {
    const g = session && session.game;
    if (!g) { showLobby(); return; }
    const node = el('div', { class: 'result' }, [
      el('h2', { class: 'result-title', text: '离开牌桌？' }),
      el('p', { class: 'result-sub', text: '桌上的 ' + fmt(g.players[HERO].chips) + ' 筹码会结算回余额。' + (g.phase === 'betting' || g.phase === 'between' ? '这手牌还没打完，离开等于弃牌。' : '') }),
      el('div', { class: 'result-foot' }, [
        el('button', { type: 'button', class: 'btn btn-primary', text: '离开并结算', onclick: leaveTable }),
        el('button', { type: 'button', class: 'btn btn-ghost', text: '继续玩', onclick: closeOverlays }),
      ]),
    ]);
    openSheet(node, { center: true });
  });
  $('#flow').addEventListener('click', () => {
    const f = $('#flow');
    f.setAttribute('aria-expanded', String(f.classList.toggle('open')));
  });

  /* 转牌时记录牌力，用于河牌逆转成就 */
  const origAdvance = E.Game.prototype.advance;
  E.Game.prototype.advance = function () {
    const events = origAdvance.call(this);
    if (session && this === session.game && this.street === 'turn') trackTurnCat();
    return events;
  };

  /* ---------- 启动 ---------- */
  function start() {
    load();
    applyTheme();
    ensureDaily();
    dailyBonus();
    renderLobby();
    window.addEventListener('orientationchange', () => setTimeout(layoutSeats, 200));
    if ('serviceWorker' in navigator && location.protocol === 'https:' && document.querySelector('link[rel="manifest"]')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  if (DEBUG) window.__dz = { get session() { return session; }, get quiz() { return quiz; }, get profile() { return profile; } };
  const hot = window.claude && window.claude.hot;
  if (hot && typeof hot.snapshot === 'function') { try { hot.snapshot(() => ({})); } catch (e) { /* 忽略 */ } }
  if (hot && typeof hot.ready === 'function') hot.ready(start); else start();
})();
