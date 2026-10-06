const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');

const { evaluate, Game, CAT } = E;

/* ---------- 牌型评估 ---------- */

test('十种牌型的识别与中文名', () => {
  const cases = [
    [['As', 'Ks', 'Qs', 'Js', 'Ts'], CAT.STRAIGHT_FLUSH, '皇家同花顺'],
    [['5h', '6h', '7h', '8h', '9h'], CAT.STRAIGHT_FLUSH, '同花顺 5 到 9'],
    [['9c', '9d', '9h', '9s', 'Kd'], CAT.QUADS, '四条 9'],
    [['Kc', 'Kd', 'Kh', '7s', '7d'], CAT.FULL_HOUSE, '葫芦 K 带 7'],
    [['Ac', '9c', '7c', '4c', '2c'], CAT.FLUSH, 'A 高同花'],
    [['9c', 'Td', 'Jh', 'Qs', 'Kd'], CAT.STRAIGHT, '顺子 9 到 K'],
    [['Ac', '2d', '3h', '4s', '5d'], CAT.STRAIGHT, '顺子 A 到 5'],
    [['7c', '7d', '7h', 'Ks', '2d'], CAT.TRIPS, '三条 7'],
    [['Ac', 'Ad', '9h', '9s', 'Kd'], CAT.TWO_PAIR, '两对 A 和 9'],
    [['Kc', 'Kd', '9h', '4s', '2d'], CAT.PAIR, '一对 K'],
    [['Ac', 'Jd', '9h', '4s', '2d'], CAT.HIGH, '高牌 A'],
  ];
  for (const [cards, cat, label] of cases) {
    const r = evaluate(cards);
    assert.equal(r.cat, cat, cards.join(' '));
    assert.equal(r.label, label, cards.join(' '));
  }
  assert.equal(evaluate(['As', 'Ks', 'Qs', 'Js', 'Ts']).royal, true);
  assert.equal(evaluate(['5h', '6h', '7h', '8h', '9h']).royal, false);
});

test('比大小：轮子顺最小、同花比踢脚、对子比踢脚、两对逐级比', () => {
  const s = c => evaluate(c).score;
  assert.ok(s(['2c', '3d', '4h', '5s', '6d']) > s(['Ac', '2d', '3h', '4s', '5d']));
  assert.ok(s(['Ac', '9c', '7c', '4c', '3c']) > s(['Ac', '9c', '7c', '4c', '2c']));
  assert.ok(s(['Kc', 'Kd', 'Ah', '4s', '2d']) > s(['Kh', 'Ks', 'Qh', 'Js', '2c']));
  assert.ok(s(['Ac', 'Ad', '3h', '3s', 'Kd']) > s(['Kc', 'Kd', 'Qh', 'Qs', 'Ad']));
  assert.ok(s(['Ac', 'Ad', '9h', '9s', '2d']) > s(['Ah', 'As', '8h', '8s', 'Kd']));
  assert.ok(s(['Ac', 'Ad', '9h', '9s', 'Kd']) > s(['Ah', 'As', '9c', '9d', 'Qd']));
  assert.ok(s(['2c', '2d', '2h', '2s', '3d']) > s(['Ac', 'Ad', 'Ah', 'Ks', 'Kd']));
  assert.equal(s(['Ac', 'Kd', 'Qh', 'Js', '9d']), s(['Ah', 'Ks', 'Qc', 'Jd', '9c']));
});

test('七张取最优', () => {
  const r = evaluate(['Ah', 'Kh', 'Qh', 'Jh', 'Th', '2c', '3d']);
  assert.equal(r.label, '皇家同花顺');
  assert.deepEqual(r.cards.slice().sort(), ['Ah', 'Jh', 'Kh', 'Qh', 'Th']);
  const r2 = evaluate(['9c', '9d', '4h', '4s', 'Kd', 'Kc', '2s']);
  assert.equal(r2.label, '两对 K 和 9');
  const r3 = evaluate(['7c', '8d', '9h', 'Ts', 'Jd', 'Qc', '2s']);
  assert.equal(r3.label, '顺子 8 到 Q');
});

/* ---------- 测试工具 ---------- */

function make(chips, button, blinds) {
  const players = chips.map((c, i) => ({ name: 'P' + i, chips: c, isHuman: i === 0 }));
  return new Game({ players, blinds: blinds || { sb: 10, bb: 20 }, button: button == null ? -1 : button, rng: () => 0.5 });
}

