export type Id = string;
export type MatchId = string;
export type Timestamp = number;
export type Duration = number;
export type OverlayType = "momentum_shift" | "player_tag" | "shot_speed" | "goal" | "card" | "milestone" | "recap_item";
export type Priority = number;
export type Language = string;
export type PersonaType = "analyst" | "casual" | "newcomer" | "club_fan";
export type Text = string;
export type EvidenceEventIds = string[];
export type Verified = boolean;

export interface Overlay {
  id: Id;
  match_id: MatchId;
  timestamp: Timestamp;
  duration: Duration;
  type: OverlayType;
  priority: Priority;
  language: Language;
  persona: PersonaType;
  text: Text;
  evidence_event_ids: EvidenceEventIds;
  verified: Verified;
  meta: Meta;
}
export interface Meta {
  [k: string]: unknown;
}
