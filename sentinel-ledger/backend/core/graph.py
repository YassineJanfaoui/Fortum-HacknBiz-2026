"""LangGraph state machine — all real agents wired (Phase 3 complete)."""
from langgraph.graph import StateGraph, END
from backend.core.state import AgentState

# Real agents — all phases
from backend.agents.transaction_intelligence import transaction_intelligence_agent
from backend.agents.wallet_reputation import wallet_reputation_agent
from backend.agents.zk_compliance import zk_compliance_agent
from backend.agents.compliance_policy import compliance_policy_agent
from backend.agents.explainability import explainability_agent
from backend.agents.governance_sentinel import governance_sentinel
from backend.agents.audit import audit_agent


def build_graph():
    """Build and compile the full LangGraph agent pipeline."""
    g = StateGraph(AgentState)

    g.add_node("tx_intel", transaction_intelligence_agent)
    g.add_node("wallet_rep", wallet_reputation_agent)
    g.add_node("zk_compliance", zk_compliance_agent)
    g.add_node("opa_policy", compliance_policy_agent)
    g.add_node("explain", explainability_agent)
    g.add_node("governance", governance_sentinel)
    g.add_node("audit", audit_agent)

    g.set_entry_point("tx_intel")
    g.add_edge("tx_intel", "wallet_rep")
    g.add_edge("wallet_rep", "zk_compliance")
    g.add_edge("zk_compliance", "opa_policy")
    g.add_edge("opa_policy", "explain")
    g.add_edge("explain", "governance")
    g.add_edge("governance", "audit")
    g.add_edge("audit", END)

    return g.compile()
