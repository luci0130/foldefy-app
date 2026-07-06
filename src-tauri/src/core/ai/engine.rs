//! Embedded llama.cpp inference engine.
//!
//! Contexts are not Send, so a dedicated worker thread owns the loaded
//! model and serves requests over a channel. One model is loaded at a
//! time; requesting a different model path replaces the worker.

use crate::error::FoldefyError;
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaModel};
use llama_cpp_2::sampling::LlamaSampler;
use std::num::NonZeroU32;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

/// Context/batch size ladder: tried in order until one fits in memory
/// (large compute buffers make context creation fail on low-VRAM GPUs).
const CTX_LADDER: [(u32, u32); 3] = [(8192, 2048), (4096, 1024), (2048, 512)];
const REQUEST_TIMEOUT: Duration = Duration::from_secs(600);

/// Generic JSON grammar (GBNF): the model physically cannot emit anything
/// but a valid JSON object — the reliability lever for small local models.
const JSON_GRAMMAR: &str = r#"
root ::= object
value ::= object | array | string | number | ("true" | "false" | "null") ws
object ::= "{" ws ( string ":" ws value ("," ws string ":" ws value)* )? "}" ws
array ::= "[" ws ( value ("," ws value)* )? "]" ws
string ::= "\"" ( [^"\\\x7F\x00-\x1F] | "\\" (["\\bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]) )* "\"" ws
number ::= ("-"? ([0-9] | [1-9] [0-9]*)) ("." [0-9]+)? ([eE] [-+]? [0-9]+)? ws
ws ::= [ \t\n]*
"#;

struct Job {
    system: String,
    prompt: String,
    max_tokens: u32,
    reply: mpsc::Sender<Result<String, String>>,
}

struct EngineHandle {
    model_path: PathBuf,
    tx: mpsc::Sender<Job>,
}

fn handle() -> &'static Mutex<Option<EngineHandle>> {
    static HANDLE: OnceLock<Mutex<Option<EngineHandle>>> = OnceLock::new();
    HANDLE.get_or_init(|| Mutex::new(None))
}

/// Run a JSON-constrained completion on the local model (blocking).
pub fn complete(
    model_path: &Path,
    system: &str,
    prompt: &str,
    max_tokens: u32,
) -> Result<String, FoldefyError> {
    let tx = {
        let mut guard = handle().lock().unwrap();
        let needs_spawn = match guard.as_ref() {
            Some(h) => h.model_path != model_path,
            None => true,
        };
        if needs_spawn {
            // Dropping the old sender lets the previous worker exit and
            // free its model memory.
            *guard = None;
            let (tx, rx) = mpsc::channel::<Job>();
            let path = model_path.to_path_buf();
            std::thread::Builder::new()
                .name("llama-engine".to_string())
                .spawn(move || worker(path, rx))
                .map_err(|e| FoldefyError::Ai(format!("failed to start engine thread: {}", e)))?;
            *guard = Some(EngineHandle {
                model_path: model_path.to_path_buf(),
                tx,
            });
        }
        guard.as_ref().unwrap().tx.clone()
    };

    let (reply_tx, reply_rx) = mpsc::channel();
    tx.send(Job {
        system: system.to_string(),
        prompt: prompt.to_string(),
        max_tokens,
        reply: reply_tx,
    })
    .map_err(|_| FoldefyError::Ai("local AI engine is not running".to_string()))?;

    reply_rx
        .recv_timeout(REQUEST_TIMEOUT)
        .map_err(|_| FoldefyError::Ai("local AI inference timed out".to_string()))?
        .map_err(FoldefyError::Ai)
}

fn backend() -> Result<&'static LlamaBackend, String> {
    static BACKEND: OnceLock<Result<LlamaBackend, String>> = OnceLock::new();
    BACKEND
        .get_or_init(|| LlamaBackend::init().map_err(|e| e.to_string()))
        .as_ref()
        .map_err(|e| e.clone())
}

