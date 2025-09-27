FROM ubuntu:22.04

#Install system dependencies
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

RUN npm install -g npm@11.2.0

ENV HOME=/root

WORKDIR /app

RUN mkdir /opt-mentor

WORKDIR /app/opt-mentor

COPY . .


ENV HUSKY=0
ENV HUSKY_SKIP_HOOKS=1
WORKDIR /app/opt-mentor/webllm-components

RUN npm install -g rollup && \
    npm install --ignore-scripts && \
    npm install --save-dev rollup@2.56.2 && \
    chmod +x cleanup-index-js.sh && \
    chmod +x node_modules/.bin/rollup && \
    export PATH="$PATH:$(npm bin)" && \
    npm run build || true


WORKDIR /app/opt-mentor/optlite-components


RUN npm install


RUN pip3 install -r optlite/requirements.txt

RUN python3 setup.py bdist_wheel -d dist



#premissions
RUN npm install -g rimraf
RUN chmod +x node_modules/.bin/webpack

RUN npm run build:prod


# Expose port
EXPOSE 8000


CMD ["python3", "-m", "http.server", "-d", "build"]

