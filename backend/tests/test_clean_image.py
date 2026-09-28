"""clean_image: strips personal metadata, but never re-compresses a JPEG that has none."""
from io import BytesIO

from PIL import Image

from app.core.uploads import clean_image


def _jpeg(exif: bool = False) -> bytes:
    img = Image.new("RGB", (64, 48), (200, 30, 30))
    out = BytesIO()
    if exif:
        data = Image.Exif()
        data[0x010F] = "PhoneMaker"  # Make
        img.save(out, "JPEG", quality=85, exif=data)
    else:
        img.save(out, "JPEG", quality=85)
    return out.getvalue()


def test_a_clean_jpeg_is_kept_byte_for_byte():
    original = _jpeg()
    cleaned, content_type, ext = clean_image(original, {"JPEG"})
    assert cleaned == original
    assert (content_type, ext) == ("image/jpeg", "jpg")


def test_a_jpeg_with_exif_is_reencoded_without_it():
    original = _jpeg(exif=True)
    assert len(Image.open(BytesIO(original)).getexif()) > 0
    cleaned, _, _ = clean_image(original, {"JPEG"})
    assert cleaned != original
    assert len(Image.open(BytesIO(cleaned)).getexif()) == 0
