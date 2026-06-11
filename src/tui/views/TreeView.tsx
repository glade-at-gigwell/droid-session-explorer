import { createMemo } from "solid-js"
import { lineage, type TreeNode } from "../../query/tree"
import { humanDate, humanTokens } from "../../cli/format"
import { useApp } from "../state"
import { T } from "../theme"

interface FlatNode {
  label: string
  meta: string
  id: string
}

export function TreeView() {
  const app = useApp()

  const flat = createMemo<FlatNode[]>(() => {
    const id = app.selectedSession()
    if (!id) return []
    const root = lineage(app.ctx.db, id)
    const out: FlatNode[] = []
    const walk = (n: TreeNode, depth: number) => {
      const badge =
        n.edgeKind === "fork" ? "[fork] " : n.edgeKind === "subagent" ? "[sub] " : ""
      out.push({
        id: n.id,
        label: `${"  ".repeat(depth)}${badge}${n.id.slice(0, 8)}  ${
          n.session?.title ?? "(missing)"
        }`,
        meta: n.session
          ? `${n.session.counts.messages} msgs · ${humanTokens(n.session.usage.credits)} credits · ${humanDate(n.session.updatedAt)}`
          : "session files no longer on disk",
      })
      n.children.forEach((c) => walk(c, depth + 1))
    }
    walk(root, 0)
    return out
  })

  const options = createMemo(() =>
    flat().map((n) => ({ name: n.label, description: n.meta, value: n.id })),
  )

  return (
    <box flexDirection="column" flexGrow={1} padding={1}>
      <text>
        <span style={{ fg: T.dim }}>fork + subagent lineage</span>
      </text>
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
