export type MatchEvent =
  | PassEvent
  | ShotEvent
  | TackleEvent
  | PressureEvent
  | CardEvent
  | GoalEvent
  | PossessionChangeEvent
  | GenericMatchEvent;
export type Id = string;
export type MatchId = string;
export type Timestamp = number;
export type Team = string;
export type Player = string;
export type X = number;
export type Y = number;
export type Type = "pass";
export type EndX = number;
export type EndY = number;
export type SpeedKmh = number | null;
export type Distance = number;
export type PassOutcome = "completed" | "incomplete" | "intercepted" | "out_of_bounds";
export type DifficultyRating = number | null;
export type Receiver = string | null;
export type Id1 = string;
export type MatchId1 = string;
export type Timestamp1 = number;
export type Team1 = string;
export type Player1 = string;
export type X1 = number;
export type Y1 = number;
export type Type1 = "shot";
export type SpeedKmh1 = number | null;
export type Xg = number;
export type ShotOutcome = "goal" | "saved" | "blocked" | "off_target" | "post";
export type Distance1 = number | null;
export type Id2 = string;
export type MatchId2 = string;
export type Timestamp2 = number;
export type Team2 = string;
export type Player2 = string;
export type X2 = number;
export type Y2 = number;
export type Type2 = "tackle";
export type Outcome = "won" | "lost";
export type OpponentPlayer = string | null;
export type Id3 = string;
export type MatchId3 = string;
export type Timestamp3 = number;
export type Team3 = string;
export type Player3 = string;
export type X3 = number;
export type Y3 = number;
export type Type3 = "pressure";
export type Duration = number;
export type OpponentPlayer1 = string | null;
export type Id4 = string;
export type MatchId4 = string;
export type Timestamp4 = number;
export type Team4 = string;
export type Player4 = string;
export type X4 = number;
export type Y4 = number;
export type Type4 = "card";
export type CardColor = "yellow" | "red";
export type Reason = string | null;
export type Id5 = string;
export type MatchId5 = string;
export type Timestamp5 = number;
export type Team5 = string;
export type Player5 = string;
export type X5 = number;
export type Y5 = number;
export type Type5 = "goal";
export type ShotEventId = string | null;
export type Scorer = string;
export type AssistPlayer = string | null;
export type Id6 = string;
export type MatchId6 = string;
export type Timestamp6 = number;
export type Team6 = string;
export type Player6 = string;
export type X6 = number;
export type Y6 = number;
export type Type6 = "possession_change";
export type PreviousTeam = string;
export type NewTeam = string;
export type Id7 = string;
export type MatchId7 = string;
export type Timestamp7 = number;
export type Team7 = string;
export type Player7 = string;
export type X7 = number;
export type Y7 = number;
export type Type7 = "foul" | "substitution";
export type Details = string | null;

export interface PassEvent {
  id: Id;
  match_id: MatchId;
  timestamp: Timestamp;
  team: Team;
  player: Player;
  x: X;
  y: Y;
  type: Type;
  end_x: EndX;
  end_y: EndY;
  speed_kmh: SpeedKmh;
  distance: Distance;
  outcome: PassOutcome;
  difficulty_rating: DifficultyRating;
  receiver: Receiver;
}
export interface ShotEvent {
  id: Id1;
  match_id: MatchId1;
  timestamp: Timestamp1;
  team: Team1;
  player: Player1;
  x: X1;
  y: Y1;
  type: Type1;
  speed_kmh: SpeedKmh1;
  xg: Xg;
  outcome: ShotOutcome;
  distance: Distance1;
}
export interface TackleEvent {
  id: Id2;
  match_id: MatchId2;
  timestamp: Timestamp2;
  team: Team2;
  player: Player2;
  x: X2;
  y: Y2;
  type: Type2;
  outcome: Outcome;
  opponent_player: OpponentPlayer;
}
export interface PressureEvent {
  id: Id3;
  match_id: MatchId3;
  timestamp: Timestamp3;
  team: Team3;
  player: Player3;
  x: X3;
  y: Y3;
  type: Type3;
  duration: Duration;
  opponent_player: OpponentPlayer1;
}
export interface CardEvent {
  id: Id4;
  match_id: MatchId4;
  timestamp: Timestamp4;
  team: Team4;
  player: Player4;
  x: X4;
  y: Y4;
  type: Type4;
  card_color: CardColor;
  reason: Reason;
}
export interface GoalEvent {
  id: Id5;
  match_id: MatchId5;
  timestamp: Timestamp5;
  team: Team5;
  player: Player5;
  x: X5;
  y: Y5;
  type: Type5;
  shot_event_id: ShotEventId;
  scorer: Scorer;
  assist_player: AssistPlayer;
}
export interface PossessionChangeEvent {
  id: Id6;
  match_id: MatchId6;
  timestamp: Timestamp6;
  team: Team6;
  player: Player6;
  x: X6;
  y: Y6;
  type: Type6;
  previous_team: PreviousTeam;
  new_team: NewTeam;
}
export interface GenericMatchEvent {
  id: Id7;
  match_id: MatchId7;
  timestamp: Timestamp7;
  team: Team7;
  player: Player7;
  x: X7;
  y: Y7;
  type: Type7;
  details: Details;
}
