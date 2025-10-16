# OPM (Offline Python Mentor)

OPM is a serverless implementation of Online Python Tutor Lite (OPTLite) designed for offline use and enhanced educational environments. This project builds upon the [optlite](https://github.com/dive4dec/optlite) concept while making it more accessible and secure for educational settings. Integrated with [WEBLLM](https://github.com/mlc-ai/web-llm) for advanced language model capabilities.

📌 Visit [https://dive4dec.github.io/OPT_Mentor/](https://dive4dec.github.io/OPT_Mentor/) to have a try!


## Features

- **Serverless Operation**: Runs entirely in the browser using [Pyodide](https://pyodide.org)
- **Offline Capability**: Can be used without internet connection
- **Enhanced Security**: No server-side code execution, reducing security risks
- **Educational Focus**: Perfect for classroom settings and online exams
- **Safe Exam Browser Compatible**: Works with [Safe Exam Browser](https://safeexambrowser.org/) 
  > ⚠️ The AI model does not work with Safe Exam Browser at present.
- **Interactive Visualization**: Visual representation of Python program execution
- **Live Editing Mode**: Real-time code editing and visualization
- **Socratic AI hints**: Provide Socratic style hints instead of answers with the fine-tuned LLM model.

## 💡 Tutorial 💡
<details open>
<summary>💡(Click to expand/collapse)</summary>

➡️ Starting page:

![OPTMentor main page](./screenshots/OPTMentor_main_page.jpg)
Enter your code, 
- the `Visulize` button will navigate to the page for visulizing  the excution;
- the `Live Edit` button will navigate to the page with fine-tuned LLM mode that providing Socratic hints; and
- the "Permalink" button will generate the link for sharing.

➡️ Visulization mode:
![OPTMentor visualization of excution](./screenshots/OPTMentor_visualize_display.jpg)
Here you can
- see the visulization of the variables, etc., on the right-hand side area;
- check the excution step-by-step either by draging the progress bar or by clicking the `<< First`, `<Prev`, ... buttons.
- Click "Edit this code" will navigate you back to the page for code editing, where you can also choose to go to the live editing mode. 

➡️ Live editing mode with LLM integrated:
![OPTMentor live edit page 1](./screenshots/OPTMentor_live_edit_1.jpg)
For the first time you visit the live editing page:
- The LLM model will be downloaded and loaded automaticly, and the progress will also be shown. You can also click `Pull Model` button to retry when needed.
- The model downloaded will be cached in the browser. `Reset Local State` button allows you to clean the cache and refresh the page as if you visit this page for the first time. 

![OPTMentor live edit page 2](./screenshots/OPTMentor_live_edit_2.jpg)
- When you see the message like "Finish loading on WebGPU ...", it means the  LLM model has been loaded succesfully.
- When your code generates errors, the `Ask AI` button will show up, and clicking on it, you will get the socratic hints from the AI.
- You can go back to the page focusing on visulization of the excution with the `Visulize` below the code box.

</details>


## Installation (Github Action)
The pages are automaticly compiled with github action, and pushed to the [`gh-pages`](https://github.com/dive4dec/OPT_Mentor/tree/gh-pages) branch. Those compiled files will work with a web server.

## Installation (for local host)
1. Ensure you have Docker installed on your system
2. Run the command in cmd or terminal
   ```docker-compose up -d --build```
3. The script will:
   - Build the Docker image of optlite-webllm and AI-model
   - RUN the docker container

## Project Structure

```
OPM_Mentor
├── AI-Model                 # AI model component
├── JupyterLite              # The JupyterLite component
└── optlite-webllm           # the integraded optlite and webllm
```

## Usage
Run the container with:
```bash
docker-compose up -d --build
```

Access at http://localhost:8000

for stop the service
```bash
docker-compose down
```

## Development
The project consists of several key components:
- **OPT Lite**: The core visualization engine
- **JupyterLite Integration**: For notebook-based interactions
- **WebLLM Integration**: For serverless AI assistant
- **Pyodide Runtime**: For in-browser Python execution
- **[optmwidgets](https://github.com/chiwangso2/optmwidgets)**: A widget built on top of [divewidgets](https://github.com/dive4dec/divewidgets) that provide programming ai assistant using webllm and langchain.

## Requirements
- Docker

## Acknowledgments

- Based on [optlite](https://github.com/dive4dec/optlite)
- Uses [Pyodide](https://pyodide.org) for in-browser Python execution
- Integrates with [JupyterLite](https://jupyterlite.readthedocs.io/) for notebook functionality 
