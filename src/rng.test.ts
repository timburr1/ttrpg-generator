import { describe, expect, it } from 'vitest';
import { rngPick, rngPickWeighted } from './rng';
import { rngSequence } from './test-support/rng-sequence';

describe('rngPick', () => {
  const items = ['a', 'b', 'c'];

  it('maps the ends of the range to the first and last item', () => {
    expect(rngPick(rngSequence([0]).rng, items)).toBe('a');
    expect(rngPick(rngSequence([0.99]).rng, items)).toBe('c');
  });

  it('throws on an empty list', () => {
    expect(() => rngPick(rngSequence([0]).rng, [])).toThrow();
  });

  it('throws when the Rng breaks its contract and returns 1', () => {
    expect(() => rngPick(rngSequence([1]).rng, items)).toThrow();
  });
});

describe('rngPickWeighted', () => {
  const weights = { a: 46, b: 46, c: 8 };

  it('maps each band of the roll to its key', () => {
    const pick = (roll: number) => rngPickWeighted(rngSequence([roll]).rng, weights);
    expect([pick(0), pick(0.459), pick(0.461), pick(0.919), pick(0.921), pick(0.99)]).toEqual(['a', 'a', 'b', 'b', 'c', 'c']);
  });

  it('does not need weights that sum to 100', () => {
    expect(rngPickWeighted(rngSequence([0.6]).rng, { x: 1, y: 1 })).toBe('y');
  });

  it('throws when the roll exceeds the total', () => {
    expect(() => rngPickWeighted(rngSequence([1]).rng, weights)).toThrow();
  });
});
