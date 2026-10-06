/* 德州陪练 · 对手决策
 * 五种打法风格，决策基于 coach.js 的分析函数加上随机性。
 */
(function (root) {
  'use strict';
  const E = root.PokerEngine || (typeof require !== 'undefined' ? require('./engine.js') : null);
  const C = root.PokerCoach || (typeof require !== 'undefined' ? require('./coach.js') : null);

  const STYLES = {
    tag: { id: 'tag', name: '紧凶', tight: 0.1, aggr: 0.75, bluff: 0.12, desc: '只玩好牌，但一玩就下注加注。他下注时通常真有牌。' },
    lag: { id: 'lag', name: '松凶', tight: -0.12, aggr: 0.85, bluff: 0.3, desc: '玩很多牌，加注频繁，诈唬也多。别被他吓到，有中等牌可以跟。' },
    rock: { id: 'rock', name: '紧弱', tight: 0.15, aggr: 0.25, bluff: 0.02, desc: '很少入池，入池也多是跟注。他突然加注就是大牌。' },
    station: { id: 'station', name: '松弱', tight: -0.2, aggr: 0.2, bluff: 0.05, desc: '什么牌都爱跟注，很少加注也很少弃牌。对他要价值下注，别诈唬。' },
    balanced: { id: 'balanced', name: '平衡', tight: 0, aggr: 0.55, bluff: 0.1, desc: '打法中规中矩，比较难看出牌力。' },
  };

  function posGroup(pos) {
    if (pos === 'UTG' || pos === 'UTG+1') return 'early';
    if (pos === 'HJ' || pos === 'MP') return 'middle';
    if (pos === 'CO' || pos === 'CO-1' || pos === 'BTN' || pos === 'BTN/SB') return 'late';
    return 'blinds';
  }

  function decide(game, seat, rng) {
    rng = rng || Math.random;
    const legal = game.legalActions(seat);
    if (!legal) return null;
    const p = game.players[seat];
    const style = STYLES[p.style] || STYLES.balanced;
    const pos = game.positions()[seat];
    const pot = game.potTotal();
    const opponents = game.players.filter(q => q.seat !== seat && game.inHand(q));
    const nOpp = Math.max(1, opponents.length);
    const roundAmt = a => C.roundTo(a, game.sb);
    const raiseTo = want => {
      if (!legal.raise) return null;
      return Math.min(legal.raise.max, Math.max(legal.raise.min, roundAmt(want)));
    };
    const chance = x => rng() < x;
    const stack = p.chips + p.bet;
    const result = (type, amount, delay) => ({ type, amount, delay: delay || 1 });

    /* ---------- 翻牌前 ---------- */
    if (game.street === 'preflop') {
      const score = C.chenScore(p.cards);
      const shift = style.tight * 10; // 松紧平移门槛
      const group = posGroup(pos);
      const limpers = game.players.filter(q => q.seat !== seat && game.inHand(q) && q.total >= game.bb && q.seat !== game.bbSeat).length;

      if (game.raiseCount === 0) {
        const base = { early: 9, middle: 8, late: 6.5, blinds: 7.5 }[group];
        const threshold = base + shift;
        if (legal.check) {
          // 大盲没人加注
          if (score >= 9 + shift && chance(style.aggr * 0.8)) {
            const to = raiseTo(game.bb * (3 + limpers));
            if (to) return result('raise', to, 1.1);
          }
          return result('check', 0, 0.7);
        }
        if (score >= threshold) {
          const wantRaise = chance(0.45 + style.aggr * 0.55) || score >= 11;
          if (wantRaise) {
            const to = raiseTo(game.bb * (2.5 + (style.tight < 0 ? 0.5 : 0) + limpers) + (pos === 'SB' ? game.sb : 0));
            if (to) return result('raise', to, 1.0);
          }
          return result('call', legal.call, 0.8);
        }
        if (score >= threshold - 2 && (group === 'late' || group === 'blinds') && chance(0.35 - style.tight)) {
          return result('call', legal.call, 0.9);
        }
        if (group === 'late' && chance(style.bluff * 0.6)) {
          const to = raiseTo(game.bb * 2.5);
          if (to) return result('raise', to, 1.0);
        }
        return result('fold', 0, 0.6);
      }

      // 面对加注
      const toCallRatio = legal.toCall / Math.max(1, stack);
      if (game.raiseCount === 1) {
        if (score >= 12 - style.aggr * 1.5) {
          if (legal.raise && (chance(0.5 + style.aggr * 0.5) || score >= 16)) {
            const to = raiseTo(game.currentBet * (group === 'late' ? 2.6 : 3.2));
            if (stack <= game.bb * 25 && score >= 13) return result('allin', 0, 1.3);
            if (to) return result('raise', to, 1.3);
          }
          return result('call', legal.call, 1.0);
        }
        if (score >= 7.5 + shift && toCallRatio <= 0.18) return result('call', legal.call, 1.0);
        if (group === 'late' && score >= 6 && chance(style.bluff * 0.5) && legal.raise) {
          const to = raiseTo(game.currentBet * 2.8);
          if (to) return result('raise', to, 1.3);
        }
        if (legal.check) return result('check', 0, 0.7);
        return result('fold', 0, 0.7);
      }
      // 面对再加注
      if (score >= 16) {
        if (legal.raise && chance(0.6 + style.aggr * 0.4)) return result('allin', 0, 1.5);
        return result('call', legal.call, 1.2);
      }
      if (score >= 12 - style.tight * 5 && toCallRatio <= 0.35) return result('call', legal.call, 1.2);
      if (legal.check) return result('check', 0, 0.7);
      return result('fold', 0, 0.9);
    }

    /* ---------- 翻牌后 ---------- */
    const c = C.classify(p.cards, game.board);
    const d = C.draws(p.cards, game.board);
    const eq = C.equity(p.cards, game.board, nOpp);
    const perCard = game.street === 'flop' ? 0.04 : 0.02;
    const drawEq = Math.min(0.42, d.outs * perCard);
    const strongDraw = d.outs >= 8 && game.street !== 'river';
    const lastToAct = C.isLastToAct(game, seat);

    const betSize = () => {
      let f;
      if (eq > 0.8) f = 0.7 + rng() * 0.3;
      else if (eq > 0.6) f = 0.55 + rng() * 0.2;
      else f = 0.4 + rng() * 0.2;
      if (style.id === 'lag' && chance(0.2)) f += 0.3;
      let want = pot * f;
      if (eq > 0.85 && stack <= pot * 2.2) return legal.allIn;
      return raiseTo(want);
    };

    if (legal.check) {
      if (eq >= 0.55 && chance(0.55 + style.aggr * 0.45)) {
        const to = betSize(); if (to) return result('raise', to, 1.0);
      }
      if (seat === game.preflopAggressor && game.street === 'flop' && nOpp <= 2 && chance(style.aggr * 0.75)) {
        const to = raiseTo(pot * (0.45 + rng() * 0.2)); if (to) return result('raise', to, 0.9);
      }
      if (strongDraw && chance(style.aggr * 0.6)) {
        const to = raiseTo(pot * (0.5 + rng() * 0.2)); if (to) return result('raise', to, 1.0);
      }
      if (nOpp === 1 && lastToAct && chance(style.bluff * 0.5)) {
        const to = raiseTo(pot * 0.5); if (to) return result('raise', to, 1.1);
      }
      if (eq >= 0.4 && lastToAct && nOpp <= 2 && chance(style.aggr * 0.4)) {
        const to = raiseTo(pot * 0.5); if (to) return result('raise', to, 0.9);
      }
      return result('check', 0, 0.7);
    }

    // 面对下注
    const odds = C.potOdds(legal.toCall, pot);
    const callRatio = legal.toCall / Math.max(1, stack);
    if (eq >= odds + 0.3 && c.tier >= 0.6) {
      if (legal.raise && chance(0.3 + style.aggr * 0.6)) {
        if (eq > 0.85 && stack <= pot * 2.5) return result('allin', 0, 1.4);
        const to = raiseTo(Math.max(game.currentBet * 2.8, game.currentBet + pot * 0.7));
        if (to) return result('raise', to, 1.3);
      }
      return result('call', legal.call, 1.0);
    }
    if (callRatio > 0.6 && eq < odds + 0.15) {
      return result('fold', 0, 1.3);
    }
    const looseness = -style.tight * 0.15;
    if (eq >= odds + 0.02 - looseness) {
      if (style.id === 'station' && c.tier < 0.3 && chance(0.4)) return result('fold', 0, 1.0);
      return result('call', legal.call, 1.0);
    }
    if (d.outs > 0 && game.street !== 'river' && drawEq >= odds * (0.85 - looseness)) {
      if (strongDraw && legal.raise && chance(style.aggr * 0.35)) {
        const to = raiseTo(game.currentBet * 2.6); if (to) return result('raise', to, 1.3);
      }
      return result('call', legal.call, 1.1);
    }
    if (style.id === 'station' && legal.toCall <= pot * 0.5 && chance(0.45)) return result('call', legal.call, 1.0);
    if (nOpp === 1 && legal.raise && legal.toCall <= pot * 0.6 && chance(style.bluff * 0.25)) {
      const to = raiseTo(game.currentBet * 2.8); if (to) return result('raise', to, 1.4);
    }
    return result('fold', 0, 0.9);
  }

  const api = { STYLES, decide, posGroup };
  root.PokerAI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
