from agent_framework import Executor, WorkflowContext, handler
from agent_framework.openai import OpenAIChatClient
from agents.state import (
    MatchRecapWorkflowState,
    UserContext,
    effective_agent_context,
    language_name,
)
from models.MatchRecap import MatchRecapDraft, MatchRecapMessage, MatchSummary

PERSONA_STYLE = {
    "casual": "energetic",
    "analyst": "measured",
    "newcomer": "plain",
    "club_fan": "passionate",
}

RECAP_COPY = {
    "en": {
        "energetic_win": "A big result for {winner}: full time, {home} {home_score}–{away_score} {away}.",
        "measured_win": "Full time: {home} {home_score}–{away_score} {away}. {winner} win.",
        "plain_win": "The match is over. {winner} won {home} {home_score}–{away_score} {away}.",
        "passionate_win": "A result to celebrate for {winner}: {home} {home_score}–{away_score} {away}.",
        "passionate_loss": "A tough result for {favorite}: full time, {home} {home_score}–{away_score} {away}.",
        "draw": "Full time: {home} and {away} finish level at {home_score}–{away_score}.",
    },
    "es": {
        "energetic_win": "Gran resultado para {winner}: final, {home} {home_score}–{away_score} {away}.",
        "measured_win": "Final: {home} {home_score}–{away_score} {away}. Gana {winner}.",
        "plain_win": "El partido ha terminado. {winner} ganó {home} {home_score}–{away_score} {away}.",
        "passionate_win": "Un resultado para celebrar para {winner}: {home} {home_score}–{away_score} {away}.",
        "passionate_loss": "Un resultado difícil para {favorite}: final, {home} {home_score}–{away_score} {away}.",
        "draw": "Final: {home} y {away} empatan {home_score}–{away_score}.",
    },
    "pt": {
        "energetic_win": "Grande resultado para {winner}: fim de jogo, {home} {home_score}–{away_score} {away}.",
        "measured_win": "Fim de jogo: {home} {home_score}–{away_score} {away}. {winner} vence.",
        "plain_win": "O jogo terminou. {winner} venceu: {home} {home_score}–{away_score} {away}.",
        "passionate_win": "Um resultado para celebrar para {winner}: {home} {home_score}–{away_score} {away}.",
        "passionate_loss": "Um resultado difícil para {favorite}: fim de jogo, {home} {home_score}–{away_score} {away}.",
        "draw": "Fim de jogo: {home} e {away} empatam em {home_score}–{away_score}.",
    },
    "gr": {
        "energetic_win": "Μεγάλη νίκη για την {winner}: τέλος αγώνα, {home} {home_score}–{away_score} {away}.",
        "measured_win": "Τελικό σκορ: {home} {home_score}–{away_score} {away}. Νικήτρια η {winner}.",
        "plain_win": "Ο αγώνας τελείωσε. Η {winner} νίκησε: {home} {home_score}–{away_score} {away}.",
        "passionate_win": "Ένα αποτέλεσμα για πανηγυρισμούς για την {winner}: {home} {home_score}–{away_score} {away}.",
        "passionate_loss": "Δύσκολο αποτέλεσμα για την {favorite}: τέλος αγώνα, {home} {home_score}–{away_score} {away}.",
        "draw": "Τελικό σκορ: {home} και {away} ισόπαλες {home_score}–{away_score}.",
    },
}


def _style_for_persona(persona: str) -> str:
    return PERSONA_STYLE.get(persona, "energetic")


def build_match_recap_text(
    summary: MatchSummary, user_context: UserContext, style: str
) -> str:
    language = user_context.language
    copy = RECAP_COPY.get(language, RECAP_COPY["en"])
    if summary.home_score == summary.away_score:
        template = copy["draw"]
    else:
        winner = (
            summary.home_team
            if summary.home_score > summary.away_score
            else summary.away_team
        )
        favorite = user_context.favorite_club
        template_style = (
            style
            if style in ("energetic", "measured", "plain", "passionate")
            else _style_for_persona(user_context.persona.value)
        )
        if (
            template_style == "passionate"
            and favorite in (summary.home_team, summary.away_team)
            and favorite != winner
        ):
            return copy["passionate_loss"].format(
                favorite=favorite,
                home=summary.home_team,
                away=summary.away_team,
                home_score=summary.home_score,
                away_score=summary.away_score,
            )
        template = copy[f"{template_style}_win"]
        return template.format(
            winner=winner,
            home=summary.home_team,
            away=summary.away_team,
            home_score=summary.home_score,
            away_score=summary.away_score,
        )
    return template.format(
        home=summary.home_team,
        away=summary.away_team,
        home_score=summary.home_score,
        away_score=summary.away_score,
    )


