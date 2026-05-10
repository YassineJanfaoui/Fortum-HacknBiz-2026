import vitalikDemoGraph from "./vitalik-demo-graph.json";

const VITALIK = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";

export async function resolveDemoGraph(address: string, maxHops: number = 5) {
  if (address.toLowerCase() === VITALIK) {
    // Add artificial delay to simulate realistic fetching time
    const delay = 1500 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return {
      meta: vitalikDemoGraph.meta,
      nodes: vitalikDemoGraph.nodes.filter(n => (n.hop ?? 0) <= maxHops),
      edges: vitalikDemoGraph.edges.filter(e => (e.hop ?? 0) <= maxHops),
    };
  }

  return null;
}
