"""Evidence Explorer — deep dive into agent outputs and ZK proofs for a transaction."""
import streamlit as st
import httpx
from datetime import datetime

st.set_page_config(page_title="Evidence | Sentinel Ledger", layout="wide")

API_URL = st.session_state.get("api_url", "http://localhost:8000")

st.title("📂 Evidence Explorer")
st.caption("Deep dive into agent outputs, compliance policies, and cryptographic proofs.")

tx_id = st.text_input("Enter Transaction ID to load evidence:", value="TX-CLEAN-001")

if st.button("Load Evidence", type="primary"):
    with st.spinner("Fetching audit record..."):
        try:
            resp = httpx.get(f"{API_URL}/audit/{tx_id}", timeout=10.0)
            if resp.status_code == 404:
                st.warning("Transaction not found in audit store.")
                st.stop()
            resp.raise_for_status()
            record = resp.json()
        except Exception as e:
            st.error(f"Error connecting to API: {e}")
            st.stop()

    st.subheader(f"Record for {record['tx_id']}")
    st.write(f"**Timestamp:** {datetime.fromtimestamp(record['timestamp']).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    st.write(f"**Decision:** `{record['governance_decision']}` — {record.get('governance_reason', 'N/A')}")
    
    if record.get('explanation'):
        st.info(record['explanation'])

    outputs = record.get("agent_outputs", {})
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### 🔍 AI Analysis")
        if outputs.get("tx_risk"):
            st.json(outputs["tx_risk"])
        else:
            st.write("No TxRisk data.")
            
        st.markdown("### 🏦 Wallet Reputation")
        if outputs.get("wallet_risk"):
            st.json(outputs["wallet_risk"])
        else:
            st.write("No WalletRisk data.")

    with col2:
        st.markdown("### ⚖️ OPA Policy Eval")
        opa = outputs.get("opa_result", {})
        if opa:
            vols = opa.get("violations", [])
            if vols:
                for v in vols:
                    st.error(f"Violation: {v}")
            else:
                st.success("No OPA violations.")
            st.write(f"Requires SAR: {opa.get('requires_sar', False)}")
        else:
            st.write("No OPA data.")
            
        st.markdown("### 🛡️ Guardrails Logs (Injection Defense)")
        if outputs.get("injection_detected"):
            st.error(f"🚨 **Injection Detected!**\n\n**Reason:** {outputs.get('injection_reason')}")
            st.warning("The pipeline was instantly halted before reaching the AI. The LLM was protected.")
        else:
            st.success("✅ Clean. No prompt injection signatures detected.")
            
    st.divider()
    st.markdown("### 🕸️ Wallet Interaction Graph")
    st.caption("Visualizing the 1-hop transaction network (Powered by NetworkX)")
    
    from streamlit_agraph import agraph, Node, Edge, Config
    
    nodes = []
    edges = []
    
    # Check if we have dynamic network graph data from the backend
    wallet_risk = outputs.get("wallet_risk", {})
    network_graph_data = wallet_risk.get("network_graph", {})
    
    # Try to get the real wallet address for highlighting, fallback to tx_id suffix
    main_wallet = record.get("agent_outputs", {}).get("wallet_risk", {}).get("cluster_id", "")
    if not main_wallet:
        main_wallet = record.get("tx_id", "Unknown")[-4:]
    
    if network_graph_data and network_graph_data.get("nodes"):
        st.success("✅ Loading dynamic transaction graph directly from NetworkX")
        for n in network_graph_data.get("nodes", []):
            color = "#f87171" if n["id"].lower() == main_wallet.lower() else "#3b82f6"
            nodes.append(Node(id=n["id"], label=n.get("label", n["id"][:8]), size=20, color=color))
        for e in network_graph_data.get("edges", []):
            edges.append(Edge(source=e["source"], target=e["target"], label="Tx"))
    else:
        st.info("ℹ️ Using mock visual graph for this demo transaction")
        # Mocking the visual graph for the demo based on the transaction data
        nodes.append(Node(id="Sender", label=f"Sender\n({main_wallet})", size=30, color="#3b82f6"))
        nodes.append(Node(id="Receiver", label="Receiver\n(Destination)", size=30, color="#10b981"))
        edges.append(Edge(source="Sender", target="Receiver", label="Current Tx"))
        
        # Generate complex realistic topologies based on the context
        if record["governance_decision"] == "BLOCK_INJECTION":
            nodes.append(Node(id="Hacker", label="Attacker\nInfrastructure", size=35, color="#000000", shape="diamond"))
            edges.append(Edge(source="Hacker", target="Sender", label="Malicious Payload"))
            nodes.append(Node(id="BotNet1", label="BotNet Node A", size=15, color="#374151"))
            nodes.append(Node(id="BotNet2", label="BotNet Node B", size=15, color="#374151"))
            edges.append(Edge(source="BotNet1", target="Hacker", label="Proxy"))
            edges.append(Edge(source="BotNet2", target="Hacker", label="Proxy"))
    
        elif record["tx_id"] == "TX-MIXER-004":
            # Darknet Mixer Scenario
            nodes.append(Node(id="Tornado", label="Tornado Cash\n(Mixer)", size=35, color="#ef4444", shape="hexagon"))
            edges.append(Edge(source="Tornado", target="Sender", label="Washed Funds (1 hop)"))
            for i in range(1, 6):
                nodes.append(Node(id=f"Anon{i}", label=f"Anon Wallet {i}", size=15, color="#f87171"))
                edges.append(Edge(source=f"Anon{i}", target="Tornado", label="Deposit"))
                
        elif record["tx_id"] == "TX-SUSP-002" or "Structuring" in record.get("governance_reason", ""):
            # Structuring/Velocity scenario
            nodes.append(Node(id="Hub", label="Central Hub", size=25, color="#f59e0b"))
            edges.append(Edge(source="Hub", target="Sender", label="Funding"))
            for i in range(1, 8):
                nodes.append(Node(id=f"Smurf{i}", label=f"Smurf Wallet {i}", size=15, color="#fbbf24"))
                edges.append(Edge(source=f"Smurf{i}", target="Receiver", label="Split Tx"))
                edges.append(Edge(source="Hub", target=f"Smurf{i}", label="Split Funding"))
                
        elif record["governance_decision"] == "AUTO_APPROVE":
            nodes.append(Node(id="Binance", label="Binance Hot Wallet", size=25, color="#8b5cf6"))
            nodes.append(Node(id="Coinbase", label="Coinbase", size=25, color="#8b5cf6"))
            edges.append(Edge(source="Binance", target="Sender", label="Withdrawal"))
            edges.append(Edge(source="Sender", target="Coinbase", label="Past Tx"))
        
    config = Config(width=900, height=500, directed=True, physics=True, hierarchical=False, nodeHighlightBehavior=True, highlightColor="#F7A7A6")
    agraph(nodes=nodes, edges=edges, config=config)

    st.divider()
    st.markdown("### 🔐 Cryptographic Proofs (ZK Bundle)")
    zk = record.get("zk_bundle", {})
    if zk:
        st.code(f"""
Amount Commitment (Pedersen):
{zk.get('amount_commit')}

Wallet Commitment (Pedersen):
{zk.get('wallet_commit')}

Merkle Root:
{zk.get('merkle_root')}
        """)
        with st.expander("View Full Merkle Non-Inclusion Proof"):
            st.json(zk.get("sanctions_proof", {}))
    else:
        st.write("No ZK Bundle generated.")
