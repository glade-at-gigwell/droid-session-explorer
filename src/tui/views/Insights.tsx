import { createMemo } from "solid-js"
import { insightsReport } from "../../query/insights"
import { humanDate } from "../../cli/format"
import { useApp } from "../state"
import { T } from "../theme"

export function Insights() {
  const app = useApp()
  const report = createMemo(() => insightsReport(app.ctx.db, { limit: 100 }))

  const options = createMemo(() =>
    report().insights.map((i) => ({
      name: `[${i.kind.padEnd(16)}] ${i.session.id.slice(0, 8)}  ${(
        i.session.title ?? "(untitled)"
      ).slice(0, 55)}`,
      description: `${i.detail} · ${i.session.project} · ${humanDate(i.session.updatedAt)}`,
      value: i.session.id,
    })),
  )

  return (
    <box flexDirection="column" flexGrow={1} padding={1}>
      <box height={1} flexDirection="row" gap={3}>
        <text>
          <span style={{ fg: T.dim }}>tool error rate </span>
          <span style={{ fg: T.red }}>{`${(report().overall.toolErrorRate * 100).toFixed(1)}%`}</span>
        </text>
        <text>
          <span style={{ fg: T.dim }}>interruption rate </span>
          <span style={{ fg: T.yellow }}>{`${(report().overall.interruptionRate * 100).toFixed(1)}%`}</span>
        </text>
        <text>
          <span style={{ fg: T.dim }}>sessions </span>
          <span style={{ fg: T.accent }}>{String(report().overall.sessions)}</span>
        </text>
      </box>
      <select
        options={options()}
        onSelect={(_i: number, option: { value?: string } | null) => {
          if (option?.value) app.openTranscript(option.value)
        }}
        focused
        flexGrow={1}
        showDescription
      />
    </box>
  )
}
