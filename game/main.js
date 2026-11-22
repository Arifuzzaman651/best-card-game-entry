// Ember Court — boot, input and the turn driver.
// Keyboard: 1-5 play a card, Space/Enter ends the turn (or begins the duel
// on the title screen), R restarts, M mutes. Mouse: click a card to play it,
// click End Turn. The Warden's turn plays out on a timer so each of its
// choices is visible; screenshots drive the same rules synchronously.

import { createGame, endAiTurn, endPlayerTurn, playCard, startGame } from './state.js';
import { planAiTurn } from './ai.js';
import { render, flashLife } from './render.js';
import { sfx, toggleMute, isMuted } from './audio.js';
import { applyShot } from './shots.js';

let game = createGame();
let aiTimer = null;

function clearAiTimer() {
  if (aiTimer !== null) { clearTimeout(aiTimer); aiTimer = null; }
}

function sideHurt(side) { flashLife(side); }

// The Warden plays its planned turn one card at a time, 650 ms apart, so
// the player can read each choice and see what to counter next.
function runAiTurn() {
  const plays = planAiTurn(game, 'greedy');
  let step = 0;
  const playNext = () => {
    if (game.screen !== 'play' || game.phase !== 'ai') return;
    if (step >= plays.length) {
      endAiTurn(game);
      sfx.turn();
      render(game);
      return;
    }
    const cardId = plays[step];
    step += 1;
    const index = game.foe.hand.indexOf(cardId);
    if (index === -1) { aiTimer = setTimeout(playNext, 650); return; }
    const before = game.you.life;
    playCard(game, 'foe', index);
    if (game.you.life < before) sideHurt('you');
    sfx.play();
    render(game);
    aiTimer = setTimeout(playNext, 650);
  };
  aiTimer = setTimeout(playNext, 700);
}

function tryPlay(index) {
  if (game.screen !== 'play' || game.phase !== 'player') return;
  const beforeFoe = game.foe.life;
  const beforeYou = game.you.life;
  const ok = playCard(game, 'you', index);
  if (!ok) return;
  if (game.foe.life < beforeFoe) { sideHurt('foe'); sfx.damage(); }
  else if (game.you.life > beforeYou) sfx.heal();
  else sfx.play();
  render(game);
  if (game.screen === 'win') sfx.win();
  if (game.screen === 'loss') sfx.loss();
}

function endTurn() {
  if (game.screen !== 'play' || game.phase !== 'player') return;
  endPlayerTurn(game);
  render(game);
  runAiTurn();
}

function beginDuel() {
  clearAiTimer();
  startGame(game);
  sfx.turn();
  render(game);
}

function restart() {
  clearAiTimer();
  game = createGame();
  render(game);
}

window.__emberPlay = tryPlay;
window.__game = game;

function bind() {
  document.getElementById('end-turn').addEventListener('click', endTurn);
  document.getElementById('begin-btn').addEventListener('click', beginDuel);
  document.getElementById('again-btn').addEventListener('click', restart);
  document.getElementById('mute-btn').addEventListener('click', () => {
    const muted = toggleMute();
    document.getElementById('mute-btn').textContent = muted ? 'Sound: off' : 'Sound: on';
  });
  document.addEventListener('keydown', (event) => {
    // Accept both key and code: automation drivers and some layouts send
    // the code (Digit1, Space) where a physical keyboard sends the key.
    const digit = /^Digit([1-5])$/.exec(event.code || '');
    if (digit) { tryPlay(Number(digit[1]) - 1); return; }
    if (event.key >= '1' && event.key <= '5') { tryPlay(Number(event.key) - 1); return; }
    if (event.key === ' ' || event.key === 'Enter' || event.code === 'Space') {
      event.preventDefault();
      if (game.screen === 'title') beginDuel();
      else if (game.screen === 'win' || game.screen === 'loss') restart();
      else endTurn();
    } else if (event.key === 'r' || event.key === 'R') restart();
    else if (event.key === 'm' || event.key === 'M') {
      const muted = toggleMute();
      document.getElementById('mute-btn').textContent = muted ? 'Sound: off' : 'Sound: on';
    }
  });
}

bind();
render(game);

// A screenshot scene (?shot=title|table|win|loss&seed=N) plays the real rules
// forward from a fresh seeded game and settles on its frame, then raises
// window.__shotReady for the capture driver.
const params = new URLSearchParams(window.location.search);
if (params.get('shot')) {
  const scene = applyShot(game, params.get('shot'), Number(params.get('seed') || 7));
  window.__game = game;
  if (scene === 'title') {
    render(game);
    window.__shotReady = true;
  } else {
    render(game);
    if (game.screen === 'win') sfx.win();
    if (game.screen === 'loss') sfx.loss();
    window.__shotReady = true;
  }
}
