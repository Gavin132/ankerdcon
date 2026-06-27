#!/usr/bin/env python3
"""
db/check_schema.py
──────────────────
Compares db/schema.sql against the live Supabase database and reports
any missing tables, missing columns, or type mismatches.

Usage:
    python db/check_schema.py

Reads SUPABASE_URL and SUPABASE_SECRET_KEY from backend/.env
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv
import os

# ── Config ────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / "backend" / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("✗  SUPABASE_URL and SUPABASE_SECRET_KEY must be set in backend/.env")
    sys.exit(1)

SCHEMA_FILE = Path(__file__).parent / "schema.sql"

# ── PostgreSQL type normalisation ─────────────────────────────────────────────
# Maps the types we write in schema.sql to what Supabase/PostgREST reports back.

TYPE_MAP: dict[str, list[str]] = {
    "uuid":        ["uuid"],
    "text":        ["text", "character varying", "varchar"],
    "boolean":     ["boolean", "bool"],
    "bool":        ["boolean", "bool"],
    "integer":     ["integer", "int4", "int"],
    "int":         ["integer", "int4"],
    "float":       ["double precision", "float8", "real", "numeric"],
    "jsonb":       ["jsonb"],
    "json":        ["json", "jsonb"],
    "timestamptz": ["timestamp with time zone", "timestamptz"],
    "text[]":      ["ARRAY", "text[]"],  # PostgREST reports arrays as "ARRAY"
    "uuid[]":      ["ARRAY", "uuid[]"],
}


def normalise(pg_type: str) -> str:
    return pg_type.lower().strip()


# ── Parse schema.sql ──────────────────────────────────────────────────────────

def parse_schema(path: Path) -> dict[str, dict[str, str]]:
    """
    Returns {table_name: {column_name: declared_type}}.
    Only parses CREATE TABLE blocks — skips ALTERs, GRANTs, comments.
    """
    sql = path.read_text(encoding="utf-8")

    tables: dict[str, dict[str, str]] = {}

    # Match each CREATE TABLE IF NOT EXISTS <name> ( ... );
    pattern = re.compile(
        r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\((.+?)\);",
        re.IGNORECASE | re.DOTALL,
    )

    for match in pattern.finditer(sql):
        table_name = match.group(1).lower()
        body = match.group(2)
        columns: dict[str, str] = {}

        for line in body.splitlines():
            line = line.strip().rstrip(",")
            if not line:
                continue
            # Skip constraints / table-level options
            if re.match(r"(PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY|CONSTRAINT)", line, re.IGNORECASE):
                continue

            # Match:  column_name  TYPE[optional []]  [NOT NULL / DEFAULT / ...]
            # Stop the type capture before any SQL keyword modifier.
            col_match = re.match(
                r"(\w+)\s+((?:timestamp\s+with\s+time\s+zone|\w+)(?:\[\])?)",
                line,
                re.IGNORECASE,
            )
            if col_match:
                col_name = col_match.group(1).lower()
                col_type = col_match.group(2).lower().strip()
                # Skip SQL keywords that aren't column names
                skip = {"primary", "unique", "check", "foreign", "constraint",
                        "not", "null", "default", "references", "on"}
                if col_name in skip:
                    continue
                columns[col_name] = col_type

        tables[table_name] = columns

    return tables


# ── Fetch live schema from Supabase OpenAPI ───────────────────────────────────

def fetch_live_schema() -> dict[str, dict[str, str]]:
    """
    Calls the Supabase REST OpenAPI endpoint and returns
    {table_name: {column_name: pg_type}}.
    """
    url = f"{SUPABASE_URL}/rest/v1/"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }

    response = httpx.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    spec = response.json()

    tables: dict[str, dict[str, str]] = {}

    # OpenAPI 2.0 format (what Supabase uses)
    definitions = spec.get("definitions", {})
    for table_name, definition in definitions.items():
        props = definition.get("properties", {})
        columns: dict[str, str] = {}
        for col_name, col_def in props.items():
            # PostgREST reports type in "format" (preferred) or "type"
            pg_type = col_def.get("format") or col_def.get("type") or "unknown"
            columns[col_name.lower()] = normalise(pg_type)
        tables[table_name.lower()] = columns

    return tables


# ── Compare ───────────────────────────────────────────────────────────────────

def check(expected: dict[str, dict[str, str]], live: dict[str, dict[str, str]]) -> int:
    """Prints a diff report. Returns number of issues found."""
    issues = 0

    print(f"\n{'-' * 60}")
    print(f"  Checking {len(expected)} table(s) defined in schema.sql")
    print(f"{'-' * 60}\n")

    for table, exp_cols in sorted(expected.items()):
        if table not in live:
            print(f"  MISSING TABLE: {table}")
            issues += 1
            continue

        live_cols = live[table]
        col_issues: list[str] = []

        for col, exp_type in sorted(exp_cols.items()):
            if col not in live_cols:
                col_issues.append(f"      MISSING COLUMN: {col}  ({exp_type})")
                issues += 1
            else:
                live_type = live_cols[col]
                accepted = TYPE_MAP.get(exp_type, [exp_type])
                # Check if the live type matches any accepted alias
                if not any(a in live_type or live_type in a for a in accepted):
                    col_issues.append(
                        f"      TYPE MISMATCH:  {col}  "
                        f"(expected ~{exp_type}, got {live_type})"
                    )
                    issues += 1

        if col_issues:
            print(f"  FAIL  {table}")
            for msg in col_issues:
                print(msg)
            print()
        else:
            print(f"  OK    {table}  ({len(exp_cols)} columns)")

    print(f"\n{'-' * 60}")
    if issues == 0:
        print("  All good -- schema.sql matches the live database.\n")
    else:
        print(f"  {issues} issue(s) found.\n")

    return issues


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print("Loading schema.sql …")
    expected = parse_schema(SCHEMA_FILE)
    print(f"  Parsed {len(expected)} tables: {', '.join(sorted(expected))}")

    print("\nFetching live schema from Supabase …")
    try:
        live = fetch_live_schema()
    except httpx.HTTPError as e:
        print(f"  ✗  Could not reach Supabase: {e}")
        sys.exit(1)
    print(f"  Found {len(live)} table(s) in the live database.")

    issues = check(expected, live)
    sys.exit(0 if issues == 0 else 1)


if __name__ == "__main__":
    main()
