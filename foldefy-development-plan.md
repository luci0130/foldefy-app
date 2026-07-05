# Foldefy — Comprehensive Module Development Plan (Offline-First Local AI)

> Status: draft v1 — to be refined with Ultraplan on Claude Code web.
> Date: 2026-07-05

## Context

Foldefy (Tauri v2, Rust + React/TS) organizes users' files with AI. Today it can scan drives, build a folder index, recommend a structure via the Claude API (user-supplied key), and create template folders — but the AI flow is **orphaned** (built yet unreachable: `appStore` flags `showStorageScan`/`showAIRecommendation` are never set), **no file-move capability exists anywhere**, and the marketplace is stubbed.

Product direction: a worldwide, easy-for-anybody tool that **works offline by default** — an AI model embedded in the app (no Ollama/external installs), **auto-selected by device specs** (RAM/GPU/VRAM), with cloud AI (Claude) as an opt-in quality upgrade. Two AI stages:

- **Stage A — structure recommendation**: names + tree only (exists, needs rewiring to local AI).
- **Stage B — content-based file sorting** (new): tiered indexing — 1) text extraction, 2) OCR when no text, 3) vision model for images.

### Locked decisions

| Decision | Choice |
|---|---|
| Local AI runtime | Embedded llama.cpp via `llama-cpp-2` crate (Vulkan + CPU fallback), Windows first |
| Min hardware | 8 GB RAM; below → cloud-only/rules-based |
| Model delivery | Downloaded on demand (consent, resume, SHA-256), never bundled |
| Online AI | Offline default; Claude opt-in; later cloud proxy (no user key) |
| Sorting behavior | User-configurable; **default auto-sort with undo** (undo all / per folder / per file); also review mode & per-batch mode |
| Sort scope | User chooses: selected folders / smart suggestions (hotspots) / everything |
| Backend | Supabase (fastest to ship; backend is never the perf bottleneck — the desktop app is) |
| Monetization | Free at launch; schema supports paid templates + platform cut from day one; Pro subscription later |

## Cross-cutting foundations

- **SQLite via `rusqlite` (bundled) + r2d2 pool** at `%APPDATA%\com.foldefy.app\foldefy.db` (WAL). Replaces JSON files for: file index, content-extraction cache, move journal, recommendations. New `src-tauri/src/db/mod.rs`, migrations via `include_str!`.
- **Restructure backend**: `commands/*.rs` stay thin `#[tauri::command]` wrappers; logic moves to testable `src-tauri/src/core/{scanner, ai, sorter, extract, models_mgr, hw, market, fs_ops}`.
- **Error type**: introduce `FoldefyError` (`thiserror`), migrate from `String` errors opportunistically.

## Modules

### M1 — Core scanning & unified index
Unify the two scanners (legacy `folder.rs::scan_directory` vs `scanning.rs::smart_scan_*`). Move smart-scan logic to `core/scanner/{mod,skip_rules,project_detect,hotspots}.rs`; delete the legacy scanner; `FolderExplorer`/`Organize` use smart scan with lazy per-level expansion. Persist index to SQLite (`files`, `scan_runs`). Fix `ScanProgress.percentage` (per-top-level-dir completion instead of -1). **New `hotspots.rs`**: detect messy dirs (loose-file count, extension entropy, Downloads/Desktop weighting) → `Hotspot { path, loose_files, score, reason }` for the sort scope picker.

### M2 — Hardware detection & model auto-selection
`core/hw/mod.rs` → `HardwareProfile { total_ram_mb, gpus[{name, vendor, dedicated_vram_mb, supports_vulkan}], cpu_cores }`. RAM/CPU via existing `sysinfo`; VRAM via `windows` crate DXGI (`IDXGIAdapter1::GetDesc1`); Vulkan probe via `ash` (`Entry::load()` graceful fail). Pure fn `select_model_tier(hw) -> ModelTier`, user-overridable.

