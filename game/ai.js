// Ember Court — the Warden's mind.
// The opponent is readable on purpose: it wants lethal first, then the most
// damage it can afford, then a shield when it is hurting, then a draw when
// its hand is thin. A player who watches it can hold a Bulwark for the
// turn the Warden is about to go all-in, and punish it after.

import { CARD_BY_ID } from './cards.js';

// What one play is worth to the side playing it, in rough points.
function scorePlay(game, side, card) {
  const actor = side === 'you' ? game.you : game.foe;
  const target = side === 'you' ? game.foe : game.you;
  let score = 0;
  for (const effect of card.effects) {
    if (effect.kind === 'damage') {
      score += effect.amount * 2;
      if (target.life - effect.amount <= 0) score += 100; // lethal
      if (target.shield > 0) score -= Math.min(target.shield, effect.amount);
    }
    if (effect.kind === 'shield') score += actor.life <= 8 ? effect.amount * 2 : effect.amount * 0.8;
    if (effect.kind === 'heal') score += actor.life < 20 ? effect.amount * 1.5 : 0;
    if (effect.kind === 'draw') score += actor.hand.length <= 3 ? effect.amount * 2 : effect.amount;
  }
  if (card.chain && actor.playedSuits.includes(card.chain.suit)) score += card.chain.bonus.amount * 2;
  return score / Math.max(1, card.cost);
}

// The best affordable play right now, or null when nothing is playable.
// `style` lets a screenshot scene steer the same brain: 'greedy' plays to
// win, 'careless' plays the cheapest card and never shields, 'timid' only
// ever plays shields and draws.
export function choosePlay(game, side, energy, style = 'greedy') {
  const actor = side === 'you' ? game.you : game.foe;
  const affordable = actor.hand
    .map((id, index) => ({ id, index, card: CARD_BY_ID[id] }))
    .filter((p) => p.card.cost <= energy);
  if (affordable.length === 0) return null;
  if (style === 'careless') {
    const cheap = affordable.filter((p) => p.card.effects.every((e) => e.kind === 'damage'));
    const pool = cheap.length > 0 ? cheap : affordable;
    return pool.reduce((a, b) => (a.card.cost <= b.card.cost ? a : b));
  }
  if (style === 'timid') {
    const safe = affordable.filter((p) => p.card.effects.some((e) => e.kind === 'shield' || e.kind === 'draw' || e.kind === 'heal'));
    if (safe.length > 0) return safe[0];
    return null;
  }
  return affordable.reduce((best, p) => (scorePlay(game, side, p.card) > scorePlay(game, side, best.card) ? p : best));
}

// The Warden's whole turn, as a list of hand indexes to play in order.
// It keeps playing while it can afford something worth playing.
export function planAiTurn(game, style = 'greedy') {
  const plays = [];
  let energy = 3;
  // A running tally of the table, so each choice in the plan sees the
  // effects of the plays before it.
  const hand = game.foe.hand.slice();
  const playedSuits = [];
  let foeLife = game.foe.life;
  let foeShield = game.foe.shield;
  let yourLife = game.you.life;
  let yourShield = game.you.shield;
  while (true) {
    const affordable = hand
      .map((id, index) => ({ id, index, card: CARD_BY_ID[id] }))
      .filter((p) => p.card.cost <= energy);
    if (affordable.length === 0) break;
    const probe = {
      you: { life: yourLife, shield: yourShield, hand: [], playedSuits },
      foe: { life: foeLife, shield: foeShield, hand: hand.map((id) => id), playedSuits },
    };
    const pick = choosePlay(probe, 'foe', energy, style);
    if (!pick) break;
    // Plays are card ids, not hand indexes: the hand shrinks as cards are
    // played, so the caller resolves each id against the live hand.
    plays.push(pick.id);
    // Apply the pick to the running tally so the next choice sees it.
    const card = pick.card;
    for (const effect of card.effects) {
      if (effect.kind === 'damage') {
        let left = effect.amount;
        const soaked = Math.min(yourShield, left);
        yourShield -= soaked; left -= soaked;
        yourLife = Math.max(0, yourLife - left);
      }
      if (effect.kind === 'shield') foeShield += effect.amount;
      if (effect.kind === 'heal') foeLife = Math.min(20, foeLife + effect.amount);
    }
    if (card.chain && playedSuits.includes(card.chain.suit)) {
      let left = card.chain.bonus.amount;
      const soaked = Math.min(yourShield, left);
      yourShield -= soaked; left -= soaked;
      yourLife = Math.max(0, yourLife - left);
    }
    playedSuits.push(card.suit);
    energy -= card.cost;
    hand.splice(hand.indexOf(pick.id), 1);
    if (yourLife <= 0) break;
  }
  return plays;
}
