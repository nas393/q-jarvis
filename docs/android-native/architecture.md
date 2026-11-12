# Q Android — Local AI Architecture (Stage 2)

## Goal
Deliver Q as a native Android application with on-device language-model inference. The Android app must generate responses without sending prompts to a hosted AI provider.

## Non-negotiable constraints
- Zero paid AI APIs, subscriptions, API credits, or billing.
- No OpenAI, Gemini, DeepSeek, Groq, or other remote inference fallback.
- Keep the existing Q web application, Neon database, and conversation records intact.
- Work only on `stage2/android-native-local-ai` until reviewed.
- Do not merge or deploy to Production without explicit approval.
- Never send local chat prompts to the existing Vercel chat API.

## Runtime direction
Use Google's LiteRT-LM Android Kotlin API as the first implementation candidate. It supports Android CPU/GPU execution and streamed conversations. Engine initialization and all inference lifecycle operations must run off the UI thread on a single-thread executor. GPU native library declarations must be included and tested on the target Samsung device.

Official implementation guide:
https://developers.google.com/edge/litert-lm/android

## Model compatibility
The Qwen3 4B Q4_K_M asset downloaded for llmman is a GGUF model and is not directly loadable by LiteRT-LM. LiteRT-LM requires a compatible `.litertlm` model artifact. The initial integration must use a published compatible model artifact; the documented Qwen3 0.6B LiteRT model is the conservative first device-validation candidate. Do not ask the user to redownload or convert the existing GGUF model unless a later verified path requires it.

## Delivery stages
1. **Android shell:** create a native Kotlin application module with a Q-branded interface and a model status screen.
2. **Runtime spike:** integrate LiteRT-LM, initialize a compatible model in a background executor, and stream a short test response.
3. **Device validation:** verify install, model load, first-token latency, sustained generation, memory stability, cancellation, and app lifecycle on Galaxy Z Fold6.
4. **Q integration:** connect the native interface to Q's project and assistant experience without routing inference through Vercel.
5. **Local-first data:** store local conversation content on-device by default. Any optional sync must be explicit and separate from inference.

## Acceptance gates
- A response is generated with network access disabled after the model is downloaded.
- No request containing user prompt text reaches a remote AI inference endpoint.
- No API key or paid service is required.
- The app does not crash during repeated prompts, cancellation, background/foreground transitions, or model reload.
- Performance and memory results are recorded on the target device before adding larger models.

## Known distinction
The current Q web app remains cloud-hosted and its existing chat route is OpenAI-based. This Android branch is separate; the web chat must not be described as local AI until the native runtime is integrated and verified.
