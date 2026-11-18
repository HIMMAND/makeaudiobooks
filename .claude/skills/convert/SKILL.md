---
name: convert
description: Turn a PDF, EPUB or TXT book into an M4B audiobook (with chapters, cover, one voice per speaker) using a local Qwen3-TTS or Kokoro model on this Mac. Use when the user drops/mentions a book file and wants it as an audiobook, or after the find skill has downloaded a book.
---

# convert: book file -> audiobook

The tool is `./makeaudiobooks` at the repo root (resolve it relative to this skill: `../../../makeaudiobooks`).
Everything runs locally; nothing is uploaded.

## Steps

1. **Check the Mac once.** If `~/.makeaudiobooks/venv` doesn't exist, run `./makeaudiobooks doctor` and show the
   user the recommended model, download size and ETA. Ask before running `./makeaudiobooks setup -y`
   (it downloads ~1–5 GB). Use `--model` only if the user wants something other than the recommendation.
2. **Preview.** Run `./makeaudiobooks convert "<book>" --dry-run`. Show the user, briefly: title, number of
   chapters, detected speakers -> voices, total hours of audio and estimated time. Point out anything odd
   (one giant chapter, junk chapters like "Index", 0-character chapters, wrong title/author).
3. **Fix up if needed** (re-run the dry run after changes):
   - pick chapters: `--chapters 2-30` (numbers from the listing; front/back matter like Copyright is skipped automatically)
   - title/author: `--title "…" --author "…"`
   - voices: `--cast "narrator=emma,YOUTH=liam"` (voices: heart, george, liam, emma); `--no-speakers` for one voice
   - clone a narrator: `--voice clip.wav --voice-text "exact words in the clip"` (5–20 s clean speech; Qwen models only;
     only clone a voice the user has the right to use)
   - faster, lower quality: `--model kokoro`
4. **Confirm and run.** For anything over ~20 minutes of estimated time, confirm with the user first, and suggest a
   one-chapter test (`--chapters N`) for a new book. Run the convert command **in the background** (it can take
   hours) and don't poll; it prints progress with chars/sec and ETA. It is resumable: if it stops, re-run the exact
   same command and cached chunks are reused.
5. **Deliver.** Output is `<Title>.m4b` next to the book (or `-o path`). Add `--mp3` for an MP3 with chapter markers.
   Offer `open -a Books "<file>.m4b"` to play it.

## Troubleshooting
- "no text layer": the PDF is scanned images; it needs OCR first (e.g. `ocrmypdf in.pdf out.pdf`).
- Garbled words / missing "fi": the tool repairs PDF ligatures automatically; if a book still reads badly, try the
  EPUB edition instead.
- Out of memory / very slow: use `--model qwen-0.6b` or `--model kokoro`, close other heavy apps.
- Only convert books the user owns or that are public domain / openly licensed.
