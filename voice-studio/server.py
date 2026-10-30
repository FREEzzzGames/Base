from __future__ import annotations
import os, re, subprocess, tempfile, urllib.request
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

APP_DIR = Path(__file__).resolve().parent
VOICE_DIR = Path(os.getenv("VOICE_DIR", "/tmp/piper-voices"))
VOICE_DIR.mkdir(parents=True, exist_ok=True)
MAX_TEXT = 20000

VOICES = {
    ("ru", "male"): ("ru_RU-denis-medium", "ru/ru_RU/denis/medium"),
    ("ru", "female"): ("ru_RU-irina-medium", "ru/ru_RU/irina/medium"),
    ("en", "male"): ("en_US-ryan-medium", "en/en_US/ryan/medium"),
    ("en", "female"): ("en_US-amy-medium", "en/en_US/amy/medium"),
    ("de", "male"): ("de_DE-thorsten-medium", "de/de_DE/thorsten/medium"),
    ("de", "female"): ("de_DE-eva_k-x_low", "de/de_DE/eva_k/x_low"),
}

app = FastAPI(title="NewSportV Voice API", version="1.0.0")
allowed = [x.strip() for x in os.getenv("CORS_ORIGINS", "https://freezzzgames.github.io,https://freezzz-portal.onrender.com").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=allowed, allow_methods=["GET","POST","OPTIONS"], allow_headers=["Content-Type"], expose_headers=["Content-Disposition"])

class SynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT)
    language: str = Field(pattern="^(ru|en|de)$")
    gender: str = Field(pattern="^(male|female)$")
    speed: float = Field(default=1.0, ge=0.8, le=1.2)

def model_files(language: str, gender: str):
    name, relative = VOICES[(language, gender)]
    model = VOICE_DIR / f"{name}.onnx"
    config = VOICE_DIR / f"{name}.onnx.json"
    base = f"https://huggingface.co/rhasspy/piper-voices/resolve/main/{relative}/{name}"
    for path, suffix in ((model, ".onnx"), (config, ".onnx.json")):
        if not path.exists() or path.stat().st_size == 0:
            request = urllib.request.Request(base + suffix, headers={"User-Agent":"NewSportV-VoiceStudio/1.0"})
            try:
                with urllib.request.urlopen(request, timeout=90) as response, tempfile.NamedTemporaryFile(dir=VOICE_DIR, delete=False) as tmp:
                    tmp.write(response.read())
                    temp_path = Path(tmp.name)
                temp_path.replace(path)
            except Exception as exc:
                raise HTTPException(502, f"VOICE_DOWNLOAD_FAILED:{name}:{type(exc).__name__}")
    return name, model, config

@app.get("/health")
def health():
    return {"ok": True, "service": "newsportv-voice-api", "voices": len(VOICES), "maxText": MAX_TEXT}

@app.post("/api/synthesize")
def synthesize(payload: SynthesisRequest):
    text = payload.text.strip()
    if not text:
        raise HTTPException(400, "TEXT_REQUIRED")
    if len(text) > MAX_TEXT:
        raise HTTPException(413, "TEXT_TOO_LONG")
    name, model, config = model_files(payload.language, payload.gender)
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as output:
            output_path = Path(output.name)
        result = subprocess.run(
            ["piper", "--model", str(model), "--config", str(config), "--output_file", str(output_path), "--length_scale", str(1.0 / payload.speed)],
            input=text, text=True, capture_output=True, timeout=180, check=False
        )
        if result.returncode != 0 or not output_path.exists() or output_path.stat().st_size < 44:
            detail = (result.stderr or result.stdout or "PIPER_FAILED")[-500:]
            raise HTTPException(500, f"SYNTHESIS_FAILED:{detail}")
        data = output_path.read_bytes()
        output_path.unlink(missing_ok=True)
        safe_name = re.sub(r"[^a-zA-Z0-9_-]", "", name)
        return Response(data, media_type="audio/wav", headers={"Content-Disposition": f'attachment; filename="{safe_name}.wav"', "Cache-Control":"no-store"})
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "SYNTHESIS_TIMEOUT")
    finally:
        try: output_path.unlink(missing_ok=True)
        except Exception: pass
