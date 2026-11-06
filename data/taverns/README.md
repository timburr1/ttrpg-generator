# Tavern content guide

Everything the tavern generator says comes from the markdown files in this folder. Edit them freely; the site picks up changes on the next build. The file format and checks are the same as for NPCs: see [../npcs/README.md](../npcs/README.md).

## Files

- `name-first.md` and `name-second.md`: the two words of a tavern name. The page shows "The [first] [second]", so write entries without a leading "The".
- `innkeepers.md`: one innkeeper per line.
- `rooms.md`: the mood of the room tonight.
- `features.md`: something odd about the building.

Every file is required. Each draw is uniform over the entries in the file, so the lists can be any length.

Any other `.md` file in this folder (besides this README) is reported as an error, so a file for a new table needs code to load it.