| Tier | Condition | Text model (GGUF Q4_K_M) | Size |
|---|---|---|---|
| Below min | <8 GB RAM | local AI off → cloud/rules | — |
| 1 | 8 GB, no dGPU | Qwen3-1.7B | ~1.2 GB |
| 2 | 16 GB or 4 GB VRAM | Qwen3-4B-Instruct | ~2.5 GB |
| 3 | 32 GB+ or 8 GB+ VRAM | Qwen3-8B | ~5 GB |
| Vision add-on | Tier 2+ | Moondream2 (T2) / Qwen2.5-VL-3B + mmproj (T3) | 1.7–3.5 GB |

(Qwen3: multilingual — matches en/ro/fr/de/es locales; good JSON adherence; llama.cpp mtmd supports Qwen2.5-VL.)

### M3 — Local AI engine (embedded llama.cpp)
Crate **`llama-cpp-2`** (utilityai, actively maintained) features `["vulkan", "mtmd"]`. `core/ai/engine.rs`: dedicated inference worker thread owning model/context, mpsc requests, token streaming via Tauri events. One model loaded at a time (LRU text↔vision). GPU policy: `n_gpu_layers = 999` if Vulkan device present else 0; `catch_unwind` + persisted `force_cpu` kill-switch auto-set after a GPU crash. **GBNF grammar-constrained sampling** generated from JSON schemas — the key reliability lever for small models (no prose-parsing failures). Ctx: 8k (T1) / 16k (T2/3). CI needs CMake + Vulkan SDK headers; +15–25 MB binary.

