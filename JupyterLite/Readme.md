
# JupyterLite Deployment

This repository contains the necessary files to deploy JupyterLite on a Kubernetes cluster. Below is a brief description of each file and instructions on how to deploy the application.

## Files

- **jupyterlite-ingress.yaml**: Defines the Ingress resource for routing external traffic to the JupyterLite service.
- **jupyterlite-deployment.yaml**: Contains the Deployment and Service definitions for running JupyterLite.
- **jupyterlite-cert.yaml**: Configures the ClusterIssuer for obtaining TLS certificates from Let's Encrypt.
- **Dockerfile**: Provides the Dockerfile used to build the JupyterLite image. This is for reference only, as the Docker image can be pulled from DockerHub.

## Dockerfile Details

The Dockerfile is based on the `continuumio/miniconda3:latest` image and sets up a conda environment named `jupyterlite-env` with Python 3.12. It installs necessary packages including `nodejs`, `jupyterlite-core`, `jupyterlab_server`, `jupyterlite-pyodide-kernel`, `ipywidgets`, and `ipython`. The working directory is set to `/opt/jupyterlite`, and the `optmentorwidgets` package is installed via pip. The JupyterLite application is initialized and built using `jupyter lite init` and `jupyter lite build`. The application is served on port 8888.

## YAML Configuration Files

- **jupyterlite-cert.yaml**: This file configures a `ClusterIssuer` for obtaining TLS certificates from Let's Encrypt. It uses the ACME protocol and requires an email address for registration.

- **jupyterlite-deployment.yaml**: Defines a Kubernetes `Deployment` and `Service` for JupyterLite. The deployment uses the `dzifanng/jup-opm` Docker image and runs a single replica. Resource limits and requests are specified for CPU and memory. The service is of type `ClusterIP` and exposes port 8888.

- **jupyterlite-ingress.yaml**: Configures an `Ingress` resource to route external traffic to the JupyterLite service. It uses the `letsencrypt-production` cluster issuer for TLS and routes traffic from `deep.cs.cityu.edu.hk` to the service on port 8888.

## Deployment Instructions

1. **Apply the ClusterIssuer**:
    ```sh
    kubectl apply -f /path/to/jupyterlite-cert.yaml
    ```

2. **Deploy the JupyterLite application**:
    ```sh
    kubectl apply -f /path/to/jupyterlite-deployment.yaml
    ```

3. **Set up the Ingress**:
    ```sh
    kubectl apply -f /path/to/jupyterlite-ingress.yaml
    ```

4. **Verify the deployment**:
    - Ensure all pods are running:
        ```sh
        kubectl get pods
        ```
    - Check the Ingress resource:
        ```sh
        kubectl get ingress
        ```
    - Check all status:
        ```sh
        kubectl get pods,svc,ingress
        ```

## Docker Image

The Docker image for JupyterLite is available on DockerHub and can be pulled using the following command:
```sh
docker pull dzifanng/jup-opm
```

This image is used in the `jupyterlite-deployment.yaml` file and does not require building the Dockerfile locally.

## Accessing JupyterLite

Once the deployment is complete, you can access JupyterLite at `https://deep.cs.cityu.edu.hk/optmentor/jupyterlite/`. This URL is configured in the `jupyterlite-ingress.yaml` file.

