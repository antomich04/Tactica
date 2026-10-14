export type MatchEvent =
  | PassEvent
  | ShotEvent
  | TackleEvent
  | PressureEvent
  | CardEvent
  | GoalEvent
  | PossessionChangeEvent
  | SaveEvent
  | SetPieceEvent
  | GenericMatchEvent;

export type BaseEvent = {
  id: string;
  match_id: string;
  timestamp: number;
  team: string;
  player: string;
  x: number;
  y: number;
};

export type PassEvent = BaseEvent & {
  type: "pass";
  end_x: number;
  end_y: number;
  speed_kmh?: number;
  distance: number;
  outcome: "completed" | "incomplete" | "intercepted" | "out_of_bounds";
  difficulty_rating?: number;
  receiver?: string;
};

export type ShotEvent = BaseEvent & {
  type: "shot";
  speed_kmh?: number;
  xg: number;
  outcome: "goal" | "saved" | "blocked" | "off_target" | "post";
  distance?: number;
};

export type SaveEvent = BaseEvent & {
  type: "save";
  shot_event_id?: string;
  difficulty?: number;
};

export type SetPieceEvent = BaseEvent & {
  type: "corner" | "goal_kick" | "penalty";
  taker?: string;
};

export type TackleEvent = BaseEvent & {
  type: "tackle";
  outcome: "won" | "lost";
  opponent_player?: string;
};

export type PressureEvent = BaseEvent & {
  type: "pressure";
  duration: number;
  opponent_player?: string;
};

export type CardEvent = BaseEvent & {
  type: "card";
  card_color: "yellow" | "red";
  reason?: string;
};

export type GoalEvent = BaseEvent & {
  type: "goal";
  shot_event_id?: string;
  scorer: string;
  assist_player?: string;
};

export type PossessionChangeEvent = BaseEvent & {
  type: "possession_change";
  previous_team: string;
  new_team: string;
};

export type GenericMatchEvent = BaseEvent & {
  type: "foul" | "substitution" | "injury";
  details?: string;
};

export type Overlay = {
  id: string;
  match_id: string;
  timestamp: number;
  duration: number;
  type: string;
  priority: number;
  language: string;
  persona: string;
  text: string;
  evidence_event_ids: string[];
  verified: boolean;
  meta: Record<string, unknown>;
};

export type MatchMetrics = {
  chaos_index?: number;
  control_index?: number;
  controlling_team?: string;
};

export type Envelope =
  | { kind: "event"; data: MatchEvent; metrics?: MatchMetrics }
  | { kind: "overlay"; data: Overlay };

export type Status = "idle" | "connecting" | "live" | "reconnecting" | "ended" | "error";

// Keep the frontend role values in sync with the backend authentication schema.
export type Role = "viewer" | "producer";

export type User = {
  id: number;
  username: string;
  role: Role;
};

export type Session = {
  access_token: string;
  token_type: "bearer";
  /** Access-token lifetime in seconds. */
  expires_in: number;
  user: User;
};

export type Ticket = {
  ticket: string;
  expires_in: number;
};

export type AuthStatus = "loading" | "anonymous" | "authenticated";