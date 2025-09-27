FROM ubuntu:22.04

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    build-essential \
    software-properties-common \
    python3 \
    python3-pip \
    curl \
    git \
    wget && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get update && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Set environment variables using recommended format
ENV HOME=/root

# Create working directory
WORKDIR /app

RUN mkdir /optlite-components

WORKDIR /app/optlite-components

# Copy rest of the code
COPY . .

RUN npm install

RUN pip3 install -r optlite/requirements.txt


# Build Python package
RUN python3 setup.py bdist_wheel -d dist

RUN npm run build:prod


# Expose port
EXPOSE 8000

CMD ["python3", "-m", "http.server", "-d", "build"]

