// Ember Court — the deck and the dice.
// One tiny seeded generator (mulberry32) so a screenshot scene can replay
// the exact same game every time, while a real game seeds from the clock.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rand) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// A deck is a draw pile plus a discard pile; when the pile runs dry the
// discard is shuffled back in, so a long duel never stalls.
export function makeDeck(cardIds, rand) {
  return { pile: shuffle(cardIds, rand), discard: [] };
}

export function drawFrom(deck, rand) {
  if (deck.pile.length === 0) {
    if (deck.discard.length === 0) return null;
    deck.pile = shuffle(deck.discard, rand);
    deck.discard = [];
  }
  return deck.pile.pop();
}
