import { createMemo, createSignal, For } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { byDay, byGroup, byHour, byTool } from "../../query/stats"
import { humanDuration, humanTokens } from "../../cli/format"
import { useApp } from "../state"
import { T } from "../theme"

type Dim = "model" | "project" | "tool" | "day" | "hour"
const DIMS: Dim[] = ["model", "project", "tool", "day", "hour"]

export function StatsView() {
  const app = useApp()
  const [dim, setDim] = createSignal<Dim>("model")

  useKeyboard((key) => {
    if (app.inputActive()) return
    const seq = key.sequence ?? key.name
    if (seq === "tab" || key.name === "tab") {
      setDim((d) => DIMS[(DIMS.indexOf(d) + 1) % DIMS.length]!)
    }
  })

  const rows = createMemo<string[]>(() => {
    const db = app.ctx.db
    switch (dim()) {
      case "model":
      case "project":
        return byGroup(db, dim() as "model" | "project")
          .slice(0, 30)
          .map(
            (g) =>
              `${(dim() === "project" ? g.key.split("/").slice(-2).join("/") : g.key)
                .padEnd(36)
                .slice(0, 36)} ${String(g.sessions).padStart(5)} ses ${humanTokens(g.inputTokens).padStart(8)} in ${humanTokens(g.outputTokens).padStart(8)} out ${humanDuration(g.activeTimeMs).padStart(8)} ${g.credits.toLocaleString().padStart(15)} cr`,
          )
      case "tool":
        return byTool(db)
          .slice(0, 30)
          .map(
            (t) =>
              `${t.tool.padEnd(36).slice(0, 36)} ${t.calls.toLocaleString().padStart(9)} calls ${String(t.errors).padStart(7)} err (${
                t.calls ? ((t.errors / t.calls) * 100).toFixed(1) : "0"
              }%)  ${String(t.sessions).padStart(5)} ses`,
          )
      case "day":
        return byDay(db)
          .slice(-35)
          .map(
            (d) =>
              `${d.day}  ${String(d.sessions).padStart(4)} ses ${String(d.messages).padStart(7)} msgs ${humanTokens(d.inputTokens).padStart(8)} in ${humanTokens(d.outputTokens).padStart(8)} out ${d.credits.toLocaleString().padStart(15)} cr`,
          )
      case "hour": {
        const hours = byHour(db)
        const map = new Map(hours.map((h) => [h.hour, h.messages]))
        const values = Array.from({ length: 24 }, (_, h) => map.get(h) ?? 0)
        const max = Math.max(...values, 1)
        return values.map(
          (v, h) =>
            `${String(h).padStart(2, "0")}:00 ${"\u2588".repeat(Math.round((v / max) * 50)).padEnd(50)} ${v.toLocaleString()}`,
        )
      }
    }
  })

  return (
    <box flexDirection="column" flexGrow={1} padding={1}>
      <box height={1} flexDirection="row" gap={2}>
        <For each={DIMS}>
          {(d) => (
            <text>
              {dim() === d ? (
                <span style={{ fg: T.bg, bg: T.accent }}>{` ${d} `}</span>
              ) : (
                <span style={{ fg: T.dim }}>{` ${d} `}</span>
              )}
            </text>
          )}
        </For>
        <text>
          <span style={{ fg: T.dim }}>(tab to cycle)</span>
        </text>
      </box>
      <scrollbox focused flexGrow={1}>
        <For each={rows()}>
          {(row) => (
            <text selectable fg={T.fg}>
              {row}
            </text>
          )}
        </For>
      </scrollbox>
    </box>
  )
}
