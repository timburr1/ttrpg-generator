// Uniform in [0, 1), the Math.random contract.
export type Rng = () => number;

export function rngPick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) {
    throw new Error(`rngPick: index out of range for a list of ${items.length}`);
  }
  return item;
}

export function rngPickWeighted<T extends string>(rng: Rng, weights: Readonly<Record<T, number>>): T {
  const entries = Object.entries<number>(weights) as [T, number][]; // keys are T by construction
  let roll = rng() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [key, weight] of entries) {
    if (roll < weight) {
      return key;
    }
    roll -= weight;
  }
  throw new Error('rngPickWeighted: roll exceeded the total weight');
}