/* 构造一副牌，使指定座位拿到指定底牌、公共牌按给定顺序出现。
 * 引擎从牌堆末尾取牌，从庄家左手第一位开始每人一张发两轮。 */
function rig(game, buttonSeat, holes, board) {
  const seats = game.players.filter(p => p.chips > 0).map(p => p.seat);
  const n = game.players.length;
  const order = [];
  let s = buttonSeat;
  for (let k = 0; k < seats.length; k++) {
    do { s = (s + 1) % n; } while (!seats.includes(s));
    order.push(s);
  }
  const pops = [];
  for (let round = 0; round < 2; round++) for (const seat of order) pops.push(holes[seat][round]);
  const filler = E.freshDeck().filter(c => !pops.includes(c) && !board.includes(c));
  const burn = () => pops.push(filler.pop());
  burn(); pops.push(board[0], board[1], board[2]);
  burn(); pops.push(board[3]);
  burn(); pops.push(board[4]);
  return filler.concat(pops.slice().reverse());
}

function seatsOf(events, type) { return events.filter(e => e.type === type); }

/* ---------- 状态机 ---------- */

test('三人桌：庄家先行动，盲注有选择权，翻牌后从小盲开始', () => {
  const g = make([1000, 1000, 1000]);
  const ev = g.startHand({ button: 0 });
  assert.equal(g.button, 0);
  assert.equal(g.sbSeat, 1);
  assert.equal(g.bbSeat, 2);
  assert.deepEqual(g.positions(), { 0: 'BTN', 1: 'SB', 2: 'BB' });
  assert.equal(seatsOf(ev, 'street')[0].first, 0);
  assert.equal(g.toAct, 0);

  const legal = g.legalActions(0);
  assert.equal(legal.toCall, 20);
  assert.equal(legal.check, false);
  assert.deepEqual(legal.raise, { min: 40, max: 1000 });

  g.act(0, { type: 'call' });
  assert.equal(g.toAct, 1);
  assert.equal(g.legalActions(1).toCall, 10);
  g.act(1, { type: 'call' });
  assert.equal(g.toAct, 2, '大盲还没行动，应该有选择权');
  assert.equal(g.legalActions(2).check, true);
  const ev2 = g.act(2, { type: 'check' });
  assert.equal(seatsOf(ev2, 'round-end').length, 1);
  assert.equal(g.phase, 'between');
  assert.deepEqual(g.nextStep(), { kind: 'deal-flop', street: 'flop', first: 1 });
  assert.equal(g.potTotal(), 60);
  assert.equal(g.potCollected(), 60);

  const ev3 = g.advance();
  assert.equal(g.board.length, 3);
  assert.equal(seatsOf(ev3, 'street')[0].first, 1);
  assert.equal(g.toAct, 1);
  assert.equal(g.legalActions(1).check, true);
  assert.deepEqual(g.legalActions(1).raise, { min: 20, max: 980 });
});

test('单挑：庄家是小盲，翻牌前先行动，翻牌后后行动', () => {
  const g = make([1000, 1000]);
  g.startHand({ button: 0 });
  assert.equal(g.sbSeat, 0);
  assert.equal(g.bbSeat, 1);
  assert.equal(g.toAct, 0);
  assert.deepEqual(g.positions(), { 0: 'BTN/SB', 1: 'BB' });
  g.act(0, { type: 'call' });
  assert.equal(g.toAct, 1);
  g.act(1, { type: 'check' });
  g.advance();
  assert.equal(g.toAct, 1, '翻牌后大盲先行动');
});

test('最小加注等于上一次加注的额度', () => {
  const g = make([1000, 1000, 1000]);
  g.startHand({ button: 0 });
  g.act(0, { type: 'raise', amount: 60 });
  assert.equal(g.currentBet, 60);
  assert.deepEqual(g.legalActions(1).raise, { min: 100, max: 1000 });
  g.act(1, { type: 'raise', amount: 150 });
  assert.deepEqual(g.legalActions(2).raise, { min: 240, max: 1000 });
  assert.throws(() => g.act(2, { type: 'raise', amount: 200 }));
});

