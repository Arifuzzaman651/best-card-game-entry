// Ember Court — the cards themselves.
// Every card is an original design in one of three suits. A suit is told by
// colour AND shape, never by text alone: Flame is red with a triangle,
// Sword is steel blue with a diamond, Leaf is green with a circle.
// A card's effect is a small function of (game, side): it reads the table,
// does its thing, and writes one line to the log.

export const SUITS = {
  flame: { name: 'Flame', color: '#e5484d', dark: '#8f1d22', shape: '▲', glow: 'rgba(229,72,77,.45)' },
  sword: { name: 'Sword', color: '#5b8def', dark: '#1e3f7d', shape: '◆', glow: 'rgba(91,141,239,.45)' },
  leaf: { name: 'Leaf', color: '#46a758', dark: '#1d5c2e', shape: '●', glow: 'rgba(70,167,88,.45)' },
};

// effect kinds the engine understands; each card lists one primary effect
// plus an optional chain (a bonus that fires when the suit was already played).
function damage(n) { return { kind: 'damage', amount: n }; }
function shield(n) { return { kind: 'shield', amount: n }; }
function heal(n) { return { kind: 'heal', amount: n }; }
function draw(n) { return { kind: 'draw', amount: n }; }

export const CARDS = [
  { id: 'ember-strike', name: 'Ember Strike', suit: 'flame', cost: 1, effects: [damage(3)], text: 'Deal 3 damage.' },
  { id: 'fireball', name: 'Fireball', suit: 'flame', cost: 2, effects: [damage(5)], text: 'Deal 5 damage.' },
  { id: 'wildfire', name: 'Wildfire', suit: 'flame', cost: 3, effects: [damage(7)], text: 'Deal 7 damage.' },
  { id: 'cinder-burst', name: 'Cinder Burst', suit: 'flame', cost: 2, effects: [damage(4)], chain: { suit: 'flame', bonus: damage(2) }, text: 'Deal 4 damage. +2 if Flame was played this turn.' },
  { id: 'duel', name: 'Duel', suit: 'sword', cost: 1, effects: [damage(2), draw(1)], text: 'Deal 2 damage. Draw a card.' },
  { id: 'riposte', name: 'Riposte', suit: 'sword', cost: 2, effects: [damage(3), shield(2)], text: 'Deal 3 damage. Gain 2 shield.' },
  { id: 'war-horn', name: 'War Horn', suit: 'sword', cost: 2, effects: [draw(2)], text: 'Draw 2 cards.' },
  { id: 'blade-dance', name: 'Blade Dance', suit: 'sword', cost: 3, effects: [damage(6)], text: 'Deal 6 damage.' },
  { id: 'bulwark', name: 'Bulwark', suit: 'leaf', cost: 1, effects: [shield(4)], text: 'Gain 4 shield.' },
  { id: 'thornwall', name: 'Thornwall', suit: 'leaf', cost: 2, effects: [shield(5), damage(1)], text: 'Gain 5 shield. Deal 1 damage.' },
  { id: 'grove-mend', name: 'Grove Mend', suit: 'leaf', cost: 2, effects: [heal(6)], text: 'Restore 6 life.' },
  { id: 'sprout', name: 'Sprout', suit: 'leaf', cost: 1, effects: [draw(1), heal(2)], text: 'Draw a card. Restore 2 life.' },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

// The shared deck: 30 cards, weighted toward cheap openers so early hands
// always have something playable.
const DECK_RECIPE = [
  ['ember-strike', 4], ['fireball', 3], ['wildfire', 2], ['cinder-burst', 3],
  ['duel', 3], ['riposte', 3], ['war-horn', 2], ['blade-dance', 2],
  ['bulwark', 3], ['thornwall', 2], ['grove-mend', 2], ['sprout', 1],
];

export function buildDeckIds() {
  const ids = [];
  for (const [id, count] of DECK_RECIPE) for (let i = 0; i < count; i += 1) ids.push(id);
  return ids;
}
