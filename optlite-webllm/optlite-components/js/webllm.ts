import * as webllm from "../../webllm-components";
import { OptFrontend } from './opt-frontend';



/*************** WebLLM logic ***************/
const messages = [
    {
        content: "You are a helpful AI agent helping users.",
        role: "system",
    },
];

const availableModels = webllm.prebuiltAppConfig.model_list.map(
    (m) => m.model_id,
);
let selectedModel = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

// Callback function for initializing progress
function updateEngineInitProgressCallback(report) {
    console.log("initialize", report.progress);
    document.getElementById("download-status").textContent = report.text;
}

// Create engine instance
const engine = new webllm.MLCEngine();
engine.setInitProgressCallback(updateEngineInitProgressCallback);

async function initializeWebLLMEngine() {
    document.getElementById("chat-stats").classList.add("hidden");
    document.getElementById("download-status").classList.remove("hidden");
    var modelSelect = document.getElementById("model-selection") as HTMLInputElement;
    selectedModel = modelSelect.value;
    const config = {
        temperature: 1.0,
        top_p: 1,
    };
    await engine.reload(selectedModel, config);
}

async function streamingGenerating(messages, onUpdate, onFinish, onError) {
    try {
        let curMessage = "";
        let usage;
        const completion = await engine.chat.completions.create({
            stream: true,
            messages,
            stream_options: { include_usage: true },
        });
        for await (const chunk of completion) {
            const curDelta = chunk.choices[0]?.delta.content;
            if (curDelta) {
                curMessage += curDelta;
            }
            if (chunk.usage) {
                usage = chunk.usage;
            }
            onUpdate(curMessage);
        }
        const finalMessage = await engine.getMessage();
        onFinish(finalMessage, usage);
    } catch (err) {
        onError(err);
    }
}

/*************** UI logic ***************/
function onMessageSend(input) {
    const message = {
        content: input,
        role: "user",
    };
    if (input.length === 0) {
        return;
    }
    //document.getElementById("send").disabled = true;
    document.getElementById("message-out").classList.remove("hidden");
    document.getElementById("message-out").textContent = "AI is thinking...";

    messages.push(message);

    const onFinishGenerating = (finalMessage, usage) => {
        document.getElementById("message-out").textContent = "AI Response:\n" + finalMessage;
        const usageText =
        `prompt_tokens: ${usage.prompt_tokens}, ` +
        `completion_tokens: ${usage.completion_tokens}, ` +
        `prefill: ${usage.extra.prefill_tokens_per_s.toFixed(4)} tokens/sec, ` +
        `decoding: ${usage.extra.decode_tokens_per_s.toFixed(4)} tokens/sec`;
        document.getElementById("chat-stats").classList.remove("hidden");
        document.getElementById("chat-stats").textContent = usageText;
        //document.getElementById("send").disabled = false;
    };

    streamingGenerating(
        messages,
        (msg) => {
            document.getElementById("message-out").textContent = "AI Response:\n" + msg;
        },
        onFinishGenerating,
        (err) => {
            document.getElementById("message-out").textContent = "Error: " + err;
            console.error(err);
        }

    );
}

// Option 1: If getCode is exported from opt-frontend.ts



document.getElementById("askAI").addEventListener("click", function () {
    //const frontend = new OptFrontend();

    var question = "I'm writing Python, and here's my code: "+extractText()+" and I received this error: " + document.getElementById("frontendErrorOutput").textContent?.replace("(UNSUPPORTED FEATURES)", "") +
    "Can you please provide a brief explanation of the cause of this error? I only need the reason., No code solution needed.";

    document.getElementById("chat-stats").classList.add("hidden");
    onMessageSend(question);
});

/*************** UI binding ***************/
availableModels.forEach((modelId) => {
    const option = document.createElement("option");
    option.value = modelId;
    option.textContent = modelId;
    document.getElementById("model-selection").appendChild(option);
});
(document.getElementById("model-selection") as HTMLSelectElement).value = selectedModel;
document.getElementById("download").addEventListener("click", function () {
    initializeWebLLMEngine().then(() => {
        (document.getElementById("askAI") as HTMLButtonElement).disabled = false;
    });
});

$("#send").click(() => {
    var inputElement = document.getElementById("user-input") as HTMLInputElement;
    onMessageSend(inputElement.value);
});

function extractText() {
    const container = document.querySelector('.ace_layer.ace_text-layer');
    const lines = container.querySelectorAll('.ace_line');
    let extractedText = '';
    lines.forEach(line => {
        extractedText += line.textContent + '\n';
    });

    return extractedText;
}

// the ask AI button hide and display
function initializeErrorObserver() {
    const frontendErrorOutput = document.getElementById('frontendErrorOutput');
    const askAIButton = document.getElementById('askAI');
    const chatStats = document.getElementById('chat-stats');
    const messageOut = document.getElementById('message-out');

    if (!frontendErrorOutput || !askAIButton) {
        console.error('Required elements not found');
        return;
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach(() => {
            const hasError = frontendErrorOutput.textContent?.trim() !== '';
            askAIButton.style.display = hasError ? 'block' : 'none';
            
            if (!hasError) {
                // Clear and hide message-out and chat-stats when error is cleared
                if (chatStats) {
                    chatStats.classList.add('hidden');
                    chatStats.textContent = '';
                }
                if (messageOut) {
                    messageOut.classList.add('hidden');
                    messageOut.textContent = '';
                }
            }
        });
    });

    observer.observe(frontendErrorOutput, {
        childList: true,
        characterData: true,
        subtree: true
    });

    // Initial check
    askAIButton.style.display = 
        frontendErrorOutput.textContent?.trim() !== '' ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', initializeErrorObserver);

