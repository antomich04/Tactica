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
  speed_kmh?: number | null;
  distance: number;
  outcome: "completed" | "incomplete" | "intercepted" | "out_of_bounds";
  difficulty_rating?: number | null;
  receiver?: string | null;
};

export type ShotEvent = BaseEvent & {
  type: "shot";
  speed_kmh?: number | null;
  xg: number;
  outcome: "goal" | "saved" | "blocked" | "off_target" | "post";
  distance?: number | null;
};

export type SaveEvent = BaseEvent & {
  type: "save";
  shot_event_id?: string | null;
  difficulty?: number | null;
};

export type SetPieceEvent = BaseEvent & {
  type: "corner" | "goal_kick" | "penalty";
  taker?: string | null;
};

export type TackleEvent = BaseEvent & {
  type: "tackle";
  outcome: "won" | "lost";
  opponent_player?: string | null;
};

export type PressureEvent = BaseEvent & {
  type: "pressure";
  duration: number;
  opponent_player?: string | null;
};

export type CardEvent = BaseEvent & {
  type: "card";
  card_color: "yellow" | "red";
  reason?: string | null;
};

export type GoalEvent = BaseEvent & {
  type: "goal";
  shot_event_id?: string | null;
  scorer: string;
  assist_player?: string | null;
};

export type PossessionChangeEvent = BaseEvent & {
  type: "possession_change";
  previous_team: string;
  new_team: string;
};

export type GenericMatchEvent = BaseEvent & {
  type: "foul" | "substitution" | "injury";
  details?: string | null;
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

export type MomentumPoint = {
  timestamp: number;
  score: number; // Positive favors the home team; negative favors the away team.
};

export type MatchMetrics = {
  chaos_index?: number;
  control_index?: number;
  home_control?: number;
  away_control?: number;
  controlling_team?: string | null;
  recent_events_count?: number;
  momentum?: MomentumPoint;
};

export type Envelope =
  | { kind: "event"; data: MatchEvent; metrics?: MatchMetrics; momentum?: MomentumPoint }
  | { kind: "overlay"; data: Overlay };

export type Status = "idle" | "connecting" | "live" | "reconnecting" | "ended" | "error";

// These role values must match the backend authentication schema.
export type Role = "viewer" | "producer";

export type User = {
  id: number;
  username: string;
  email: string;
  role: Role;
  email_verified?: boolean;
};

export type Session = {
  status?: string;
  message?: string;
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