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
    { id: 'river-hit', name: '河牌逆转', desc: '河牌补中同花或顺子并赢下摊牌', reward: 300 },
    { id: 'hands100', name: '一百手', desc: '打满 100 手牌', reward: 500 },
  ];

  const DEFAULT_PROFILE = () => ({
    bankroll: 10000, xp: 0, achievements: {}, lastDaily: null,
    stats: { hands: 0, wins: 0, showdownWins: 0, vpipHands: 0, biggestPot: 0, bestHand: null, bestHandScore: 0, dealerCorrect: 0, dealerTotal: 0, dealerStreak: 0, dealerBest: 0, bustCount: 0, streak: 0, bestStreak: 0, chipsWon: 0 },
    settings: { coach: true, dealer: false, opponents: 5, fourColor: false, sound: true, speed: 'normal', autoNext: true, felt: 'green', back: 'classic', showBots: true },
    session: null,
  });

  /* ---------- 工具 ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const fmt = n => Math.round(n).toLocaleString('zh-CN');
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
  const today = () => new Date().toISOString().slice(0, 10);
  const speedFactor = () => ({ slow: 1.7, normal: 1, fast: 0.45 })[profile.settings.speed] || 1;
  const T = ms => Math.round(ms * speedFactor());

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

  /* ---------- 等级 ---------- */
  function levelFromXp(xp) {
    let level = 1;
    while (xpForLevel(level + 1) <= xp && level < 40) level++;
    return level;
  }
  function xpForLevel(level) { return level <= 1 ? 0 : 50 * (level - 1) * level; }
  function levelTitle(level) {
    let title = '新手';
    for (const [min, name] of LEVEL_TITLES) if (level >= min) title = name;
    return title;
  }
  function isUnlocked(type, id) {
    if ((type === 'felt' && id === 'green') || (type === 'back' && id === 'classic')) return true;
    const u = UNLOCKS.find(x => x.type === type && x.id === id);
    return !!u && levelFromXp(profile.xp) >= u.level;
  }
  function nextUnlockText(level) {
    const next = UNLOCKS.find(u => u.level > level);
    if (!next) return '所有桌布和牌背都已解锁';
    return '升到 ' + next.level + ' 级解锁' + next.name;
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
      const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
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
    node.setAttribute('aria-label', C.cardText(card));
    node.append(
      el('div', null, [el('div', { class: 'rank', text: card[0] === 'T' ? '10' : card[0] }), el('div', { class: 'suit-sm', text: C.SUIT_SYMBOLS[suit] })]),
      el('div', { class: 'suit-big', text: C.SUIT_SYMBOLS[suit] }),
    );
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
  function fromTemplate(id) {
    const tpl = document.getElementById(id);
    const frag = tpl.content.cloneNode(true);
    const wrap = el('div', { class: 'tpl' });
    wrap.style.display = 'contents';
    wrap.append(frag);
    return wrap;
  }
  const toastWrap = $('#toast-wrap');
  function toast(text, gold) {
    const t = el('div', { class: 'toast' + (gold ? ' gold' : ''), text });
    toastWrap.append(t);
    setTimeout(() => { t.style.transition = 'opacity 300ms'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, gold ? 3600 : 2400);
  }

  /* ---------- 大厅 ---------- */
  const lobby = $('#lobby'), tableScreen = $('#table');
  function renderLobby() {
    const level = levelFromXp(profile.xp);
    $('#bank-amount').textContent = fmt(profile.bankroll);
    $('#level-no').textContent = level;
    $('#level-title').textContent = levelTitle(level);
    const cur = xpForLevel(level), next = xpForLevel(level + 1);
    $('#level-xp').textContent = fmt(profile.xp - cur) + ' / ' + fmt(next - cur);
    $('#level-bar').style.transform = 'scaleX(' + Math.min(1, (profile.xp - cur) / (next - cur)) + ')';
    $('#level-next').textContent = nextUnlockText(level);
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
  function dailyBonus() {
    const d = today();
    if (profile.lastDaily !== d) {
      profile.lastDaily = d;
      profile.bankroll += DAILY;
      save();
      const note = $('#daily-note');
      note.textContent = '今日签到 +' + fmt(DAILY) + ' 已入账';
      note.hidden = false;
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
  $$('.switch[data-setting]').forEach(sw => sw.addEventListener('click', () => {
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
  function openRules() {
    const node = fromTemplate('tpl-rules');
    const rows = $('#rank-rows', node);
    RANK_EXAMPLES.forEach(([name, cards, desc]) => {
      rows.append(el('tr', null, [el('td', { text: name }), el('td', null, el('div', { class: 'mini-cards' }, cards.map(c => cardEl(c)))), el('td', { text: desc })]));
    });
    node.addEventListener('click', e => {
      const t = e.target.closest('[data-tab]'); if (!t) return;
      $$('[data-tab]', node).forEach(b => b.setAttribute('aria-pressed', String(b === t)));
      $$('[data-panel]', node).forEach(p => { p.hidden = p.dataset.panel !== t.dataset.tab; });
    });
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
      ['发牌员答题', s.dealerTotal ? fmt(s.dealerCorrect) + ' / ' + fmt(s.dealerTotal) : '—'], ['发牌员正确率', pct(s.dealerCorrect, s.dealerTotal)], ['发牌员最长连对', fmt(s.dealerBest)],
      ['破产次数', fmt(s.bustCount)], ['经验', fmt(profile.xp)],
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
      sw('coach', '教练模式', '解释每个动作，给出建议和理由'),
      sw('dealer', '发牌员模式', '关键节点先问你：谁先行动、下一步做什么、谁赢'),
      sw('showBots', '对手摊牌时亮牌', '关掉后只亮赢家的牌，更接近线下'),
      sw('fourColor', '四色牌', '方块蓝色、梅花绿色，更容易看出同花'),
      sw('sound', '音效'),
      sw('autoNext', '一手结束后自动开下一手'),
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
      profile = DEFAULT_PROFILE(); session = null; save(); applyTheme(); renderLobby(); closeOverlays(); showLobby();
      toast('已清空，重新开始');
    });
    openSheet(node);
  }

  /* ---------- 牌桌：会话 ---------- */
  let session = null; // { game, token, log, hand, quizPending }
  const seatsHost = $('#seats'), betsHost = $('#bets'), tableWrap = $('#table-wrap');
  const seatEls = [], betEls = [];

  function pickBots(n) {
    const pool = BOT_POOL.slice();
    const out = [];
    while (out.length < n && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      const b = pool.splice(i, 1)[0];
      out.push({ name: b.name, style: b.style, chips: 1500 + 100 * Math.floor(Math.random() * 16) });
    }
    return out;
  }
  function botStack() { return 1500 + 100 * Math.floor(Math.random() * 16); }

  function sitDown() {
    if (profile.bankroll < BUYIN) return;
    profile.bankroll -= BUYIN;
    const players = [{ name: '你', chips: BUYIN, isHuman: true }].concat(pickBots(profile.settings.opponents));
    const game = new E.Game({ players, blinds: BLINDS });
    beginSession(game);
    saveSession(-1);
    save();
  }
  function resumeTable() {
    const s = profile.session;
    const game = new E.Game({ players: s.players, blinds: BLINDS, button: s.button });
    game.handNo = s.handNo || 0;
    beginSession(game);
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
    profile.session = { button: buttonBefore, handNo: g.handNo, players: g.players.map(p => ({ name: p.name, chips: p.chips, isHuman: p.isHuman, style: p.style })) };
    save();
  }

  function beginSession(game) {
    session = { game, token: { cancelled: false }, log: [], hand: null, quizPending: false, heroActed: false };
    buildSeats();
    showTable();
    renderAll();
    startNextHand();
  }

  function showTable() { lobby.hidden = true; tableScreen.hidden = false; layoutSeats(); }
  function showLobby() { tableScreen.hidden = true; lobby.hidden = false; renderLobby(); }

  function leaveTable() {
    if (!session) return;
    const g = session.game;
    session.token.cancelled = true;
    closeOverlays();
    closeQuiz();
    // 牌局进行中：替你弃牌，让对手把这手打完
    if (g.phase === 'betting' || g.phase === 'between') fastForward();
    const chips = g.players[HERO].chips;
    profile.bankroll += chips;
    if (chips >= BUYIN * 2) unlock('double');
    profile.session = null;
    save();
    session = null;
    showLobby();
    toast('结算 ' + fmt(chips) + ' 回余额');
  }
  function fastForward() {
    const g = session.game;
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'idle' && guard++ < 300) {
      if (g.phase === 'betting') {
        if (g.toAct === HERO) {
          const legal = g.legalActions(HERO);
          g.act(HERO, { type: legal.check ? 'check' : 'fold' });
        } else g.act(g.toAct, AI.decide(g, g.toAct));
      } else g.advance();
    }
  }

  /* ---------- 座位布局 ---------- */
  function buildSeats() {
    seatsHost.innerHTML = ''; betsHost.innerHTML = '';
    seatEls.length = 0; betEls.length = 0;
    session.game.players.forEach((p, i) => {
      const seat = el('div', { class: 'seat' + (i === HERO ? ' hero' : ''), 'data-seat': i }, [
        el('div', { class: 'seat-cards' }),
        el('div', { class: 'seat-box' }, [
          el('span', { class: 'seat-pos' }),
          el('span', { class: 'seat-bubble' }),
          el('div', { class: 'seat-name', text: p.name }),
          el('div', { class: 'seat-chips num' }),
          el('div', { class: 'seat-style' }),
          el('span', { class: 'seat-think' }),
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
    const cx = rect.width / 2, cy = rect.height / 2;
    const rx = felt.width / 2, ry = felt.height / 2;
    const theta = (Math.PI / 2) + i * (2 * Math.PI / n);
    return { cx, cy, rx, ry, cos: Math.cos(theta), sin: Math.sin(theta) };
  }
  function layoutSeats() {
    if (!session || tableScreen.hidden) return;
    session.game.players.forEach((p, i) => {
      const g = seatGeometry(i);
      const seat = seatEls[i];
      const x = g.cx + g.rx * g.cos, y = g.cy + g.ry * g.sin;
      seat.style.left = x + 'px'; seat.style.top = y + 'px';
      seat.classList.toggle('top', g.sin < -0.2);
      seat.style.flexDirection = g.sin < -0.2 ? 'column-reverse' : 'column';
      const bet = betEls[i];
      bet.style.left = (g.cx + g.rx * 0.6 * g.cos) + 'px';
      bet.style.top = (g.cy + g.ry * 0.58 * g.sin) + 'px';
    });
    placeDealerButton();
  }
  function placeDealerButton() {
    const g = session.game, btn = $('#dealer-btn');
    if (g.button < 0) { btn.hidden = true; return; }
    const geo = seatGeometry(g.button);
    const n = g.players.length;
    const theta = (Math.PI / 2) + g.button * (2 * Math.PI / n) + 0.42;
    btn.hidden = false;
    btn.style.left = (geo.cx + geo.rx * 0.8 * Math.cos(theta)) + 'px';
    btn.style.top = (geo.cy + geo.ry * 0.78 * Math.sin(theta)) + 'px';
  }
  new ResizeObserver(() => layoutSeats()).observe(tableWrap);

  /* ---------- 渲染 ---------- */
  function renderAll() {
    if (!session) return;
    const g = session.game;
    renderSeats();
    renderBets();
    renderBoard();
    renderPot();
    renderHero();
    renderFlow();
    renderActions();
    placeDealerButton();
  }
  function renderSeats() {
    const g = session.game;
    const pos = g.positions();
    g.players.forEach((p, i) => {
      const seat = seatEls[i];
      seat.classList.toggle('folded', p.folded);
      seat.classList.toggle('out', p.out);
      seat.classList.toggle('active', g.phase === 'betting' && g.toAct === i && !(session.quizPending && session.quizHide));
      $('.seat-chips', seat).textContent = p.chips === 0 && !p.out ? '全下' : fmt(p.chips);
      const posEl = $('.seat-pos', seat);
      const label = pos[i];
      posEl.textContent = label ? (POS_SHORT[label] || label) : '';
      posEl.hidden = !label;
      posEl.classList.toggle('is-btn', label === 'BTN' || label === 'BTN/SB');
      posEl.classList.toggle('is-blind', label === 'SB' || label === 'BB');
      const styleEl = $('.seat-style', seat);
      styleEl.textContent = (profile.settings.coach && p.style && AI.STYLES[p.style]) ? AI.STYLES[p.style].name : '';
      styleEl.hidden = !styleEl.textContent;
      const cardsEl = $('.seat-cards', seat);
      const showFace = p.revealed && p.cards.length === 2;
      const key = (p.cards.length ? (showFace ? p.cards.join('') : 'back') : 'none') + (p.folded ? 'f' : '');
      if (cardsEl.dataset.key !== key) {
        cardsEl.dataset.key = key;
        cardsEl.innerHTML = '';
        if (i !== HERO && p.cards.length === 2 && !p.folded) {
          p.cards.forEach(c => cardsEl.append(cardEl(showFace ? c : null)));
        }
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
      if (p.bet > 0) {
        bet.hidden = false;
        $('.num', bet).textContent = fmt(p.bet);
        const stack = $('.chip-stack', bet);
        const count = Math.min(4, 1 + Math.floor(Math.log10(Math.max(1, p.bet / 10))));
        if (stack.childElementCount !== count || stack.dataset.amt !== String(p.bet)) {
          stack.dataset.amt = String(p.bet);
          stack.innerHTML = '';
          for (let k = 0; k < count; k++) { const c = el('div', { class: 'chip' }); c.style.top = (-3 * k) + 'px'; c.style.setProperty('--chip-color', chipColor(p.bet)); stack.append(c); }
        }
      } else bet.hidden = true;
    });
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
    if (g.phase === 'done' && g.result && !g.result.uncontested) {
      const bestCards = new Set();
      g.result.winners.forEach(w => (g.players[w].hand ? g.players[w].hand.cards : []).forEach(c => bestCards.add(c)));
      $$('.card', board).forEach((cEl, k) => cEl.classList.toggle('best', bestCards.has(g.board[k])));
    } else $$('.card', board).forEach(cEl => cEl.classList.remove('best'));
  }
  function renderPot() {
    const g = session.game;
    $('#pot-amount').textContent = fmt(g.phase === 'done' ? 0 : g.potTotal());
    $('#street-tag').textContent = g.phase === 'done' || !g.street ? '底池' : (C.STREET_NAMES[g.street] + ' · 底池');
  }
  function renderHero() {
    const g = session.game, p = g.players[HERO];
    const host = $('#hero-cards');
    const key = p.cards.join('') + (p.folded ? 'f' : '');
    if (host.dataset.key !== key) {
      host.dataset.key = key;
      host.innerHTML = '';
      if (p.cards.length === 2) p.cards.forEach(c => { const n = cardEl(c); if (p.folded) n.classList.add('dim'); host.append(n); });
      else { host.append(cardEl(null), cardEl(null)); }
    }
    if (g.phase === 'done' && g.result && g.result.winners.includes(HERO) && p.hand) {
      $$('.card', host).forEach((cEl, k) => cEl.classList.toggle('best', p.hand.cards.includes(p.cards[k])));
    } else $$('.card', host).forEach(cEl => cEl.classList.remove('best'));
    const title = $('#readout-title'), sub = $('#readout-sub');
    if (p.cards.length === 2 && !p.out) {
      const r = C.readout(p.cards, g.board);
      title.textContent = r.title;
      sub.textContent = p.folded ? '已弃牌' : (profile.settings.coach ? r.sub : '');
    } else { title.textContent = p.out ? '没有筹码了' : '等待发牌'; sub.textContent = ''; }
    // 教练建议
    const chip = $('#coach-chip');
    const mine = g.phase === 'betting' && g.toAct === HERO && !session.quizPending && !session.animating;
    if (profile.settings.coach && mine) {
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
    $('#flow-text').textContent = s.line || (g.phase === 'idle' ? '准备开始' : '');
    $('#flow-why').textContent = profile.settings.coach ? s.why : '';
  }

  /* ---------- 动作区 ---------- */
  const actionsEl = $('#actions'), waitingNote = $('#waiting-note'), raisePanel = $('#raise-panel');
  let raiseState = null;
  function renderActions() {
    const g = session.game, p = g.players[HERO];
    const mine = g.phase === 'betting' && g.toAct === HERO && !session.quizPending && !session.animating;
    actionsEl.hidden = !mine;
    if (!mine) {
      raisePanel.hidden = true; raiseState = null;
      waitingNote.hidden = false;
      if (g.phase === 'betting') {
        waitingNote.textContent = p.folded ? '你已弃牌，看他们打完这手' : '等待 ' + g.players[g.toAct].name + ' 行动';
      } else if (g.phase === 'done') waitingNote.textContent = '这手牌结束';
      else if (session.quizPending) waitingNote.textContent = '先回答上面的问题';
      else waitingNote.textContent = p.out ? '你没有筹码了' : '发牌员整理底池';
      return;
    }
    waitingNote.hidden = true;
    const legal = g.legalActions(HERO);
    const hints = profile.settings.coach ? C.hints(g, HERO) : {};
    const fold = $('#act-fold'), cc = $('#act-check-call'), raise = $('#act-raise');
    fold.innerHTML = '弃牌';
    if (legal.check) { cc.innerHTML = '过牌'; }
    else { cc.innerHTML = (legal.callIsAllIn ? '跟注全下' : '跟注') + '<small>' + fmt(legal.toCall) + '</small>'; }
    if (legal.raise) {
      const verb = g.currentBet === 0 ? '下注' : '加注';
      raise.disabled = false;
      raise.innerHTML = legal.raise.min === legal.raise.max ? '全下<small>' + fmt(legal.raise.max) + '</small>' : verb + '<small>至少 ' + fmt(legal.raise.min) + '</small>';
    } else { raise.disabled = true; raise.innerHTML = '加注<small>不可用</small>'; }
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
    raiseState = { min: legal.raise.min, max: legal.raise.max, amount: Math.min(legal.raise.max, Math.max(legal.raise.min, start)), pot: g.potTotal(), toCall: legal.toCall, bet: g.players[HERO].bet };
    raisePanel.hidden = false;
    const slider = $('#raise-slider');
    slider.min = raiseState.min; slider.max = raiseState.max; slider.step = g.sb;
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
    // 底池按“跟注后的底池”算
    const potAfterCall = s.pot + s.toCall;
    const base = g.currentBet;
    const by = f => base + Math.round(potAfterCall * f / g.sb) * g.sb;
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
      el('div', { class: 'sheet-head' }, [el('h2', { text: rec.title }), el('button', { type: 'button', class: 'btn-icon', 'data-close': '', 'aria-label': '关闭', html: '<svg class="icon" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>' })]),
      el('ul', null, rec.reasons.map(r => el('li', { text: r }))),
      el('p', { text: '建议只是一个常见的打法参考，最后怎么打由你决定。' }),
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
    if (g.phase !== 'betting' || g.toAct !== HERO || session.quizPending) return;
    const legal = g.legalActions(HERO);
    const k = e.key.toLowerCase();
    if (k === 'f') heroAct({ type: 'fold' });
    else if (k === 'c') heroAct({ type: legal.check ? 'check' : 'call' });
    else if (k === 'r' && legal.raise) { if (raiseState) return; $('#act-raise').click(); }
    else if (k === 'enter' && raiseState) $('#raise-confirm').click();
    else if ((k === 'arrowup' || k === 'arrowright') && raiseState) { raiseState.amount += g.bb; updateRaisePanel(); }
    else if ((k === 'arrowdown' || k === 'arrowleft') && raiseState) { raiseState.amount -= g.bb; updateRaisePanel(); }
  });

  async function heroAct(action) {
    if (!session) return;
    const g = session.game;
    if (g.phase !== 'betting' || g.toAct !== HERO || session.quizPending || session.animating || session.loopActive) return;
    const legal = g.legalActions(HERO);
    if (action.type === 'check' && !legal.check) return;
    if (action.type === 'raise' && !legal.raise) return;
    Sound.unlock();
    if (g.street === 'preflop' && (action.type === 'call' || action.type === 'raise')) session.hand.vpip = true;
    if (action.type === 'raise') { session.hand.heroRaised.push(g.street); if (g.street === 'river') session.hand.heroRiverAggr = true; }
    if (action.type === 'raise' && action.amount >= legal.raise.max) session.hand.heroAllIn = true;
    if (action.type === 'call' && legal.callIsAllIn) session.hand.heroAllIn = true;
    const token = session.token;
    let events;
    try { events = g.act(HERO, action); } catch (err) { toast(err.message); return; }
    actionsEl.hidden = true; raisePanel.hidden = true; raiseState = null;
    await applyEvents(events, token);
    if (token.cancelled) return;
    runLoop(token);
  }

  /* ---------- 流程 ---------- */
  function newHandRecord() {
    return { vpip: false, heroRaised: [], heroRiverAggr: false, heroAllIn: false, heroTurnCat: null, startChips: session.game.players[HERO].chips };
  }
  async function startNextHand() {
    const g = session.game, token = session.token;
    // 对手补买
    g.players.forEach((p, i) => {
      if (i !== HERO && p.chips <= 0) { const amt = botStack(); const ev = g.rebuy(i, amt); log(ev); }
    });
    if (g.players[HERO].chips <= 0) { showBustSheet(); return; }
    const buttonBefore = g.button;
    saveSession(buttonBefore);
    session.hand = newHandRecord();
    session.quizPending = false;
    seatEls.forEach(s => { s.classList.remove('winner'); $('.seat-bubble', s).className = 'seat-bubble'; });
    const events = g.startHand();
    if (events.some(e => e.type === 'need-players')) { toast('人数不够'); return; }
    await applyEvents(events, token);
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
          // 新一街的第一个行动者提问
          await askQuiz('first-to-act');
          if (token.cancelled) return;
          session.quizPending = false; session.quizHide = false;
          renderAll();
        }
        const seat = g.toAct;
        if (seat === HERO) { renderAll(); return; }
        await botTurn(seat, token);
        if (token.cancelled) return;
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
          } else if (step.kind === 'award-uncontested') {
            await askQuiz('next-step');
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
  async function botTurn(seat, token) {
    const g = session.game;
    const d = AI.decide(g, seat);
    const think = T(Math.round((700 + Math.random() * 700) * (d.delay || 1)));
    seatEls[seat].style.setProperty('--think-ms', think + 'ms');
    renderAll();
    await wait(think);
    if (token.cancelled) return;
    let events;
    try { events = g.act(seat, d); } catch (err) { events = g.act(seat, { type: g.legalActions(seat).check ? 'check' : 'fold' }); }
    await applyEvents(events, token);
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
  function bubble(seat, text, cls) {
    const b = $('.seat-bubble', seatEls[seat]);
    b.textContent = text;
    b.className = 'seat-bubble show ' + (cls || '');
  }
  function clearBubbles() { seatEls.forEach(s => { const b = $('.seat-bubble', s); b.className = 'seat-bubble'; }); }
  function showBanner(text, ms) {
    const host = $('#banner-host');
    host.innerHTML = '';
    const b = el('div', { class: 'banner', text });
    host.append(b);
    setTimeout(() => { if (b.parentNode) b.remove(); }, ms || 1400);
  }

  async function applyEvents(events, token) {
    const g = session.game;
    session.animating = true;
    try { await applyEventsInner(events, token, g); } finally { if (session) session.animating = false; }
    if (!token.cancelled) renderAll();
  }
  async function applyEventsInner(events, token, g) {
    for (const ev of events) {
      if (token.cancelled) return;
      log(ev);
      switch (ev.type) {
        case 'hand-start':
          clearBubbles();
          renderAll();
          if (profile.settings.coach && ev.button === HERO) showBanner('这一手你是庄家：翻牌后你最后行动', 1800);
          await wait(T(350));
          break;
        case 'blind':
          Sound.chip();
          renderSeats(); renderBets(); renderPot();
          bubble(ev.seat, (ev.kind === 'sb' ? '小盲 ' : '大盲 ') + fmt(ev.amount) + (ev.short ? '（全下）' : ''), 'blind');
          await wait(T(260));
          break;
        case 'deal-hole': {
          Sound.deal();
          renderSeats(); renderHero();
          $$('#hero-cards .card, .seat-cards .card').forEach((c, k) => { c.classList.add('deal-in'); c.style.animationDelay = (k * 40) + 'ms'; });
          await wait(T(600));
          clearBubbles();
          break;
        }
        case 'street':
          if (ev.first >= 0 && profile.settings.dealer) { session.quizPending = true; session.quizHide = true; }
          if (ev.street !== 'preflop' && ev.first >= 0 && profile.settings.coach && !profile.settings.dealer) {
            showBanner(C.STREET_NAMES[ev.street] + '：从庄家左边第一位 ' + (ev.first === HERO ? '你' : g.players[ev.first].name) + ' 开始', 1500);
          }
          if (ev.skipped) showBanner('能行动的人不足两位，直接发牌', 1200);
          renderFlow();
          break;
        case 'turn':
          renderAll();
          break;
        case 'action': {
          const p = g.players[ev.seat];
          const labels = { fold: '弃牌', check: '过牌', call: '跟注 ' + fmt(ev.amount || 0), bet: '下注 ' + fmt(ev.to || 0), raise: '加注到 ' + fmt(ev.to || 0) };
          let text = labels[ev.action];
          if (ev.allIn) text += ' · 全下';
          bubble(ev.seat, text, ev.allIn ? 'allin' : ev.action);
          if (ev.action === 'fold') Sound.fold(); else if (ev.action === 'check') Sound.check(); else Sound.chip();
          renderSeats(); renderBets(); renderPot();
          if (ev.seat === HERO) renderHero();
          await wait(T(ev.seat === HERO ? 150 : 320));
          break;
        }
        case 'round-end': {
          await animateBetsToPot();
          clearBubbles();
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
          g.players.forEach(p => { if (g.inHand(p)) p.revealed = true; });
          renderSeats();
          showBanner('全部全下，先亮牌再发完公共牌', 1600);
          await wait(T(900));
          break;
        case 'deal-board': {
          Sound.deal();
          renderBoard();
          const cards = $$('#board .card');
          cards.slice(-ev.cards.length).forEach((c, k) => { c.classList.add('deal-in'); c.style.animationDelay = (k * 120) + 'ms'; });
          renderHero(); renderFlow();
          await wait(T(500 + ev.cards.length * 120));
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
          bubble(ev.seat, '退回 ' + fmt(ev.amount), 'check');
          renderSeats();
          await wait(T(400));
          break;
        case 'award': {
          seatEls[ev.seat].classList.add('winner');
          await flyPot(ev.seat, ev.amount);
          renderSeats();
          if (ev.seat === HERO) Sound.win(); else Sound.chip();
          break;
        }
        case 'bust':
          break;
        case 'hand-end':
          renderAll();
          break;
        default:
          break;
      }
    }
  }

  function centerOf(elm) {
    const r = elm.getBoundingClientRect(), w = tableWrap.getBoundingClientRect();
    return { x: r.left + r.width / 2 - w.left, y: r.top + r.height / 2 - w.top };
  }
  async function animateBetsToPot() {
    const potEl = $('#pot');
    const target = centerOf(potEl);
    const moving = betEls.filter(b => !b.hidden);
    if (!moving.length) return;
    Sound.chip();
    const anims = moving.map(b => {
      const from = centerOf(b);
      return b.animate([{ transform: 'translate(-50%, -50%)' }, { transform: 'translate(calc(-50% + ' + (target.x - from.x) + 'px), calc(-50% + ' + (target.y - from.y) + 'px))', opacity: 0.2 }], { duration: T(420), easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }).finished.catch(() => {});
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
      await f.animate([{ transform: 'translate(-50%, -50%)' }, { transform: 'translate(calc(-50% + ' + (to.x - from.x) + 'px), calc(-50% + ' + (to.y - from.y) + 'px))' }], { duration: T(650), easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }).finished;
    } catch (e) { /* 忽略 */ }
    f.remove();
  }

  /* ---------- 一手结束：奖励与结果 ---------- */
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
  function trackTurnCat() {
    const g = session.game, p = g.players[HERO];
    if (g.street === 'turn' && g.board.length === 4 && !p.folded && p.cards.length === 2) {
      session.hand.heroTurnCat = E.evaluate(p.cards.concat(g.board)).cat;
    }
  }

  async function handEnd(token) {
    const g = session.game, p = g.players[HERO], s = profile.stats, hand = session.hand, res = g.result;
    const levelBefore = levelFromXp(profile.xp);
    let xp = 10;
    const heroWon = res.winners.includes(HERO);
    const won = res.pots.reduce((sum, pot) => sum + (pot.shares && pot.shares[HERO] ? pot.shares[HERO] : 0), 0);
    const netChange = p.chips - hand.startChips;
    s.hands++;
    if (hand.vpip) s.vpipHands++;
    const earned = [];
    const pos = g.positions()[HERO];
    if (heroWon) {
      s.wins++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); xp += 25;
      s.chipsWon += Math.max(0, won);
      const potTotal = res.pots.reduce((sum, pot) => sum + pot.amount, 0);
      s.biggestPot = Math.max(s.biggestPot, potTotal);
      if (unlock('first-win')) earned.push('first-win');
      if (potTotal > 100 * g.bb && unlock('big-pot')) earned.push('big-pot');
      if (s.streak >= 3 && unlock('streak3')) earned.push('streak3');
      if (!res.uncontested) {
        s.showdownWins++; xp += 25;
        const h = p.hand || E.evaluate(p.cards.concat(g.board));
        if (h.score > (s.bestHandScore || 0)) { s.bestHandScore = h.score; s.bestHand = h.label; }
        const cat = h.cat;
        const map = { [E.CAT.FLUSH]: 'flush', [E.CAT.FULL_HOUSE]: 'full-house', [E.CAT.QUADS]: 'quads', [E.CAT.STRAIGHT_FLUSH]: 'straight-flush' };
        if (map[cat] && unlock(map[cat])) earned.push(map[cat]);
        if (h.royal && unlock('royal')) earned.push('royal');
        if (hand.heroAllIn && unlock('allin-win')) earned.push('allin-win');
        if ((cat === E.CAT.FLUSH || cat === E.CAT.STRAIGHT) && hand.heroTurnCat != null && hand.heroTurnCat < E.CAT.STRAIGHT && unlock('river-hit')) earned.push('river-hit');
      } else {
        if (res.street === 'preflop' && g.preflopAggressor === HERO && (pos === 'BTN' || pos === 'CO' || pos === 'BTN/SB') && unlock('steal')) earned.push('steal');
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
    profile.xp += xp;
    save();
    const levelAfter = levelFromXp(profile.xp);
    if (levelAfter > levelBefore) toast('升到 ' + levelAfter + ' 级 · ' + levelTitle(levelAfter) + '。' + nextUnlockText(levelAfter), true);

    await wait(T(900));
    if (token.cancelled) return;
    showResultSheet({ heroWon, won, netChange, xp, earned });
  }

  function showResultSheet(info) {
    const g = session.game, res = g.result, token = session.token;
    const winnersText = res.winners.map(w => w === HERO ? '你' : g.players[w].name).join('、');
    let title, cls = '';
    if (info.heroWon) { title = res.winners.length > 1 ? '平分底池 +' + fmt(info.won) : '你赢了 +' + fmt(info.won); cls = 'win'; }
    else title = winnersText + ' 赢了';
    let sub;
    if (res.uncontested) sub = res.winners.includes(HERO) ? '其他人都弃牌了，你不用亮牌。' : '你' + (g.players[HERO].folded ? '弃牌后，' : '') + '其他人都弃牌，底池直接归他。';
    else {
      const w = g.players[res.winners[0]];
      sub = '赢的牌型：' + (w.hand ? w.hand.label : '') + (res.pots.length > 1 ? '，这手有边池。' : '。');
    }
    const lines = [
      ['底池合计', fmt(res.pots.reduce((a, p) => a + p.amount, 0))],
      ['你的筹码变化', (info.netChange >= 0 ? '+' : '') + fmt(info.netChange)],
      ['经验', '+' + info.xp],
    ];
    const node = el('div', { class: 'result' }, [
      el('h2', { class: 'result-title ' + cls, text: title }),
      el('p', { class: 'result-sub', text: sub }),
      el('div', { class: 'result-lines' }, lines.map(([k, v]) => el('div', { class: 'row' }, [el('span', { text: k }), el('span', { class: 'num', text: v })]))),
    ]);
    info.earned.forEach(id => {
      const a = ACHIEVEMENTS.find(x => x.id === id);
      node.append(el('div', { class: 'achv-pop' }, [el('div', null, [el('strong', { text: '成就 · ' + a.name }), el('small', { text: a.desc + ' · 奖励 ' + fmt(a.reward) })])]));
    });
    const next = el('button', { type: 'button', class: 'btn btn-primary', text: '下一手' });
    const leave = el('button', { type: 'button', class: 'btn btn-ghost', text: '离开牌桌' });
    const countdown = el('span', { class: 'countdown' });
    node.append(el('div', { class: 'result-foot' }, [el('div', { style: 'display:flex;gap:8px;align-items:center' }, [next, countdown]), leave]));
    let timer = null, left = 5;
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const go = () => { stop(); closeOverlays(); if (token.cancelled) return; startNextHand(); };
    next.addEventListener('click', go);
    leave.addEventListener('click', () => { stop(); leaveTable(); });
    openSheet(node, { sticky: true, onClose: stop });
    if (profile.settings.autoNext) {
      countdown.textContent = left + ' 秒后自动开始';
      timer = setInterval(() => {
        left--;
        if (left <= 0) { go(); return; }
        countdown.textContent = left + ' 秒后自动开始';
      }, 1000);
    }
  }

  function showBustSheet() {
    const canBuy = profile.bankroll >= BUYIN;
    const node = el('div', { class: 'result' }, [
      el('h2', { class: 'result-title', text: '筹码打光了' }),
      el('p', { class: 'result-sub', text: canBuy ? '余额还有 ' + fmt(profile.bankroll) + '，可以再买入 ' + fmt(BUYIN) + ' 继续。' : '余额不够再买入。回大厅可以领一笔救济金。' }),
      el('div', { class: 'result-foot' }, [
        canBuy ? el('button', { type: 'button', class: 'btn btn-primary', text: '再买入 ' + fmt(BUYIN), onclick: () => { profile.bankroll -= BUYIN; profile.stats.bustCount++; session.game.rebuy(HERO, BUYIN); save(); closeOverlays(); startNextHand(); } }) : null,
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
      if (DEBUG) console.log('[quiz]', kind, 'street', g.street, 'phase', g.phase, 'toAct', g.toAct, 'answer', q && q.answer, 'existing', !!quiz);
      if (!q) { resolve(); return; }
      quiz = { q, resolve, wrong: 0, answeredFirst: false };
      renderQuiz();
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
    if (q.type === 'choice') {
      bar.append(el('div', { class: 'quiz-options' }, q.options.map(o => el('button', { type: 'button', class: 'btn btn-sm', text: o.label, onclick: () => answerQuiz(o.id) }))));
    } else {
      bar.append(el('div', { class: 'quiz-options' }, [el('button', { type: 'button', class: 'btn btn-sm', text: '是我', onclick: () => answerQuiz(HERO) })]));
    }
    if (feedback) bar.append(el('p', { class: 'quiz-feedback ' + (cls || ''), text: feedback }));
    bar.append(el('div', { class: 'quiz-foot' }, [
      el('span', { text: '连对 ' + profile.stats.dealerStreak + ' · 正确率 ' + (profile.stats.dealerTotal ? Math.round(profile.stats.dealerCorrect / profile.stats.dealerTotal * 100) + '%' : '—') }),
      el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: '跳过', onclick: () => finishQuiz(false, true) }),
    ]));
    host.append(bar);
  }
  function onSeatClick(seat) {
    if (!quiz || quiz.q.type !== 'seat') return;
    answerQuiz(seat);
  }
  function answerQuiz(answer) {
    if (!quiz) return;
    const q = quiz.q;
    const correct = Array.isArray(q.answer) ? q.answer.includes(answer) : q.answer === answer;
    if (correct) {
      const firstTry = quiz.wrong === 0;
      profile.stats.dealerTotal++;
      if (firstTry) { profile.stats.dealerCorrect++; profile.stats.dealerStreak++; profile.stats.dealerBest = Math.max(profile.stats.dealerBest, profile.stats.dealerStreak); profile.xp += 5; }
      else profile.stats.dealerStreak = 0;
      save();
      if (profile.stats.dealerStreak >= 10) unlock('dealer10');
      renderQuiz((firstTry ? '对。' : '对了。') + q.explain, 'ok');
      Sound.tap();
      setTimeout(() => finishQuiz(true), T(firstTry ? 1500 : 2600));
      return;
    }
    quiz.wrong++;
    Sound.fold();
    if (quiz.wrong >= 2) {
      profile.stats.dealerTotal++; profile.stats.dealerStreak = 0; save();
      renderQuiz('不对。' + q.explain, 'bad');
      setTimeout(() => finishQuiz(false), T(3200));
    } else {
      const hint = q.kind === 'first-to-act'
        ? (session.game.street === 'preflop' ? '再想想：翻牌前从大盲的左边数。' : '再想想：翻牌后从庄家的左边数，跳过弃牌和全下的人。')
        : q.kind === 'next-step' ? '再想想：数一数公共牌有几张，还有几个人没弃牌。' : '再想想：每个人用两张底牌加五张公共牌凑最大的五张。';
      renderQuiz(hint, 'bad');
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
      el('div', { class: 'drawer-head' }, [el('h2', { text: '发牌员记录' }), el('button', { type: 'button', class: 'btn-icon', 'aria-label': '关闭', onclick: closeOverlays, html: '<svg class="icon" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>' })]),
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
    const open = f.classList.toggle('open');
    f.setAttribute('aria-expanded', String(open));
  });

  /* ---------- 对手转牌时记录牌力（用于河牌逆转成就） ---------- */
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
    dailyBonus();
    renderLobby();
    window.addEventListener('orientationchange', () => setTimeout(layoutSeats, 200));
  }
  if (DEBUG) window.__dz = { get session() { return session; }, get quiz() { return quiz; }, get profile() { return profile; } };
  const hot = window.claude && window.claude.hot;
  if (hot && typeof hot.snapshot === 'function') { try { hot.snapshot(() => ({})); } catch (e) { /* 忽略 */ } }
  if (hot && typeof hot.ready === 'function') hot.ready(start); else start();
})();
