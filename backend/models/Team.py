from typing import List
from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.User import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    short_code: Mapped[str] = mapped_column(String(5), unique=True, nullable=False)
    primary_color: Mapped[str] = mapped_column(String(7), nullable=False)  
    secondary_color: Mapped[str] = mapped_column(String(7), nullable=False)
    formation: Mapped[str] = mapped_column(String(15), nullable=False)
    tactical_style: Mapped[str] = mapped_column(String(40), nullable=False, default="possession_control")
    stadium_name: Mapped[str] = mapped_column(String(80), nullable=False)
    badge_svg: Mapped[str] = mapped_column(String(2048), nullable=False)

    players: Mapped[List["Player"]] = relationship(
        back_populates="team",
        cascade="all, delete-orphan",
        order_by="Player.squad_number",
    )


class Player(Base):
    __tablename__ = "players"
    __table_args__ = (
        UniqueConstraint("team_id", "squad_number", name="uq_team_squad_number"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    squad_number: Mapped[int] = mapped_column(Integer, nullable=False)
    position: Mapped[str] = mapped_column(String(10), nullable=False) 
    nationality: Mapped[str] = mapped_column(String(50), nullable=False)  
    tier: Mapped[str] = mapped_column(String(15), nullable=False, default="starter")  # "starter", "substitute", "reserve"

    team: Mapped["Team"] = relationship(back_populates="players")