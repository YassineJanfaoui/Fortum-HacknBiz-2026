.PHONY: install run-api run-frontend run-all test demo-clean demo-suspicious demo-injection sanctions

install:
	pip install -r requirements.txt
	@echo "Install OPA: brew install opa  OR  apt install opa  OR  winget install OPA.OPA"

sanctions:
	python scripts/build_sanctions.py

run-api:
	uvicorn backend.api.main:app --reload --port 8000

run-frontend:
	streamlit run frontend/app.py --server.port 8501

run-all:
	(make run-api &) && make run-frontend

test:
	pytest tests/ -v

demo-clean:
	curl -X POST http://localhost:8000/analyze -H "Content-Type: application/json" -d @demos/tx_clean.json | python -m json.tool

demo-suspicious:
	curl -X POST http://localhost:8000/analyze -H "Content-Type: application/json" -d @demos/tx_suspicious.json | python -m json.tool

demo-injection:
	curl -X POST http://localhost:8000/analyze -H "Content-Type: application/json" -d @demos/tx_injection.json | python -m json.tool
