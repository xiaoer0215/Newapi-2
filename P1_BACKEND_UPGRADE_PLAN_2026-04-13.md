# P1 Backend Upgrade Plan

Generated: 2026-04-13

## Goal

Bring in the highest-value upstream backend improvements first, while keeping the current custom UI intact.

This round is intentionally limited to:

- backend request/relay compatibility
- backend billing correctness
- backend file/mime handling
- backend channel affinity behavior

This round explicitly avoids:

- layout rewrites
- dashboard UI rewrites
- front-end ErrorBoundary work
- admin analytics pages/components

## Baseline

Current local state appears to be:

- roughly based on upstream `v0.11.8`
- plus local custom UI / business changes
- plus some selectively merged upstream `v0.12.x` work

As of 2026-04-13:

- latest stable upstream release: `v0.12.8`
- notable nightly mentioned in the previous gap report: `nightly-20260409`

## Scope For This Round

### In scope

1. Channel affinity `IncludeModelName`
2. file compatibility and file conversion bridge work that does not require UI changes
3. `vllm-omini` request field compatibility
4. MiniMax image relay support

### Explicitly deferred

These should not be mixed into this round:

- Web `ErrorBoundary`
- admin user analytics screens
- tiered billing from `nightly-20260409`
- Seedance 2.0 interface + differential billing
- `wan2.7-image`

## Why These Four First

They have the best ratio of:

- user-facing compatibility gain
- low to medium merge risk
- minimal impact on your existing custom front-end

They also fit the current architecture well, because the repo already has:

- a mature `channel_affinity` service
- a reusable file source / file decoder stack
- a unified relay adaptor architecture
- a unified billing/session pipeline

## Work Package 1: Channel Affinity IncludeModelName

### Current local state

Existing affinity support is already strong:

- `setting/operation_setting/channel_affinity_setting.go`
- `service/channel_affinity.go`
- `controller/channel_affinity_cache.go`

Current key composition supports:

- rule name
- using group
- affinity value

But it does not appear to support an explicit `IncludeModelName` switch.

### Change target

Allow a rule to optionally include model name in the affinity cache key so that:

- same affinity key + different model does not force reuse of the same upstream channel
- cache granularity becomes safer for mixed-model clients

### Files to change

- `setting/operation_setting/channel_affinity_setting.go`
- `service/channel_affinity.go`
- tests under `service/`

### Expected implementation

1. Add a boolean rule field:
   - `IncludeModelName bool`
2. Extend key building logic in:
   - `buildChannelAffinityCacheKeySuffix(...)`
3. Store model name in the affinity meta already collected in:
   - `GetPreferredChannelByAffinity(...)`
4. Keep default behavior backward-compatible:
   - default `false`

### Acceptance checks

- old rules behave exactly the same
- when `IncludeModelName=false`, cache key remains unchanged
- when `IncludeModelName=true`, same affinity key but different model yields different cache entries
- existing admin info and cache stats still work

### Suggested tests

- add unit tests near:
  - `service/channel_affinity_template_test.go`
  - `service/channel_affinity_usage_cache_test.go`

## Work Package 2: File Compatibility And PDF Bridge

### Current local state

The local repo already has a solid file foundation:

- `service/file_decoder.go`
- `service/file_service.go`
- `types/file_source.go`
- `dto/openai_request.go`
- `dto/claude.go`
- `dto/gemini.go`

There is also existing PDF awareness:

- `service/file_decoder.go` maps `.pdf` to `application/pdf`
- `relay/channel/gemini/relay-gemini.go` already allows `application/pdf`

However, conversion coverage still looks incomplete across request format bridges, especially in:

- `service/convert.go`
- Claude/OpenAI message conversion paths

Also, local mime extension handling does not appear to include:

- `heic`
- `heif`

### Change target

Improve backend file compatibility without touching UI:

1. recognize `HEIC` / `HEIF`
2. keep PDF files flowing through request conversion layers
3. avoid dropping file-type content when converting between request formats

### Files to change

- `service/file_decoder.go`
- `service/convert.go`
- `dto/openai_request.go`
- `dto/claude.go`
- `relay/channel/claude/relay-claude.go`
- optionally `relay/channel/gemini/relay-gemini.go`

### Expected implementation

#### Part A: mime compatibility

Add extension mapping support in `GetMimeTypeByExtension(...)` for:

- `heic` -> `image/heic`
- `heif` -> `image/heif`

If additional sniffing logic is needed, keep it conservative and backward-compatible.

#### Part B: request conversion bridge

Review conversion paths where file content may be lost:

- OpenAI -> Claude
- Claude -> OpenAI

The local code already handles:

- text
- image
- tool use / tool result

The gap is file/document style content.

The objective is not a huge refactor. The objective is:

- preserve supported file payloads instead of silently dropping them
- pass through PDF-compatible content where upstream supports it

