FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY voice-studio/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY voice-studio/server.py ./server.py
EXPOSE 10000
CMD ["sh","-c","uvicorn server:app --host 0.0.0.0 --port ${PORT:-10000}"]
