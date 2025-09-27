
# LLM conversion to wasm format

This Dockerfile creates a Docker image based on Ubuntu 24.04, setting up an environment for building, converting and running wasm models, with a focus on web-based inference using WebAssembly. It installs tools, libraries, and dependencies to support the development and deployment of large language models (LLMs) in a web environment.

## Hardware Requirements
- **CPU**: 4+ cores (8+ recommended for better performance).
- **RAM**: 8 GB minimum (16 GB+ recommended for machine learning tasks).
- **GPU**: CUDA-compatible NVIDIA GPU (optional but recommended for accelerated machine learning).
- **Storage**: 20 GB+ free space (50 GB+ recommended for larger workloads).
- **Driver**: 
    - Latest NVIDIA driver in base machine
    - Nvidia container toolkit in base machine
    - docker-ce in base machine

Please notice that do NOT install cuda in container 

<br><br>

## Dockerfile explained
### 1. Base Image

**Commands** 
``` dockerfile
FROM ubuntu:24.04
```

The image is built on Ubuntu 24.04, the latest Long-Term Support (LTS) version of Ubuntu at the time of writing.<br><br>



### 2. Essential Tools Installation

**Commands**
``` dockerfile
RUN apt-get update && apt-get install -y software-properties-common curl wget unzip git git-lfs nano
```
    
Updates the package list and installs:
-   software-properties-common: Tools for managing software repositories.
-   curl and wget: Utilities for downloading files from the web.
-   unzip: For extracting ZIP archives.
-   git and git-lfs: Version control system and large file storage extension.
-   nano: A lightweight text editor.<br><br>

### 3. Python Installation

**Commands**
``` dockerfile
RUN add-apt-repository ppa:deadsnakes/ppa && apt-get update && apt-get install -y python3.12 python3-pip
```

Adds the deadsnakes PPA to access newer Python versions, updates the package list, and installs Python 3.12 along with pip (Python package manager).<br><br>

### 4. Machine Learning Python Libraries

**Commands**
```dockerfile
RUN pip3 install --break-system-packages transformers peft bitsandbytes  RUN pip3 install --break-system-packages --pre -U -f https://mlc.ai/wheels mlc-llm-nightly-cu123 mlc-ai-nightly-cu123
```
    
