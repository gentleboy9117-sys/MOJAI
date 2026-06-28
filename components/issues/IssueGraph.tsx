"use client";
import { useMemo } from "react";
import { ReactFlow, Background, Controls, type Node, type Edge, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface GNode { id: string; type: string; label: string }
interface GEdge { source: string; target: string; type: string }

const TYPE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  issue: { bg: "#003675", border: "#002046", color: "#ffffff" },
  office: { bg: "#eff5ff", border: "#246beb", color: "#16408d" },
  crime: { bg: "#fff7e6", border: "#ffb724", color: "#9a6a00" },
  region: { bg: "#e7f6ea", border: "#008a1e", color: "#00611a" },
  entity: { bg: "#f8f8f8", border: "#c6c6c6", color: "#555555" },
  article: { bg: "#ffffff", border: "#d8d8d8", color: "#717171" },
};
const EDGE_LABEL: Record<string, string> = {
  related_to: "관할", classified_as: "유형", located_in: "지역", mentioned_in: "언급", reported_by: "보도",
};

export function IssueGraph({ graph }: { graph: { nodes: GNode[]; edges: GEdge[] } }) {
  const { nodes, edges } = useMemo(() => {
    const others = graph.nodes.filter((n) => n.id !== "issue");
    const R = 200;
    const cx = 280, cy = 180;
    const nodes: Node[] = graph.nodes.map((n) => {
      const s = TYPE_STYLE[n.type] ?? TYPE_STYLE.entity;
      let pos = { x: cx, y: cy };
      if (n.id !== "issue") {
        const idx = others.indexOf(n);
        const ang = (idx / Math.max(1, others.length)) * Math.PI * 2 - Math.PI / 2;
        pos = { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) };
      }
      return {
        id: n.id,
        position: pos,
        data: { label: n.label },
        style: {
          background: s.bg, border: `1.5px solid ${s.border}`, color: s.color,
          borderRadius: 8, fontSize: 11, fontWeight: n.id === "issue" ? 700 : 500,
          padding: "6px 10px", width: n.id === "issue" ? 150 : "auto", textAlign: "center" as const,
        },
      };
    });
    const edges: Edge[] = graph.edges.map((e, i) => ({
      id: `e${i}`, source: e.source, target: e.target,
      label: EDGE_LABEL[e.type] ?? e.type,
      labelStyle: { fontSize: 9, fill: "#717171" },
      style: { stroke: "#c6c6c6" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#c6c6c6" },
    }));
    return { nodes, edges };
  }, [graph]);

  return (
    <div className="h-[360px] w-full rounded-md border border-line bg-white">
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
        <Background color="#e4e4e4" gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
