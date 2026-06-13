FROM python:3.12-slim

WORKDIR /app
COPY agents/personal/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agents/common ./common
COPY agents/personal .

EXPOSE 9001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9001"]
