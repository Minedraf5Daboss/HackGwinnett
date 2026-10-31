def test_list_accommodations(client):
    accommodations = client.get("/api/v1/accommodations").json()
    assert accommodations[0]["id"] == "wheelchair-access"
    assert {"Mobility", "Communication", "Sensory"} <= {a["category"] for a in accommodations}


def test_list_clinics_sorted_by_name(client):
    clinics = client.get("/api/v1/clinics").json()
    names = [c["name"] for c in clinics]
    assert len(clinics) == 12
    assert names == sorted(names)
    assert clinics[0]["distance_miles"] is None


def test_clinic_badges_include_notes(client):
    clinic = client.get("/api/v1/clinics/maple-creek-family-medicine").json()
    badges = {a["id"]: a for a in clinic["accommodations"]}
    assert badges["asl-interpreter"]["label"] == "ASL interpreter"
    assert badges["asl-interpreter"]["note"] == "Book 48 hours ahead"
    assert badges["wheelchair-access"]["note"] is None


def test_get_unknown_clinic(client):
    assert client.get("/api/v1/clinics/nope").status_code == 404


def test_search_text(client):
    def ids(q):
        return {c["id"] for c in client.get("/api/v1/clinics", params={"q": q}).json()}

    assert ids("brightpath") == {"brightpath-dental"}
    assert ids("dental") == {"brightpath-dental", "pinecrest-dental-group"}  # by type
    assert ids("Duluth") == {"riverbend-pediatrics"}  # by city
    assert ids("30518") == {"harbor-urgent-care", "bluebird-hearing-speech"}  # by ZIP
    assert "bluebird-hearing-speech" in ids("hearing loop")  # by badge
    assert ids("100%") == set()  # % is matched literally, not as a wildcard


def test_filter_by_type_and_accommodations(client):
    resp = client.get("/api/v1/clinics", params={"type": "dental"})
    assert {c["id"] for c in resp.json()} == {"brightpath-dental", "pinecrest-dental-group"}

    resp = client.get(
        "/api/v1/clinics", params={"accommodations": "asl-interpreter,roll-in-exam-table"}
    )
    clinics = resp.json()
    assert {c["id"] for c in clinics} == {"maple-creek-family-medicine", "sunrise-community-clinic"}
    for clinic in clinics:
        offered = {a["id"] for a in clinic["accommodations"]}
        assert {"asl-interpreter", "roll-in-exam-table"} <= offered


def test_filter_unknown_accommodation(client):
    resp = client.get("/api/v1/clinics", params={"accommodations": "wheelchair-access,teleport"})
    assert resp.status_code == 422
    assert "teleport" in resp.json()["detail"]


def test_sort_by_distance(client):
    # Downtown Duluth: Riverbend Pediatrics is there, Loganville is ~20 miles away.
    resp = client.get("/api/v1/clinics", params={"lat": 34.0029, "lng": -84.1446})
    clinics = resp.json()
    distances = [c["distance_miles"] for c in clinics]
    assert clinics[0]["id"] == "riverbend-pediatrics"
    assert distances == sorted(distances)
    assert distances[0] < 1


def test_distance_needs_both_coordinates(client):
    assert client.get("/api/v1/clinics", params={"lat": 34}).status_code == 422


def test_clinic_types(client):
    types = client.get("/api/v1/clinics/types").json()
    assert "Dental" in types
    assert types == sorted(types)


def test_rank_by_needs(client):
    needs = "wheelchair-access,hearing-loop"
    clinics = client.get("/api/v1/clinics", params={"needs": needs}).json()
    assert len(clinics) == 12
    top = [c for c in clinics if c["match"]["score"] == 1.0]
    assert {c["id"] for c in top} == {
        "willow-womens-health",
        "sunrise-community-clinic",
        "bluebird-hearing-speech",
    }
    assert clinics[: len(top)] == top
    assert clinics[-1]["match"] == {
        "met": [],
        "missing": ["wheelchair-access", "hearing-loop"],
        "score": 0.0,
    }


def test_rank_by_needs_breaks_ties_by_distance(client):
    # From Sugar Hill, Bluebird (in Sugar Hill) is the closest full match.
    params = {"needs": "wheelchair-access,hearing-loop", "lat": 34.1065, "lng": -84.0335}
    clinics = client.get("/api/v1/clinics", params=params).json()
    assert [c["id"] for c in clinics[:3]] == [
        "bluebird-hearing-speech",
        "willow-womens-health",
        "sunrise-community-clinic",
    ]


def test_rank_by_unknown_need(client):
    assert client.get("/api/v1/clinics", params={"needs": "teleport"}).status_code == 422