test('不足额的全下不会重新打开已行动玩家的加注权', () => {
  const g = make([1000, 1000, 90]);
  g.startHand({ button: 0 });
  g.act(0, { type: 'raise', amount: 60 });
  g.act(1, { type: 'call' });
  const legalC = g.legalActions(2);
  assert.deepEqual(legalC.raise, { min: 90, max: 90 }, '筹码不够最小加注时只能全下');
  const ev = g.act(2, { type: 'allin' });
  const a = seatsOf(ev, 'action')[0];
  assert.equal(a.action, 'raise');
  assert.equal(a.full, false);
  assert.equal(g.toAct, 0);
  const legalA = g.legalActions(0);
  assert.equal(legalA.toCall, 30);
  assert.equal(legalA.raise, null, '已经行动过的人不能再加注');
  g.act(0, { type: 'call' });
  assert.equal(g.legalActions(1).raise, null);
  const ev2 = g.act(1, { type: 'call' });
  assert.equal(seatsOf(ev2, 'round-end').length, 1);
  assert.equal(seatsOf(ev2, 'all-in-showdown').length, 0, '还有两个人能继续下注');
});

test('足额的加注重新打开加注权', () => {
  const g = make([1000, 1000, 1000]);
  g.startHand({ button: 0 });
  g.act(0, { type: 'raise', amount: 60 });
  g.act(1, { type: 'call' });
  g.act(2, { type: 'raise', amount: 100 });
  assert.deepEqual(g.legalActions(0).raise, { min: 140, max: 1000 });
});

test('大盲不够盲注时全下，其他人仍需跟满大盲', () => {
  const g = make([1000, 1000, 15]);
  const ev = g.startHand({ button: 0 });
  const bb = seatsOf(ev, 'blind')[1];
  assert.equal(bb.amount, 15);
  assert.equal(bb.allIn, true);
  assert.equal(bb.short, true);
  assert.equal(g.legalActions(0).toCall, 20);
});

test('弃到最后一人：退回未被跟注的部分', () => {
  const g = make([1000, 1000, 1000]);
  g.startHand({ button: 0 });
  g.act(0, { type: 'raise', amount: 100 });
  g.act(1, { type: 'fold' });
  const ev = g.act(2, { type: 'fold' });
  assert.equal(seatsOf(ev, 'round-end')[0].uncontested, true);
  assert.deepEqual(g.nextStep(), { kind: 'award-uncontested', seat: 0 });
  const ev2 = g.advance();
  const ret = seatsOf(ev2, 'returned')[0];
  assert.equal(ret.amount, 80);
  const award = seatsOf(ev2, 'award')[0];
  assert.equal(award.amount, 50);
  assert.equal(g.players[0].chips, 1030);
  assert.equal(g.players[1].chips, 990);
  assert.equal(g.players[2].chips, 980);
  assert.equal(g.phase, 'done');
  assert.equal(g.result.uncontested, true);
});

test('边池：三人不同全下量', () => {
  const g = make([100, 300, 1000]);
  const deck = rig(g, 0, { 0: ['Ah', 'Ad'], 1: ['Kh', 'Kd'], 2: ['Qh', 'Qd'] }, ['2c', '7d', '9s', '4h', 'Jc']);
  g.startHand({ button: 0, deck });
  assert.deepEqual(g.players[0].cards, ['Ah', 'Ad']);
  assert.deepEqual(g.players[1].cards, ['Kh', 'Kd']);
  assert.deepEqual(g.players[2].cards, ['Qh', 'Qd']);

  g.act(0, { type: 'allin' });
  assert.equal(g.currentBet, 100);
  g.act(1, { type: 'allin' });
  assert.equal(g.currentBet, 300);
  const ev = g.act(2, { type: 'call' });
  assert.equal(seatsOf(ev, 'all-in-showdown').length, 1);

  // 发完三条街，没有下注轮
  let step = g.nextStep();
  assert.equal(step.kind, 'deal-flop');
  assert.equal(step.first, -1);
  g.advance();
  assert.equal(g.nextStep().kind, 'deal-turn');
  g.advance();
  assert.equal(g.nextStep().kind, 'deal-river');
  g.advance();
  assert.deepEqual(g.board, ['2c', '7d', '9s', '4h', 'Jc']);
  assert.equal(g.nextStep().kind, 'showdown');

  const pots = g.previewShowdown();
  assert.equal(pots.length, 2);
  assert.equal(pots[0].amount, 300);
  assert.deepEqual(pots[0].eligible, [0, 1, 2]);
  assert.deepEqual(pots[0].winners, [0]);
  assert.equal(pots[1].amount, 400);
  assert.deepEqual(pots[1].eligible, [1, 2]);
  assert.deepEqual(pots[1].winners, [1]);

  const ev2 = g.advance();
  const awards = seatsOf(ev2, 'award');
  assert.deepEqual(awards.map(a => [a.seat, a.amount, a.potIndex]), [[0, 300, 0], [1, 400, 1]]);
  assert.equal(g.players[0].chips, 300);
  assert.equal(g.players[1].chips, 400);
  assert.equal(g.players[2].chips, 700);
  assert.equal(g.players.reduce((s, p) => s + p.chips, 0), 1400);
  assert.equal(seatsOf(ev2, 'showdown')[0].reveals[0].seat, 1, '河牌没人下注时庄家左手第一位先亮牌');
});

