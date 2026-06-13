FROM python:3.12-slim

WORKDIR /app
COPY agents/research/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agents/common ./common
COPY agents/research .
COPY kb ./kb
ENV KB_DIR=/app/kb

EXPOSE 9003
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9003"]