-   Installs transformers, peft, and bitsandbytes—libraries for working with transformer-based machine learning models.
-   Installs nightly builds of mlc-llm-nightly-cu123 and mlc-ai-nightly-cu123 from a custom wheel source (https://mlc.ai/wheels), with CUDA support. The --pre flag allows pre-release versions, and -U upgrades existing packages. The --break-system-packages flag permits overriding system-managed packages.<br><br>

### 5. Emscripten SDK Setup

**Commands**
```dockerfile
RUN mkdir -p ~/tools && cd ~/tools && \ wget https://github.com/emscripten-core/emsdk/archive/refs/heads/main.zip && \ unzip main.zip && cd emsdk-main && \ chmod +x ./emsdk_env.sh 

WORKDIR /root/tools/emsdk-main  

RUN ./emsdk update && \ ./emsdk install 3.1.56 && \ ./emsdk activate 3.1.56
```
    
-   Creates a ~/tools directory, downloads the Emscripten SDK (a toolchain for compiling C/C++ to WebAssembly) from GitHub, and extracts it.
-   Makes the emsdk_env.sh script executable.
-   Sets the working directory to the Emscripten SDK folder.
-   Updates the SDK, installs version 3.1.56, and activates it.<br><br>

### 6. Environment Variables for Emscripten

**Commands**
```dockerfile 
ENV PATH = /root/tools/emsdk-main:/root/tools/emsdk-main/upstream/emscripten:/root/tools/emsdk-main/node/20.18.0_64bit/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

ENV EMSDK = /root/tools/emsdk-main 

ENV EMSDK_NODE = /root/tools/emsdk-main/node/20.18.0_64bit/bin/node 

ENV EMSCRIPTEN_ROOT=/root/tools/emsdk/upstream/emscripten
```
    
Sets environment variables to include Emscripten binaries and Node.js (version 20.18.0) in the system PATH, and defines locations for the Emscripten SDK and its components.<br><br>

### 7. TVM Web Runtime Build

**Commands**
```dockerfile
RUN  cd /usr/local/lib/python3.12/dist-packages/tvm/web && make  

ENV TVM_SOURCE_DIR=/usr/local/lib/python3.12/dist-packages/tvm
```

-   Builds the web runtime for TVM (Tensor Virtual Machine), a deep learning compiler framework, by running make in the TVM web directory.
-   Sets the TVM_SOURCE_DIR environment variable to the TVM installation path.<br><br>

### 8. mlc-llm Repository Setup

**Commands**
    

```dockerfile
WORKDIR /root/tools  

RUN git clone https://github.com/mlc-ai/mlc-llm.git ./mlc-llm && \ cd mlc-llm/web && chmod +x ./prep_emcc_deps.sh && ./prep_emcc_deps.sh && make
```
-   Clones the mlc-llm repository (a framework for deploying large language models) into /root/tools/mlc-llm.
-   Changes to the web directory, makes the prep_emcc_deps.sh script executable, runs it to prepare Emscripten dependencies, and builds the web components with make.<br><br>

### 9. Link NVIDIA libraries at runtime

**Commands**
```dockerfile
ENV LD_LIBRARY_PATH=/usr/local/lib/python3.12/dist-packages/nvidia/cuda_nvrtc/lib/:/usr/local/lib/python3.12/dist-packages/nvidia/cuda_runtime/lib/:/usr/local/lib/python3.12/dist-packages/nvidia/cublas/lib/
```

The LD_LIBRARY_PATH environment variable specifies directories for the dynamic linker to search for libraries before default system paths. 

Setting this variable ensures the application locates NVIDIA CUDA libraries necessary for execution, especially in environments where default paths lack these libraries, such as custom Docker images or isolated setups. 

The paths in LD_LIBRARY_PATH should point to directories containing specific library versions required by the application, ensuring compatibility and preventing runtime errors related to missing or incompatible libraries.

Paths Included:
- /usr/local/lib/python3.12/dist-packages/nvidia/cuda_nvrtc/lib/
    - This path likely contains the NVIDIA Runtime Compilation (NVRTC) libraries.

- /usr/local/lib/python3.12/dist-packages/nvidia/cuda_runtime/lib/
    - This path is for the CUDA runtime libraries.

- /usr/local/lib/python3.12/dist-packages/nvidia/cublas/lib/
    - This path includes the cuBLAS libraries, which are used for GPU-accelerated linear algebra operations.

### 10. TVM Emscripten Configuration Modification

**Commands**
```dockerfile    
RUN sed -i '/all_libs = \[\]/,+5c\ all_libs = []\n if not with_runtime:\n all_libs.append("\/usr\/local\/lib\/python3.12\/dist-packages\/tvm\/web\/dist\/wasm\/wasm_runtime.bc")#[find_lib_path("wasm_runtime.bc")[0]]\n\n all_libs.append("\/usr\/local\/lib\/python3.12\/dist-packages\/tvm\/web\/dist\/wasm\/tvmjs_support.bc")#[find_lib_path("tvmjs_support.bc")[0]]\n all_libs.append("\/usr\/local\/lib\/python3.12\/dist-packages\/tvm\/web\/dist\/wasm\/webgpu_runtime.bc")#[find_lib_path("webgpu_runtime.bc")[0]]' /usr/local/lib/python3.12/dist-packages/tvm/contrib/emcc.py
```
    
Uses sed to modify the emcc.py file in TVM's contrib directory. It replaces a section of code to directly specify paths to WebAssembly bitcode files (wasm_runtime.bc, tvmjs_support.bc, webgpu_runtime.bc) instead of relying on a dynamic find_lib_path function, ensuring these libraries are correctly linked during compilation.

<br><br>

## Model conversion
The model conversion have following steps:
1. Convert Model Weights with Quantization
2. Generate MLC Chat Config
3. Compile Model Libraries
4. Package Libraries and Weights
5. Define New Model Architectures
6. Configure 

If you are using peft model, you need to merge the peft model with original model first.

Environment check:
Verify mlc-llm:
```bash
$ mlc_llm --help

# you should got message like this
usage: MLC LLM Command Line Interface. [-h] {compile,convert_weight,gen_config,chat,serve,package,calibrate,router}

positional arguments:
  {compile,convert_weight,gen_config,chat,serve,package,calibrate,router}
                        Subcommand to to run. (choices: compile, convert_weight, gen_config, chat, serve, package, calibrate, router)

options:
  -h, --help            show this help message and exit
```

Verify TVM:
```bash
$ python3 -c "import tvm; print(tvm.__file__)"

# you should got message like this
/some-path/lib/python3.11/site-packages/tvm/__init__.py
```
<br>

### 1. Convert Model Weights
You can use following shell command to convert model weight

```bash
mlc_llm convert_weight /path/to/model/folder --quantization [Quantization] -o /path/to/output/folder
```

Currently, available quantization options are: q0f16, q0f32, q3f16_1, q4f16_1, q4f32_1, and q4f16_awq (not stable).
<br>

### 2. Generate MLC Chat Config
You can use following shell command to generate MLC Chat Config

```bash
mlc_llm gen_config /path/to/model/folder --quantization [Quantization] --conv-template [model template] -o /path/to/output/folder
```

Currently, available quantization options are: q0f16, q0f32, q3f16_1, q4f16_1, q4f32_1, and q4f16_awq (not stable).
<br>


### 3. Compile Model Libraries
You can use following shell command to compile model libraries

```bash
mlc_llm compile /path/to/model/folder -o /path/to/output/folder
```
<br>

### 4. Test model
You can use following shell command to test converted model

```bash
mlc_llm chat /path/to/output/folder
```