### M4 — Model manager
`core/models_mgr/` + `commands/models.rs`: `list_models, get_model_status, download_model, cancel_download, delete_model, set_active_model`. Curated embedded `models.json` registry `{id, purpose, tier, hf_repo, filename, size_bytes, sha256, license, min_ram_mb, min_vram_mb}` (no arbitrary repos; later refreshable from Supabase). Download: `reqwest` streaming + `Range` resume to `.part`, progress events, `sha2` verify, atomic rename; disk-space preflight. Store at `%APPDATA%\com.foldefy.app\models\<id>\`. Frontend: `src/stores/modelStore.ts`, `src/components/settings/ModelManager.tsx`.

### M5 — AI provider abstraction
`core/ai/provider.rs`: trait `AiProvider { complete_json(req) -> Value; capabilities() }`. Impls: `LocalLlamaProvider` (M3), `ClaudeProvider` (extracted from `commands/ai.rs`; key → keyring), later `CloudProxyProvider` (Supabase edge fn). `core/ai/prompts.rs`: Stage A prompt builder + **token-budgeted tree serializer** (depth cap, collapse big dirs to "1,243 files, mostly .jpg", target ~6k tokens). Config gains `provider: "local"|"claude"`, default local; Settings toggle.

### M6 — Structure recommendation (rewire + apply)
Rewire orphaned flow: `ConfirmationStep` completion → `setShowStorageScan(true)`; `ScanComplete` → `setShowAIRecommendation(true)`; verify `App.tsx` conditional order; add re-entry point from Organize page. New `commands/structure.rs::apply_structure(recommendation, target_root, dry_run)` reusing dir-creation + `{{var}}` substitution extracted from `template.rs::apply_template` into `core/fs_ops/create_tree.rs`; created dirs journaled (undoable). Persist recommendations to SQLite for Dashboard "last recommendation" + Stage B consumption.

### M7 — Content indexing pipeline (text → OCR → vision)
`core/extract/mod.rs`: tiered, budgeted worker pool (`spawn_blocking`, N=cores/2) → SQLite `file_content` (+FTS5 for future search), cached by `(path, size, mtime)`.

- **Tier 1 text (v1)**: PDF `pdf-extract` → fallback `lopdf`; <50 chars/page ⇒ `needs_ocr`. DOCX `docx-rust`; XLSX `calamine` (sheet names + ~50 rows); TXT/code direct read + `chardetng`/`encoding_rs`, first 4 KB. Everything else: metadata-only classification.
- **Tier 2 OCR (v1.x)**: **`ocrs`** (pure Rust, ~10 MB ONNX, Latin-script — fits all 5 locales); benchmark vs `tesseract-rs` on a ro/en scan corpus before committing. Scanned PDFs need rasterization: `pdfium-render` with pdfium DLL fetched like a model artifact (~5 MB). Ship image-OCR first, scanned-PDF OCR second.
- **Tier 3 vision (v1.x)**: llama.cpp mtmd — Moondream2 (T2) / Qwen2.5-VL-3B (T3); one-line "describe for filing" captions; `image` crate for resize. Opt-in, size-capped, scoped folders only.
- Per-run caps (e.g. 2,000 text / 200 OCR / 100 vision), cheapest tier first.

### M8 — Sorting engine (classify → plan → journal → undo)
`core/sorter/`:

- `classifier.rs`: phase 1 **rule engine** (extension/profile/pattern maps — resolves 60–80% free), phase 2 **AI batches** (~30 files/prompt: name, ext, dates, M7 snippet) → GBNF JSON `[{file_id, dest_category, confidence}]`; destinations come from applied structure (M6) or template.
- `planner.rs`: `MovePlan`; collision resolution (`name (2).ext`), `blake3` exact-dupe flagging, **protected-path hard guard** (M13) filters here.
- `journal.rs`: SQLite `move_journal(id, batch_id, src, dst, size, mtime, status, error, executed_at)`; write `in_progress` + flush **before** each move; startup crash reconciliation (file at dst→done, at src→failed).
- `executor.rs`: same-volume `rename`; cross-volume copy+verify+delete; locked files retry×2 then `skipped_locked`; `sort-progress` events.
- `undo.rs`: `undo_batch / undo_folder / undo_file`; destination-modified ⇒ `conflict`, never clobber; remove empty created dirs on full undo.
- Commands: `plan_sort(scope, mode)`, `execute_plan`, `undo_*`, `list_batches`.
- Modes: `auto` (default; plan→execute→toast with Undo), `review`, `per_batch`. Confidence <0.7 always lands in "Needs review" even in auto.

### M9 — Sorting UX
Rework `src/pages/Organize.tsx` into 3-step wizard: **Scope** (`sorting/ScopePicker.tsx` — selected folders / hotspot suggestion cards / everything+warning), **Mode**, **Run**. `sorting/ReviewPlan.tsx`: grouped-by-destination diff (reuse `RecommendedStructureTree` patterns), checkboxes, confidence badges, destination override. `sorting/SortProgress.tsx` (mirror ScanProgress). **Undo Center** (`sorting/UndoCenter.tsx`) from Header history icon + Dashboard card: batch → folder → file with undo at each level. New `src/stores/sortStore.ts`; types in `src/lib/tauri.ts`; i18n keys ×5 locales.

### M10 — Templates & marketplace (Supabase)
New repo dir `supabase/` (migrations + edge functions). Tables: `profiles`, `templates(structure jsonb …price_cents, status, downloads, rating_avg)`, `template_ratings`, `template_downloads` (+M11 purchase tables). RLS: public read published, owner write, one rating/user. Keep existing `FolderTemplate` shape as wire format so `apply_template` works unchanged on downloaded templates. **App calls Supabase via Rust reqwest (PostgREST)** — single HTTP/auth stack, no CORS/webview storage issues. Implement real `fetch_community_templates`, `publish_template`, `rate_template`, `download_template` in `core/market/`. Marketplace UI: browse/search/sort, detail + preview, publish dialog, ratings. Builtin 6 templates stay offline.

### M11 — Accounts & monetization (dormant)
Supabase Auth: magic-link + Google OAuth via system browser + `tauri-plugin-deep-link` v2 (`foldefy://auth/callback`), PKCE exchange in Rust, refresh token in keyring. `core/auth.rs`, `authStore.ts`, `AccountSection.tsx`. Accounts required only to publish/rate/purchase. Dormant schema: `products (platform_fee_bps default 3000)`, `purchases`, `entitlements`, `payout_accounts` — enabling payments later is a Stripe Connect edge fn + UI, zero migration. Cloud-AI proxy later: edge fn `ai-proxy` (server key, Pro-gated, rate-limited) → `CloudProxyProvider`.

### M12 — Settings & onboarding updates
Settings **AI tab**: provider toggle, hardware summary, tier auto/override, ModelManager, content/vision analysis consent toggles, Claude key (keyring), default sort mode, protected-paths editor. Onboarding: new `AISetupStep.tsx` after profile confirm — "Foldefy downloads a X GB model to work fully offline; nothing leaves this device" with download-now / later / use-cloud; download runs in background during the storage scan. Profile schema gains `ai_consent`, `sort_mode`, `schema_version` + load migration.

