# makeaudiobooks

**Turn any PDF or EPUB into a real audiobook, on your Mac, for free.** Chapters, cover art, a different voice for
each speaker, narrated by [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) running locally with Apple's MLX.
Nothing leaves your machine.

[![makeaudiobooks demo: click for the video with sound](docs/demo.gif)](docs/demo.mp4)

*Click the animation for the full video with sound.*

## Quick start

You need an Apple Silicon Mac (M1 or newer), [uv](https://docs.astral.sh/uv/) and ffmpeg (`brew install uv ffmpeg`).

```bash
git clone https://github.com/HIMMAND/makeaudiobooks && cd makeaudiobooks
./makeaudiobooks doctor          # checks your Mac, picks a model, shows download size + time per book
./makeaudiobooks setup           # installs everything into ~/.makeaudiobooks (asks before downloading)
./makeaudiobooks convert book.pdf --dry-run   # chapters, speakers, estimated time
./makeaudiobooks convert book.pdf             # -> "Book Title.m4b" next to the PDF
```

Open the `.m4b` in Apple Books (or any audiobook player). Add `--mp3` for an MP3 with chapter markers.
Long books take hours; stop any time with Ctrl-C and run the same command again to pick up where it left off.

## What it does

1. **Reads the book.** PDFs through macOS PDFKit (falls back to `pdftotext`), EPUBs and plain text directly.
2. **Cleans it up.** Removes page numbers and running headers/footers, repairs broken ligatures
   (`dissatis ed` -> `dissatisfied`) and split letters (`Y es` -> `Yes`), rejoins hyphenated words.
3. **Finds the chapters** from the PDF outline, the contents page, or "Chapter 3"-style headings. Skips the
   copyright page and the index.
4. **Casts the voices.** Script-style dialogue (`YOUTH: ...`, `Q: ...`, `Livingston: ...`) is detected
   automatically and each speaker gets their own voice; the narrator gets another.
5. **Narrates** in ~500-character chunks split at sentence boundaries, several at a time on the GPU,
   caching every chunk so nothing is ever generated twice.
6. **Packages** an M4B with chapter markers, title, author and the book's cover.

## Models and speed

`doctor` picks one for you based on your RAM. Speeds measured on an M5 MacBook with 16 GB
(characters of book text per second; spoken audio is ~16 characters/second):

| Model | Download | Speed | Typical 350-page book | Notes |
|---|---|---|---|---|
| `qwen-1.7b` | 4.2 GB | ~31 chars/s | ~6 h | best quality; recommended with 24 GB+ RAM |
| `qwen-0.6b` | 2.0 GB | ~23–38 chars/s | ~5–8 h | great quality; default for 16 GB |
| `kokoro` | 0.4 GB | ~140 chars/s | ~1.5 h | fast, lighter quality, no cloning |

Plus ~1.2 GB of Python packages once. Run `./makeaudiobooks doctor --bench` after setup to measure your own Mac;
ETAs then use your number.

## Voices

Built-in voices: `heart` (narrator), `george`, `liam`, `emma`. The reference clips in `voices/` were generated
with Kokoro (Apache-2.0), so no real person's voice is cloned by default.

```bash
./makeaudiobooks convert book.pdf --cast "narrator=emma,YOUTH=liam"     # choose who sounds like whom
./makeaudiobooks convert book.pdf --no-speakers                         # one voice throughout
./makeaudiobooks convert book.pdf --voice me.wav --voice-text "exact words I said in the clip"   # clone a narrator
```

Only clone voices you have permission to use.

## Claude Code skills

Open this folder in [Claude Code](https://claude.com/claude-code) and two skills are available:

- **convert**: drop in a PDF or EPUB and ask for an audiobook. Claude previews the chapters and voices,
  confirms the time it'll take, and runs the conversion.
- **find**: ask for a book by title. Claude checks [LibriVox](https://librivox.org) for an existing free audiobook,
  then looks for a free legal copy on [Standard Ebooks](https://standardebooks.org),
  [Project Gutenberg](https://www.gutenberg.org), the [Internet Archive](https://archive.org) and
  [Open Library](https://openlibrary.org), and hands it to convert. It only uses public-domain and openly licensed
  sources and won't go looking for copies of in-copyright books.

## Use it legally

Convert books you own, public-domain books, or openly licensed ones. Audiobooks you make from someone else's
copyrighted book are for your own personal listening; don't share them.

## Credits

[Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) (Apache-2.0) by the Qwen team ·
[mlx-audio](https://github.com/Blaizzy/mlx-audio) (MIT) · [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0) ·
demo built with [Remotion](https://www.remotion.dev) + three.js (`demo/`) and narrated with
[Cartesia](https://cartesia.ai) Sonic 3.6.

MIT licensed.
