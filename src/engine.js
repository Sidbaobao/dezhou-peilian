/* 德州陪练 · 规则引擎（无 DOM）
 * 牌用两字符字符串表示：点数 2-9 T J Q K A，花色 s h d c，例如 'As' 'Td'。
 * 引擎只产生结构化事件，不包含任何界面文案。
 */
(function (root) {
  'use strict';

  const RANK_CHARS = '23456789TJQKA';
  const SUITS = ['s', 'h', 'd', 'c'];

  function rankOf(card) { return RANK_CHARS.indexOf(card[0]) + 2; }
  function suitOf(card) { return card[1]; }
  function makeCard(rank, suit) { return RANK_CHARS[rank - 2] + suit; }

  function freshDeck() {
    const deck = [];
    for (const s of SUITS) for (let r = 2; r <= 14; r++) deck.push(makeCard(r, s));
    return deck;
  }

  function shuffle(deck, rng) {
    const a = deck.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- 牌型评估 ---------- */

  const CAT = {
    HIGH: 0, PAIR: 1, TWO_PAIR: 2, TRIPS: 3, STRAIGHT: 4,
    FLUSH: 5, FULL_HOUSE: 6, QUADS: 7, STRAIGHT_FLUSH: 8,
  };

  const CAT_NAMES = ['高牌', '一对', '两对', '三条', '顺子', '同花', '葫芦', '四条', '同花顺'];

  function encode(cat, ranks) {
    let score = cat;
    for (let i = 0; i < 5; i++) score = score * 15 + (ranks[i] || 0);
    return score;
  }

  function evaluate5(cards) {
    const ranks = cards.map(rankOf).sort((a, b) => b - a);
    const flush = cards.every(c => c[1] === cards[0][1]);
    const counts = new Map();
    for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);
    const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

    let straightHigh = 0;
    if (groups.length === 5) {
      if (ranks[0] - ranks[4] === 4) straightHigh = ranks[0];
      else if (ranks[0] === 14 && ranks[1] === 5 && ranks[4] === 2) straightHigh = 5;
    }

    let cat, tie;
    if (straightHigh && flush) { cat = CAT.STRAIGHT_FLUSH; tie = [straightHigh]; }
    else if (groups[0][1] === 4) { cat = CAT.QUADS; tie = [groups[0][0], groups[1][0]]; }
    else if (groups[0][1] === 3 && groups[1][1] === 2) { cat = CAT.FULL_HOUSE; tie = [groups[0][0], groups[1][0]]; }
    else if (flush) { cat = CAT.FLUSH; tie = ranks; }
    else if (straightHigh) { cat = CAT.STRAIGHT; tie = [straightHigh]; }
    else if (groups[0][1] === 3) { cat = CAT.TRIPS; tie = [groups[0][0], groups[1][0], groups[2][0]]; }
    else if (groups[0][1] === 2 && groups[1][1] === 2) { cat = CAT.TWO_PAIR; tie = [groups[0][0], groups[1][0], groups[2][0]]; }
    else if (groups[0][1] === 2) { cat = CAT.PAIR; tie = [groups[0][0], groups[1][0], groups[2][0], groups[3][0]]; }
    else { cat = CAT.HIGH; tie = ranks; }

    return { cat, tie, score: encode(cat, tie), cards: cards.slice() };
  }

  function combos5(cards) {
    const n = cards.length, out = [];
    for (let a = 0; a < n - 4; a++)
      for (let b = a + 1; b < n - 3; b++)
        for (let c = b + 1; c < n - 2; c++)
          for (let d = c + 1; d < n - 1; d++)
            for (let e = d + 1; e < n; e++)
              out.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
    return out;
  }

  /* 评估 5 到 7 张牌，返回最佳五张及其牌型 */
  function evaluate(cards) {
    if (cards.length < 5) return null;
    if (cards.length === 5) return finish(evaluate5(cards));
    let best = null;
    for (const combo of combos5(cards)) {
      const r = evaluate5(combo);
      if (!best || r.score > best.score) best = r;
    }
    return finish(best);
  }

  function rankLabel(r) {
    if (r === 14) return 'A';
    if (r === 13) return 'K';
    if (r === 12) return 'Q';
    if (r === 11) return 'J';
    return String(r);
  }

  function finish(r) {
    r.name = CAT_NAMES[r.cat];
    r.royal = r.cat === CAT.STRAIGHT_FLUSH && r.tie[0] === 14;
    if (r.royal) r.name = '皇家同花顺';
    r.label = describe(r);
    return r;
  }

  function describe(r) {
    const t = r.tie;
    switch (r.cat) {
      case CAT.HIGH: return '高牌 ' + rankLabel(t[0]);
      case CAT.PAIR: return '一对 ' + rankLabel(t[0]);
      case CAT.TWO_PAIR: return '两对 ' + rankLabel(t[0]) + ' 和 ' + rankLabel(t[1]);
      case CAT.TRIPS: return '三条 ' + rankLabel(t[0]);
      case CAT.STRAIGHT: return '顺子 ' + rankLabel(t[0] === 5 ? 14 : t[0] - 4) + ' 到 ' + rankLabel(t[0]);
      case CAT.FLUSH: return rankLabel(t[0]) + ' 高同花';
      case CAT.FULL_HOUSE: return '葫芦 ' + rankLabel(t[0]) + ' 带 ' + rankLabel(t[1]);
      case CAT.QUADS: return '四条 ' + rankLabel(t[0]);
      case CAT.STRAIGHT_FLUSH:
        if (r.royal) return '皇家同花顺';
        return '同花顺 ' + rankLabel(t[0] === 5 ? 14 : t[0] - 4) + ' 到 ' + rankLabel(t[0]);
    }
    return '';
  }

  /* ---------- 一手牌状态机 ---------- */

  const STREETS = ['preflop', 'flop', 'turn', 'river'];

  class Game {
    constructor(opts) {
      this.sb = opts.blinds.sb;
      this.bb = opts.blinds.bb;
      this.rng = opts.rng || Math.random;
      this.players = opts.players.map((p, i) => ({
        seat: i,
        id: p.id != null ? p.id : i,
        name: p.name || ('座位' + (i + 1)),
        chips: p.chips,
        isHuman: !!p.isHuman,
        style: p.style || null,
        cards: [], bet: 0, total: 0,
        folded: false, allIn: false, out: p.chips <= 0,
        acted: false, actedAtRaise: -1,
        lastAction: null,
      }));
      this.button = opts.button == null ? -1 : opts.button;
      this.handNo = 0;
      this.phase = 'idle';
      this.street = null;
      this.board = [];
      this.deck = [];
      this.toAct = -1;
      this.currentBet = 0;
      this.minRaise = this.bb;
      this.raiseCount = 0;
      this.lastAggressor = -1;
      this.riverAggressor = -1;
      this.preflopAggressor = -1;
      this.pending = null;
      this.result = null;
      this.sbSeat = -1;
      this.bbSeat = -1;
    }

    /* ----- 工具 ----- */

    seated() { return this.players.filter(p => !p.out); }
    nextSeat(from, pred) {
      const n = this.players.length;
      for (let k = 1; k <= n; k++) {
        const p = this.players[(from + k) % n];
        if (pred(p)) return p.seat;
      }
      return -1;
    }
    inHand(p) { return !p.out && !p.folded; }
    canAct(p) { return this.inHand(p) && !p.allIn; }
    needsToAct(p) { return this.canAct(p) && (!p.acted || p.bet < this.currentBet); }
    potTotal() { return this.players.reduce((s, p) => s + p.total, 0); }
    potCollected() { return this.players.reduce((s, p) => s + p.total - p.bet, 0); }
    headsUp() { return this.seated().length === 2; }

    positions() {
      const labels = {};
      const seatedN = this.seated().length;
      if (seatedN < 2 || this.button < 0) return labels;
      const order = [];
      let s = this.button;
      for (let k = 0; k < seatedN; k++) {
        order.push(s);
        s = this.nextSeat(s, p => !p.out);
      }
      if (seatedN === 2) {
        labels[order[0]] = 'BTN/SB';
        labels[order[1]] = 'BB';
        return labels;
      }
      const names = { 3: ['BTN', 'SB', 'BB'], 4: ['BTN', 'SB', 'BB', 'UTG'], 5: ['BTN', 'SB', 'BB', 'UTG', 'CO'], 6: ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'] };
      const list = names[seatedN] || ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'CO-1'].slice(0, seatedN);
      order.forEach((seat, i) => { labels[seat] = list[i]; });
      return labels;
    }

    /* ----- 开始一手 ----- */

    startHand(options) {
      options = options || {};
      const events = [];
      for (const p of this.players) {
        p.out = p.chips <= 0;
        p.cards = []; p.bet = 0; p.total = 0;
        p.folded = false; p.allIn = false; p.acted = false; p.actedAtRaise = -1;
        p.lastAction = null; p.revealed = false; p.hand = null;
      }
      const seated = this.seated();
      if (seated.length < 2) {
        this.phase = 'idle';
        events.push({ type: 'need-players' });
        return events;
      }
      this.handNo++;
      this.board = [];
      this.street = 'preflop';
      this.pending = null;
      this.result = null;
      this.raiseCount = 0;
      this.lastAggressor = -1;
      this.riverAggressor = -1;
      this.preflopAggressor = -1;

      // 庄家按钮移到下一位有筹码的玩家
      if (this.button < 0) {
        this.button = options.button != null ? options.button : seated[Math.floor(this.rng() * seated.length)].seat;
      } else {
        this.button = this.nextSeat(this.button, p => !p.out);
      }
      events.push({ type: 'hand-start', handNo: this.handNo, button: this.button, positions: this.positions() });

      // 盲注
      if (seated.length === 2) {
        this.sbSeat = this.button;
        this.bbSeat = this.nextSeat(this.button, p => !p.out);
      } else {
        this.sbSeat = this.nextSeat(this.button, p => !p.out);
        this.bbSeat = this.nextSeat(this.sbSeat, p => !p.out);
      }
      events.push(this.postBlind(this.sbSeat, 'sb', this.sb));
      events.push(this.postBlind(this.bbSeat, 'bb', this.bb));
      this.currentBet = this.bb;
      this.minRaise = this.bb;

      // 发底牌：从庄家左手第一位开始，每人一张，发两轮
      this.deck = options.deck ? options.deck.slice() : shuffle(freshDeck(), this.rng);
      // 洗好的整副牌顺序，供界面在发牌前记录指纹、结束后公开核对
      this.shuffled = this.deck.slice();
      const order = [];
      let s = this.nextSeat(this.button, p => !p.out);
      for (let k = 0; k < seated.length; k++) { order.push(s); s = this.nextSeat(s, p => !p.out); }
      for (let round = 0; round < 2; round++) {
        for (const seat of order) this.players[seat].cards.push(this.deck.pop());
      }
      events.push({ type: 'deal-hole', order });

      // 翻牌前第一个行动的人
      const first = this.firstToAct('preflop');
      if (first < 0 || this.players.filter(p => this.canAct(p)).length < 2) {
        // 盲注就把人全下了，没有下注轮
        events.push({ type: 'street', street: 'preflop', first: -1, skipped: true });
        events.push(...this.closeRound());
      } else {
        this.phase = 'betting';
        this.toAct = first;
        events.push({ type: 'street', street: 'preflop', first });
        events.push({ type: 'turn', seat: first });
      }
      return events;
    }

    postBlind(seat, kind, amount) {
      const p = this.players[seat];
      const paid = Math.min(amount, p.chips);
      p.chips -= paid; p.bet = paid; p.total = paid;
      if (p.chips === 0) p.allIn = true;
      p.lastAction = { type: kind, amount: paid };
      return { type: 'blind', seat, kind, amount: paid, allIn: p.allIn, short: paid < amount };
    }

    /* 某条街第一个行动的座位（不改变状态） */
    firstToAct(street) {
      if (street === 'preflop') {
        if (this.headsUp()) {
          return this.canAct(this.players[this.button]) ? this.button : this.nextSeat(this.button, p => this.canAct(p));
        }
        return this.nextSeat(this.bbSeat, p => this.canAct(p));
      }
      return this.nextSeat(this.button, p => this.canAct(p));
    }

    /* ----- 合法动作 ----- */

    legalActions(seat) {
      if (this.phase !== 'betting' || seat !== this.toAct) return null;
      const p = this.players[seat];
      const toCall = Math.min(this.currentBet - p.bet, p.chips);
      const maxTo = p.bet + p.chips;
      const canRaise = p.chips > toCall && p.actedAtRaise !== this.raiseCount;
      let raise = null;
      if (canRaise) {
        const min = Math.min(this.currentBet + this.minRaise, maxTo);
        raise = { min, max: maxTo };
      }
      return {
        fold: true,
        check: toCall === 0,
        call: toCall > 0 ? toCall : 0,
        callIsAllIn: toCall > 0 && toCall >= p.chips,
        raise,
        allIn: maxTo,
        toCall,
        pot: this.potTotal(),
      };
    }

    /* ----- 执行动作 ----- */

    act(seat, action) {
      const legal = this.legalActions(seat);
      if (!legal) throw new Error('不是该座位行动的时候');
      const p = this.players[seat];
      const events = [];
      let type = action.type;
      let amount = action.amount;

      if (type === 'allin') {
        amount = p.bet + p.chips;
        type = amount > this.currentBet ? 'raise' : 'call';
        if (type === 'call' && legal.toCall === 0) type = 'check';
      }

      if (type === 'fold') {
        p.folded = true; p.acted = true;
        p.lastAction = { type: 'fold' };
        events.push({ type: 'action', seat, action: 'fold' });
      } else if (type === 'check') {
        if (!legal.check) throw new Error('有人下注时不能过牌');
        p.acted = true; p.actedAtRaise = this.raiseCount;
        p.lastAction = { type: 'check' };
        events.push({ type: 'action', seat, action: 'check' });
      } else if (type === 'call') {
        if (!legal.call) throw new Error('没有需要跟注的金额');
        const paid = legal.toCall;
        p.chips -= paid; p.bet += paid; p.total += paid;
        if (p.chips === 0) p.allIn = true;
        p.acted = true; p.actedAtRaise = this.raiseCount;
        p.lastAction = { type: 'call', amount: paid, allIn: p.allIn };
        events.push({ type: 'action', seat, action: 'call', amount: paid, to: p.bet, allIn: p.allIn });
      } else if (type === 'raise') {
        if (!legal.raise) throw new Error('现在不能加注');
        if (amount == null) amount = legal.raise.min;
        amount = Math.round(amount);
        if (amount > legal.raise.max) amount = legal.raise.max;
        if (amount < legal.raise.min && amount !== legal.raise.max) throw new Error('加注额低于最小加注');
        const wasBet = this.currentBet === 0;
        const raiseSize = amount - this.currentBet;
        const full = raiseSize >= this.minRaise;
        const paid = amount - p.bet;
        p.chips -= paid; p.bet = amount; p.total += paid;
        if (p.chips === 0) p.allIn = true;
        this.currentBet = amount;
        if (full) { this.minRaise = raiseSize; this.raiseCount++; }
        this.lastAggressor = seat;
        if (this.street === 'river') this.riverAggressor = seat;
        if (this.street === 'preflop') this.preflopAggressor = seat;
        p.acted = true; p.actedAtRaise = this.raiseCount;
        const label = wasBet ? 'bet' : 'raise';
        p.lastAction = { type: label, amount, allIn: p.allIn };
        events.push({ type: 'action', seat, action: label, amount: paid, to: amount, raiseSize, full, allIn: p.allIn });
      } else {
        throw new Error('未知动作 ' + type);
      }

      events.push(...this.afterAction(seat));
      return events;
    }

    afterAction(seat) {
      const events = [];
      const inHand = this.players.filter(p => this.inHand(p));
      if (inHand.length === 1) {
        this.phase = 'between';
        this.toAct = -1;
        for (const p of this.players) p.bet = 0;
        this.currentBet = 0;
        this.pending = { kind: 'award-uncontested', seat: inHand[0].seat };
        events.push({ type: 'round-end', street: this.street, pot: this.potTotal(), uncontested: true });
        return events;
      }
      const next = this.nextSeat(seat, p => this.needsToAct(p));
      if (next >= 0) {
        this.toAct = next;
        events.push({ type: 'turn', seat: next });
        return events;
      }
      events.push(...this.closeRound());
      return events;
    }

    /* 一轮下注结束：收筹码进底池，决定下一步 */
    closeRound() {
      const events = [];
      this.toAct = -1;
      this.phase = 'between';
      for (const p of this.players) p.bet = 0;
      this.currentBet = 0;
      events.push({ type: 'round-end', street: this.street, pot: this.potTotal() });

      const inHand = this.players.filter(p => this.inHand(p));
      const able = inHand.filter(p => !p.allIn);
      if (this.street === 'river') {
        this.pending = { kind: 'showdown' };
      } else {
        const idx = STREETS.indexOf(this.street);
        this.pending = { kind: 'deal-' + STREETS[idx + 1], street: STREETS[idx + 1] };
        if (able.length < 2 && inHand.length >= 2) {
          events.push({ type: 'all-in-showdown', seats: inHand.map(p => p.seat) });
        }
      }
      return events;
    }

    /* 下一步是什么（供发牌员模式提问，不改变状态） */
    nextStep() {
      if (this.phase === 'betting') {
        return { kind: 'betting', street: this.street, seat: this.toAct };
      }
      if (!this.pending) return null;
      const step = Object.assign({}, this.pending);
      if (step.kind.startsWith('deal-')) {
        const able = this.players.filter(p => this.canAct(p));
        step.first = able.length >= 2 ? this.nextSeat(this.button, p => this.canAct(p)) : -1;
      }
      return step;
    }

    /* 执行下一步 */
    advance() {
      if (this.phase !== 'between' || !this.pending) return [];
      const step = this.pending;
      this.pending = null;
      if (step.kind === 'award-uncontested') return this.awardUncontested(step.seat);
      if (step.kind === 'showdown') return this.showdown();
      return this.dealStreet(step.street);
    }

    dealStreet(street) {
      const events = [];
      this.street = street;
      const count = street === 'flop' ? 3 : 1;
      this.deck.pop(); // 烧牌
      const cards = [];
      for (let i = 0; i < count; i++) cards.push(this.deck.pop());
      this.board.push(...cards);
      events.push({ type: 'deal-board', street, cards, board: this.board.slice() });

      for (const p of this.players) { p.acted = false; p.actedAtRaise = -1; if (!p.folded) p.lastAction = null; }
      this.currentBet = 0;
      this.minRaise = this.bb;
      this.raiseCount = 0;
      this.lastAggressor = -1;

      const able = this.players.filter(p => this.canAct(p));
      if (able.length >= 2) {
        const first = this.firstToAct(street);
        this.phase = 'betting';
        this.toAct = first;
        events.push({ type: 'street', street, first });
        events.push({ type: 'turn', seat: first });
      } else {
        events.push({ type: 'street', street, first: -1, skipped: true });
        events.push(...this.closeRound());
      }
      return events;
    }

    /* 其他人都弃牌：退回未被跟注的部分，底池给唯一剩下的人 */
    awardUncontested(seat) {
      const events = [];
      const winner = this.players[seat];
      const othersMax = Math.max(0, ...this.players.filter(p => p.seat !== seat && !p.out).map(p => p.total));
      const refund = Math.max(0, winner.total - othersMax);
      if (refund > 0) {
        winner.total -= refund;
        winner.chips += refund;
        events.push({ type: 'returned', seat, amount: refund });
      }
      const pot = this.potTotal();
      winner.chips += pot;
      events.push({ type: 'award', seat, amount: pot, potIndex: 0, reason: 'uncontested' });
      this.result = {
        uncontested: true,
        winners: [seat],
        pots: [{ amount: pot, eligible: [seat], winners: [seat], shares: { [seat]: pot } }],
        reveals: [],
        street: this.street,
      };
      return this.endHand(events);
    }

    /* 计算边池（不改变状态） */
    buildPots() {
      const contributors = this.players.filter(p => p.total > 0);
      const inHand = this.players.filter(p => this.inHand(p));
      const levels = [...new Set(inHand.map(p => p.total))].sort((a, b) => a - b);
      const pots = [];
      let prev = 0;
      for (const level of levels) {
        let amount = 0;
        for (const p of contributors) amount += Math.max(0, Math.min(p.total, level) - Math.min(p.total, prev));
        const eligible = inHand.filter(p => p.total >= level).map(p => p.seat);
        if (amount > 0) pots.push({ amount, eligible });
        prev = level;
      }
      // 弃牌玩家投入超过所有在局玩家的部分（理论上不会发生，保险起见归入最后一个底池）
      let leftover = 0;
      for (const p of contributors) leftover += Math.max(0, p.total - prev);
      if (leftover > 0 && pots.length) pots[pots.length - 1].amount += leftover;
      return pots;
    }

    /* 摊牌预览：每个底池的赢家（不改变状态） */
    previewShowdown() {
      const inHand = this.players.filter(p => this.inHand(p));
      for (const p of inHand) p.hand = evaluate(p.cards.concat(this.board));
      const pots = this.buildPots();
      for (const pot of pots) {
        let best = -1;
        for (const seat of pot.eligible) best = Math.max(best, this.players[seat].hand.score);
        pot.winners = pot.eligible.filter(seat => this.players[seat].hand.score === best);
      }
      return pots;
    }

    showdown() {
      const events = [];
      const inHand = this.players.filter(p => this.inHand(p));
      const pots = this.previewShowdown();

      // 亮牌顺序：河牌有下注则最后下注者先亮，否则庄家左手第一位先亮
      let start = this.riverAggressor >= 0 && this.inHand(this.players[this.riverAggressor])
        ? this.riverAggressor
        : this.nextSeat(this.button, p => this.inHand(p));
      const reveals = [];
      let s = start;
      for (let k = 0; k < inHand.length; k++) {
        const p = this.players[s];
        p.revealed = true;
        reveals.push({ seat: s, cards: p.cards.slice(), hand: p.hand });
        s = this.nextSeat(s, p2 => this.inHand(p2));
      }
      events.push({ type: 'showdown', reveals, board: this.board.slice() });

      const allWinners = new Set();
      pots.forEach((pot, i) => {
        pot.shares = {};
        if (pot.winners.length === 1 && pot.eligible.length === 1) {
          const seat = pot.winners[0];
          this.players[seat].chips += pot.amount;
          this.players[seat].total -= pot.amount;
          pot.shares[seat] = pot.amount;
          events.push({ type: 'returned', seat, amount: pot.amount, potIndex: i });
          return;
        }
        const share = Math.floor(pot.amount / pot.winners.length);
        let remainder = pot.amount - share * pot.winners.length;
        // 零头从庄家左手第一位赢家开始分
        const ordered = [];
        let seat = this.nextSeat(this.button, p => pot.winners.includes(p.seat));
        for (let k = 0; k < pot.winners.length; k++) {
          ordered.push(seat);
          seat = this.nextSeat(seat, p => pot.winners.includes(p.seat));
        }
        for (const w of ordered) {
          const extra = remainder > 0 ? 1 : 0;
          remainder -= extra;
          const amt = share + extra;
          this.players[w].chips += amt;
          pot.shares[w] = amt;
          allWinners.add(w);
          events.push({
            type: 'award', seat: w, amount: amt, potIndex: i,
            reason: pot.winners.length > 1 ? 'split' : 'best-hand',
            hand: this.players[w].hand, side: i > 0,
          });
        }
      });

      this.result = { uncontested: false, winners: [...allWinners], pots, reveals, street: 'river' };
      return this.endHand(events);
    }

    endHand(events) {
      this.phase = 'done';
      this.toAct = -1;
      this.pending = null;
      const busted = this.players.filter(p => !p.out && p.chips === 0).map(p => p.seat);
      for (const seat of busted) events.push({ type: 'bust', seat });
      events.push({ type: 'hand-end', handNo: this.handNo, winners: this.result.winners, result: this.result });
      return events;
    }

    rebuy(seat, amount) {
      const p = this.players[seat];
      p.chips += amount;
      p.out = false;
      return { type: 'rebuy', seat, amount };
    }

    /* 供界面保存与恢复的快照（只在两手之间使用） */
    snapshot() {
      return {
        button: this.button,
        handNo: this.handNo,
        players: this.players.map(p => ({ id: p.id, name: p.name, chips: p.chips, isHuman: p.isHuman, style: p.style })),
      };
    }
  }

  const api = {
    RANK_CHARS, SUITS, CAT, CAT_NAMES, STREETS,
    rankOf, suitOf, makeCard, rankLabel, freshDeck, shuffle,
    evaluate, evaluate5, combos5, Game,
  };
  root.PokerEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
