# Content authoring guide

Everything the generator says comes from the markdown files in this folder. Edit them freely; the site picks up changes on the next build.

## Files

- `quirks.md`: one pool of quirks for every race and gender.
- `names/<race>/first-male.md`, `first-female.md`, `first-other.md`: first names by gender. "other" covers other and non-binary.
- `names/<race>/last.md`: last names, for every race except dwarf and warforged.

Races: dwarf, elf, gnome, halfling, half-elf, half-orc, human, warforged. Every race needs the three first-name files.

Dwarves have no `last.md`: a dwarf's last name is another first name from the same gender's file plus a suffix (`ssen` male, `sdottir` female, `skind` other), appended directly to the entry. Warforged have one name and no `last.md`. The suffixes live in the code (`LAST_NAME_RULES` in `src/npc.ts`). A `last.md` for either race is reported as an error.

## Format

One entry per line, written as a bullet:

```markdown
# Any heading you like

> Notes to yourself start with a greater-than sign and are ignored.

- First entry
- Second entry
```

- Lines starting with `-`, `*`, or `+` followed by a space are entries. A bullet with no text is an error.
- Blank lines, `#` headings, and `>` notes are ignored. To switch an entry off without deleting it, change its `-` to `>`.
- Any other line is an error. The page and the tests report the file and line.
- Each file needs at least one entry, and no entry may repeat within a file (case-insensitive). The same entry in different files is fine.
- Entries are shown as plain text. Markdown inside an entry is not interpreted.

## Writing quirks

The card does not know which pronoun fits a character, so write each quirk as a fragment with no subject, not a sentence that starts with he, she, or they.

## Checking your edits

Run `npm test`. The data-integrity test loads these files exactly as the page does and lists every problem it finds. If you edit on github.com, a failed check on the commit means a problem: open the failed run's log to see the same list.
