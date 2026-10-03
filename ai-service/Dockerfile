FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/tmp/huggingface

# System libraries required by OpenCV
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libgl1 \
        libxcb1 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# CPU-only PyTorch first. The default (CUDA) wheel segfaults in a GPU-less container when torch
# lazily imports triton during inference, and it adds several GB of unused NVIDIA libraries.
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --retries 10 torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir --retries 10 -r requirements.txt

COPY app ./app

RUN useradd --create-home --shell /bin/bash appuser && \
    mkdir -p /tmp/huggingface && \
    chown -R appuser:appuser /app /tmp/huggingface

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]