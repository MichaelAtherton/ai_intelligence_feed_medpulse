# Use official Crawl4AI Docker image as base
FROM unclecode/crawl4ai:latest

# Set working directory
WORKDIR /app

# Copy requirements and application files
COPY requirements.txt .
COPY main.py .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port (Railway will override with $PORT)
EXPOSE 8000

# Start the FastAPI application
# Use $PORT environment variable from Railway
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
