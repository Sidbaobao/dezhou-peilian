const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const C = require('../src/coach.js');
const AI = require('../src/ai.js');
const N = require('../src/narrate.js');

test('Chen 公式打分', () => {
  assert.equal(C.chenScore(['As', 'Ad']), 20);
  assert.equal(C.chenScore(['Ks', 'Kd']), 16);
  assert.equal(C.chenScore(['As', 'Ks']), 12);
  assert.equal(C.chenScore(['As', 'Kd']), 10);
  assert.equal(C.chenScore(['Ts', '9s']), 8);
  assert.equal(C.chenScore(['7s', '6s']), 7);
  assert.equal(C.chenScore(['2s', '2d']), 5);
  assert.equal(C.chenScore(['7s', '2d']), -1 + 0 || C.chenScore(['7s', '2d']));
  assert.ok(C.chenScore(['7s', '2d']) < 4);
  assert.equal(C.preflopTier(['As', 'Ad']).tier, 'premium');
  assert.equal(C.preflopTier(['9s', '8d']).tier, 'speculative');
  assert.equal(C.holeLabel(['As', 'Ks']), 'AK 同花');
  assert.equal(C.holeLabel(['Qd', 'Qs']), '口袋对 Q');
});

test('成牌分档', () => {
  const t = (hole, board) => C.classify(hole, board);
  assert.equal(t(['Ah', 'Kd'], ['As', '7c', '2d']).cls, 'top-pair');
  assert.equal(t(['Qh', 'Qd'], ['Js', '7c', '2d']).cls, 'overpair');
  assert.equal(t(['7h', '7d'], ['Js', '8c', '2d']).cls, 'underpair');
  assert.equal(t(['7h', '7d'], ['Js', '7c', '2d']).cls, 'set');
  assert.equal(t(['Ah', '7d'], ['7s', '7c', '2d']).cls, 'trips');
  assert.equal(t(['Ah', 'Kd'], ['7s', '7c', '2d']).cls, 'board-pair');
  assert.equal(t(['Ah', '2d'], ['As', '2c', '9d']).cls, 'two-pair');
  assert.equal(t(['Ah', 'Kd'], ['As', '2c', '2d']).cls, 'pair-plus-board');
  assert.equal(t(['Ah', 'Kd'], ['9s', '7c', '2d']).cls, 'overcards');
  assert.equal(t(['9h', '8d'], ['7s', '6c', '5d']).cls, 'straight');
  assert.equal(t(['9h', '8h'], ['7h', '6h', 'Kh']).cls, 'flush');
  assert.ok(t(['Ah', 'Ad'], ['As', '7c', '7d']).tier > 0.9);
  assert.ok(t(['Ah', 'Kd'], ['As', '7c', '2d']).tier > t(['Ah', '3d'], ['As', '7c', '2d']).tier, '踢脚好的顶对更强');
});

test('听牌识别', () => {
  const fd = C.draws(['Ah', 'Kh'], ['7h', '2h', '9c']);
  assert.deepEqual(fd.list.map(x => x.kind), ['flush']);
  assert.equal(fd.outs, 9);
  const oesd = C.draws(['9c', '8d'], ['7s', '6h', 'Kd']);
  assert.deepEqual(oesd.list.map(x => x.kind), ['oesd']);
  assert.equal(oesd.outs, 8);
  const gut = C.draws(['9c', '8d'], ['6s', '5h', 'Kd']);
  assert.deepEqual(gut.list.map(x => x.kind), ['gutshot']);
  assert.equal(gut.outs, 4);
  const combo = C.draws(['9h', '8h'], ['7h', '6h', 'Kd']);
  assert.equal(combo.outs, 15);
  assert.equal(C.draws(['Ah', 'Kd'], ['7s', '2c', '9d']).outs, 0);
  assert.equal(C.draws(['Ah', 'Kd'], ['7s', '2c', '9d', '3s', '4c']).outs, 0, '河牌后没有听牌');
});

test('胜率与底池赔率', () => {
  assert.ok(C.equity(['Ah', 'Ad'], [], 1) > C.equity(['7h', '2d'], [], 1));
  assert.ok(C.equity(['Ah', 'Ad'], [], 1) > C.equity(['Ah', 'Ad'], [], 4));
  assert.equal(C.potOdds(50, 100), 50 / 150);
});

function setup(chips, button, deck) {
  const players = chips.map((c, i) => ({ name: 'P' + i, chips: c, isHuman: i === 0, style: ['balanced', 'tag', 'lag', 'rock', 'station', 'balanced'][i] }));
  const g = new E.Game({ players, blinds: { sb: 10, bb: 20 }, rng: () => 0.5 });
  g.startHand({ button, deck });
  return g;
}

