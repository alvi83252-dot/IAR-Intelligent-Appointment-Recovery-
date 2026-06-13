FROM python:3.12-slim

WORKDIR /app
COPY agents/frontdesk/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agents/common ./common
COPY agents/frontdesk .
COPY data ./data
ENV DATA_DIR=/app/data

EXPOSE 9002
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9002"]
