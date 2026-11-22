// Ember Court — the screenshot scenes behind ?shot=title|table|win|loss.
// Each scene plays the real rules forward from a fresh seeded game, so the
// frame is what a short game really looks like and the same seed always
// gives the same frame. No state is faked: the win and loss screens are
// reached by actually winning and losing.

import { createGame, startGame, playCard, endPlayerTurn, endAiTurn, ENERGY_PER_TURN } from './state.js';
import { choosePlay, planAiTurn } from './ai.js';

// One side's whole turn, played synchronously: keep picking the best
// affordable play until the energy runs out or nothing is playable.
function playFullTurn(game, side, style) {
  let energy = ENERGY_PER_TURN;
  while (true) {
    const pick = choosePlay(game, side, energy, style);
    if (!pick) break;
    const index = (side === 'you' ? game.you : game.foe).hand.indexOf(pick.id);
    if (index === -1) break;
    if (!playCard(game, side, index)) break;
    energy -= pick.card.cost;
    if (game.screen !== 'play') return;
  }
}

function playFoeTurn(game, style) {
  endPlayerTurn(game);
  for (const cardId of planAiTurn(game, style)) {
    const index = game.foe.hand.indexOf(cardId);
    if (index === -1) continue;
    if (!playCard(game, 'foe', index)) break;
    if (game.screen !== 'play') return;
  }
  if (game.screen === 'play') endAiTurn(game);
}

function drive(game, yourStyle, foeStyle, maxTurns) {
  startGame(game);
  for (let t = 0; t < maxTurns && game.screen === 'play'; t += 1) {
    playFullTurn(game, 'you', yourStyle);
    if (game.screen !== 'play') break;
    playFoeTurn(game, foeStyle);
  }
}

export function applyShot(game, scene, seed) {
  // Rebuild the table from the scene's seed, in place, so the caller keeps
  // rendering the same object.
  Object.assign(game, createGame(seed));
  if (scene === 'title') return 'title';
  if (scene === 'table') {
    // Four turns of honest play on both sides: a real mid-game table with
    // both hands full, life totals dented, and the log telling the story.
    drive(game, 'greedy', 'greedy', 4);
    return 'table';
  }
  if (scene === 'win') {
    // The player presses every advantage while the Warden plays timidly
    // (shields and draws only): the duel ends in a win.
    drive(game, 'greedy', 'timid', 30);
    return 'win';
  }
  if (scene === 'loss') {
    // The player plays carelessly (cheapest damage, never a shield) while
    // the Warden plays to win: the duel ends in a loss.
    drive(game, 'careless', 'greedy', 30);
    return 'loss';
  }
  return 'title';
}
