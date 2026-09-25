import pytest

from app.routers.admin import _cdn_kind

_UUID_A = "b2e6c0f4-c206-46ed-b14b-602bf3f8b785"
_UUID_B = "439ff250-2f3d-4f84-8f40-7498befa0b76"


@pytest.mark.parametrize("key, kind", [
    (f"{_UUID_A}/{_UUID_B}/fc4d70b8c3f24ef98c77448e7b03875b.jpg", "story"),
    ("cosplay/c7138843fa284746838ce10a56eccdb9.jpg", "cosplay"),
    (f"banners/{_UUID_A}/abc.webp", "banner"),
    ("badges/x.png", "badge"),
    ("event-covers/x.jpg", "event-cover"),
    ("0000000000553E25.jpg", "other"),          # something we didn't put there
    ("some/other/folder/file.jpg", "other"),
])
def test_cdn_kind(key, kind):
    assert _cdn_kind(key) == kind