### Acceptance checks

- `pdf` files remain present after request conversion
- `heic` / `heif` are recognized by backend mime logic
- no regression for existing image/audio/video handling

### Suggested tests

- add focused tests around:
  - request conversion helpers in `service/convert.go`
  - file extension mapping in `service/file_decoder.go`

## Work Package 3: vllm-omini Field Compatibility

### Current local state

This feature is not visible in local code scans.

The lowest-risk approach is to treat it as a compatibility passthrough task rather than a broader model feature task.

### Change target

Add support for the upstream custom request field(s) required by `vllm-omini`, while keeping the general OpenAI-compatible request flow unchanged.

### Files likely to change

- `dto/openai_request.go`
- `relay/channel/openai/adaptor.go`
- possibly request conversion helpers under `service/`

### Expected implementation

1. identify the exact custom field shape from upstream
2. add DTO support using the existing optional-pointer conventions
3. ensure the field survives marshal / relay paths
4. avoid touching unrelated providers

### Acceptance checks

- unknown models remain unaffected
- `vllm-omini` requests retain the custom field on relay
- zero-value semantics are preserved for optional fields

### Note

Because this repo has a strict rule about preserving explicit zero values, any optional scalar added here should use pointer types with `omitempty`.

## Work Package 4: MiniMax Image Relay

### Current local state

MiniMax support exists locally, but the visible implementation is limited:

- `relay/channel/minimax/adaptor.go`
- `relay/channel/minimax/constants.go`
- `relay/channel/minimax/relay-minimax.go`
- `relay/channel/minimax/tts.go`

The current request URL routing in `relay-minimax.go` appears to cover:

- chat
- audio speech

Image generation support is not visible yet.

### Change target

Add MiniMax image relay support in the same adaptor family, without altering your custom UI pages.

### Files to change

- `relay/channel/minimax/relay-minimax.go`
- `relay/channel/minimax/adaptor.go`
- `relay/channel/minimax/constants.go`
- `relay/relay_adaptor.go`
- possibly DTO or image request helpers if MiniMax needs provider-specific shaping

### Expected implementation

1. add request URL mapping for image generation relay mode
2. adapt incoming OpenAI-style image requests to MiniMax upstream schema
3. convert upstream response back into local common response format
4. ensure billing path follows existing image generation quota logic

### Acceptance checks

- MiniMax channel can receive image generation requests
- non-image MiniMax flows keep working
- no regression in existing TTS/chat handling

### Suggested tests

- request URL selection tests
- provider response conversion tests

## What This Round Does Not Touch

To protect your custom UI and reduce merge risk, this round should not edit:

- `web/src/components/layout/`
- `web/src/pages/Home/`
- `web/src/pages/Token/`
- your custom dashboard visual layer

Front-end-only upstream items such as `ErrorBoundary` should be deferred to a later, isolated round.

## Recommended Execution Order

Use this exact order to keep risk low:

1. Channel affinity `IncludeModelName`
2. file mime updates (`heic` / `heif`)
3. PDF / file conversion bridge fixes
4. `vllm-omini` field compatibility
5. MiniMax image relay

Reason:

- steps 1 and 2 are low risk and easy to validate
- step 3 changes request conversion logic, so do it after mime support is stable
- step 4 is small but model-specific
- step 5 is the most provider-specific and should come last

## Recommended Commit Slices

If we implement this plan, the cleanest commit sequence is:

1. `channel-affinity: add optional IncludeModelName keying`
2. `files: add HEIC/HEIF mime compatibility`
3. `convert: preserve pdf/file content in relay conversion`
4. `openai: add vllm-omini field compatibility`
5. `minimax: add image relay support`

## Test Plan

Minimum backend verification for each slice:

1. targeted package tests
2. full Go test run
3. one manual relay smoke test per changed provider

Recommended commands:

```powershell
go test ./service/...
go test ./relay/...
go test ./dto/...
go test ./...
```

For manual smoke tests:

- channel affinity rule hit/miss
- OpenAI-style file request containing PDF
- HEIC/HEIF file type detection
- MiniMax image request
- `vllm-omini` model request passthrough

## Safe Merge Boundary

For this round, most edits should stay inside:

- `service/`
- `relay/`
- `dto/`
- `setting/operation_setting/`

Try hard not to spread changes into:

- `web/`
- generic settings UI
- unrelated billing screens

## After This Round

Once this round is complete and stable, the next recommended round is:

1. backend support for `Seedance 2.0`
2. backend support for `wan2.7-image`
3. `amount-first` / atomic quota update review
4. only then consider UI-only items such as `ErrorBoundary`

## Practical Recommendation

If you want me to execute this plan next, the safest implementation order is:

1. Work Package 1
2. Work Package 2

These two give the best value with the lowest risk, and they do not require any UI rewrite.
