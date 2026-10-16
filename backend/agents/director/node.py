from agent_framework import Executor, WorkflowContext, handler
from agent_framework.openai import OpenAIChatClient
from agents.state import TacticaGraphState, DirectorDecision

class DirectorExecutor(Executor):
    def __init__(self, client: OpenAIChatClient):
        super().__init__(id="director")
        self.agent = client.as_agent(
            name="MatchDirector",
            instructions=(
                "You are the AI Broadcast Director for Tactica. You receive a detected Match Moment. "
                "Choose exactly one route for the rich follow-up overlay:\n"
                "- 'deep_analyst': Use for GOAL, RED_CARD, PENALTY, HIGH_XG_SAVE, or MOMENTUM_SPIKE "
                "where tactical Pulse/player context explains WHY it happened.\n"
                "- 'fast_narrator': Use for routine DANGEROUS_FREE_KICK moments that just need quick phrasing.\n"
                "- 'skip': Do not produce a rich overlay when the moment is redundant or unsuitable.\n"
                "The route is the sole decision; do not return separate air/skip flags."
            ),
        )

    @handler
    async def evaluate(
        self, state: TacticaGraphState, ctx: WorkflowContext[TacticaGraphState, None]
    ) -> None:
        state.trace.append("Director")
        prompt = (
            f"Moment Category: {state.moment.category}\n"
            f"Primary Event: {state.moment.primary_event.model_dump_json()}\n"
            f"Initial Stats Context: {state.moment.stats_context}\n"
            f"Viewer Contexts: {[context.model_dump() for context in state.user_contexts]}"
        )
        response = await self.agent.run(
            prompt, options={"response_format": DirectorDecision}
        )
        state.director = DirectorDecision.model_validate_json(response.text)
        await ctx.send_message(state)