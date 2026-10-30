# NewSportV Voice API

Piper TTS service for the FREEzzz Base portal's Voice Studio block.

## Deploy
Create a Render Web Service from this repository:
- Runtime: Docker
- Dockerfile: `voice-studio/Dockerfile`
- Docker context: repository root
- Region: Frankfurt
- Health check: `/health`

The service downloads individual Piper ONNX voice files on first use into `VOICE_DIR` (default: ephemeral `/tmp/piper-voices`). Add a persistent disk and set `VOICE_DIR=/var/data/voices` if a paid persistent disk is later approved. The first synthesis for each voice can take longer while the model downloads.

## API
- `GET /health`
- `POST /api/synthesize` JSON: `{ "text": "...", "language": "ru|en|de", "gender": "male|female", "speed": 0.8..1.2 }`
- Response: WAV audio.

## Voice licensing
Piper engine and each model have separate licenses. Check the exact voice's Hugging Face model card before commercial use. The German female voice Eva K is an x_low model tier.

## Limits
20,000 characters per request. The service is stateless; audio is returned directly and not retained.