### M13 — Safety & trust
- **Protected paths enforced in planner (not UI)**: Windows/, Program Files*, ProgramData, AppData (minus user dirs), project-marker dirs (.git, node_modules, …), registry-detected install dirs, OneDrive placeholders (`FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS`), size cap; user-extendable.
- Dry-run everywhere; export plan as text.
- **Keyring (`keyring` v3 / Windows Credential Manager)** for Claude key + Supabase token; migrate plaintext `ai_config.json` on first load.
- Journal writes `synchronous=FULL`; sorting never deletes (cross-device is verify-then-delete only).
- Privacy stance: zero telemetry; static Privacy panel stating exactly what leaves the machine — also a marketing asset.

### M14 — Packaging, CI, tests
GitHub Actions (windows-latest): CMake + Vulkan SDK setup, `cargo fmt/clippy/test`, `tsc + vitest`, `tauri build`, cargo/llama.cpp caching. **One Vulkan build for all GPUs** (runtime detection + CPU fallback + force_cpu). Rust tests: skip_rules, project_detect, tier selection, planner collisions/guards, journal crash-recovery (temp dirs); golden-set eval fixtures (~50 synthetic trees) for prompt regressions. Signing: Azure Trusted Signing via `windows.signCommand`. `tauri-plugin-updater` + GitHub Releases `latest.json` (app updates must never re-download models). Repo hygiene: commit current work in chunks, conventional commits.

## Build sequence

| Phase | Content | Effort (1 dev) |
|---|---|---|
| 0 Foundations | CI skeleton, error type, SQLite layer, M1 unification + hotspots, keyring migration | 1–1.5 wk |
| 1 Make it real | M6 rewire + apply_structure, M8 journal/executor/undo, M9 UI, **rule-based classifier only** | 3 wk |
| 2 Local AI | M2, M4, M3, M5, Stage A on local model, M12 | 3–4 wk |
| 3 Content sorting | M7 tier 1 (text), AI classifier in M8, confidence buckets | 2–3 wk |
| 4 OCR + vision | M7 tiers 2–3 | 2–3 wk |
| 5 Online | Supabase, M10 marketplace, M11 auth + dormant schema | 2–3 wk |
| 6 Ship | Signing, updater, installer QA (overlaps 4–5) | 1–2 wk |

**First shippable milestone = end of Phase 2 (~7–8 wk):** offline Stage A on local AI, rule-based auto-sort with full undo, Claude opt-in, model download UX. **Cut from v1:** OCR, vision, marketplace backend, accounts, per-batch mode.

## Top risks & mitigations

1. **Vulkan on varied Windows GPUs** → runtime probe, CPU fallback, crash-flag auto-disable, force_cpu setting; tiers sized so CPU inference is tolerable.
2. **Small-model quality** → GBNF forced-JSON, rule engine first, confidence routing to review, Claude escape hatch, golden-set evals.
3. **Long-context big trees** → budgeted serializer, 30-file batches, hierarchical refinement.
4. **Download friction (1–5 GB)** → consent w/ exact size, resume, background during onboarding, 1.2 GB Tier-1, cloud/later options.
5. **File-move safety** → journal-before-move, startup reconciliation, copy-verify-delete, OneDrive guard, protected paths, full undo, heavy executor integration tests.
6. **ocrs maturity** → Phase 4, additive; benchmark vs tesseract-rs first; classification tolerates imperfect OCR.

## Verification

- Per-module: Rust unit/integration tests above; `pnpm tsc && vitest`; `pnpm tauri dev` manual flows.
- Phase 1 gate: sort 500-file synthetic Downloads dir → auto-sort → undo all/folder/file → byte-identical tree restored (scripted temp-dir test).
- Phase 2 gate: on an 8 GB VM (no GPU) and a GPU machine: model auto-select, download+resume+verify, Stage A recommendation < 60 s, GPU crash simulation → CPU fallback.
- Phase 3 gate: golden-set classification accuracy ≥ target vs Claude baseline; low-confidence routed to review.
- Phase 5 gate: publish → fetch → apply community template round-trip; RLS negative tests.
