FROM continuumio/miniconda3:latest

RUN apt-get update && \
    apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN conda create -n jupyterlite-env python=3.12 -y && \
    conda run -n jupyterlite-env conda install -c conda-forge -y \
    nodejs \
    jupyterlite-core \
    jupyterlab_server \
    jupyterlite-pyodide-kernel \
    ipywidgets>=7.0.0 \
    ipython>=7.0.0

ENV PATH /opt/conda/envs/jupyterlite-env/bin:$PATH

SHELL ["conda", "run", "-n", "jupyterlite-env", "/bin/bash", "-c"]

WORKDIR /opt/jupyterlite

RUN pip install optmentorwidgets

RUN jupyter lite init && \
    jupyter lite build

EXPOSE 8888

CMD ["/bin/bash", "-c", "source /opt/conda/etc/profile.d/conda.sh && conda activate jupyterlite-env && jupyter lite serve --port 8888"]
