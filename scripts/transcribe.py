#!/usr/bin/env python3
"""
Mosique Lyrics Transcription & Romanization Engine

Flow:
1. Try demucs CLI to isolate vocals (safe subprocess)
2. faster-whisper transcribes the vocal stem (or raw audio)
3. Preserves original spoken language (e.g. English, Urdu, Hindi, Punjabi, etc.)
4. Transliterates non-Latin scripts (Urdu/Arabic script, Devanagari, Gurmukhi) into clean Roman Urdu / Romanized Latin alphabet for sing-along karaoke
5. Cleans Whisper hallucinations, music notes, repeated lines
6. Outputs JSON: [{"time": float, "text": string}]
"""

import sys
import json
import os
import re
import subprocess
import shutil
import tempfile
import urllib.parse
import requests

# Prevent OpenMP duplicate library error on macOS
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
# Limit OpenMP threads to avoid crashes in subprocess
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OBJC_DISABLE_INITIALIZE_FORK_SAFETY"] = "YES"

# Force imageio_ffmpeg into PATH if available
try:
    import imageio_ffmpeg
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_exe)
    os.environ["PATH"] = ffmpeg_dir + os.path.pathsep + os.environ.get("PATH", "")
except Exception:
    pass


def clean_lyric_line(text):
    """Remove Whisper hallucinations, music notes, brackets, and unwanted noise."""
    if not text:
        return ""

    # Remove music symbols and bracketed noise tags
    text = re.sub(r'[♪♫♩♬♭♮♯#]', '', text)
    text = re.sub(r'\[(Music|Singing|Applause|Laughter|Silence|Noise|Gasp|Inhales|Cheering|\s*)\]', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\((Music|Singing|Applause|Laughter|Silence|Noise|Gasp|Inhales|Cheering|\s*)\)', '', text, flags=re.IGNORECASE)

    # Strip IPA phonetic characters that leak through during instrumental sections
    # (e.g. ɔ ʃ ʒ ə ɓ ɾ ɪ ʊ ɛ ɐ ɑ ɗ ʁ etc.)
    text = re.sub(r'[\u0250-\u02AF\u1D00-\u1DBF\u0180-\u024F]', '', text)  # IPA extensions + Latin extended
    # Strip hiragana/katakana iteration marks that Whisper outputs during beats
    text = re.sub(r'[\u3000-\u30FF\u3100-\u312F]', '', text)

    # Filter common Whisper hallucinations
    hallucination_patterns = [
        r'subtitles?\s+by.*',
        r'amara\.org.*',
        r'thank\s+you\s+for\s+watching.*',
        r'subscribe\s+to\s+my\s+channel.*',
        r'like\s+and\s+subscribe.*',
        r'transcribed\s+by.*',
        r'captioned\s+by.*',
        r'watching!?',
        r'^[\.،,\!\?\-\s]+$'
    ]

    lower = text.strip().lower()
    for pat in hallucination_patterns:
        if re.search(pat, lower):
            return ""

    text = re.sub(r'\s+', ' ', text).strip()

    # Quality filter: reject lines that are mostly isolated single uppercase letters / numbers
    # (these are Whisper hallucinations during instrumental/beat-only sections)
    words = text.split()
    if len(words) >= 2:
        single_upper_count = sum(1 for w in words if len(w) == 1 and w.isupper())
        if single_upper_count >= 2 or (len(words) >= 3 and single_upper_count / len(words) > 0.35):
            return ""  # Multiple isolated uppercase tokens = garbled instrumental hallucination

    # Reject very short lines (1-3 words) that have no real multi-char alphabetic word
    alpha_words = [w for w in words if re.search(r'[a-zA-Z]{3,}', w)]
    if len(words) <= 3 and len(alpha_words) == 0:
        return ""

    # Reject single-word lines that are too short to be real lyrics (< 3 chars)
    if len(words) == 1 and len(words[0]) < 3:
        return ""

    return text


def separate_vocals_demucs(audio_path, temp_dir):
    """
    Isolate vocal stem using demucs CLI (subprocess - safe, no fork issues).
    Falls back to original audio if demucs is not installed or fails.
    """
    python_bin = sys.executable

    try:
        print("[Demucs] Running demucs CLI to isolate vocals...", file=sys.stderr)
        cmd = [
            python_bin, "-m", "demucs.separate",
            "-n", "htdemucs",
            "--two-stems", "vocals",
            "-o", temp_dir,
            audio_path
        ]
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=300
        )

        if proc.returncode == 0:
            filename = os.path.splitext(os.path.basename(audio_path))[0]
            vocals_path = os.path.join(temp_dir, "htdemucs", filename, "vocals.wav")
            if os.path.exists(vocals_path) and os.path.getsize(vocals_path) > 1000:
                print(f"[Demucs] Vocal stem isolated: {vocals_path}", file=sys.stderr)
                return vocals_path
        else:
            print(f"[Demucs Warning] CLI returned code {proc.returncode}: {proc.stderr[-200:]}", file=sys.stderr)

    except subprocess.TimeoutExpired:
        print("[Demucs Warning] Demucs timed out after 300s.", file=sys.stderr)
    except Exception as e:
        print(f"[Demucs Warning] CLI failed: {e}", file=sys.stderr)

    print("[Demucs] Skipping vocal separation — using original audio.", file=sys.stderr)
    return audio_path


