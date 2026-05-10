.PHONY: install install-frontend run-api run-frontend run-all run-all-win clean-generated test demo-clean demo-suspicious demo-injection sanctions

install:
	pip install -r requirements.txt
	@echo "Install OPA: brew install opa  OR  apt install opa  OR  winget install OPA.OPA"

install-frontend:
	cd frontend-next && npm install

sanctions:
	python scripts/build_sanctions.py

run-api:
	uvicorn backend.api.main:app --reload --port 8000

run-frontend:
	cd frontend-next && npm run dev

run-all:
	(make run-api &) && make run-frontend

run-all-win:
	powershell -ExecutionPolicy Bypass -File scripts/start_dev.ps1

clean-generated:
	powershell -ExecutionPolicy Bypass -File scripts/clean_generated.ps1

test:
	pytest tests/ -v

demo-clean:
	curl -X POST http://localhost:8000/analyze -H "Content-Type: application/json" -d @demos/tx_clean.json | python -m json.tool

demo-suspicious:
	curl -X POST http://localhost:8000/analyze -H "Content-Type: application/json" -d @demos/tx_suspicious.json | python -m json.tool

demo-injection:
	curl -X POST http://localhost:8000/analyze -H "Content-Type: application/json" -d @demos/tx_injection.json | python -m json.tool
