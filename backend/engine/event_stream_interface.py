from abc import ABC, abstractmethod
from typing import AsyncGenerator
from models.Event import MatchEvent

class EventSource(ABC):
    """
    Abstract interface for match event ingestion.
    """
    
    @abstractmethod
    async def stream_events(self) -> AsyncGenerator[MatchEvent, None]:
        """Yields a continuous stream of validated match events."""
        ...