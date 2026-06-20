"""Google Sheets client singleton and TTL-cached data fetcher."""

from __future__ import annotations

import time

import gspread
import pandas as pd
from google.oauth2.service_account import Credentials

from app.config import Settings

_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
_TABS = ["Users", "Rides", "Meals", "Payments", "Calendar"]
_CACHE_TTL = 60.0  # seconds

_client: gspread.Client | None = None
_spreadsheet: gspread.Spreadsheet | None = None
_data_cache: dict[str, pd.DataFrame] = {}
_cache_timestamp: float = 0.0


def get_spreadsheet(settings: Settings) -> gspread.Spreadsheet:
    """Return a cached gspread Spreadsheet instance, creating it on first call."""
    global _client, _spreadsheet
    if _spreadsheet is None:
        creds = Credentials.from_service_account_info(
            settings.google_service_account, scopes=_SCOPES
        )
        _client = gspread.authorize(creds)
        _spreadsheet = _client.open_by_key(settings.google_sheet_id)
    return _spreadsheet


def get_cached_tables(spreadsheet: gspread.Spreadsheet) -> dict[str, pd.DataFrame]:
    """Return all sheet tabs as DataFrames, re-fetching after TTL expires."""
    global _data_cache, _cache_timestamp
    if _data_cache and (time.monotonic() - _cache_timestamp) < _CACHE_TTL:
        return _data_cache
    _data_cache = _fetch_all_tables(spreadsheet)
    _cache_timestamp = time.monotonic()
    return _data_cache


def invalidate_cache() -> None:
    """Force a fresh fetch on the next read (called after any write)."""
    global _cache_timestamp
    _cache_timestamp = 0.0


def _fetch_all_tables(spreadsheet: gspread.Spreadsheet) -> dict[str, pd.DataFrame]:
    """Batch-fetch all tabs in a single Sheets API call."""
    ranges = [f"{tab}!A:Z" for tab in _TABS]
    response = spreadsheet.values_batch_get(ranges)
    value_ranges = response.get("valueRanges", [])

    result: dict[str, pd.DataFrame] = {}
    for i, tab in enumerate(_TABS):
        if i >= len(value_ranges):
            result[tab] = pd.DataFrame()
            continue

        values = value_ranges[i].get("values", [])
        if not values:
            result[tab] = pd.DataFrame()
        elif len(values) == 1:
            result[tab] = pd.DataFrame(columns=values[0])
        else:
            headers = values[0]
            padded = [row + [""] * (len(headers) - len(row)) for row in values[1:]]
            df = pd.DataFrame(padded, columns=headers)
            df = df.astype(str).replace("nan", "", regex=False)
            df["row_number"] = df.index + 2
            result[tab] = df

    return result
