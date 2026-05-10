import vitalikDemoGraph from "./vitalik-demo-graph.json";
import { scenario02 } from "./demo/data/scenario-02-structuring";
import { scenario03 } from "./demo/data/scenario-03-mixer";

const VITALIK = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
const STRUCTURING = "0x1111111111111111111111111111111111111111";
const MIXER = "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936";

export async function resolveDemoGraph(address: string, maxHops: number = 5) {
  const addr = address.toLowerCase();

  if (addr === VITALIK) {
    // Add artificial delay to simulate realistic fetching time
    const delay = 1500 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return {
      meta: vitalikDemoGraph.meta,
      nodes: vitalikDemoGraph.nodes.filter(n => (n.hop ?? 0) <= maxHops),
      edges: vitalikDemoGraph.edges.filter(e => (e.hop ?? 0) <= maxHops),
    };
  }

  if (addr === STRUCTURING) {
    const delay = 1500 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return {
      meta: { target_address: address, resolved_at: new Date().toISOString() },
      nodes: scenario02.subgraph.nodes,
      edges: scenario02.subgraph.edges,
    };
  }

  if (addr === MIXER) {
    const delay = 1500 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return {
      meta: { target_address: address, resolved_at: new Date().toISOString() },
      nodes: scenario03.subgraph.nodes,
      edges: scenario03.subgraph.edges,
    };
  }

  return null;
}
