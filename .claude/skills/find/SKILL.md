---
name: find
description: Find a legitimately free copy of a book (public domain or openly licensed) and turn it into an audiobook. Checks LibriVox for an existing free human-read audiobook first, then Project Gutenberg, Standard Ebooks, Internet Archive and Open Library, then hands the EPUB to the convert skill. Use when the user asks to get/find/download a book or audiobook by title or author.
---

# find: legal free book -> audiobook

Only use the sources below. **Never** search GitHub, file-sharing sites, shadow libraries, or the open web for
copies of in-copyright commercial books, even if asked; say that plainly and offer the legal options at the end.

Use `curl -s` (URL-encode the query). Show the user what you found (title, author, year, source, link) before
downloading anything, and download into `~/Downloads/makeaudiobooks/`.

## 1. LibriVox first (free audiobooks read by volunteers, public domain)
`https://librivox.org/api/feed/audiobooks/?title=^<title>&format=json&extended=1` (or `author=<last name>`).
If there's a match, tell the user it already exists as a free audiobook and give `url_librivox` plus the zip/M4B
links (`url_zip_file`, or the Internet Archive item in `url_iarchive` which has an `.m4b`). Ask if they still want a
fresh AI-narrated version.

## 2. Ebook sources (prefer EPUB, it converts cleanest)
1. **Standard Ebooks** (carefully proofread public-domain EPUBs): search `https://standardebooks.org/ebooks?query=<q>`;
   book pages link `.../downloads/<author>_<title>.epub`.
2. **Project Gutenberg** via Gutendex: `https://gutendex.com/books?search=<title author>`; use
   `formats["application/epub+zip"]` (fallback `text/plain; charset=utf-8`). Check `copyright` is false.
3. **Internet Archive**: `https://archive.org/advancedsearch.php?q=title:(<q>) AND mediatype:texts&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=year&rows=10&output=json`,
   then `https://archive.org/metadata/<identifier>`. Only download if the item is freely downloadable
   (no `access-restricted-item: true`, not in the `inlibrary` / `printdisabled` lending collections). Lending-only
   items: give the user the borrow link instead; don't try to download them.
4. **Open Library**: `https://openlibrary.org/search.json?q=<q>&fields=key,title,author_name,first_publish_year,ebook_access,ia`.
   `ebook_access: "public"` -> download via the `ia` identifier (as above). `"borrowable"` -> borrow link only.
5. **Author-published free books**: only from the author's or publisher's own official site, or a clear Creative
   Commons / open license page (e.g. an author who posts the book free on their site). Name the source and license.

## 3. Hand off
Pass the downloaded file to the **convert** skill (`./makeaudiobooks convert "<file>" --dry-run` first).

## Nothing legal found
Say the book is probably still in copyright and isn't legally free. Options: buy the ebook (DRM-free stores, or an
ebook the user can export) or use a PDF/EPUB they already own, then run convert on it; borrow it from their library
(Libby / Open Library lending); or check the official audiobook.
