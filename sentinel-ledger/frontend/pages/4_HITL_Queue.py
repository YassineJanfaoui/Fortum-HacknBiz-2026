"""HITL Queue — Human-in-the-Loop review for escalated transactions."""
import streamlit as st
import httpx
from datetime import datetime

st.set_page_config(page_title="HITL Queue | Sentinel Ledger", layout="wide")

API_URL = st.session_state.get("api_url", "http://localhost:8000")

st.title("👤 Human-in-the-Loop Queue")
st.caption("Review transactions that the AI escalated for human compliance review.")

if st.button("🔄 Refresh Queue"):
    pass

with st.spinner("Fetching pending escalations..."):
    try:
        resp = httpx.get(f"{API_URL}/hitl/pending", timeout=10.0)
        resp.raise_for_status()
        pending = resp.json()
    except Exception as e:
        st.error(f"Error connecting to API: {e}")
        st.stop()

if not pending:
    st.success("🎉 Queue is empty! No pending escalations.")
    st.stop()

st.write(f"**{len(pending)}** transactions pending review.")

for idx, rec in enumerate(pending):
    tx_id = rec["tx_id"]
    st.markdown(f"### {tx_id}")
    st.write(f"**Escalation Reason:** {rec.get('governance_reason', 'N/A')}")
    st.info(rec.get("explanation", "No AI explanation available."))
    
    with st.form(key=f"hitl_form_{idx}"):
        st.write("Review Evidence in the Evidence Explorer page using the TX ID.")
        operator = st.text_input("Operator ID", value="demo_operator", key=f"op_{idx}")
        notes = st.text_area("Review Notes", key=f"notes_{idx}")
        
        col1, col2 = st.columns(2)
        with col1:
            approve = st.form_submit_button("✅ Approve Transaction", use_container_width=True)
        with col2:
            reject = st.form_submit_button("❌ Reject Transaction", use_container_width=True)
            
        if approve or reject:
            action = "approve" if approve else "reject"
            with st.spinner(f"Submitting {action}..."):
                try:
                    res = httpx.post(f"{API_URL}/operator/{action}/{tx_id}?operator_id={operator}", timeout=10.0)
                    res.raise_for_status()
                    st.success(f"Transaction {tx_id} {action}d successfully!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to submit decision: {e}")
    st.divider()
