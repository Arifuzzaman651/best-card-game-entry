// Ember Court — the table. DOM only, no rules here.
// Cards are real DOM so their text stays crisp at thumbnail size: a big
// numeral for the card's punch, the suit as a coloured shape, the cost in a
// gold pip. A played card slides to the middle of the table and the target's
// life bar flashes; a win lands with falling embers.

import { CARD_BY_ID, SUITS } from './cards.js';
import { MAX_LIFE } from './state.js';

const $ = (id) => document.getElementById(id);

function suitIcon(suitKey) {
  const suit = SUITS[suitKey];
  return `<span class="suit" style="color:${suit.color}" title="${suit.name}">${suit.shape}</span>`;
}

// The card's headline number: its damage first, else its shield, else its draw.
function headline(card) {
  const hit = card.effects.find((e) => e.kind === 'damage');
  if (hit) return { n: hit.amount, label: 'DMG' };
  const guard = card.effects.find((e) => e.kind === 'shield');
  if (guard) return { n: guard.amount, label: 'SHIELD' };
  const mend = card.effects.find((e) => e.kind === 'heal');
  if (mend) return { n: mend.amount, label: 'HEAL' };
  return { n: card.effects[0]?.amount ?? 0, label: 'DRAW' };
}

export function cardElement(cardId, opts = {}) {
  const card = CARD_BY_ID[cardId];
  const suit = SUITS[card.suit];
  const head = headline(card);
  const el = document.createElement('div');
  el.className = `card suit-${card.suit}${opts.playable === false ? ' unplayable' : ''}${opts.faceDown ? ' face-down' : ''}`;
  el.style.setProperty('--suit', suit.color);
  el.style.setProperty('--suit-dark', suit.dark);
  el.style.setProperty('--glow', suit.glow);
  if (opts.faceDown) {
    el.innerHTML = `<div class="card-back"><span class="back-mark">♛</span><span class="back-word">EMBER<br>COURT</span></div>`;
    return el;
  }
  el.innerHTML = `
    <div class="card-top"><span class="cost" title="Energy cost">${card.cost}</span>${suitIcon(card.suit)}</div>
    <div class="card-name">${card.name}</div>
    <div class="card-art"><span class="art-glyph">${suit.shape}</span><span class="art-num">${head.n}</span><span class="art-label">${head.label}</span></div>
    <div class="card-text">${card.text}</div>
    <div class="card-key">${opts.keyHint ?? ''}</div>`;
  return el;
}

function renderFighter(game, side) {
  const fighter = side === 'you' ? game.you : game.foe;
  const prefix = side === 'you' ? 'you' : 'foe';
  $(`${prefix}-life-text`).textContent = `${fighter.life} / ${MAX_LIFE}`;
  $(`${prefix}-life-fill`).style.width = `${(fighter.life / MAX_LIFE) * 100}%`;
  const shieldEl = $(`${prefix}-shield`);
  shieldEl.textContent = fighter.shield > 0 ? `🛡 Shield ${fighter.shield}` : 'No shield';
  shieldEl.classList.toggle('has-shield', fighter.shield > 0);
}

function renderHand(game) {
  const handEl = $('your-hand');
  handEl.innerHTML = '';
  game.you.hand.forEach((cardId, index) => {
    const card = CARD_BY_ID[cardId];
    const playable = game.screen === 'play' && game.phase === 'player' && game.energy >= card.cost;
    const el = cardElement(cardId, { playable, keyHint: String(index + 1) });
    el.dataset.index = String(index);
    el.addEventListener('click', () => window.__emberPlay(index));
    handEl.appendChild(el);
  });
  // Fan the hand when it would run past the table's right edge: overlap
  // the cards so the whole hand stays visible, even at seven cards.
  // (The hand's own scrollWidth can't show this — a flex row refuses to
  // shrink below its content — so measure against the app's edge.)
  requestAnimationFrame(() => {
    const appRight = document.getElementById('app').getBoundingClientRect().right - 18;
    const overflow = handEl.getBoundingClientRect().right - appRight;
    if (overflow > 0 && handEl.children.length > 1) {
      const step = Math.ceil(overflow / (handEl.children.length - 1)) + 2;
      [...handEl.children].slice(1).forEach((child) => { child.style.marginLeft = `-${step}px`; });
    }
  });
  const foeHand = $('foe-hand');
  foeHand.innerHTML = '';
  game.foe.hand.forEach(() => foeHand.appendChild(cardElement('ember-strike', { faceDown: true })));
}

function renderEnergy(game) {
  const energyEl = $('energy');
  energyEl.innerHTML = '';
  for (let i = 0; i < 3; i += 1) {
    const pip = document.createElement('span');
    pip.className = `pip${i < game.energy ? ' lit' : ''}`;
    energyEl.appendChild(pip);
  }
  const label = document.createElement('span');
  label.className = 'energy-label';
  label.textContent = `Energy ${game.energy} / 3`;
  energyEl.appendChild(label);
}

function renderLog(game) {
  const logEl = $('log');
  logEl.innerHTML = '';
  game.log.slice(-4).forEach((line) => {
    const p = document.createElement('p');
    p.textContent = line;
    logEl.appendChild(p);
  });
}

function renderLastPlay(game) {
  const slot = $('last-play');
  slot.innerHTML = '';
  if (!game.lastPlay) return;
  const who = game.lastPlay.by === 'you' ? 'You played' : 'Warden played';
  const label = document.createElement('div');
  label.className = 'last-play-label';
  label.textContent = who;
  slot.appendChild(label);
  slot.appendChild(cardElement(game.lastPlay.cardId, {}));
  slot.firstElementChild?.classList?.add('pop');
}

function renderBanner(game) {
  const banner = $('turn-banner');
  if (game.screen === 'win') { banner.textContent = 'Victory!'; return; }
  if (game.screen === 'loss') { banner.textContent = 'Defeat'; return; }
  banner.textContent = game.phase === 'player' ? `Your turn — Turn ${game.turn}` : `Warden's turn — Turn ${game.turn}`;
  $('end-turn').disabled = game.screen !== 'play' || game.phase !== 'player';
}

function renderOverlays(game) {
  $('title-screen').classList.toggle('hidden', game.screen !== 'title');
  const end = $('end-screen');
  const over = game.screen === 'win' || game.screen === 'loss';
  end.classList.toggle('hidden', !over);
  if (over) {
    const win = game.screen === 'win';
    $('end-title').textContent = win ? 'VICTORY' : 'DEFEAT';
    $('end-title').className = win ? 'win' : 'loss';
    $('end-sub').textContent = win
      ? `The Warden falls on turn ${game.turn}. The Ember Court is yours.`
      : `The Warden keeps the Court on turn ${game.turn}. Deal again and take it back.`;
    if (win && !end.dataset.confetti) {
      end.dataset.confetti = '1';
      const field = $('confetti');
      field.innerHTML = '';
      for (let i = 0; i < 48; i += 1) {
        const bit = document.createElement('i');
        bit.style.left = `${Math.random() * 100}%`;
        bit.style.animationDelay = `${Math.random() * 1.6}s`;
        bit.style.background = ['#e5484d', '#f5b83d', '#46a758', '#5b8def'][i % 4];
        field.appendChild(bit);
      }
    }
  }
}

// Flash the life bar of the side that just took a hit.
export function flashLife(side) {
  const el = $(`${side}-life-fill`);
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

export function render(game) {
  renderFighter(game, 'you');
  renderFighter(game, 'foe');
  renderHand(game);
  renderEnergy(game);
  renderLog(game);
  renderLastPlay(game);
  renderBanner(game);
  renderOverlays(game);
}
