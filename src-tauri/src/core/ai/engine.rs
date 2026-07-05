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

const N_CTX: u32 = 8192;
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
    let n_gpu_layers: u32 = if crate::core::hw::detect().vulkan_available {
        1_000_000
    } else {
        0
    };
    let model = load_model(backend, &path, n_gpu_layers).or_else(|first_err| {
        if n_gpu_layers > 0 {
            eprintln!("GPU model load failed ({}), retrying on CPU", first_err);
            load_model(backend, &path, 0)
        } else {
            Err(first_err)
        }
    });
    let model = match model {
        Ok(m) => m,
        Err(e) => {
            drain_with_error(&rx, &format!("failed to load model: {}", e));
            return;
        }
    };

    while let Ok(job) = rx.recv() {
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            run_one(backend, &model, &job)
        }))
        .unwrap_or_else(|_| Err("local AI engine crashed during inference".to_string()));
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

    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(NonZeroU32::new(N_CTX))
        .with_n_batch(N_CTX);
    let mut ctx = model
        .new_context(backend, ctx_params)
        .map_err(|e| format!("context creation failed: {}", e))?;

    let tokens = model
        .str_to_token(&full_prompt, AddBos::Always)
        .map_err(|e| format!("tokenization failed: {}", e))?;

    let max_prompt = (N_CTX - job.max_tokens.min(N_CTX / 2)) as usize;
    if tokens.len() > max_prompt {
        return Err(format!(
            "prompt too long for the local model ({} tokens, max {})",
            tokens.len(),
            max_prompt
        ));
    }

    let mut batch = LlamaBatch::new(N_CTX as usize, 1);
    let last_index = tokens.len() as i32 - 1;
    for (i, token) in tokens.iter().enumerate() {
        batch
            .add(*token, i as i32, &[0], i as i32 == last_index)
            .map_err(|e| format!("batch add failed: {}", e))?;
    }
    ctx.decode(&mut batch)
        .map_err(|e| format!("prompt decode failed: {}", e))?;

    let grammar = LlamaSampler::grammar(model, JSON_GRAMMAR, "root")
        .map_err(|e| format!("grammar compile failed: {}", e))?;
    let mut sampler = LlamaSampler::chain_simple([grammar, LlamaSampler::greedy()]);

    let mut output = String::new();
    let mut decoder = encoding_rs::UTF_8.new_decoder();
    let mut n_cur = batch.n_tokens();

    for _ in 0..job.max_tokens {
        let token = sampler.sample(&ctx, batch.n_tokens() - 1);
        sampler.accept(token);

        if model.is_eog_token(token) {
            break;
        }

        let piece = model
            .token_to_piece(token, &mut decoder, false, None)
            .unwrap_or_default();
        output.push_str(&piece);

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
