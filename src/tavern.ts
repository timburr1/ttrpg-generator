import { type Rng, rngPick } from './rng';

export type TavernData = {
  readonly nameFirst: readonly string[];
  readonly nameSecond: readonly string[];
  readonly innkeepers: readonly string[];
  readonly rooms: readonly string[];
  readonly features: readonly string[];
};

export type Tavern = {
  readonly name: string;
  readonly innkeeper: string;
  readonly room: string;
  readonly feature: string;
};

// Draw order: first name word, second name word, innkeeper, room, feature.
export function tavernGenerate(data: TavernData, rng: Rng): Tavern {
  const nameFirst = rngPick(rng, data.nameFirst);
  const nameSecond = rngPick(rng, data.nameSecond);
  return {
    name: `The ${nameFirst} ${nameSecond}`,
    innkeeper: rngPick(rng, data.innkeepers),
    room: rngPick(rng, data.rooms),
    feature: rngPick(rng, data.features),
  };
}