test('平分底池：零头给庄家左手第一位赢家', () => {
  const g = make([1000, 1000, 1000], -1, { sb: 5, bb: 10 });
  const deck = rig(g, 0, { 0: ['Qh', '2d'], 1: ['Qs', '3c'], 2: ['7h', '8d'] }, ['Ac', 'Ad', 'Kh', '9s', '4d']);
  g.startHand({ button: 0, deck });
  g.act(0, { type: 'raise', amount: 25 });
  g.act(1, { type: 'call' });
  g.act(2, { type: 'call' });
  assert.equal(g.potTotal(), 75);
  for (let street = 0; street < 3; street++) {
    g.advance();
    g.act(1, { type: 'check' });
    g.act(2, { type: 'check' });
    g.act(0, { type: 'check' });
  }
  const ev = g.advance();
  const awards = seatsOf(ev, 'award');
  assert.deepEqual(awards.map(a => [a.seat, a.amount]), [[1, 38], [0, 37]]);
  assert.equal(awards[0].reason, 'split');
  assert.equal(g.players[2].chips, 975);
});

test('河牌有下注时最后下注者先亮牌；对手弃牌后赢家正确', () => {
  const g = make([1000, 1000, 1000]);
  const deck = rig(g, 0, { 0: ['Ah', 'Kh'], 1: ['2s', '3c'], 2: ['7h', '8d'] }, ['Ac', 'Jd', '4h', '9s', '2d']);
  g.startHand({ button: 0, deck });
  g.act(0, { type: 'call' }); g.act(1, { type: 'call' }); g.act(2, { type: 'check' });
  g.advance(); g.act(1, { type: 'check' }); g.act(2, { type: 'check' }); g.act(0, { type: 'check' });
  g.advance(); g.act(1, { type: 'check' }); g.act(2, { type: 'check' }); g.act(0, { type: 'check' });
  g.advance();
  g.act(1, { type: 'raise', amount: 40 });
  g.act(2, { type: 'fold' });
  g.act(0, { type: 'call' });
  const ev = g.advance();
  const sd = seatsOf(ev, 'showdown')[0];
  assert.equal(sd.reveals[0].seat, 1);
  assert.deepEqual(g.result.winners, [0]);
  assert.equal(g.players[0].chips, 1000 - 20 - 40 + 140);
});

test('庄家按钮跳过没有筹码的座位，打光的人不再发牌', () => {
  const g = make([1000, 0, 1000, 1000]);
  g.startHand({ button: 0 });
  assert.equal(g.sbSeat, 2);
  assert.equal(g.bbSeat, 3);
  assert.equal(g.players[1].cards.length, 0);
  assert.equal(g.players[1].out, true);
  g.act(0, { type: 'fold' }); g.act(2, { type: 'fold' });
  g.advance();
  g.startHand();
  assert.equal(g.button, 2);
  g.rebuy(1, 500);
  g.act(2, { type: 'fold' }); g.act(3, { type: 'fold' });
  g.advance();
  g.startHand();
  assert.equal(g.button, 3);
  assert.equal(g.players[1].cards.length, 2, '补买后重新参与');
});

test('六人桌位置标签', () => {
  const g = make([1000, 1000, 1000, 1000, 1000, 1000]);
  g.startHand({ button: 2 });
  assert.deepEqual(g.positions(), { 2: 'BTN', 3: 'SB', 4: 'BB', 5: 'UTG', 0: 'HJ', 1: 'CO' });
  assert.equal(g.toAct, 5);
});

test('全下跟注不足额时视为跟注', () => {
  const g = make([1000, 50, 1000]);
  g.startHand({ button: 0 });
  g.act(0, { type: 'raise', amount: 200 });
  const ev = g.act(1, { type: 'allin' });
  const a = seatsOf(ev, 'action')[0];
  assert.equal(a.action, 'call');
  assert.equal(a.allIn, true);
  assert.equal(g.currentBet, 200);
  assert.equal(g.toAct, 2);
});
