import { createMemo, createResource, createSignal, For, Match, Show, Switch } from "solid-js"
import { useKeyboard, useRenderer } from "@opentui/solid"
import { resolveSession } from "../../query/sessions"
import { loadTranscript, type TranscriptEntry } from "../../query/transcript"
import { humanTokens, isoDate } from "../../cli/format"
import { useApp } from "../state"
import { T } from "../theme"

const PAGE = 200

export function TranscriptView() {
  const app = useApp()
  const renderer = useRenderer()
  const [showThinking, setShowThinking] = createSignal(true)
  const [showToolOutput, setShowToolOutput] = createSignal(false)
  const [page, setPage] = createSignal(0)

  const session = createMemo(() => {
    const id = app.selectedSession()
    if (!id) return null
    try {
      return resolveSession(app.ctx.db, id)
    } catch {
      return null
    }
  })

  const [transcript] = createResource(
    () => session()?.transcriptPath ?? null,
    (path) => (path ? loadTranscript(path) : null),
  )

  const visible = createMemo(() => {
    const t = transcript()
    if (!t) return []
    return t.entries.filter((e) => e.kind !== "thinking" || showThinking())
  })

  const pageCount = createMemo(() => Math.max(1, Math.ceil(visible().length / PAGE)))
  const windowed = createMemo(() => {
    const p = Math.min(page(), pageCount() - 1)
    return visible().slice(p * PAGE, (p + 1) * PAGE)
  })

  useKeyboard((key) => {
    if (app.inputActive()) return
    const seq = key.sequence ?? key.name
    if (seq === "t") {
      setShowThinking((v) => !v)
    } else if (seq === "o") {
      setShowToolOutput((v) => !v)
    } else if (seq === "]") {
      setPage((p) => Math.min(pageCount() - 1, p + 1))
    } else if (seq === "[") {
      setPage((p) => Math.max(0, p - 1))
    } else if (seq === "y") {
      const id = session()?.id
      if (id) {
        renderer.copyToClipboardOSC52?.(id)
        app.setStatus(`copied ${id}`)
      }
    } else if (seq === "r") {
      const s = session()
      if (s) {
        const cmd = s.cwd
          ? `cd '${s.cwd}' && droid --resume ${s.id}`
          : `droid --resume ${s.id}`
        app.quit(cmd)
      }
    }
  })

  return (
    <box flexDirection="column" flexGrow={1}>
      <box height={1} paddingX={1} backgroundColor={T.bgPanel} flexDirection="row" gap={2}>
        <text>
          <span style={{ fg: T.accent }}>{session()?.id.slice(0, 8) ?? "?"}</span>
          <span style={{ fg: T.fg }}>
            <strong>{` ${session()?.title ?? "(untitled)"}`.slice(0, 70)}</strong>
          </span>
        </text>
        <text>
          <span style={{ fg: T.dim }}>
            {`${session()?.counts.messages ?? 0} msgs · ${humanTokens(session()?.usage.credits ?? 0)} credits · page ${
              Math.min(page(), pageCount() - 1) + 1
            }/${pageCount()} · thinking:${showThinking() ? "on" : "off"} · tool output:${showToolOutput() ? "on" : "off"}`}
          </span>
        </text>
      </box>
      <Show when={!transcript.loading} fallback={<text>loading transcript...</text>}>
        <scrollbox focused flexGrow={1} paddingX={1}>
          <For each={windowed()}>{(entry) => <Entry entry={entry} showToolOutput={showToolOutput()} />}</For>
        </scrollbox>
      </Show>
    </box>
  )
}

function Entry(props: { entry: TranscriptEntry; showToolOutput: boolean }) {
  const e = () => props.entry
  return (
    <Switch>
      <Match when={e().kind === "user"}>
        <box flexDirection="column" marginY={0} paddingX={1} borderColor={T.accent}>
          <text>
            <span style={{ fg: T.accent }}>
              <strong>user</strong>
            </span>
            <span style={{ fg: T.dim }}>{`  ${isoDate((e() as any).ts) ?? ""}`}</span>
          </text>
          <text selectable fg={T.fg}>
            {clip((e() as any).text, 4000)}
          </text>
        </box>
      </Match>
      <Match when={e().kind === "assistant"}>
        <box flexDirection="column" paddingX={1}>
          <text>
            <span style={{ fg: T.green }}>
              <strong>assistant</strong>
            </span>
          </text>
          <text selectable fg={T.fg}>
            {clip((e() as any).text, 8000)}
          </text>
        </box>
      </Match>
      <Match when={e().kind === "thinking"}>
        <box flexDirection="column" paddingX={1}>
          <text>
            <span style={{ fg: T.magenta }}>thinking</span>
          </text>
          <text selectable fg={T.dim}>
            {clip((e() as any).text, 2000)}
          </text>
        </box>
      </Match>
      <Match when={e().kind === "tool_call"}>
        <box flexDirection="column" paddingX={1}>
          <text>
            <span style={{ fg: (e() as any).isError ? T.red : T.cyan }}>
              {`> ${(e() as any).tool}${(e() as any).isError ? " (error)" : ""}`}
            </span>
            <span style={{ fg: T.dim }}>{`  ${clip(oneLine((e() as any).input), 120)}`}</span>
          </text>
          <Show when={props.showToolOutput && (e() as any).result}>
            <text selectable fg={T.dim}>
              {clip((e() as any).result ?? "", 3000)}
            </text>
          </Show>
        </box>
      </Match>
      <Match when={e().kind === "todo"}>
        <box paddingX={1}>
          <text fg={T.yellow}>{clip((e() as any).text, 1000)}</text>
        </box>
      </Match>
      <Match when={e().kind === "compaction"}>
        <box paddingX={1}>
          <text>
            <span style={{ fg: T.orange }}>--- context compacted ---</span>
          </text>
        </box>
      </Match>
      <Match when={e().kind === "session_end"}>
        <box paddingX={1}>
          <text>
            <span style={{ fg: T.dim }}>=== session ended ===</span>
          </text>
        </box>
      </Match>
    </Switch>
  )
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)} \u2026` : s)
const oneLine = (s: string) => s.replaceAll("\n", " ")
