from agent_framework import Executor, WorkflowContext, handler
from agent_framework.openai import OpenAIChatClient
from agents.state import TacticaGraphState, NarratorDraft, AnalystEvidence

class NarratorExecutor(Executor):
    def __init__(self, client: OpenAIChatClient):
        super().__init__(id="narrator")
        self.agent = client.as_agent(
            name="MatchNarrator",
            instructions=(
                "You are the Tactica Broadcast Narrator. Write a concise, punchy 1-2 sentence "
                "'why it matters' overlay line based ONLY on the provided Moment and Analyst Evidence. "
                "Every factual claim must map to the provided evidence_event_ids. "
                "If Revision Feedback is present, fix the ungrounded claims immediately."
            ),
        )

    @handler
    async def narrate(
        self, state: TacticaGraphState, ctx: WorkflowContext[TacticaGraphState, None]
    ) -> None:
        state.trace.append("Narrator")
        ev = state.moment.primary_event

        # Fallback evidence if Director bypassed the Analyst (fast_narrator route)
        if state.evidence is None:
            stats_ctx = state.moment.stats_context
            state.evidence = AnalystEvidence(
                summary=f"Direct telemetry for {state.moment.category.value} by {ev.player} ({ev.team}).",
                evidence_event_ids=state.moment.evidence_event_ids,
                chaos_index=float(stats_ctx.get("chaos_index", 0.0)),
                control_index=float(stats_ctx.get("control_index", 0.0)),
                controlling_team=stats_ctx.get("controlling_team"),
                momentum_score=0.0,
            )

        feedback_note = (
            f"\nREVISION FEEDBACK FROM VERIFIER: {state.verification.feedback}"
            if state.verification and not state.verification.is_verified
            else ""
        )

        prompt = (
            f"Moment Category: {state.moment.category.value}\n"
            f"Primary Event: {ev.model_dump_json()}\n"
            f"Verified Evidence: {state.evidence.model_dump_json()}"
            f"{feedback_note}"
        )

        response = await self.agent.run(
            prompt, options={"response_format": NarratorDraft}
        )
        state.draft = NarratorDraft.model_validate_json(response.text)
        await ctx.send_message(state)