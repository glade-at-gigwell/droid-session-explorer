import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { searchBlocks, type SearchHit } from "../../query/search"
import { humanDate, renderSnippet } from "../../cli/format"
import { useApp } from "../state"
import { T } from "../theme"

export function SearchView() {
  const app = useApp()
  const [query, setQuery] = createSignal("")
  const [debounced, setDebounced] = createSignal("")
  const [editing, setEditing] = createSignal(true)

  onMount(() => app.setInputActive(true))
  onCleanup(() => app.setInputActive(false))

  let timer: ReturnType<typeof setTimeout> | undefined
  createEffect(() => {
    const q = query()
    clearTimeout(timer)
    timer = setTimeout(() => setDebounced(q), 120)
  })
  onCleanup(() => clearTimeout(timer))

  const hits = createMemo<SearchHit[]>(() => {
    const q = debounced().trim()
    if (q.length < 2) return []
    try {
      return searchBlocks(app.ctx.db, q, { limit: 100 })
    } catch {
      return []
    }
  })

  const options = createMemo(() =>
    hits().map((h) => ({
      name: `${h.sessionId.slice(0, 8)}#${String(h.seq).padEnd(5)} ${badge(h).padEnd(
        20,
      )} ${renderSnippet(h.snippet, false).slice(0, 90)}`,
      description: `${h.project} · ${h.sessionTitle ?? "(untitled)"} · ${humanDate(h.ts)}`,
      value: h.sessionId,
    })),
  )

  useKeyboard((key) => {
    if (editing()) {
      if (key.name === "escape" || (key.name === "return" && hits().length > 0)) {
        setEditing(false)
        app.setInputActive(false)
      }
      return
    }
    const seq = key.sequence ?? key.name
    if (seq === "/") {
      setEditing(true)
      app.setInputActive(true)
    }
  })

  return (
    <box flexDirection="column" flexGrow={1} padding={1}>
      <box height={1} flexDirection="row" gap={1}>
        <text>
          <span style={{ fg: editing() ? T.yellow : T.dim }}>search:</span>
        </text>
        <input
          value={query()}
          onInput={setQuery}
          placeholder='FTS5 query: "exact phrase", AND, OR, NEAR(a b, 5)'
          focused={editing()}
          flexGrow={1}
        />
        <text>
          <span style={{ fg: T.dim }}>{`${hits().length} hits`}</span>
        </text>
      </box>
      <select
        options={options()}
        onSelect={(_i: number, option: { value?: string } | null) => {
          if (option?.value) app.openTranscript(option.value)
        }}
        focused={!editing()}
        flexGrow={1}
        showDescription
      />
    </box>
  )
}

function badge(h: SearchHit): string {
  if (h.type === "tool_use" || h.type === "tool_result") {
    return `${h.type}${h.toolName ? `:${h.toolName}` : ""}`
  }
  if (h.type === "thinking") return "thinking"
  return h.role
}
