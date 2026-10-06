/* 德州陪练 · 教学层
 * 局面分析（成牌分档、听牌、胜率估算）、给玩家的建议与解释、发牌员模式提问。
 * 对手决策（ai.js）也复用这里的分析函数。
 */
(function (root) {
  'use strict';
  const E = root.PokerEngine || (typeof require !== 'undefined' ? require('./engine.js') : null);
  const { rankOf, suitOf, rankLabel, evaluate, freshDeck, CAT } = E;

  const STREET_NAMES = { preflop: '翻牌前', flop: '翻牌圈', turn: '转牌圈', river: '河牌圈' };
  const POS_NAMES = {
    'BTN': '庄位', 'SB': '小盲位', 'BB': '大盲位', 'UTG': '枪口位', 'HJ': '中位', 'CO': '关煞位',
    'BTN/SB': '庄位兼小盲', 'UTG+1': '枪口后一位', 'MP': '中位', 'CO-1': '关煞前一位',
  };
  const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' };

  function cardText(card) {
    const r = card[0] === 'T' ? '10' : card[0];
    return r + SUIT_SYMBOLS[card[1]];
  }
  function cardsText(cards) { return cards.map(cardText).join(' '); }

  /* ---------- 翻牌前：Chen 公式 ---------- */

  function chenScore(cards) {
    const r1 = rankOf(cards[0]), r2 = rankOf(cards[1]);
    const hi = Math.max(r1, r2), lo = Math.min(r1, r2);
    const base = r => (r === 14 ? 10 : r === 13 ? 8 : r === 12 ? 7 : r === 11 ? 6 : r / 2);
    let score = base(hi);
    if (hi === lo) score = Math.max(5, score * 2);
    else {
      if (suitOf(cards[0]) === suitOf(cards[1])) score += 2;
      const gap = hi - lo - 1;
      score -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
      if (gap <= 1 && hi < 12) score += 1;
    }
    return Math.ceil(score);
  }

  function holeLabel(cards) {
    const r1 = rankOf(cards[0]), r2 = rankOf(cards[1]);
    const hi = Math.max(r1, r2), lo = Math.min(r1, r2);
    if (hi === lo) return '口袋对 ' + rankLabel(hi);
    const sep = (hi === 10 || lo === 10) ? ' ' : '';
    return rankLabel(hi) + sep + rankLabel(lo) + (suitOf(cards[0]) === suitOf(cards[1]) ? ' 同花' : ' 杂色');
  }

  function preflopTier(cards) {
    const score = chenScore(cards);
    let tier, name;
    if (score >= 12) { tier = 'premium'; name = '顶级牌'; }
    else if (score >= 10) { tier = 'strong'; name = '强牌'; }
    else if (score >= 8) { tier = 'playable'; name = '可玩牌'; }
    else if (score >= 6) { tier = 'speculative'; name = '投机牌'; }
    else { tier = 'weak'; name = '弱牌'; }
    return { score, tier, name, label: holeLabel(cards) };
  }

  const OPEN_THRESHOLD = { 'UTG': 9, 'UTG+1': 9, 'MP': 8, 'HJ': 8, 'CO': 7, 'CO-1': 7, 'BTN': 6, 'BTN/SB': 6, 'SB': 7, 'BB': 7 };
  const STYLE_NOTES = {
    tag: '他是紧凶型，加注通常真有牌',
    lag: '他是松凶型，加注范围很宽，不一定是大牌',
    rock: '他是紧弱型，平时很少加注，一加注多半是大牌',
    station: '他是松弱型，很少主动加注，加注时要当心',
    balanced: '他打法平衡，不好从加注判断牌力',
  };

  /* 当前最佳五张（公共牌不足三张时为空） */
  function bestFive(hole, board) {
    if (!hole || hole.length < 2 || !board || board.length < 3) return [];
    return evaluate(hole.concat(board)).cards;
  }

  /* ---------- 翻牌后：成牌分档 ---------- */

  function boardTexture(board) {
    const ranks = board.map(rankOf);
    const suits = {};
    for (const c of board) suits[suitOf(c)] = (suits[suitOf(c)] || 0) + 1;
    const maxSuit = Math.max(...Object.values(suits));
    const counts = {};
    for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
    const paired = Object.values(counts).some(n => n >= 2);
    const uniq = [...new Set(ranks)].sort((a, b) => a - b);
    let connected = 0;
    for (let i = 0; i < uniq.length; i++)
      for (let j = i + 1; j < uniq.length; j++)
        if (uniq[j] - uniq[i] <= 4) connected++;
    const notes = [];
    if (maxSuit >= 4) notes.push('牌面四张同花');
    else if (maxSuit === 3) notes.push('牌面三张同花');
    if (paired) notes.push('牌面有对子');
    if (connected >= 3) notes.push('牌面连张多，容易成顺');
    const wet = (maxSuit >= 3 ? 1 : 0) + (connected >= 3 ? 1 : 0) + (paired ? 0.5 : 0);
    return { maxSuit, paired, connected, wet, notes };
  }

  function classify(hole, board) {
    const all = hole.concat(board);
    const hand = evaluate(all);
    const holeRanks = hole.map(rankOf);
    const pocket = holeRanks[0] === holeRanks[1];
    const boardRanks = board.map(rankOf).sort((a, b) => b - a);
    const top = boardRanks[0], second = boardRanks.find(r => r < top) || 0;
    const usesHole = hand.cards.filter(c => hole.includes(c)).length;
    const texture = boardTexture(board);
    let tier, cls, name;

    switch (hand.cat) {
      case CAT.STRAIGHT_FLUSH: tier = 0.995; cls = 'straight-flush'; name = hand.label; break;
      case CAT.QUADS: tier = 0.99; cls = 'quads'; name = hand.label; break;
      case CAT.FULL_HOUSE: tier = 0.95; cls = 'full-house'; name = hand.label; break;
      case CAT.FLUSH: tier = 0.9; cls = 'flush'; name = hand.label; break;
      case CAT.STRAIGHT: tier = 0.85; cls = 'straight'; name = hand.label; break;
      case CAT.TRIPS:
        if (pocket && usesHole === 2) { tier = 0.86; cls = 'set'; name = '暗三条 ' + rankLabel(hand.tie[0]); }
        else if (usesHole >= 1) { tier = 0.78; cls = 'trips'; name = '三条 ' + rankLabel(hand.tie[0]); }
        else { tier = 0.3; cls = 'board-trips'; name = '牌面三条（大家都有）'; }
        break;
      case CAT.TWO_PAIR: {
        const pairRanks = [hand.tie[0], hand.tie[1]];
        const holeInPairs = holeRanks.filter(r => pairRanks.includes(r)).length;
        if (holeInPairs === 2 && !pocket) { tier = 0.74; cls = 'two-pair'; name = '两对 ' + rankLabel(pairRanks[0]) + ' 和 ' + rankLabel(pairRanks[1]); }
        else if (holeInPairs >= 1) {
          const mine = holeRanks.find(r => pairRanks.includes(r));
          tier = mine === top ? 0.6 : 0.5; cls = 'pair-plus-board'; name = '两对（一对在牌面上）';
        } else { tier = 0.2; cls = 'board-two-pair'; name = '牌面两对（大家都有）'; }
        break;
      }
      case CAT.PAIR: {
        const pr = hand.tie[0];
        if (pocket) {
          if (pr > top) { tier = 0.64; cls = 'overpair'; name = '超对 ' + rankLabel(pr); }
          else {
            const above = boardRanks.filter(r => r > pr).length;
            tier = above === 1 ? 0.4 : 0.26; cls = 'underpair'; name = '口袋对 ' + rankLabel(pr) + '（牌面有更大的牌）';
          }
        } else if (usesHole >= 1 && holeRanks.includes(pr)) {
          const kicker = holeRanks.find(r => r !== pr);
          if (pr === top) { tier = kicker >= 12 ? 0.58 : 0.5; cls = 'top-pair'; name = '顶对 ' + rankLabel(pr) + (kicker >= 12 ? '，踢脚好' : ''); }
          else if (pr === second) { tier = 0.38; cls = 'middle-pair'; name = '中对 ' + rankLabel(pr); }
          else { tier = 0.3; cls = 'bottom-pair'; name = '底对 ' + rankLabel(pr); }
        } else {
          const over = holeRanks.filter(r => r > top).length;
          tier = 0.12 + over * 0.04; cls = 'board-pair'; name = '牌面对子，你没有成牌';
        }
        break;
      }
      default: {
        const over = holeRanks.filter(r => r > top).length;
        if (over === 2) { tier = 0.15; cls = 'overcards'; name = '两张高牌 ' + rankLabel(holeRanks[0]) + rankLabel(holeRanks[1]); }
        else if (over === 1) { tier = 0.09; cls = 'one-overcard'; name = '一张高牌，没成牌'; }
        else { tier = 0.05; cls = 'nothing'; name = '没成牌'; }
      }
    }

    // 牌面危险时，对子类成牌打折
    if (['top-pair', 'middle-pair', 'bottom-pair', 'overpair', 'underpair', 'two-pair', 'pair-plus-board', 'trips', 'set'].includes(cls)) {
      tier *= 1 - Math.min(0.25, texture.wet * 0.1);
    }
    if (cls === 'straight' && texture.maxSuit >= 4) tier *= 0.8;
    if (cls === 'flush' && texture.paired) tier *= 0.95;

    return { hand, tier, cls, name, usesHole, texture, pocket };
  }

  /* 听牌：枚举未见的牌，看哪些能把牌提升到顺子或同花 */
  function draws(hole, board) {
    if (board.length < 3 || board.length > 4) return { list: [], outs: 0, cards: [] };
    const known = hole.concat(board);
    const cur = evaluate(known);
    if (cur.cat >= CAT.STRAIGHT && cur.cat !== CAT.TRIPS && cur.cat !== CAT.TWO_PAIR) return { list: [], outs: 0, cards: [] };
    const unseen = freshDeck().filter(c => !known.includes(c));
    let flushOuts = 0, straightOuts = 0;
    const outCards = [];
    for (const c of unseen) {
      const r = evaluate(known.concat([c]));
      if (r.cat <= cur.cat) continue;
      if (r.cat === CAT.FLUSH || r.cat === CAT.STRAIGHT_FLUSH) {
        // 只算用到至少一张底牌的同花
        if (r.cards.some(x => hole.includes(x))) { flushOuts++; outCards.push(c); }
      } else if (r.cat === CAT.STRAIGHT) {
        if (r.cards.some(x => hole.includes(x))) { straightOuts++; outCards.push(c); }
      }
    }
    const list = [];
    if (flushOuts >= 7) list.push({ kind: 'flush', outs: flushOuts, name: '同花听牌' });
    if (straightOuts >= 7) list.push({ kind: 'oesd', outs: straightOuts, name: '两头顺听牌' });
    else if (straightOuts >= 3) list.push({ kind: 'gutshot', outs: straightOuts, name: '卡顺听牌' });
    return { list, outs: outCards.length, cards: outCards };
  }

  /* 粗略胜率估算（面对 nOpp 个对手） */
  function equity(hole, board, nOpp) {
    nOpp = Math.max(1, nOpp || 1);
    if (board.length === 0) {
      const s = chenScore(hole);
      const base = Math.min(0.85, 0.3 + (s - 4) * 0.035);
      return Math.pow(Math.max(0.12, base), 1 + 0.45 * (nOpp - 1));
    }
    const c = classify(hole, board);
    const d = draws(hole, board);
    const perCard = board.length === 3 ? 0.04 : 0.02;
    const drawEq = Math.min(0.42, d.outs * perCard);
    const single = Math.min(0.98, c.tier + (1 - c.tier) * drawEq);
    return Math.pow(single, 1 + 0.45 * (nOpp - 1));
  }

  function potOdds(toCall, pot) { return toCall <= 0 ? 0 : toCall / (pot + toCall); }
  function pct(x) { return Math.round(x * 100) + '%'; }
  function roundTo(amount, unit) { return Math.max(unit, Math.round(amount / unit) * unit); }

  /* ---------- 给玩家的建议 ---------- */

  function recommend(game, seat) {
    const legal = game.legalActions(seat);
    if (!legal) return null;
    const p = game.players[seat];
    const pos = game.positions()[seat];
    const posName = POS_NAMES[pos] || pos;
    const opponents = game.players.filter(q => q.seat !== seat && game.inHand(q));
    const nOpp = opponents.length;
    const pot = game.potTotal();
    const reasons = [];
    const mk = (action, amount, title) => ({ action, amount, title, reasons, legal });
    const raiseTo = (want) => {
      if (!legal.raise) return null;
      let amt = roundTo(want, game.sb);
      return Math.min(legal.raise.max, Math.max(legal.raise.min, amt));
    };

    if (game.street === 'preflop') {
      const t = preflopTier(p.cards);
      const limpers = game.players.filter(q => q.seat !== seat && game.inHand(q) && q.total >= game.bb && q.seat !== game.bbSeat && q.seat !== game.sbSeat).length;
      reasons.push('你的底牌是' + t.label + '，按常用的翻牌前评分属于' + t.name + '（' + t.score + ' 分）。');
      reasons.push('你在' + posName + '。' + positionNote(pos, game.headsUp()));
      if (game.raiseCount === 0) {
        const threshold = OPEN_THRESHOLD[pos] || 8;
        if (t.score >= threshold) {
          const to = raiseTo(game.bb * (2.5 + limpers) + (pos === 'SB' ? game.sb : 0));
          if (to) {
            reasons.push('前面没人加注，主动加注既能赢下盲注，也能在翻牌后拿到主动权。常见的开池尺度是 2.5 到 3 个大盲。');
            return mk('raise', to, '建议加注到 ' + to);
          }
        }
        if (legal.check) {
          reasons.push('没有人加注，你可以免费看翻牌，不需要弃牌。');
          return mk('check', 0, '建议过牌，免费看翻牌');
        }
        if (pos === 'SB' && t.tier === 'speculative' && legal.call <= game.sb) {
          reasons.push('小盲只需再补 ' + legal.call + ' 就能看翻牌，投机牌可以便宜看一眼。');
          return mk('call', legal.call, '建议补齐 ' + legal.call + ' 看翻牌');
        }
        reasons.push('这手牌在' + posName + '不够主动加注的门槛，跟注进去容易翻牌后没方向。弃牌不花钱。');
        return mk('fold', 0, '建议弃牌');
      }
      // 面对加注
      const raiser = game.players[game.lastAggressor];
      reasons.push('前面 ' + (raiser ? raiser.name : '有人') + ' 加注到 ' + game.currentBet + '，你需要补 ' + legal.toCall + ' 才能继续。' + (raiser && raiser.style && STYLE_NOTES[raiser.style] ? STYLE_NOTES[raiser.style] + '。' : ''));
      if (t.score >= 12 && game.raiseCount <= 1) {
        const to = raiseTo(game.currentBet * 3);
        if (to) { reasons.push('顶级牌面对一次加注应该反加（3-bet），把底池做大。'); return mk('raise', to, '建议反加到 ' + to); }
      }
      if (t.score >= 16) {
        const to = raiseTo(game.currentBet * 2.5);
        if (to) { reasons.push('AA、KK 这种牌不怕再加注。'); return mk('raise', to, '建议再加注到 ' + to); }
      }
      const continueThreshold = game.raiseCount >= 2 ? 11 : 8;
      if (t.score >= continueThreshold && legal.toCall <= p.chips * 0.2) {
        reasons.push('牌力足够跟注看翻牌，跟注金额不到你筹码的 20%。');
        return mk('call', legal.call, '建议跟注 ' + legal.call);
      }
      if (legal.callIsAllIn && t.score >= 12) {
        reasons.push('跟注就是全下，顶级牌值得。');
        return mk('call', legal.call, '建议跟注全下');
      }
      reasons.push(t.score < continueThreshold ? '面对加注这手牌不够强，跟注是在用弱牌追强牌。' : '要补的金额太大，不值得用这手牌冒险。');
      return mk('fold', 0, '建议弃牌');
    }

    // 翻牌后
    const c = classify(p.cards, game.board);
    const d = draws(p.cards, game.board);
    const eq = equity(p.cards, game.board, nOpp);
    const inPosition = isLastToAct(game, seat);
    reasons.push('你现在是' + c.name + (c.hand ? '（最佳五张：' + c.hand.label + '）' : '') + '。');
    if (d.list.length) reasons.push('还有' + d.list.map(x => x.name + ' ' + x.outs + ' 张补牌').join('、') + '，下一张来对牌的概率约 ' + pct(Math.min(0.5, d.outs / (52 - 2 - game.board.length))) + '。');
    if (c.texture.notes.length) reasons.push('牌面提醒：' + c.texture.notes.join('，') + '。');
    reasons.push('面对 ' + nOpp + ' 个对手，粗估你的胜率约 ' + pct(eq) + '。');

    if (legal.check) {
      if (c.tier >= 0.6) {
        const to = raiseTo(pot * 0.66);
        if (to) { reasons.push('你的牌领先大部分对手牌，下注让对手为看牌付钱，也不给听牌免费机会。常见尺度是底池的 1/2 到 3/4。'); return mk('raise', to, '建议下注 ' + to); }
      }
      if (c.tier >= 0.45 && inPosition && nOpp <= 2) {
        const to = raiseTo(pot * 0.5);
        if (to) { reasons.push('你是最后行动的人，前面都过牌，中等牌力可以下注半个底池拿下底池。'); return mk('raise', to, '建议下注 ' + to); }
      }
      if (d.outs >= 8 && game.street !== 'river') {
        const to = raiseTo(pot * 0.5);
        if (to) { reasons.push('强听牌可以半诈唬：对手弃牌你直接赢，被跟注也还有不少补牌。'); return mk('raise', to, '建议下注 ' + to + '（半诈唬）'); }
      }
      reasons.push(game.street === 'river' ? '河牌没成牌，下注只会被更好的牌跟注。过牌看对手摊牌。' : '牌力一般，先过牌，看看对手怎么做再决定。');
      return mk('check', 0, '建议过牌');
    }

    const odds = potOdds(legal.toCall, pot);
    const bettor = game.players[game.lastAggressor];
    reasons.push('对手下注后底池 ' + pot + '，你要补 ' + legal.toCall + '，跟注需要至少 ' + pct(odds) + ' 的胜率才划算。' + (bettor && bettor.style && STYLE_NOTES[bettor.style] ? STYLE_NOTES[bettor.style].replace('加注', '下注') + '。' : ''));
    if (c.tier >= 0.74) {
      const to = raiseTo(Math.max(game.currentBet * 3, game.currentBet + pot * 0.7));
      if (to) { reasons.push('强牌面对下注应该加注，让底池变大。'); return mk('raise', to, '建议加注到 ' + to); }
    }
    if (legal.callIsAllIn && eq < odds + 0.1) {
      reasons.push('跟注就是全下，胜率优势不够明显，不必冒这个险。');
      return mk('fold', 0, '建议弃牌');
    }
    if (eq >= odds + 0.05) {
      reasons.push('估算胜率 ' + pct(eq) + ' 高于需要的 ' + pct(odds) + '，跟注是划算的。');
      return mk('call', legal.call, '建议跟注 ' + legal.call);
    }
    if (d.outs > 0 && game.street !== 'river') {
      const perCard = game.street === 'flop' ? 0.04 : 0.02;
      const drawEq = d.outs * perCard;
      if (drawEq >= odds * 0.9) {
        reasons.push('补牌概率约 ' + pct(drawEq) + '，和需要的 ' + pct(odds) + ' 差不多，加上成牌后还能赢更多，可以跟注。');
        return mk('call', legal.call, '建议跟注 ' + legal.call + '（听牌）');
      }
      reasons.push('补牌概率约 ' + pct(drawEq) + '，低于需要的 ' + pct(odds) + '，追牌不划算。');
    } else {
      reasons.push('胜率 ' + pct(eq) + ' 低于需要的 ' + pct(odds) + '，跟注长期亏钱。');
    }
    return mk('fold', 0, '建议弃牌');
  }

  function isLastToAct(game, seat) {
    // 翻牌后，庄家左边第一位最先行动；离庄家最近（顺时针方向最后）的人最后行动
    const able = game.players.filter(p => game.canAct(p)).map(p => p.seat);
    if (able.length <= 1) return true;
    let s = game.button, last = -1;
    const n = game.players.length;
    for (let k = 1; k <= n; k++) {
      const q = (game.button - k + n) % n;
      if (able.includes(q)) { last = q; break; }
    }
    if (game.street === 'preflop') {
      // 翻牌前大盲最后行动（单挑除外）
      if (game.headsUp()) return seat === game.bbSeat;
      return seat === game.bbSeat || (!able.includes(game.bbSeat) && seat === last);
    }
    return seat === last;
  }

  function positionNote(pos, headsUp) {
    if (headsUp) return pos === 'BB' ? '单挑时大盲翻牌前最后行动，翻牌后最先行动。' : '单挑时庄家兼小盲，翻牌前先行动，翻牌后最后行动。';
    switch (pos) {
      case 'BTN': return '庄位翻牌后最后行动，是最好的位置，可以玩更多牌。';
      case 'CO': return '关煞位只在庄家前面一位，位置不错。';
      case 'HJ': case 'MP': return '中间位置，后面还有几个人没说话，牌要稍微紧一点。';
      case 'UTG': case 'UTG+1': return '枪口位翻牌前第一个说话，后面的人都还没表态，应该只玩强牌。';
      case 'SB': return '小盲翻牌后第一个行动，位置最差，少玩弱牌。';
      case 'BB': return '大盲已经投入了一个盲注，没人加注时可以免费看翻牌。';
    }
    return '';
  }

  /* 动作按钮下的一句话解释 */
  function hints(game, seat) {
    const legal = game.legalActions(seat);
    if (!legal) return {};
    const h = {};
    h.fold = legal.check ? '现在没人下注，不用弃牌也能留在牌局里' : '放弃这手牌，已经投入的筹码不退';
    if (legal.check) h.check = '不下注，把行动交给下一位。没人下注时才能过牌';
    else h.call = legal.callIsAllIn ? '跟注需要 ' + legal.toCall + '，这会用光你的筹码（全下）' : '补 ' + legal.toCall + ' 和前面的下注持平';
    if (legal.raise) {
      const verb = game.currentBet === 0 ? '下注' : '加注';
      if (legal.raise.min === legal.raise.max) h.raise = '筹码不够最小加注，只能全下 ' + legal.raise.max;
      else if (game.currentBet === 0) h.raise = '至少下注一个大盲 ' + game.bb + '，常见尺度是半个到四分之三底池';
      else if (game.street === 'preflop' && game.raiseCount === 0) h.raise = '大盲算一次下注，再加一个大盲，至少到 ' + legal.raise.min;
      else h.raise = '上次加注 ' + game.minRaise + '，至少再加这么多，到 ' + legal.raise.min;
    } else if (!legal.check && legal.call) {
      h.raise = legal.callIsAllIn ? '' : '前面有不足额的全下，已经行动过的人不能再加注';
    }
    return h;
  }

  /* 顶部流程条文案 */
  function situation(game, heroSeat) {
    const streetName = STREET_NAMES[game.street] || '';
    const pos = game.positions();
    const name = s => (game.players[s] ? (s === heroSeat ? '你' : game.players[s].name) : '');
    const posOf = s => POS_NAMES[pos[s]] || pos[s] || '';
    if (game.phase === 'betting') {
      const seat = game.toAct;
      const legal = game.legalActions(seat);
      let why;
      if (game.street === 'preflop') {
        why = game.headsUp() ? '单挑时庄家（小盲）先行动' : '翻牌前从大盲左边第一位开始';
      } else {
        why = '翻牌后从庄家左边第一位还在局里的人开始';
      }
      const facing = game.currentBet > 0
        ? (game.street === 'preflop' && game.raiseCount === 0 ? '盲注 ' + game.bb : '当前下注 ' + game.currentBet)
        : '还没人下注';
      const line = seat === heroSeat
        ? '轮到你（' + posOf(seat) + '）· ' + facing + (legal.toCall > 0 ? ' · 需要补 ' + legal.toCall : ' · 可以过牌')
        : '轮到 ' + name(seat) + '（' + posOf(seat) + '）· ' + facing;
      return { street: streetName, line, why, pot: game.potTotal() };
    }
    if (game.phase === 'between' && game.pending) {
      const k = game.pending.kind;
      const map = { 'deal-flop': '本轮结束，准备发翻牌', 'deal-turn': '本轮结束，准备发转牌', 'deal-river': '本轮结束，准备发河牌', 'showdown': '河牌圈结束，准备摊牌', 'award-uncontested': '只剩一人，底池归他' };
      return { street: streetName, line: map[k] || '', why: '所有还能行动的人下注相等后，这一轮才结束', pot: game.potTotal() };
    }
    if (game.phase === 'done') return { street: '', line: '这手牌结束', why: '', pot: 0 };
    return { street: '', line: '', why: '', pot: 0 };
  }

  /* 手牌读数（底部） */
  function readout(hole, board) {
    if (!hole || hole.length < 2) return null;
    if (board.length === 0) {
      const t = preflopTier(hole);
      return { title: t.label, sub: t.name + ' · ' + t.score + ' 分', tier: t.tier };
    }
    const c = classify(hole, board);
    const d = draws(hole, board);
    let sub = '';
    if (d.list.length) sub = d.list.map(x => x.name + ' ' + x.outs + ' 张').join(' · ');
    return { title: c.hand.label, sub: sub || c.name, best: c.hand.cards, cls: c.cls };
  }

  /* ---------- 发牌员模式提问 ---------- */

  function dealerQuestion(game, kind, heroSeat) {
    const pos = game.positions();
    const name = s => (s === heroSeat ? '你' : game.players[s].name);
    const posOf = s => POS_NAMES[pos[s]] || pos[s] || '';
    if (kind === 'first-to-act') {
      const seat = game.toAct;
      const street = STREET_NAMES[game.street];
      const explain = game.street === 'preflop'
        ? (game.headsUp()
          ? '两个人单挑时，庄家就是小盲，翻牌前由庄家先行动。'
          : '翻牌前从大盲左边第一位开始行动。小盲和大盲已经投入了盲注，所以轮到他们时是最后两个说话的人。')
        : '翻牌后每一轮都从庄家左边第一位还在牌局里（没弃牌、没全下）的人开始，庄家永远最后行动。';
      return {
        kind, type: 'seat', answer: seat,
        prompt: street + '第一个行动的是谁？点一下那个座位。',
        explain: explain + '所以这一轮先说话的是 ' + name(seat) + '（' + posOf(seat) + '）。',
      };
    }
    if (kind === 'next-step') {
      const step = game.nextStep();
      const options = [
        { id: 'deal-flop', label: '发翻牌' }, { id: 'deal-turn', label: '发转牌' }, { id: 'deal-river', label: '发河牌' },
        { id: 'showdown', label: '比牌' }, { id: 'award-uncontested', label: '直接把底池给剩下的人' },
      ];
      let explain;
      if (step.kind === 'award-uncontested') explain = '其他人都弃牌了，不需要摊牌，底池直接给最后留下的 ' + name(step.seat) + '。他可以不亮牌。';
      else if (step.kind === 'showdown') explain = '河牌圈的下注已经结束，公共牌发满五张，接下来是比牌。';
      else explain = '本轮所有人下注相等，这一轮结束。公共牌现在有 ' + game.board.length + ' 张，接下来烧一张牌，再' + options.find(o => o.id === step.kind).label + '。';
      return { kind, type: 'choice', answer: step.kind, options, prompt: '这一轮下注结束了。发牌员接下来该做什么？', explain };
    }
    if (kind === 'blinds') {
      const btn = game.button, sb = game.sbSeat, bb = game.bbSeat;
      if (game.headsUp()) {
        return {
          kind, type: 'seat', answer: sb,
          prompt: '只有两个人单挑，这一手谁出小盲？点一下那个座位。',
          explain: '单挑时庄家自己出小盲，另一个人出大盲。翻牌前庄家先行动，翻牌后大盲先行动。这一手庄家是 ' + name(btn) + '，所以小盲也是 ' + name(sb) + '。',
        };
      }
      return {
        kind, type: 'seat', answer: sb,
        prompt: '庄家按钮在 ' + name(btn) + '。这一手谁出小盲？点一下那个座位。',
        explain: '庄家左手第一位出小盲，再左手一位出大盲。所以小盲是 ' + name(sb) + '，大盲是 ' + name(bb) + '。',
      };
    }
    if (kind === 'min-raise') {
      const raiser = game.players[game.lastAggressor];
      const answer = game.currentBet + game.minRaise;
      const candidates = [answer, game.currentBet * 2, game.currentBet + game.bb, answer + game.minRaise, game.currentBet + game.sb];
      const values = [];
      for (const v of candidates) if (v > game.currentBet && !values.includes(v)) values.push(v);
      const options = values.slice(0, 3).sort((a, b) => a - b).map(v => ({ id: String(v), label: String(v) }));
      return {
        kind, type: 'choice', answer: String(answer), options,
        prompt: (raiser ? name(raiser.seat) : '有人') + ' 加注到 ' + game.currentBet + '，这次加了 ' + game.minRaise + '。下一位如果想再加注，最少要加到多少？',
        explain: '再加注至少要加上一次加注的额度：' + game.currentBet + ' + ' + game.minRaise + ' = ' + answer + '。不足这个数只能跟注或弃牌，除非全下。',
      };
    }
    if (kind === 'winner') {
      const pots = game.previewShowdown();
      const main = pots[0];
      const winners = main.winners;
      const names = winners.map(s => name(s) + '（' + game.players[s].hand.label + '）').join('、');
      return {
        kind, type: 'seat', answer: winners, multi: winners.length > 1,
        prompt: winners.length > 1 ? '主底池谁赢？这次有人平分，点出其中一位。' : '主底池谁赢？点一下那个座位。',
        explain: '比牌只看每个人用自己两张底牌加五张公共牌能凑出的最大五张。' + (winners.length > 1 ? '这次 ' + names + ' 平分底池。' : '赢家是 ' + names + '。') + (pots.length > 1 ? '剩下的边池只在投入更多筹码的人之间比。' : ''),
      };
    }
    return null;
  }

  const api = {
    STREET_NAMES, POS_NAMES, SUIT_SYMBOLS, OPEN_THRESHOLD, STYLE_NOTES,
    cardText, cardsText, chenScore, holeLabel, preflopTier, boardTexture, classify, draws, equity, potOdds, bestFive,
    recommend, hints, situation, readout, dealerQuestion, isLastToAct, positionNote, roundTo,
  };
  root.PokerCoach = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
