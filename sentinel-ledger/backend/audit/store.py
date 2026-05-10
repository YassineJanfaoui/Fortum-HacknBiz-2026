"""SQLite-backed audit record store with HMAC-SHA256 chain integrity."""
import json
import sqlite3
import hashlib
import hmac
from typing import Optional
from backend.core.schemas import AuditRecord

_GENESIS_HASH = "0" * 64  # sentinel previous hash for the first record


class AuditStore:
    """Append-only audit log with HMAC-chained records stored in SQLite."""

    def __init__(self, db_url: str, hmac_key: bytes) -> None:
        # Extract file path from sqlite URL: sqlite:///./foo.db → ./foo.db
        db_path = db_url.replace("sqlite:///", "")
        self._db_path = db_path
        self._hmac_key = hmac_key
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS audit_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tx_id TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    record_json TEXT NOT NULL,
                    record_hash TEXT NOT NULL,
                    prev_record_hash TEXT NOT NULL,
                    signature TEXT NOT NULL,
                    created_at REAL DEFAULT (julianday('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_tx_id ON audit_records(tx_id);
                CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_records(timestamp);
            """)

    def _sign(self, canonical: str) -> str:
        return hmac.new(self._hmac_key, canonical.encode(), hashlib.sha256).hexdigest()

    def _hash_record(self, canonical: str) -> str:
        return hashlib.sha256(canonical.encode()).hexdigest()

    def append(self, record: AuditRecord) -> AuditRecord:
        """Sign, hash, and insert a record. Returns record with signature filled in."""
        # Canonicalize without signature field
        data = record.model_dump(exclude={"signature"})
        canonical = json.dumps(data, sort_keys=True, default=str)

        record_hash = self._hash_record(canonical)
        signature = self._sign(canonical)
        record.signature = signature

        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO audit_records
                    (tx_id, timestamp, record_json, record_hash, prev_record_hash, signature)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    record.tx_id,
                    record.timestamp,
                    record.model_dump_json(),
                    record_hash,
                    record.prev_record_hash,
                    signature,
                ),
            )
        return record

    def get(self, tx_id: str) -> Optional[AuditRecord]:
        """Fetch the latest record for a tx_id."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT record_json FROM audit_records WHERE tx_id = ? ORDER BY id DESC LIMIT 1",
                (tx_id,),
            ).fetchone()
        if not row:
            return None
        return AuditRecord.model_validate_json(row["record_json"])

    def latest_hash(self) -> str:
        """Return the record_hash of the most recent record (or genesis hash)."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT record_hash FROM audit_records ORDER BY id DESC LIMIT 1"
            ).fetchone()
        return row["record_hash"] if row else _GENESIS_HASH

    def verify_chain(self) -> tuple[bool, list[str]]:
        """Verify HMAC signatures and hash chain for all records."""
        errors: list[str] = []
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, tx_id, record_json, record_hash, signature
                FROM audit_records
                ORDER BY id ASC
                """
            ).fetchall()

        expected_prev = _GENESIS_HASH
        for row in rows:
            data = json.loads(row["record_json"])
            record_prev_hash = data.get("prev_record_hash", "")
            data.pop("signature", None)
            canonical = json.dumps(data, sort_keys=True, default=str)

            if record_prev_hash != expected_prev:
                errors.append(
                    f"Record id={row['id']} tx_id={row['tx_id']}: prev hash mismatch"
                )

            # Verify HMAC
            expected_sig = self._sign(canonical)
            if not hmac.compare_digest(expected_sig, row["signature"]):
                errors.append(f"Record id={row['id']} tx_id={row['tx_id']}: HMAC mismatch")

            # Verify hash
            expected_hash = self._hash_record(canonical)
            if expected_hash != row["record_hash"]:
                errors.append(f"Record id={row['id']} tx_id={row['tx_id']}: hash mismatch")
            expected_prev = row["record_hash"]

        return len(errors) == 0, errors

    def append_human_decision(self, record: AuditRecord) -> AuditRecord:
        """Re-sign and update a record with human decision fields."""
        return self.append(record)

    def all_records(self, limit: int = 100, offset: int = 0) -> list[AuditRecord]:
        """Return paginated audit records, newest first."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT record_json FROM audit_records ORDER BY id DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ).fetchall()
        return [AuditRecord.model_validate_json(r["record_json"]) for r in rows]

    def pending_hitl(self) -> list[AuditRecord]:
        """Return records that require human review and haven't been decided."""
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT record_json FROM audit_records
                WHERE id IN (
                    SELECT MAX(id) FROM audit_records GROUP BY tx_id
                )
                  AND json_extract(record_json, '$.requires_hitl') = 1
                  AND json_extract(record_json, '$.human_decision') IS NULL
                ORDER BY id DESC
                """
            ).fetchall()
        results = []
        for r in rows:
            rec = AuditRecord.model_validate_json(r["record_json"])
            if rec.requires_hitl and rec.human_decision is None:
                results.append(rec)
        return results