def build_fallback_match_recap(
    summary: MatchSummary, user_context: UserContext
) -> MatchRecapMessage:
    agent_context = effective_agent_context(
        user_context, [summary.home_team, summary.away_team]
    )
    return MatchRecapMessage(
        match_id=summary.match_id,
        language=user_context.language,
        persona=user_context.persona,
        text=build_match_recap_text(
            summary, agent_context, _style_for_persona(agent_context.persona.value)
        ),
    )


class MatchSummarizerExecutor(Executor):
    def __init__(self, client: OpenAIChatClient):
        super().__init__(id="match_summarizer")
        self.agent = client.as_agent(
            name="MatchSummarizer",
            instructions=(
                "You are Tactica's post-match broadcast summarizer. "
                "Write a vivid, 2-3 sentence post-match recap strictly grounded in the provided MatchSummary JSON. "
                "RULES:\n"
                "1. You MUST state the exact final scoreline ({home_team} {home_score}-{away_score} {away_team}).\n"
                "2. Mention 1-2 standout details from `key_events` (goal scorers, key saves, cards) or `stats` (shots, passes).\n"
                "3. Adapt tone to the viewer persona:\n"
                "   - casual -> energetic (punchy, exciting)\n"
                "   - analyst -> measured (tactical, cites shot/pass numbers)\n"
                "   - newcomer -> plain (clear, welcoming, explains why the stats mattered)\n"
                "   - club_fan -> passionate (empathetic to favorite_club if provided)\n"
                "4. Write the entire `text` in the requested language. Do not use English unless "
                "English is requested; keep team/player names and standard football abbreviations unchanged.\n"
                "5. Never invent players, goals, or stats not present in the JSON."
            ),
        )

    @handler
    async def summarize(
        self,
        state: MatchRecapWorkflowState,
        ctx: WorkflowContext[MatchRecapWorkflowState, None],
    ) -> None:
        user_ctx = state.user_context
        agent_ctx = effective_agent_context(
            user_ctx, [state.summary.home_team, state.summary.away_team]
        )
        expected_style = _style_for_persona(agent_ctx.persona.value)
        prompt = (
            f"Viewer Persona: {agent_ctx.persona.value} (style: {expected_style})\n"
            f"Target Language: {language_name(agent_ctx.language)} "
            f"(code: {agent_ctx.language})\n"
            f"Write every sentence of `text` in {language_name(agent_ctx.language)}. "
            "Do not write the recap in English unless English is the target language.\n"
            f"Favorite Club: {agent_ctx.favorite_club or 'None'}\n"
            f"Favorite Player: {agent_ctx.player_lock or 'None'}\n\n"
            f"MatchSummary JSON:\n{state.summary.model_dump_json(indent=2)}"
        )
        response = await self.agent.run(prompt, options={"response_format": MatchRecapDraft})
        state.draft = MatchRecapDraft.model_validate_json(response.text)
        await ctx.send_message(state)


class MatchRecapVerifierExecutor(Executor):
    def __init__(self):
        super().__init__(id="match_recap_verifier")

    @handler
    async def verify(
        self,
        state: MatchRecapWorkflowState,
        ctx: WorkflowContext[None, MatchRecapMessage],
    ) -> None:
        if state.draft is None or not state.draft.text.strip():
            raise RuntimeError("Match recap verifier received an empty summarizer draft.")

        summary = state.summary
        draft_text = state.draft.text.strip()

        # Lightweight deterministic sanity check: ensure both team names or the score numbers appear
        has_scores = (
            str(summary.home_score) in draft_text and str(summary.away_score) in draft_text
        )
        if not has_scores:
            # Append the official scoreline if the LLM forgot the numbers
            agent_context = effective_agent_context(
                state.user_context, [summary.home_team, summary.away_team]
            )
            fallback_line = build_match_recap_text(
                summary,
                agent_context,
                _style_for_persona(agent_context.persona.value),
            )
            draft_text = f"{draft_text} ({fallback_line})"

        await ctx.yield_output(
            MatchRecapMessage(
                match_id=summary.match_id,
                language=state.user_context.language,
                persona=state.user_context.persona,
                text=draft_text,
            )
        )