def transliterate_to_roman(text, detected_lang='auto'):
    """
    Transliterate non-Latin scripts (Urdu, Hindi, Punjabi, Arabic, etc.) 
    into Roman Urdu / Roman Hindi / Latin alphabet for sing-along karaoke.
    """
    if not text:
        return ""

    # Check if text contains non-Latin scripts (Arabic/Urdu, Devanagari, Gurmukhi, etc.)
    has_non_latin = re.search(
        r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0900-\u097F\u0A00-\u0A7F\u4E00-\u9FFF\u0400-\u04FF]',
        text
    )
    if not has_non_latin:
        return text

    # Attempt 1: High quality Google Romanization (dt=rm)
    try:
        lang_param = detected_lang if detected_lang and detected_lang not in ['en', 'english', 'auto'] else 'ur'
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={lang_param}&tl=en&dt=rm&q={urllib.parse.quote(text)}"
        res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=5).json()

        if res and isinstance(res, list) and len(res) > 0 and isinstance(res[0], list):
            for part in res[0]:
                if len(part) > 3 and part[3]:
                    roman = str(part[3]).strip()
                    if roman:
                        return roman
                if len(part) > 2 and part[2] and isinstance(part[2], str) and re.match(r'^[a-zA-Z0-9\s\,\.\!\?\'\-\"]+$', part[2]):
                    return part[2].strip()
    except Exception as e:
        print(f"[Romanizer Warning] Google romanization note: {e}", file=sys.stderr)

    # Attempt 2: anyascii transliterator
    try:
        import anyascii
        roman = anyascii.anyascii(text).strip()
        if roman:
            return roman
    except Exception:
        pass

    return text


def transcribe_audio(audio_path, model_size="small"):
    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"Audio file not found: {audio_path}"}))
        sys.exit(1)

    temp_dir = tempfile.mkdtemp(prefix="mosique_lyrics_")

    try:
        # Step 1: Vocal separation via demucs CLI (safe subprocess)
        vocal_path = separate_vocals_demucs(audio_path, temp_dir)

        # Step 2: Transcribe with faster-whisper
        from faster_whisper import WhisperModel

        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        print(f"[Whisper] Transcribing {'vocal stem' if vocal_path != audio_path else 'original audio'}...", file=sys.stderr)

        segments, info = model.transcribe(
            vocal_path,
            task="transcribe",
            beam_size=2
        )
        raw_segments = list(segments)

        # Fallback: if vocal stem produced no speech, try original audio
        if len(raw_segments) == 0 and vocal_path != audio_path:
            print("[Whisper] Vocal stem yielded no speech — trying original audio...", file=sys.stderr)
            segments, info = model.transcribe(
                audio_path,
                task="transcribe",
                beam_size=2
            )
            raw_segments = list(segments)

        detected_lang = getattr(info, 'language', 'en')
        lang_prob = getattr(info, 'language_probability', 0.0)
        print(f"[Whisper] Detected language: '{detected_lang}' (confidence: {lang_prob:.2f})", file=sys.stderr)

        # Step 3: Clean and deduplicate segments
        raw_results = []
        for segment in raw_segments:
            cleaned = clean_lyric_line(segment.text)
            if cleaned:
                raw_results.append({"start": round(segment.start, 1), "text": cleaned})

        # Deduplicate consecutive repeated loops (Whisper hallucinations)
        filtered_results = []
        last_text = ""
        repeat_count = 0
        for item in raw_results:
            curr = item["text"].lower()
            if curr == last_text:
                repeat_count += 1
                if repeat_count > 2:
                    continue
            else:
                last_text = curr
                repeat_count = 1
            filtered_results.append(item)

        # Step 4: Transliterate non-Latin scripts into Roman Urdu / Roman Hindi / Latin
        final_results = []
        for item in filtered_results:
            orig_text = item["text"]
            roman_text = transliterate_to_roman(orig_text, detected_lang)
            cleaned_roman = clean_lyric_line(roman_text)
            if cleaned_roman:
                final_results.append({"time": item["start"], "text": cleaned_roman})

        # Step 5: Validate output
        if not final_results:
            print(json.dumps({"error": "No vocals or lyrics detected in this audio track."}))
            sys.exit(1)

        # Step 6: Final check to ensure any remaining non-Latin glyphs are converted
        fixed_results = []
        for item in final_results:
            fixed_text = transliterate_to_roman(item["text"], detected_lang)
            fixed_results.append({"time": item["time"], "text": fixed_text})

        print(json.dumps(fixed_results))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
    finally:
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python transcribe.py <audio_file_path> [model_size]"}))
        sys.exit(1)

    audio_file = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "small"
    transcribe_audio(audio_file, model_name)
