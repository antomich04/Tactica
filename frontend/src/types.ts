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
  end_x?: number | null;
  end_y?: number | null;
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
  player_off?: string | null;
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

export type MatchRecapKeyEvent = {
  type: string;
  timestamp: number;
  team: string;
  player: string;
  details?: string | null;
};

export type MatchRecapTeamStats = {
  shots: number;
  shots_on_target: number;
  passes_attempted: number;
  passes_completed: number;
  corners: number;
  yellow_cards: number;
  red_cards: number;
};

export type MatchSummary = {
  match_id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  match_time: number;
  stats: {
    home: MatchRecapTeamStats;
    away: MatchRecapTeamStats;
  };
  key_events: MatchRecapKeyEvent[];
};

export type MatchRecap = {
  match_id: string;
  language: string;
  persona: string;
  text: string;
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
  paused?: boolean;
  halftime_pause?: boolean;
  momentum?: MomentumPoint;
};

export type Envelope =
  | {
      kind: "event";
      data: MatchEvent;
      metrics?: MatchMetrics;
      momentum?: MomentumPoint;
    }
    | { kind: "overlay"; data: Overlay }
    | { kind: "match_ended"; data: MatchSummary }
    | { kind: "match_recap"; data: MatchRecap };

export type PlayerRole =
  | "GK"
  | "RB"
  | "RCB"
  | "CB"
  | "LCB"
  | "LB"
  | "RDM"
  | "CDM"
  | "LDM"
  | "RM"
  | "RCM"
  | "CM"
  | "LCM"
  | "LM"
  | "CAM"
  | "RW"
  | "LW"
  | "RS"
  | "ST"
  | "LS"
  | "DEF"
  | "MID"
  | "FWD";

export type RosterTier = "starter" | "substitute" | "reserve";

export type TeamPlayer = {
  id: number;
  team_id: number;
  name: string;
  squad_number: number;
  position: "GK" | "DEF" | "MID" | "FWD";
  role: PlayerRole;
  nationality: string;
  tier: RosterTier;
};

export type TeamRoster = {
  starters: TeamPlayer[];
  substitutes: TeamPlayer[];
  reserves: TeamPlayer[];
};

export type ClubTeam = {
  id: number;
  name: string;
  short_code: string;
  primary_color: string;
  secondary_color: string;
  formation: string;
  tactical_style: string;
  stadium_name: string;
  badge_svg: string;
  players: TeamPlayer[];
  roster: TeamRoster;
};

export type NextMatchResponse = {
  status: string;
  home_team: ClubTeam;
  away_team: ClubTeam;
};

export type Status =
  | "idle"
  | "connecting"
  | "live"
  | "reconnecting"
  | "ended"
  | "error";

export type Role = "viewer" | "producer";
export type LanguageCode = "en" | "es" | "pt" | "gr";
export type PersonaCode = "casual" | "analyst" | "newcomer" | "club_fan";

export type UserPreferences = {
  language: LanguageCode;
  persona: PersonaCode;
  favorite_team: string | null;
  favorite_player: string | null;
};

export type User = {
  id: number;
  username: string;
  email: string;
  role: Role;
  email_verified: boolean;
  avatar_url: string | null;
  preferences: UserPreferences;
};

export type Session = {
  status: string;
  message: string;
  /** Access-token cookie lifetime in seconds (900s = 15m). */
  expires_in: number;
  user: User;
};

export type Ticket = {
  ticket: string;
  expires_in: number;
};

export type AuthStatus = "loading" | "anonymous" | "authenticated";
