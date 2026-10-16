from agent_framework import Executor, WorkflowContext, handler
from agent_framework.openai import OpenAIChatClient
from agents.state import TacticaGraphState, VerificationResult

class VerifierExecutor(Executor):
    def __init__(self, client: OpenAIChatClient):
        super().__init__(id="verifier")
        self.agent = client.as_agent(
            name="GroundingVerifier",
            instructions=(
                "You are a strict Fact-Checking Verifier for a live sports broadcast. "
                "Compare the Narrator's Draft against the Primary Event and Analyst Evidence. "
                "Reject the draft (is_verified=False) if it invents any stat, speed, xG, or tactical trend "
                "not explicitly present in the evidence, or if cited_event_ids is empty."
            ),
        )

    @handler
    async def verify(
        self, state: TacticaGraphState, ctx: WorkflowContext[TacticaGraphState, None]
    ) -> None:
        state.trace.append("Verifier")
        ev = state.moment.primary_event

        prompt = (
            f"Primary Event: {ev.model_dump_json()}\n"
            f"Allowed Evidence: {state.evidence.model_dump_json()}\n"
            f"Narrator Draft to Verify: {state.draft.model_dump_json()}"
        )
        response = await self.agent.run(
            prompt, options={"response_format": VerificationResult}
        )
        result = VerificationResult.model_validate_json(response.text)

        # Ensures cited IDs actually exist in allowed evidence
        allowed_ids = set(state.evidence.evidence_event_ids) | set(state.moment.evidence_event_ids) | {ev.id}
        if not state.draft.cited_event_ids or not set(state.draft.cited_event_ids).issubset(allowed_ids):
            result.is_verified = False
            result.feedback = f"Cited invalid or empty event IDs. Allowed IDs: {list(allowed_ids)}"

        if not result.is_verified:
            state.revision_count += 1

        state.verification = result
        await ctx.send_message(state)