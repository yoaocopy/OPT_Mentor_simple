import * as webllm from "../../webllm-components";
import { OptFrontend } from './opt-frontend';

/*************** API Configuration ***************/
const API_CONFIG = {
    enabled: false, // Whether to use API mode instead of local WebLLM
    baseUrl: "https://ollama.optmentor.webllm.art/v1", // API server base URL
    apiKey: "", // API key for authentication
    model: "sft_model_1.5B_f16" // Model name for API calls
};

// Keep a copy of defaults for reset
const DEFAULT_API_CONFIG = { ...API_CONFIG };

/*************** WebLLM logic ***************/
const messages = [
    {
        content: "You are a Python tutor. Respond ONLY with Socratic-style hints: short, guiding QUESTIONS (no solutions, no code, no imperative fixes). At most 100 words.",
        role: "system",
    },
];

const availableModels = webllm.prebuiltAppConfig.model_list.map(
    (m) => m.model_id,
);
let selectedModel = "sft_model_1.5B-q4f16_1-MLC (Hugging Face)";

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

/*************** API Calling Functions ***************/
async function callOpenAIAPI(messages, onUpdate, onFinish, onError) {
    try {
        // Use AbortController to allow inactivity timeout
        const abortController = new AbortController();
        const INACTIVITY_TIMEOUT_MS = 20000; // Auto-stop if no delta within this window
        let inactivityTimer: number | null = null;
        const resetInactivity = () => {
            if (inactivityTimer !== null) {
                clearTimeout(inactivityTimer as unknown as number);
            }
            inactivityTimer = setTimeout(() => {
                console.warn("[API] Inactivity timeout reached, aborting stream");
                abortController.abort();
            }, INACTIVITY_TIMEOUT_MS) as unknown as number;
        };

        const response = await fetch(`${API_CONFIG.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Prefer SSE, but allow JSON fallback
                'Accept': 'text/event-stream, application/json',
                ...(API_CONFIG.apiKey && { 'Authorization': `Bearer ${API_CONFIG.apiKey}` })
            },
            body: JSON.stringify({
                model: API_CONFIG.model,
                messages: messages,
                stream: true,
                temperature: 1.0,
                top_p: 1,
                // Constrain generation to avoid endless outputs
                max_tokens: 512,
                // Qwen2 stop strings (aligned with qwen2/chatml template)
                stop: ["<|endoftext|>", "<|im_end|>"]
            }),
            signal: abortController.signal
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        // Log basic response meta for debugging
        console.log("[API] Response content-type:", contentType);
        // If server supports SSE streaming (OpenAI-compatible), handle stream
        if (contentType.includes('text/event-stream')) {
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullResponse = '';
            resetInactivity();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                resetInactivity();

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the last incomplete line

                for (const rawLine of lines) {
                    const line = rawLine.trim();
                    // Skip keepalive comments like ": ping"
                    if (!line || line.startsWith(':')) continue;
                    if (!line.startsWith('data:')) continue;

                    const data = line.slice(5).trim();
                    if (data === '[DONE]') {
                        onFinish(fullResponse, null);
                        return;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        // Support both OpenAI and Ollama stream chunk shapes
                        const choice = parsed.choices?.[0];
                        const deltaOpenAI = choice?.delta?.content as string | undefined;
                        const deltaOllama = (parsed.message?.content as string | undefined) ?? (parsed.response as string | undefined);
                        const hasDone = parsed.done === true || choice?.finish_reason;

                        const delta = deltaOpenAI ?? deltaOllama;
                        if (delta) {
                            fullResponse += delta;
                            onUpdate(fullResponse);
                            // Log incremental delta to console
                            console.debug("[API] Stream delta:", delta);
                            resetInactivity();
                        }
                        if (hasDone) {
                            console.log("[API] Stream finished with reason:", choice?.finish_reason ?? 'done flag');
                            onFinish(fullResponse, null);
                            return;
                        }
                    } catch {
                        // Ignore non-JSON heartbeats or partial lines
                    }
                }
            }
            // Stream ended gracefully without explicit [DONE]
            console.log("[API] Stream ended. Final response:", fullResponse);
            onFinish(fullResponse, null);
        } else {
            // Fallback: non-streaming JSON response
            const data = await response.json();
            // Support OpenAI and Ollama non-streaming shapes
            const content =
                data.choices?.[0]?.message?.content ??
                data.choices?.[0]?.text ??
                data.message?.content ??
                data.response ?? '';
            console.log("[API] JSON response:", data);
            onUpdate(content);
            onFinish(content, null);
            return;
        }
    } catch (err) {
        onError(err);
    }
}

async function streamingGenerating(messages, onUpdate, onFinish, onError) {
    if (API_CONFIG.enabled) {
        return callOpenAIAPI(messages, onUpdate, onFinish, onError);
    }
    
    // Original WebLLM logic
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
            // Log incremental delta for local WebLLM
            if (curDelta) {
                console.debug("[Local] Stream delta:", curDelta);
            }
        }
        const finalMessage = await engine.getMessage();
        console.log("[Local] Final response:", finalMessage);
        if (usage) {
            console.log("[Local] Usage:", usage);
        }
        onFinish(finalMessage, usage);
    } catch (err) {
        onError(err);
    }
}

/*************** UI logic ***************/
function onMessageSend(input) {
    // Reset the messages array, keeping only the system message
    messages.length = 1; 
    
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

    // Print the current messages array to the console for debugging purposes
    console.log("Messages:", messages);

    const onFinishGenerating = (finalMessage, usage) => {
        document.getElementById("message-out").innerText = "AI Response:\n" + finalMessage.replace(/\?/g, '?\n');
        
        // Show usage stats only if available (local mode)
        if (usage && usage.prompt_tokens) {
            const usageText =
            `prompt_tokens: ${usage.prompt_tokens}, ` +
            `completion_tokens: ${usage.completion_tokens}, ` +
            `prefill: ${usage.extra.prefill_tokens_per_s.toFixed(4)} tokens/sec, ` +
            `decoding: ${usage.extra.decode_tokens_per_s.toFixed(4)} tokens/sec`;
            document.getElementById("chat-stats").classList.remove("hidden");
            document.getElementById("chat-stats").textContent = usageText;
        } else {
            // Hide usage stats for API mode
            document.getElementById("chat-stats").classList.add("hidden");
        }
        //document.getElementById("send").disabled = false;
    };

    streamingGenerating(
        messages,
        (msg) => {
            document.getElementById("message-out").innerText = "AI Response:\n" + msg.replace(/\?/g, '?\n');
        },
        onFinishGenerating,
        (err) => {
            document.getElementById("message-out").innerText = "Error: " + err;
            console.error(err);
        }

    );
}

// Option 1: If getCode is exported from opt-frontend.ts



document.getElementById("askAI").addEventListener("click", function () {
    //const frontend = new OptFrontend();

    var question = "## Code ```python  "+extractText()+"  ```  ## Error  ```text  " + document.getElementById("frontendErrorOutput").textContent?.replace("(UNSUPPORTED FEATURES)", "") +
    "  ```  ## Task  Ask guiding questions that help me discover the mistake.";

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

/*************** Mode Switching Functions ***************/
function toggleAPIMode() {
    API_CONFIG.enabled = !API_CONFIG.enabled;
    updateModeDisplay();
    updateUIElements();
    persistAPIConfig(); // Save the mode preference immediately
}

function updateModeDisplay() {
    const statusElement = document.getElementById("mode-status");
    if (statusElement) {
        statusElement.textContent = `Current Mode: ${API_CONFIG.enabled ? "API Mode" : "Local Mode"}`;
        statusElement.className = API_CONFIG.enabled ? "mode-status api-mode" : "mode-status local-mode";
    }
    
    const toggleBtn = document.getElementById("toggle-api");
    if (toggleBtn) {
        toggleBtn.textContent = API_CONFIG.enabled ? "Switch to Local Mode" : "Switch to API Mode";
    }
}

function updateUIElements() {
    const localElements = document.querySelectorAll(".local-only");
    const apiElements = document.querySelectorAll(".api-only");
    
    localElements.forEach(el => (el as HTMLElement).style.display = API_CONFIG.enabled ? "none" : "block");
    apiElements.forEach(el => (el as HTMLElement).style.display = API_CONFIG.enabled ? "block" : "none");
    
    // Enable/disable Ask AI button based on mode
    const askAIButton = document.getElementById("askAI") as HTMLButtonElement;
    if (askAIButton) {
        if (API_CONFIG.enabled) {
            // In API mode, enable Ask AI button immediately
            askAIButton.disabled = false;
        } else {
            // In local mode, keep the original behavior (disabled until model is downloaded)
            askAIButton.disabled = true;
        }
    }
}

/*************** Configuration Management ***************/
// Persist current runtime settings to localStorage (called on each change)
function persistAPIConfig() {
    const configToSave = {
        enabled: API_CONFIG.enabled,
        baseUrl: API_CONFIG.baseUrl,
        apiKey: API_CONFIG.apiKey,
        model: API_CONFIG.model
    };
    localStorage.setItem('api_config', JSON.stringify(configToSave));
}

function loadAPIConfig() {
    const saved = localStorage.getItem('api_config');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            API_CONFIG.enabled = (config.enabled ?? API_CONFIG.enabled);
            API_CONFIG.baseUrl = (config.baseUrl ?? API_CONFIG.baseUrl);
            API_CONFIG.apiKey = (config.apiKey ?? API_CONFIG.apiKey);
            API_CONFIG.model = (config.model ?? API_CONFIG.model);
            
            console.log("API configuration loaded:", config);
        } catch (e) {
            console.error("Failed to load API configuration:", e);
        }
    }

    // Always reflect current runtime values into inputs on first load
    const urlInput = document.getElementById("api-url") as HTMLInputElement | null;
    const keyInput = document.getElementById("api-key") as HTMLInputElement | null;
    const modelInput = document.getElementById("api-model") as HTMLInputElement | null;
    if (urlInput) urlInput.value = API_CONFIG.baseUrl;
    if (keyInput) keyInput.value = API_CONFIG.apiKey;
    if (modelInput) modelInput.value = API_CONFIG.model;
}

// Bind input fields so changes take effect immediately
function bindAPIInputsImmediate() {
    const urlInput = document.getElementById("api-url") as HTMLInputElement | null;
    const keyInput = document.getElementById("api-key") as HTMLInputElement | null;
    const modelInput = document.getElementById("api-model") as HTMLInputElement | null;
    if (urlInput) {
        urlInput.addEventListener('input', () => {
            API_CONFIG.baseUrl = urlInput.value.trim();
            persistAPIConfig();
        });
    }
    if (keyInput) {
        keyInput.addEventListener('input', () => {
            API_CONFIG.apiKey = keyInput.value; // allow empty to clear
            persistAPIConfig();
        });
    }
    if (modelInput) {
        modelInput.addEventListener('input', () => {
            API_CONFIG.model = modelInput.value.trim();
            persistAPIConfig();
        });
    }
}

// Reset API settings back to defaults
function resetAPIConfigToDefaults() {
    API_CONFIG.baseUrl = DEFAULT_API_CONFIG.baseUrl;
    API_CONFIG.apiKey = DEFAULT_API_CONFIG.apiKey;
    API_CONFIG.model = DEFAULT_API_CONFIG.model;
    // reflect to inputs
    const urlInput = document.getElementById("api-url") as HTMLInputElement | null;
    const keyInput = document.getElementById("api-key") as HTMLInputElement | null;
    const modelInput = document.getElementById("api-model") as HTMLInputElement | null;
    if (urlInput) urlInput.value = API_CONFIG.baseUrl;
    if (keyInput) keyInput.value = API_CONFIG.apiKey;
    if (modelInput) modelInput.value = API_CONFIG.model;
    persistAPIConfig();
}

/*************** Event Listeners ***************/
document.addEventListener('DOMContentLoaded', function() {
    // Initialize error observer
    initializeErrorObserver();
    
    // Load API configuration
    loadAPIConfig();
    // Bind inputs for immediate effect
    bindAPIInputsImmediate();
    
    // If user switches to API mode for the first time in this browser session,
    // use the in-code defaults immediately (so displayed values match actual usage)
    const toggleBtn = document.getElementById("toggle-api");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            // After toggle, API_CONFIG.enabled state will flip in toggleAPIMode
            // We just ensure inputs reflect current runtime values before first save
            const urlInput = document.getElementById("api-url") as HTMLInputElement | null;
            const keyInput = document.getElementById("api-key") as HTMLInputElement | null;
            const modelInput = document.getElementById("api-model") as HTMLInputElement | null;
            if (urlInput && !urlInput.value) urlInput.value = API_CONFIG.baseUrl;
            if (keyInput && !keyInput.value) keyInput.value = API_CONFIG.apiKey;
            if (modelInput && !modelInput.value) modelInput.value = API_CONFIG.model;
        });
    }

    // Update UI based on loaded configuration
    updateModeDisplay();
    updateUIElements();
    
    // Bind API configuration reset button
    const resetBtn = document.getElementById("reset-api-config");
    if (resetBtn) {
        resetBtn.addEventListener("click", resetAPIConfigToDefaults);
    }
    
    // Bind mode toggle button (actual toggle)
    const toggleBtn2 = document.getElementById("toggle-api");
    if (toggleBtn2) {
        toggleBtn2.addEventListener("click", toggleAPIMode);
    }
});

