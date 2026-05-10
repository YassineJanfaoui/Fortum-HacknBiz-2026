"""Audit Trail — view the immutable HMAC chain of transactions."""
import streamlit as st
import httpx
from datetime import datetime
import pandas as pd

st.set_page_config(page_title="Audit Trail | Sentinel Ledger", layout="wide")

API_URL = st.session_state.get("api_url", "http://localhost:8000")

st.title("🗄️ Audit Trail")
st.caption("Immutable ledger of all transactions, decisions, and evidence hashes.")

# Pagination controls
col1, col2 = st.columns([1, 4])
with col1:
    limit = st.number_input("Records to fetch", min_value=10, max_value=500, value=50)

if st.button("🔄 Refresh Audit Log"):
    pass # Re-runs the page

with st.spinner("Loading audit chain..."):
    try:
        resp = httpx.get(f"{API_URL}/audit?limit={limit}", timeout=10.0)
        resp.raise_for_status()
        records = resp.json()
    except Exception as e:
        st.error(f"Error fetching audit records: {e}")
        st.stop()

if not records:
    st.info("No records found in the audit store.")
else:
    # Convert to dataframe for nice display
    data = []
    for r in records:
        data.append({
            "Timestamp": datetime.fromtimestamp(r["timestamp"]).strftime('%Y-%m-%d %H:%M:%S'),
            "TX ID": r["tx_id"],
            "Decision": r["governance_decision"],
            "HITL Status": r.get("human_decision", "N/A") if r.get("human_decision") else "Pending" if "ESCALATE" in r["governance_decision"] else "-",
            "Hash": r["signature"][:16] + "..." if r.get("signature") else "N/A"
        })
    df = pd.DataFrame(data)
    
    # Apply some basic color styling based on decision
    def color_decision(val):
        if 'APPROVE' in str(val): return 'color: green'
        elif 'BLOCK' in str(val): return 'color: red'
        elif 'ESCALATE' in str(val): return 'color: orange'
        return ''
    
    st.dataframe(df.style.map(color_decision, subset=['Decision']), use_container_width=True)


