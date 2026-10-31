def simplify(client, text):
    resp = client.post("/api/v1/simplify", json={"text": text})
    assert resp.status_code == 200
    return resp.json()


def test_replaces_jargon_and_lists_terms(client):
    result = simplify(client, "History of hypertension. Take analgesic BID; repeat BID as needed.")
    assert result["simplified"] == (
        "History of high blood pressure. Take pain reliever twice a day; "
        "repeat twice a day as needed."
    )
    assert result["terms"] == [
        {"term": "hypertension", "plain": "high blood pressure", "count": 1},
        {"term": "analgesic", "plain": "pain reliever", "count": 1},
        {"term": "BID", "plain": "twice a day", "count": 2},
    ]


def test_longest_phrase_wins(client):
    result = simplify(client, "Ruled out acute myocardial\ninfarction and cardiac arrest.")
    assert result["simplified"] == "Ruled out heart attack and sudden stop of the heart."


def test_keeps_capitalization_and_fixes_articles(client):
    result = simplify(client, "Edema noted. An NSAID helps. A biopsy was benign. HYPOTENSION.")
    assert result["simplified"] == (
        "Swelling noted. An anti-inflammatory pain reliever (like ibuprofen) helps. "
        "A small tissue sample for testing was not cancer. LOW BLOOD PRESSURE."
    )
    assert simplify(client, "Given an analgesic.")["simplified"] == "Given a pain reliever."


def test_leaves_ordinary_words_alone(client):
    text = "Make a bid at the PO Box by noon; the non-acute plan is fine."
    result = simplify(client, text)
    assert result == {"simplified": text, "terms": []}


def test_rejects_empty_or_huge_text(client):
    for text in ("", "   ", "x" * 5001):
        assert client.post("/api/v1/simplify", json={"text": text}).status_code == 422
