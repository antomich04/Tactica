from models.Event import MatchEvent, EventType, PassOutcome, ShotOutcome

class MomentumTracker:
    def __init__(self):
        self.current_momentum = 0.0 # Positive values mean home team is dominating, negative ones mean away team is dominating  
        self.decay_rate = 0.85 # Decays to zero evry ping to neutralize momentum
        self.home_team = None 

    def update(self, event: MatchEvent) -> dict:
        self.current_momentum *= self.decay_rate
        
        if not self.home_team and hasattr(event, 'team'):
            self.home_team = event.team
            
        impact = 0
        
        if event.type == EventType.GOAL:
            impact = 50
        elif event.type == EventType.SHOT:
            impact = 20 if event.outcome in [ShotOutcome.SAVED, ShotOutcome.POST, ShotOutcome.GOAL] else 10
        elif event.type == EventType.SAVE:
            impact = 15  
        elif event.type in [EventType.CORNER, EventType.PENALTY]:
            impact = 10
        elif event.type == EventType.PASS and getattr(event, 'outcome', None) == PassOutcome.COMPLETED:
            impact = 2
        elif event.type == EventType.TACKLE and getattr(event, 'outcome', None) == 'won':
            impact = 5
        elif event.type == EventType.POSSESSION_CHANGE:
            impact = 5 
            

        event_team = getattr(event, 'team', None)
        if event.type == EventType.POSSESSION_CHANGE:
            event_team = getattr(event, 'new_team', event_team)
            
        if event_team == self.home_team:
            self.current_momentum += impact
        else:
            self.current_momentum -= impact
            
        self.current_momentum = max(-100.0, min(100.0, self.current_momentum))
        
        return {
            "timestamp": round(event.timestamp, 1),
            "score": round(self.current_momentum, 2)
        }