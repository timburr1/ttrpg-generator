import { describe, expect, it } from 'vitest';
import { tavernGenerate } from './tavern';
import { dataFixtureTavern } from './test-support/data-fixture';
import { rngSequence } from './test-support/rng-sequence';

describe('tavernGenerate', () => {
  const data = dataFixtureTavern();

  it('draws name first, name second, innkeeper, room, feature, and nothing else', () => {
    const { rng, remaining } = rngSequence([0, 0.5, 0.99, 0.5, 0]);
    const tavern = tavernGenerate(data, rng);
    expect(tavern).toEqual({
      name: 'The name-first-0 name-second-1',
      innkeeper: 'innkeeper-2',
      room: 'room-1',
      feature: 'feature-0',
    });
    expect(remaining()).toBe(0);
  });
});
