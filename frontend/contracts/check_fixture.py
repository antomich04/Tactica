import json, pathlib, sys
here = pathlib.Path(__file__).parent
sys.path.insert(0, str(here.parent.parent / "backend"))
from pydantic import TypeAdapter
from models.Event import MatchEvent
from models.Overlays import Overlay

items = json.loads((here.parent / "fixtures" / "mini-match.json").read_text())
ta, events = TypeAdapter(MatchEvent), {}
for it in items:
    if it["kind"] == "event":
        ev = ta.validate_python(it["data"])
        assert ev.id not in events, f"duplicate event id {ev.id}"
        events[ev.id] = ev
    else:
        Overlay.model_validate(it["data"])

# Overlays cite event ids, so catch typos before the fixture is used in the UI.
bad = [(it["data"]["id"], e) for it in items if it["kind"] == "overlay" for e in it["data"]["evidence_event_ids"] if e not in events]
assert not bad, f"overlay evidence points at missing events: {bad}"
print(f"OK: {len(events)} events + {sum(i['kind']=='overlay' for i in items)} overlays valid against A's models")
