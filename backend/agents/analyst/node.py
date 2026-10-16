from agent_framework import Executor, WorkflowContext, handler
from agent_framework.openai import OpenAIChatClient
from agents.state import TacticaGraphState, AnalystEvidence
from agents.analyst.tools import get_pulse_momentum_window, get_player_match_stats

class AnalystExecutor(Executor):
    def __init__(self, client: OpenAIChatClient):
        super().__init__(id="analyst")
        self.agent = client.as_agent(
            name="TacticalAnalyst",
            instructions=(
                "You are the Tactica Tactical Analyst. Call `get_pulse_momentum_window` and "
                "`get_player_match_stats` (for the primary player involved) to gather deterministic evidence. "
                "Combine the initial moment evidence_event_ids with the IDs returned by your tools. "
                "Never invent stats."
            ),
            tools=[get_pulse_momentum_window, get_player_match_stats],
        )

    @handler
    async def analyze(
        self, state: TacticaGraphState, ctx: WorkflowContext[TacticaGraphState, None]
    ) -> None:
        state.trace.append("Analyst")
        ev = state.moment.primary_event
        prompt = (
            f"Moment: {state.moment.category} at {state.moment.timestamp:.1f}s\n"
            f"Primary Event: {ev.model_dump_json()}\n"
            f"Base Evidence IDs: {state.moment.evidence_event_ids}\n"
            f"Call your tools for player '{ev.player}' and the current Pulse window."
        )
        response = await self.agent.run(
            prompt, options={"response_format": AnalystEvidence}
        )
        evidence = AnalystEvidence.model_validate_json(response.text)
        
        merged_ids = list(dict.fromkeys(state.moment.evidence_event_ids + evidence.evidence_event_ids))
        evidence.evidence_event_ids = merged_ids
        state.evidence = evidence

        await ctx.send_message(state)