test('建议：枪口位弱牌弃牌，顶级牌加注', () => {
  const g = setup([2000, 2000, 2000, 2000, 2000, 2000], 2);
  assert.equal(g.toAct, 5);
  g.players[5].cards = ['7h', '2d'];
  let r = C.recommend(g, 5);
  assert.equal(r.action, 'fold');
  g.players[5].cards = ['Ah', 'Ad'];
  r = C.recommend(g, 5);
  assert.equal(r.action, 'raise');
  assert.ok(r.amount >= 40 && r.amount <= 70, '开池尺度 ' + r.amount);
  assert.ok(r.reasons.length >= 2);
});

test('建议：大盲没人加注时过牌；面对下注赔率不够就弃牌', () => {
  const g = setup([2000, 2000, 2000], 0);
  g.act(0, { type: 'call' }); g.act(1, { type: 'call' });
  g.players[2].cards = ['7h', '2d'];
  let r = C.recommend(g, 2);
  assert.equal(r.action, 'check');
  g.act(2, { type: 'check' });
  g.advance();
  g.board = ['Ks', 'Qc', '9d'];
  g.act(1, { type: 'raise', amount: 60 });
  r = C.recommend(g, 2);
  assert.equal(r.action, 'fold');
  g.players[2].cards = ['Kh', 'Kd'];
  r = C.recommend(g, 2);
  assert.equal(r.action, 'raise');
});

test('动作提示与流程条', () => {
  const g = setup([2000, 2000, 2000], 0);
  const h = C.hints(g, 0);
  assert.ok(h.call.includes('20'));
  assert.ok(h.raise.includes('40'));
  const s = C.situation(g, 0);
  assert.equal(s.street, '翻牌前');
  assert.ok(s.line.includes('轮到你'));
  const ro = C.readout(['As', 'Kd'], []);
  assert.equal(ro.title, 'AK 杂色');
  const ro2 = C.readout(['As', 'Kd'], ['Ah', '7c', '2d']);
  assert.equal(ro2.title, '一对 A');
});

test('对手决策总是合法', () => {
  let seed = 7;
  const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let hand = 0; hand < 150; hand++) {
    const players = [0, 1, 2, 3, 4, 5].map(i => ({ name: 'P' + i, chips: 500 + Math.floor(rng() * 3000), style: ['tag', 'lag', 'rock', 'station', 'balanced', 'tag'][i] }));
    const g = new E.Game({ players, blinds: { sb: 10, bb: 20 }, rng });
    const before = g.players.reduce((s, p) => s + p.chips, 0);
    g.startHand();
    let guard = 0;
    while (g.phase !== 'done' && guard++ < 200) {
      if (g.phase === 'betting') {
        const d = AI.decide(g, g.toAct, rng);
        const legal = g.legalActions(g.toAct);
        if (d.type === 'raise') assert.ok(legal.raise, '不能加注时给出了加注');
        if (d.type === 'check') assert.ok(legal.check, '不能过牌时给出了过牌');
        g.act(g.toAct, d);
      } else {
        g.advance();
      }
    }
    assert.equal(g.phase, 'done', '牌局应当结束');
    const after = g.players.reduce((s, p) => s + p.chips, 0);
    assert.equal(after, before, '筹码总量不变');
  }
});

test('发牌员记录文案', () => {
  const g = setup([2000, 2000, 2000], 0);
  const ev = { type: 'street', street: 'preflop', first: 0 };
  const lines = N.narrate(ev, g, 0);
  assert.ok(lines[0].text.includes('大盲左边第一位'));
  const lines2 = N.narrate({ type: 'deal-board', street: 'flop', cards: ['As', 'Td', '2c'] }, g, 0);
  assert.equal(lines2[0].text, '烧一张，发翻牌：A♠ 10♦ 2♣');
});

test('发牌员提问', () => {
  const g = setup([2000, 2000, 2000], 0);
  const q = C.dealerQuestion(g, 'first-to-act', 0);
  assert.equal(q.answer, 0);
  assert.equal(q.type, 'seat');
  g.act(0, { type: 'call' }); g.act(1, { type: 'call' }); g.act(2, { type: 'check' });
  const q2 = C.dealerQuestion(g, 'next-step', 0);
  assert.equal(q2.answer, 'deal-flop');
  assert.equal(q2.options.length, 5);
});
