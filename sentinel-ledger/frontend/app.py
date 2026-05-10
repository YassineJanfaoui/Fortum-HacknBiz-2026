"""Sentinel Ledger Streamlit frontend — Phase 0 bootstrap."""
import streamlit as st

st.set_page_config(page_title="Sentinel Ledger", layout="wide")
st.title("Sentinel Ledger — NORDA AML Trust Layer")
st.sidebar.markdown("### Demo Controls")
api_url = st.sidebar.text_input("API URL", value="http://localhost:8000")
st.session_state["api_url"] = api_url

st.markdown("Use the sidebar to navigate pages.")
st.info("Phase 0 bootstrap — backend and frontend are starting up.")
