/* 德州陪练 · 发牌员记录
 * 把引擎事件翻译成发牌员口吻的中文。
 */
(function (root) {
  'use strict';
  const C = root.PokerCoach || (typeof require !== 'undefined' ? require('./coach.js') : null);

  const STREET = { preflop: '翻牌前', flop: '翻牌圈', turn: '转牌圈', river: '河牌圈' };
  const DEAL = { flop: '发翻牌', turn: '发转牌', river: '发河牌' };

  /* 返回 {text, tone} 数组，tone 用于记录里的颜色：'deal' | 'action' | 'pot' | 'end' | 'note' */
  function narrate(ev, game, heroSeat) {
    const name = s => (s === heroSeat ? '你' : game.players[s].name);
    const pos = game.positions();
    const posOf = s => C.POS_NAMES[pos[s]] || pos[s] || '';
    const out = [];
    const push = (text, tone) => out.push({ text, tone: tone || 'note' });

    switch (ev.type) {
      case 'hand-start':
        push('第 ' + ev.handNo + ' 手 · 庄家按钮在 ' + name(ev.button), 'end');
        break;
      case 'blind':
        push(name(ev.seat) + ' 下' + (ev.kind === 'sb' ? '小盲' : '大盲') + ' ' + ev.amount + (ev.short ? '（筹码不够，全下）' : ''), 'action');
        break;
      case 'deal-hole':
        push('从庄家左手第一位 ' + name(ev.order[0]) + ' 开始，每人发两张底牌', 'deal');
        break;
      case 'street':
        if (ev.skipped) {
          push(ev.street === 'preflop' ? '盲注已经让所有人全下，没有下注轮' : '能行动的人不足两位，跳过下注直接发牌', 'note');
        } else if (ev.street === 'preflop') {
          push('翻牌前下注，从' + (game.headsUp() ? '庄家兼小盲 ' : '大盲左边第一位 ') + name(ev.first) + '（' + posOf(ev.first) + '）开始', 'deal');
        } else {
          push(STREET[ev.street] + '下注，从庄家左边第一位还在局里的 ' + name(ev.first) + ' 开始', 'deal');
        }
        break;
      case 'action': {
        const n = name(ev.seat);
        if (ev.action === 'fold') push(n + ' 弃牌', 'action');
        else if (ev.action === 'check') push(n + ' 过牌', 'action');
        else if (ev.action === 'call') push(n + ' 跟注 ' + ev.amount + (ev.allIn ? '，全下' : ''), 'action');
        else if (ev.action === 'bet') push(n + ' 下注 ' + ev.to + (ev.allIn ? '，全下' : ''), 'action');
        else if (ev.action === 'raise') {
          let t = n + ' 加注到 ' + ev.to;
          if (ev.allIn) t += '，全下';
          if (!ev.full) t += '（不足一个完整加注，已行动过的人只能跟注或弃牌）';
          push(t, 'action');
        }
        break;
      }
      case 'round-end':
        if (ev.uncontested) push('只剩一人没弃牌，这手牌不用比牌', 'pot');
        else push(STREET[ev.street] + '下注结束，所有人投入相等，底池 ' + ev.pot, 'pot');
        break;
      case 'all-in-showdown':
        push('能行动的人不足两位，先亮牌，再把剩下的公共牌发完', 'note');
        break;
      case 'deal-board':
        push('烧一张，' + DEAL[ev.street] + '：' + C.cardsText(ev.cards), 'deal');
        break;
      case 'showdown': {
        const first = ev.reveals[0];
        const why = game.riverAggressor >= 0 && game.riverAggressor === first.seat
          ? '河牌有人下注，最后下注的人先亮牌'
          : '河牌没人下注，庄家左边第一位先亮牌';
        push('摊牌（' + why + '）', 'deal');
        for (const r of ev.reveals) push(name(r.seat) + ' 亮出 ' + C.cardsText(r.cards) + ' · ' + r.hand.label, 'action');
        break;
      }
      case 'returned':
        push(name(ev.seat) + ' 多投入的 ' + ev.amount + ' 没人跟，退回', 'pot');
        break;
      case 'award': {
        const which = ev.side ? '边池' : '底池';
        if (ev.reason === 'uncontested') push(name(ev.seat) + ' 赢得' + which + ' ' + ev.amount, 'pot');
        else if (ev.reason === 'split') push(name(ev.seat) + ' 平分' + which + '，得到 ' + ev.amount + '（' + ev.hand.label + '）', 'pot');
        else push(name(ev.seat) + ' 以 ' + ev.hand.label + ' 赢得' + which + ' ' + ev.amount, 'pot');
        break;
      }
      case 'bust':
        push(name(ev.seat) + ' 筹码打光了', 'note');
        break;
      case 'rebuy':
        push(name(ev.seat) + ' 重新买入 ' + ev.amount, 'note');
        break;
      case 'hand-end':
        push('第 ' + ev.handNo + ' 手结束', 'end');
        break;
      default:
        break;
    }
    return out;
  }

  const api = { narrate, STREET, DEAL };
  root.PokerNarrate = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
