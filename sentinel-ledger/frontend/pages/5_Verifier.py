"""Cryptographic Verifier — check ZK bundles and HMAC chains mathematically."""
import streamlit as st
import httpx
import time

st.set_page_config(page_title="Verifier | Sentinel Ledger", layout="wide")

API_URL = st.session_state.get("api_url", "http://localhost:8000")

st.title("🛡️ Cryptographic Verifier")
st.caption("Verify the mathematical proofs of any transaction analyzed by the system.")

tx_id_to_verify = st.text_input("Enter Transaction ID to Verify:", value="TX-CLEAN-001")

if st.button("🔍 Verify Cryptographic Proofs", type="primary", use_container_width=True):
    with st.spinner("Requesting verification..."):
        try:
            resp = httpx.get(f"{API_URL}/verify/{tx_id_to_verify}", timeout=10.0)
            if resp.status_code == 404:
                st.error("Transaction not found.")
                st.stop()
            resp.raise_for_status()
            v_result = resp.json()
        except Exception as e:
            st.error(f"Verification request failed: {e}")
            st.stop()
            
    # Animated checks
    st.subheader("Verification Sequence")
    
    # 1. Merkle Root
    with st.empty():
        st.info("⏳ Checking published Merkle Root...")
        time.sleep(0.5)
        if v_result['merkle_root_published']:
            st.success("✅ Merkle Root matches published OFAC SDN tree.")
        else:
            st.error("❌ Merkle Root mismatch or tree not found.")
            
    # 2. Non-Inclusion Proof
    with st.empty():
        st.info("⏳ Verifying Sender Wallet Non-Inclusion Proof...")
        time.sleep(0.5)
        if v_result['sanctions_non_inclusion_proof_valid']:
            st.success("✅ Sanctions non-inclusion proof is cryptographically valid.")
        else:
            st.error("❌ Sanctions proof invalid! Wallet may be sanctioned.")
            
    # 3. HMAC Chain
    with st.empty():
        st.info("⏳ Recomputing HMAC-SHA256 Audit Chain...")
        time.sleep(0.5)
        if v_result['audit_chain_intact']:
            st.success("✅ Audit chain is fully intact. No records altered.")
        else:
            st.error("❌ Audit chain integrity check failed!")
            st.write(v_result.get('audit_chain_errors', []))
            
    st.divider()
    if v_result["all_proofs_valid"]:
        st.markdown(f"""
        <div style="background-color: #d1fae5; padding: 20px; border-radius: 10px; border: 2px solid #10b981; text-align: center;">
            <h2 style="color: #047857; margin: 0;">🎉 All Proofs Valid</h2>
            <p style="color: #065f46; margin-top: 10px;">The transaction record is cryptographically sound and untampered.</p>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown(f"""
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 10px; border: 2px solid #ef4444; text-align: center;">
            <h2 style="color: #b91c1c; margin: 0;">🚨 Verification Failed</h2>
            <p style="color: #991b1b; margin-top: 10px;">The data integrity or cryptographic proofs could not be verified.</p>
        </div>
        """, unsafe_allow_html=True)