fn worker(path: PathBuf, rx: mpsc::Receiver<Job>) {
    let backend = match backend() {
        Ok(b) => b,
        Err(e) => {
            drain_with_error(&rx, &format!("llama backend init failed: {}", e));
            return;
        }
    };

    // GPU when Vulkan is usable, with a CPU retry if the GPU load fails
    // (bad drivers must never brick the app).
    let hw = crate::core::hw::detect();
    eprintln!(
        "Local AI engine starting: RAM {} MB, Vulkan {}, GPUs: {}",
        hw.total_ram_mb,
        hw.vulkan_available,
        hw.gpus
            .iter()
            .map(|g| format!("{} ({} MB VRAM)", g.name, g.dedicated_vram_mb))
            .collect::<Vec<_>>()
            .join(", ")
    );

    // llama.cpp aborts the whole process on some GPU allocation failures —
    // catch_unwind cannot intercept that. Two defenses:
    // 1. VRAM preflight: skip the GPU when the model + headroom can't fit
    //    in dedicated VRAM.
    // 2. Persistent crash marker: written before the GPU attempt, removed
    //    after the first successful GPU inference. If the process dies,
    //    the next launch goes straight to CPU.
    let model_size_mb = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0) / (1024 * 1024);
    let max_vram_mb = hw
        .gpus
        .iter()
        .filter(|g| !g.is_software)
        .map(|g| g.dedicated_vram_mb)
        .max()
        .unwrap_or(0);
    let crash_marker = path
        .parent()
        .and_then(|p| p.parent())
        .map(|p| p.join(".gpu-disabled"));
    let marker_present = crash_marker.as_ref().map(|m| m.exists()).unwrap_or(false);
    let needed_vram_mb = model_size_mb + 768; // weights + KV cache + compute buffers

    let gpu_viable = hw.vulkan_available && max_vram_mb >= needed_vram_mb && !marker_present;
    if hw.vulkan_available && !gpu_viable {
        if marker_present {
            eprintln!("GPU disabled: a previous GPU attempt crashed (delete the .gpu-disabled file in the models folder to retry)");
        } else {
            eprintln!(
                "GPU skipped: {} MB VRAM available, ~{} MB needed for this model — running on CPU",
                max_vram_mb, needed_vram_mb
            );
        }
    }
    if gpu_viable {
        if let Some(marker) = &crash_marker {
            let _ = std::fs::write(marker, "GPU attempt in progress");
        }
    }
    let n_gpu_layers: u32 = if gpu_viable { 1_000_000 } else { 0 };
    let model = load_model(backend, &path, n_gpu_layers).or_else(|first_err| {
        if n_gpu_layers > 0 {
            eprintln!("GPU model load failed ({}), retrying on CPU", first_err);
            load_model(backend, &path, 0)
        } else {
            Err(first_err)
        }
    });
    let mut model = match model {
        Ok(m) => m,
        Err(e) => {
            drain_with_error(&rx, &format!("failed to load model: {}", e));
            return;
        }
    };
    let mut on_gpu = n_gpu_layers > 0;

    while let Ok(job) = rx.recv() {
        let mut result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            run_one(backend, &model, &job)
        }))
        .unwrap_or_else(|_| Err("local AI engine crashed during inference".to_string()));

        // First successful GPU inference proves this GPU works — clear the
        // crash marker so future launches keep using it.
        if on_gpu && result.is_ok() {
            if let Some(marker) = &crash_marker {
                let _ = std::fs::remove_file(marker);
            }
        }

        // Some GPUs load the weights fine (into shared memory) but cannot
        // allocate the inference buffers — reload fully on CPU and retry.
        if on_gpu {
            if let Err(e) = &result {
                if e.contains("context creation failed") || e.contains("crashed") {
                    eprintln!("GPU inference failed ({}), reloading model on CPU", e);
                    match load_model(backend, &path, 0) {
                        Ok(cpu_model) => {
                            model = cpu_model;
                            on_gpu = false;
                            result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                                run_one(backend, &model, &job)
                            }))
                            .unwrap_or_else(|_| {
                                Err("local AI engine crashed during inference".to_string())
                            });
                        }
                        Err(reload_err) => {
                            eprintln!("CPU reload also failed: {}", reload_err);
                        }
                    }
                }
            }
        }

        let _ = job.reply.send(result);
    }
}

fn load_model(
    backend: &LlamaBackend,
    path: &Path,
    n_gpu_layers: u32,
) -> Result<LlamaModel, String> {
    let params = LlamaModelParams::default().with_n_gpu_layers(n_gpu_layers);
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        LlamaModel::load_from_file(backend, path, &params).map_err(|e| e.to_string())
    }))
    .unwrap_or_else(|_| Err("model loading crashed".to_string()))
}

