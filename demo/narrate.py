"""Generate the demo narration with Cartesia Sonic 3.6, one clip per scene -> public/narration.wav + public/timing.json.
usage: CARTESIA_KEY=... python3 narrate.py"""
import json, os, subprocess, urllib.request, wave

VOICE = "22df7143-7987-4e15-a720-d65c69a443b3"  # Oscar
LINES = [
    "Got a book you'd love to listen to?",
    "Just drop in a PDF, or an EPUB.",
    "Make Audiobooks cleans up the text, finds every chapter, and gives each speaker their own voice.",
    "Then Qwen 3 narrates the whole book, running entirely on your Mac. No cloud. No subscription.",
    "Out comes a real audiobook, with chapters and cover art, ready for Apple Books.",
    "Make Audiobooks. Your library, out loud.",
]
SR, GAP = 44100, 0.55
pcm, timing = b"", []
for i, line in enumerate(LINES):
    path = f"/tmp/narr_{i}.pcm"
    if not os.path.exists(path):
        body = json.dumps({"model_id": "sonic-3.6", "transcript": line, "language": "en",
                           "voice": {"mode": "id", "id": VOICE},
                           "output_format": {"container": "raw", "encoding": "pcm_s16le", "sample_rate": SR}}).encode()
        req = urllib.request.Request("https://api.cartesia.ai/tts/bytes", body, {
            "X-API-Key": os.environ["CARTESIA_KEY"], "Cartesia-Version": "2025-04-16", "Content-Type": "application/json"})
        open(path, "wb").write(urllib.request.urlopen(req, timeout=120).read())
    clip = open(path, "rb").read()
    lead = 0.6 if i == 0 else GAP
    start = len(pcm) / 2 / SR + lead
    pcm += b"\0\0" * int(SR * lead) + clip
    timing.append({"text": line, "start": round(start, 3), "end": round(len(pcm) / 2 / SR, 3)})
pcm += b"\0\0" * int(SR * 1.8)
w = wave.open("public/narration.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm); w.close()
json.dump({"duration": round(len(pcm) / 2 / SR, 3), "lines": timing}, open("public/timing.json", "w"), indent=1)
print(json.dumps(timing, indent=1), len(pcm) / 2 / SR)
