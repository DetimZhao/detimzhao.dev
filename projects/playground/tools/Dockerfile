FROM python:3.11-slim

RUN pip install uv --no-cache-dir

WORKDIR /app

COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

COPY generate_corpus.py .

ENTRYPOINT ["python", "generate_corpus.py"]
