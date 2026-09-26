FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# .dockerignore keeps .env (and every other secret) out of the image;
# configuration comes from the container's environment at runtime.
COPY . .

# Run as an unprivileged user, not root.
RUN useradd --system --no-create-home app && chown -R app /app
USER app

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
