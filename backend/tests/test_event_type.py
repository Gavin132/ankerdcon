"""event_type: the con/gathering/concert tag shown at the top of a trip's ticket
card, replacing the old is_party boolean (which only ever meant "gathering")."""
import pytest
from pydantic import ValidationError

from app.models.admin import AdminCreateEventRequest, AdminUpdateEventRequest
from app.models.calendar import CalendarEvent, Event


@pytest.mark.parametrize("model", [Event, CalendarEvent])
@pytest.mark.parametrize("value", ["con", "gathering", "concert"])
def test_a_real_tag_is_accepted(model, value):
    kwargs = {"id": "e1", "event_name": "Test", "event_type": value}
    if model is CalendarEvent:
        kwargs["date"] = "2026-09-28"
    assert model(**kwargs).event_type == value


@pytest.mark.parametrize("model", [Event, CalendarEvent])
def test_no_tag_is_the_plain_trip_default(model):
    kwargs = {"id": "e1", "event_name": "Test"}
    if model is CalendarEvent:
        kwargs["date"] = "2026-09-28"
    assert model(**kwargs).event_type is None


@pytest.mark.parametrize("model", [Event, CalendarEvent])
def test_a_made_up_tag_is_refused(model):
    kwargs = {"id": "e1", "event_name": "Test", "event_type": "festival"}
    if model is CalendarEvent:
        kwargs["date"] = "2026-09-28"
    with pytest.raises(ValidationError):
        model(**kwargs)


def test_creating_and_updating_an_event_both_accept_the_tag():
    assert AdminCreateEventRequest(event_name="Test", event_type="concert").event_type == "concert"
    assert AdminUpdateEventRequest(event_type="con").event_type == "con"


def test_updating_can_explicitly_clear_the_tag():
    # model_fields_set is how admin_update_event (_build_updates) tells "sent
    # as null, please clear it" apart from "field omitted, leave it alone".
    body = AdminUpdateEventRequest(event_type=None)
    assert "event_type" in body.model_fields_set
    assert body.event_type is None
