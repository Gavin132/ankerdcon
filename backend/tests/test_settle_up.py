from app.services.settle_up import (
    balance_between,
    build_name_resolver,
    normalize_iban,
    pair_balances,
)

PROFILES = [
    {"id": "t", "name": "Timo", "aliases": ["telegy"]},
    {"id": "b", "name": "Bob", "aliases": []},
    {"id": "f", "name": "Frekkel", "aliases": ["toosyboi"]},
]
resolve = build_name_resolver(PROFILES)


def share(sid, participant, amount, status="pending", settlement_id=None):
    return {"id": sid, "participant": participant, "amount": amount, "status": status, "settlement_id": settlement_id}


def test_resolver_uses_names_and_unambiguous_aliases():
    assert resolve("Timo") == "t"
    assert resolve("toosyboi") == "f"
    assert resolve("Nobody") is None
    both = build_name_resolver([
        {"id": "1", "name": "A", "aliases": ["x"]},
        {"id": "2", "name": "B", "aliases": ["x"]},
    ])
    assert both("x") is None


def test_debts_both_ways_are_netted_per_pair():
    expenses = [
        {"paid_by": "Timo", "currency": "EUR", "shares": [
            share("s1", "Timo", 10), share("s2", "Bob", 10), share("s3", "Frekkel", 10),
        ]},
        {"paid_by": "Bob", "currency": "EUR", "shares": [share("s4", "Timo", 4)]},
    ]
    balances = pair_balances(expenses, resolve)
    tb = balance_between(balances, "t", "b", "EUR")
    assert (tb.debtor_id, tb.creditor_id, tb.amount_cents) == ("b", "t", 600)
    assert sorted(tb.share_ids) == ["s2", "s4"]
    tf = balance_between(balances, "t", "f", "EUR")
    assert (tf.debtor_id, tf.amount_cents) == ("f", 1000)
    # The payer's own share never creates a debt.
    assert all("s1" not in b.share_ids for b in balances)


def test_settled_and_in_progress_shares_are_left_out():
    expenses = [{"paid_by": "Timo", "currency": "EUR", "shares": [
        share("s1", "Bob", 5, status="confirmed"),
        share("s2", "Bob", 7, status="claimed", settlement_id="x"),
        share("s3", "Bob", 3),
    ]}]
    (bal,) = pair_balances(expenses, resolve)
    assert bal.amount_cents == 300 and bal.share_ids == ["s3"]


def test_old_names_count_for_the_renamed_member():
    expenses = [{"paid_by": "telegy", "currency": "EUR", "shares": [share("s1", "Bob", 2.5)]}]
    (bal,) = pair_balances(expenses, resolve)
    assert (bal.debtor_id, bal.creditor_id, bal.amount_cents) == ("b", "t", 250)


def test_currencies_are_kept_apart_and_even_pairs_are_reported():
    expenses = [
        {"paid_by": "Timo", "currency": "EUR", "shares": [share("s1", "Bob", 5)]},
        {"paid_by": "Bob", "currency": "EUR", "shares": [share("s2", "Timo", 5)]},
        {"paid_by": "Timo", "currency": "JPY", "shares": [share("s3", "Bob", 1000)]},
    ]
    balances = pair_balances(expenses, resolve)
    assert balance_between(balances, "t", "b", "EUR").amount_cents == 0
    assert balance_between(balances, "t", "b", "JPY").amount_cents == 100000


def test_iban_validation():
    assert normalize_iban("nl91 abna 0417 1643 00") == "NL91ABNA0417164300"
    assert normalize_iban("NL91ABNA0417164301") is None  # wrong check digits
    assert normalize_iban("NL91ABNA041716430") is None   # too short for NL
    assert normalize_iban("hello") is None


import pytest
from app.services.settle_up import is_allowed_payment_link_host


@pytest.mark.parametrize("host", [
    "tikkie.me", "www.tikkie.me", "bunq.me", "paypal.me", "revolut.me", "pay.klarna.com",
    "ing.nl", "betaalverzoek.rabobank.nl", "abnamro.nl", "snsbank.nl", "knab.nl", "TIKKIE.ME",
])
def test_known_payment_hosts_are_allowed(host):
    assert is_allowed_payment_link_host(host)


@pytest.mark.parametrize("host", [
    "", None, "evil.example", "tikkie.me.evil.example", "nottikkie.me", "tikkie-me.com",
    "ing.nl.evil.example", "wero-wallet.eu", "google.com",
])
def test_other_hosts_are_refused(host):
    assert not is_allowed_payment_link_host(host)
