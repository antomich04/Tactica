import { Overlay } from "../types";

interface Props {
  active?: Overlay;
}

export function ActiveOverlay({ active }: Props) {
  return (
    <div className={`onair ${active ? "live" : ""}`} aria-live="polite">
      {active ? (
        <>
          <span className="tag">{active.type.replace("_", " ")}</span>
          <p>{active.text}</p>
          <small>
            {active.verified
              ? `Verified, cites ${active.evidence_event_ids.length} events`
              : "Not verified"}
          </small>
        </>
      ) : (
        <p className="idle">Nothing on air.</p>
      )}
    </div>
  );
}