fn run_one(backend: &LlamaBackend, model: &LlamaModel, job: &Job) -> Result<String, String> {
    // Qwen ChatML with an empty think block: skips Qwen3's thinking mode
    // so the grammar-constrained JSON starts immediately.
    let full_prompt = format!(
        "<|im_start|>system\n{}<|im_end|>\n<|im_start|>user\n{}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n",
        job.system, job.prompt
    );

    // Walk the size ladder: big contexts fail on machines with little
    // free (V)RAM, smaller ones still handle our prompts.
    let mut ctx = None;
    let mut n_ctx = 0u32;
    let mut n_batch = 0u32;
    let mut last_err = String::new();
    for (ctx_size, batch_size) in CTX_LADDER {
        let params = LlamaContextParams::default()
            .with_n_ctx(NonZeroU32::new(ctx_size))
            .with_n_batch(batch_size);
        match model.new_context(backend, params) {
            Ok(created) => {
                ctx = Some(created);
                n_ctx = ctx_size;
                n_batch = batch_size;
                break;
            }
            Err(e) => {
                last_err = e.to_string();
                eprintln!(
                    "context creation failed at n_ctx={} ({}), trying smaller",
                    ctx_size, e
                );
            }
        }
    }
    let Some(mut ctx) = ctx else {
        return Err(format!(
            "context creation failed even at the smallest size: {} (not enough free memory?)",
            last_err
        ));
    };

    let tokens = model
        .str_to_token(&full_prompt, AddBos::Always)
        .map_err(|e| format!("tokenization failed: {}", e))?;

    let max_prompt = (n_ctx - job.max_tokens.min(n_ctx / 2)) as usize;
    if tokens.len() > max_prompt {
        return Err(format!(
            "prompt too long for the local model ({} tokens, max {})",
            tokens.len(),
            max_prompt
        ));
    }

    // Decode the prompt in n_batch-sized chunks (decode rejects larger batches)
    let mut batch = LlamaBatch::new(n_batch as usize, 1);
    let total = tokens.len();
    let mut pos = 0usize;
    for chunk in tokens.chunks(n_batch as usize) {
        batch.clear();
        for (j, token) in chunk.iter().enumerate() {
            let is_last_overall = pos + j == total - 1;
            batch
                .add(*token, (pos + j) as i32, &[0], is_last_overall)
                .map_err(|e| format!("batch add failed: {}", e))?;
        }
        ctx.decode(&mut batch)
            .map_err(|e| format!("prompt decode failed: {}", e))?;
        pos += chunk.len();
    }

    let grammar = LlamaSampler::grammar(model, JSON_GRAMMAR, "root")
        .map_err(|e| format!("grammar compile failed: {}", e))?;
    let mut sampler = LlamaSampler::chain_simple([grammar, LlamaSampler::greedy()]);

    let mut output = String::new();
    let mut decoder = encoding_rs::UTF_8.new_decoder();
    // Next absolute position = prompt length (batch holds only the last chunk)
    let mut n_cur = total as i32;

    // JSON completion tracking: once the root object closes, the grammar
    // has no legal continuation and feeding it further tokens makes
    // llama.cpp abort the process (GGML_ASSERT(!stacks.empty())).
    let mut depth = 0i32;
    let mut started = false;
    let mut in_string = false;
    let mut escaped = false;

    for _ in 0..job.max_tokens {
        let token = sampler.sample(&ctx, batch.n_tokens() - 1);

        // EOG must not be accepted into the grammar (same abort)
        if model.is_eog_token(token) {
            break;
        }
        sampler.accept(token);

        let piece = model
            .token_to_piece(token, &mut decoder, false, None)
            .unwrap_or_default();
        output.push_str(&piece);

        for ch in piece.chars() {
            if escaped {
                escaped = false;
                continue;
            }
            match ch {
                '\\' if in_string => escaped = true,
                '"' => in_string = !in_string,
                '{' if !in_string => {
                    depth += 1;
                    started = true;
                }
                '}' if !in_string => depth -= 1,
                _ => {}
            }
        }
        if started && depth == 0 {
            break;
        }

        batch.clear();
        batch
            .add(token, n_cur, &[0], true)
            .map_err(|e| format!("batch add failed: {}", e))?;
        n_cur += 1;
        ctx.decode(&mut batch)
            .map_err(|e| format!("decode failed: {}", e))?;
    }

    if output.trim().is_empty() {
        return Err("local model produced no output".to_string());
    }
    Ok(output)
}

fn drain_with_error(rx: &mpsc::Receiver<Job>, message: &str) {
    while let Ok(job) = rx.recv() {
        let _ = job.reply.send(Err(message.to_string()));
    }
}
