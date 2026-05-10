'use client';

import { useCallback } from 'react';
import { api, traceToSubgraph } from '@/lib/api';
import { useDashboardStore } from '@/lib/store';
import { GraphCanvas } from './GraphCanvas';
import { GraphLegend } from './GraphLegend';
import { GraphToolbar } from './GraphToolbar';

export function WalletGraph() {
  const {
    graphNodes, graphEdges, setGraph,
    selectedNodeId, setSelectedNodeId,
    graphLoading, setGraphLoading,
    graphWallet,
  } = useDashboardStore();

  const handleSearch = useCallback(async (address: string, hops: number) => {
    setGraphLoading(true);
    setSelectedNodeId(null);
    try {
      const trace = await api.walletTrace(address, hops, 8, 120);
      const { nodes, edges } = traceToSubgraph(trace, address);
      setGraph(nodes, edges);
    } catch {
      // Show empty state on error
      setGraph([], []);
    } finally {
      setGraphLoading(false);
    }
  }, [setGraph, setGraphLoading, setSelectedNodeId]);

  const handleExpand = useCallback(async (address: string) => {
    if (!address) return;
    setGraphLoading(true);
    try {
      const trace = await api.walletTrace(address, 1, 6, 30);
      const { nodes: newNodes, edges: newEdges } = traceToSubgraph(trace, address);

      // Merge: avoid duplicate ids
      const existingIds = new Set(graphNodes.map((n) => n.id));
      const merged = [
        ...graphNodes,
        ...newNodes.filter((n) => !existingIds.has(n.id)),
      ];
      const existingEdgeIds = new Set(graphEdges.map((e) => e.id));
      const mergedEdges = [
        ...graphEdges,
        ...newEdges.filter((e) => !existingEdgeIds.has(e.id)),
      ];
      setGraph(merged, mergedEdges);
    } catch {
      // ignore
    } finally {
      setGraphLoading(false);
    }
  }, [graphNodes, graphEdges, setGraph, setGraphLoading]);

  const nodeCount = graphNodes.length;
  const showTopN = nodeCount > 200;
  const visibleNodes = showTopN
    ? [...graphNodes].sort((a, b) => b.tx_count - a.tx_count).slice(0, 200)
    : graphNodes;
  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = graphEdges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        background: 'var(--color-background-primary)',
      }}
    >
      <GraphToolbar onSearch={handleSearch} loading={graphLoading} />

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {showTopN && (
          <div
            style={{
              position: 'absolute', top: 8, right: 12, zIndex: 10,
              background: 'rgba(15,21,36,0.85)', border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 'var(--border-radius-md)', padding: '4px 8px',
              fontSize: 10, color: 'var(--color-text-secondary)',
              backdropFilter: 'blur(8px)',
            }}
          >
            Showing top 200 of {nodeCount} nodes by tx volume
          </div>
        )}

        {graphWallet && (
          <div
            style={{
              position: 'absolute', top: 8, left: 12, zIndex: 10,
              background: 'rgba(15,21,36,0.85)', border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 'var(--border-radius-md)', padding: '4px 8px',
              fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {graphWallet.slice(0, 6)}…{graphWallet.slice(-4)}&nbsp;·&nbsp;
            <span style={{ color: 'var(--color-text-secondary)' }}>{visibleNodes.length} nodes · {visibleEdges.length} edges</span>
          </div>
        )}

        <GraphCanvas
          nodes={visibleNodes}
          edges={visibleEdges}
          selectedId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onExpandNode={handleExpand}
          loading={graphLoading}
        />

        <GraphLegend />
      </div>
    </div>
  );
}
