import json, pathlib, sys
here = pathlib.Path(__file__).parent
sys.path.insert(0, str(here.parent.parent / "backend"))
from pydantic import TypeAdapter
from models.Event import MatchEvent
from models.Overlays import Overlay

# The frontend generates TypeScript from these schemas instead of copying backend code.
(here / "event.schema.json").write_text(json.dumps(TypeAdapter(MatchEvent).json_schema(), indent=1) + "\n")
(here / "overlay.schema.json").write_text(json.dumps(Overlay.model_json_schema(), indent=1) + "\n")
print("wrote contracts/event.schema.json and contracts/overlay.schema.json")
