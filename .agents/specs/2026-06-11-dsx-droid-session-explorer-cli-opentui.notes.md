# Implementation Notes — 2026-06-11-dsx-droid-session-explorer-cli-opentui

Spec: 2026-06-11-dsx-droid-session-explorer-cli-opentui.md
Approved: 2026-06-11
User comment: push as powerfully as you'd like, I'm excited to see where your instincts take you! I can always help you refine after the fact <3

---

## 2026-06-11T07:05Z — FTS5 external-content replaced with regular FTS table
**Type**: deviation
**Context**: Spec said FTS5 with external content on a blocks table. External-content and contentless FTS tables require the special 'delete' insert command for row removal, which makes purge/reindex of a session awkward.
**Resolution**: blocks table holds metadata only; blocks_fts is a regular FTS5 table whose rowid mirrors blocks.id and stores the (capped) text. Plain DELETE works; snippet() still available. Content capped at 8KB/block since full content is always re-readable from source JSONL.

## 2026-06-11T07:10Z — Index DB stores no full transcripts
**Type**: decision
**Context**: 3.3GB of session data; indexing full tool outputs would multiply disk usage.
**Resolution**: Transcript viewer/exporter always re-parses the source JSONL (loadTranscript). The DB is a search/stats index, not a mirror. Regex search delegates to ripgrep over source files instead of SQL.

## 2026-06-11T07:40Z — bunfig.toml preload removed
**Type**: surprise
**Context**: bunfig.toml `preload = ["@opentui/solid/preload"]` is read by ANY bun process started in the repo dir, which broke running `droid --help` from this directory (droid is bun-based and failed with "preload not found").
**Resolution**: Deleted bunfig.toml. Dev script uses `bun --preload @opentui/solid/preload`; distribution bundle is pre-transformed by the solid bun-plugin so runtime needs no preload.

## 2026-06-11T08:20Z — dist bundling strategy for the Solid TUI
**Type**: tradeoff
**Context**: Two build bugs: (1) `banner` option duplicated the source shebang producing invalid JS; (2) `packages: "external"` left solid-js unresolved at runtime, so Bun picked its SSR build (dist/server.js) and the TUI crashed. The opentui solid plugin redirects server.js to the client build via onLoad, which only runs for bundled modules.
**Resolution**: build.ts bundles solid-js + @opentui/solid (plugin redirect applies) and keeps @opentui/core, commander, picocolors external. Shebang comes from src/index.ts, no banner.

## 2026-06-11T08:30Z — Deferred TUI view switches by one tick
**Type**: surprise
**Context**: Pressing a view hotkey (e.g. "3") delivered the same keypress into the freshly-mounted focused input of the new view ("3retry loop" in the search box).
**Resolution**: state.setView/back wrap the actual view swap in setTimeout(0) so mounting happens after the triggering key event completes.

## 2026-06-11T08:35Z — span styling uses style prop, not fg/bg props
**Type**: surprise
**Context**: @opentui/solid 0.4.0's reconciler only honors `style={{fg,bg}}` on TextNode spans (direct fg prop is silently ignored and also not in SpanProps types).
**Resolution**: All spans use style objects; `<text fg=...>` remains valid since TextRenderable options include fg.

## 2026-06-11T07:45Z — Verified JSONL schema against factory-mono source
**Type**: decision
**Context**: packages/common/src/session/jsonl/types.ts defines DroidSessionEvent union; matches the implemented parser. Extra block types exist (image, redacted_thinking, document) and DroidMessageEvent.tokens exists but is never populated in local files (verified by rg over all sessions).
**Resolution**: Parser skips unknown block types; per-message tokens not indexed. Daily token attribution stays pro-rated from session totals by assistant-message activity.
