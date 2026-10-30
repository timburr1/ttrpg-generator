import type { Rng } from '../npc';

// A scripted Rng: returns the given values in order and throws when they run out, so a test also pins how many draws the code under test makes.
export function rngSequence(values: readonly number[]): { readonly rng: Rng; readonly remaining: () => number } {
  let next = 0;
  return {
    rng: () => {
      const value = values[next];
      if (value === undefined) {
        throw new Error(`rngSequence: draw ${next + 1} requested but only ${values.length} values were scripted`);
      }
      next += 1;
      return value;
    },
    remaining: () => values.length - next,
  };
}
