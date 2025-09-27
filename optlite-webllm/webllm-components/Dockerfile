FROM ubuntu:22.04

# Install.
RUN \
  sed -i 's/# \(.*multiverse$\)/\1/g' /etc/apt/sources.list && \
  apt-get update && \
  apt-get -y upgrade && \
  apt-get install -y build-essential && \
  apt-get install -y software-properties-common && \
  apt-get install -y byobu curl git htop man unzip vim wget && \
  rm -rf /var/lib/apt/lists/*

# Install Node.js v22.11.0
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get update && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Set environment variables.
ENV HOME=/root

# Define working directory.
WORKDIR /root

RUN mkdir /webllm-components
# Add files.

WORKDIR /root/webllm-components

COPY . .

# Define default command.
RUN npm install || true && \
    npm run build || true

WORKDIR /root/webllm-components/website

# Define default command.
RUN npm install || true

EXPOSE 8000

CMD npm start







