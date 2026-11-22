// Ember Court — the rules engine. Pure state, no DOM here.
// A game: two fighters (you, the Warden), each with life, shield, a hand and
// a deck. A turn: draw 2, refill to 3 energy, play cards, end turn. Shield
// soaks damage first and stays until it is spent. First to 0 life loses.

import { CARD_BY_ID, buildDeckIds } from './cards.js';
import { drawFrom, makeDeck, mulberry32 } from './deck.js';

export const MAX_LIFE = 20;
export const HAND_LIMIT = 7;
export const OPENING_HAND = 5;
export const ENERGY_PER_TURN = 3;

export function newFighter(name) {
  return { name, life: MAX_LIFE, shield: 0, hand: [], playedSuits: [] };
}

export function createGame(seed) {
  const rand = mulberry32(seed ?? ((Date.now() % 2147483647) + 1));
  const game = {
    rand,
    seed,
    screen: 'title', // title | play | win | loss
    phase: 'player', // player | ai
    turn: 1,
    you: newFighter('You'),
    foe: newFighter('Ashen Warden'),
    youDeck: makeDeck(buildDeckIds(), rand),
    foeDeck: makeDeck(buildDeckIds(), rand),
    energy: ENERGY_PER_TURN,
    log: ['The Ember Court is in session.'],
    lastPlay: null, // { by, cardId } shown in the middle of the table
    winner: null,
  };
  drawCards(game, game.you, game.youDeck, OPENING_HAND);
  drawCards(game, game.foe, game.foeDeck, OPENING_HAND);
  return game;
}

export function drawCards(game, fighter, deck, count) {
  let drawn = 0;
  while (drawn < count && fighter.hand.length < HAND_LIMIT) {
    const id = drawFrom(deck, game.rand);
    if (!id) break;
    fighter.hand.push(id);
    drawn += 1;
  }
  return drawn;
}

function hurt(game, target, amount) {
  let left = amount;
  if (target.shield > 0) {
    const soaked = Math.min(target.shield, left);
    target.shield -= soaked;
    left -= soaked;
  }
  target.life = Math.max(0, target.life - left);
  return left;
}

function applyEffect(game, actor, target, effect) {
  if (effect.kind === 'damage') {
    const dealt = hurt(game, target, effect.amount);
    game.log.push(`${actor.name} deals ${dealt} damage${effect.amount !== dealt ? ` (${effect.amount - dealt} soaked by shield)` : ''}.`);
  } else if (effect.kind === 'shield') {
    actor.shield += effect.amount;
    game.log.push(`${actor.name} gains ${effect.amount} shield.`);
  } else if (effect.kind === 'heal') {
    const healed = Math.min(effect.amount, MAX_LIFE - actor.life);
    actor.life += healed;
    game.log.push(`${actor.name} restores ${healed} life.`);
  } else if (effect.kind === 'draw') {
    const deck = actor === game.you ? game.youDeck : game.foeDeck;
    const n = drawCards(game, actor, deck, effect.amount);
    game.log.push(`${actor.name} draws ${n} card${n === 1 ? '' : 's'}.`);
  }
}

// Play one card from a fighter's hand. Returns false when the play is
// illegal (not that side's turn, not enough energy, game already over).
export function playCard(game, side, handIndex) {
  if (game.screen !== 'play') return false;
  const actor = side === 'you' ? game.you : game.foe;
  const target = side === 'you' ? game.foe : game.you;
  const cardId = actor.hand[handIndex];
  if (cardId === undefined) return false;
  const card = CARD_BY_ID[cardId];
  if (side === 'you') {
    if (game.phase !== 'player') return false;
    if (game.energy < card.cost) {
      game.log.push(`Not enough energy for ${card.name} (${card.cost} needed).`);
      return false;
    }
    game.energy -= card.cost;
  }
  actor.hand.splice(handIndex, 1);
  const deck = side === 'you' ? game.youDeck : game.foeDeck;
  deck.discard.push(cardId);
  game.lastPlay = { by: side, cardId };
  game.log.push(`${actor.name} plays ${card.name}.`);
  for (const effect of card.effects) applyEffect(game, actor, target, effect);
  if (card.chain && actor.playedSuits.includes(card.chain.suit)) {
    game.log.push(`Chain! ${card.name} answers the ${card.chain.suit} already played.`);
    applyEffect(game, actor, target, card.chain.bonus);
  }
  actor.playedSuits.push(card.suit);
  checkEnd(game);
  return true;
}

export function startPlayerTurn(game) {
  game.phase = 'player';
  game.energy = ENERGY_PER_TURN;
  game.you.playedSuits = [];
  drawCards(game, game.you, game.youDeck, 2);
  game.log.push(`Turn ${game.turn}: your move. Draw 2, energy refilled to ${ENERGY_PER_TURN}.`);
}

export function endPlayerTurn(game) {
  game.phase = 'ai';
  game.foe.playedSuits = [];
  drawCards(game, game.foe, game.foeDeck, 2);
  game.log.push('The Warden takes the table…');
}

export function endAiTurn(game) {
  game.turn += 1;
  startPlayerTurn(game);
}

function checkEnd(game) {
  if (game.foe.life <= 0) {
    game.screen = 'win';
    game.winner = 'you';
    game.log.push('The Warden falls. The Court is yours!');
  } else if (game.you.life <= 0) {
    game.screen = 'loss';
    game.winner = 'foe';
    game.log.push('Your ember gutters out. The Warden keeps the Court.');
  }
}

export function startGame(game) {
  game.screen = 'play';
  game.phase = 'player';
  game.energy = ENERGY_PER_TURN;
  game.log.push('Duel! Play a card, then end your turn.');
}
