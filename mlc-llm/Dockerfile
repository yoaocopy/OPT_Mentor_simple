FROM ubuntu:24.04

RUN apt-get update && apt-get install -y software-properties-common curl wget unzip git git-lfs nano
RUN add-apt-repository ppa:deadsnakes/ppa && apt-get update && apt-get install -y python3.12 python3-pip
RUN pip3 install --break-system-packages transformers peft bitsandbytes
RUN pip3 install --break-system-packages --pre -U -f https://mlc.ai/wheels mlc-llm-nightly-cu123 mlc-ai-nightly-cu123

RUN mkdir -p ~/tools && cd ~/tools && \
    wget https://github.com/emscripten-core/emsdk/archive/refs/heads/main.zip && \
    unzip main.zip && cd emsdk-main && \
    chmod +x ./emsdk_env.sh

WORKDIR /root/tools/emsdk-main

RUN ./emsdk update && \
    ./emsdk install 3.1.56 && \
    ./emsdk activate 3.1.56

ENV PATH=/root/tools/emsdk-main:/root/tools/emsdk-main/upstream/emscripten:/root/tools/emsdk-main/node/20.18.0_64bit/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ENV EMSDK=/root/tools/emsdk-main
ENV EMSDK_NODE=/root/tools/emsdk-main/node/20.18.0_64bit/bin/node
ENV EMSCRIPTEN_ROOT=/root/tools/emsdk/upstream/emscripten

RUN cd /usr/local/lib/python3.12/dist-packages/tvm/web && make
ENV TVM_SOURCE_DIR=/usr/local/lib/python3.12/dist-packages/tvm

WORKDIR /root/tools
RUN git clone https://github.com/mlc-ai/mlc-llm.git ./mlc-llm && \
    cd mlc-llm/web && chmod +x ./prep_emcc_deps.sh && ./prep_emcc_deps.sh && make

WORKDIR /root

ENV LD_LIBRARY_PATH=/usr/local/lib/python3.12/dist-packages/nvidia/cuda_nvrtc/lib/:/usr/local/lib/python3.12/dist-packages/nvidia/cuda_runtime/lib/:/usr/local/lib/python3.12/dist-packages/nvidia/cublas/lib/

RUN sed -i '/all_libs = \[\]/,+5c\    all_libs = []\n    if not with_runtime:\n        all_libs.append("\/usr\/local\/lib\/python3.12\/dist-packages\/tvm\/web\/dist\/wasm\/wasm_runtime.bc")#[find_lib_path("wasm_runtime.bc")[0]]\n\n    all_libs.append("\/usr\/local\/lib\/python3.12\/dist-packages\/tvm\/web\/dist\/wasm\/tvmjs_support.bc")#[find_lib_path("tvmjs_support.bc")[0]]\n    all_libs.append("\/usr\/local\/lib\/python3.12\/dist-packages\/tvm\/web\/dist\/wasm\/webgpu_runtime.bc")#[find_lib_path("webgpu_runtime.bc")[0]]' /usr/local/lib/python3.12/dist-packages/tvm/contrib/emcc.py
