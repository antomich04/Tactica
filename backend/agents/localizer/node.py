import hashlib
import logging
from pydantic import BaseModel
from agent_framework import Executor, WorkflowContext, handler
from agent_framework.openai import OpenAIChatClient
from agents.state import (
    PersonalizedOverlay,
    TacticaGraphState,
    VerificationResult,
    effective_agent_context,
    language_name,
)
from models.Overlays import Overlay, OverlayType

logger = logging.getLogger(__name__)


class LocalizedText(BaseModel):
    text: str


class LocalizerExecutor(Executor):
    def __init__(self, client: OpenAIChatClient):
        super().__init__(id="localizer")
        self.agent = client.as_agent(
            name="PersonaLocalizer",
            instructions=(
                "Rewrite the verified football broadcast line for the target Persona and Language "
                "without adding, removing, or changing factual claims or numbers.\n"
                "- 'casual': Make the same facts emotionally engaging, warm, and punchy; do not "
                "invent drama or change the source claims.\n"
                "- 'analyst': Prefer a restrained, data-driven delivery and precise football "
                "language only when it preserves the source meaning; avoid emotional "
                "embellishment and do not add statistics.\n"
                "- 'newcomer': Clarify jargon without adding new match facts.\n"
                "- 'club_fan': Adapt the tone around the user's favorite club without changing facts.\n"
                "Translate accurately into the requested language. The complete overlay text must "
                "be written in that language; do not leave English phrases untranslated unless "
                "they are proper names or standard football abbreviations."
            ),
        )
        self.verifier = client.as_agent(
            name="LocalizedTextVerifier",
            instructions=(
                "Check whether the localized text is a faithful translation and style adaptation of "
                "the verified source text. Reject added, removed, contradicted, or altered factual "
                "claims and numbers. Also reject text that is not written in the requested language, "
                "apart from proper names and standard football abbreviations. Do not reject solely "
                "because wording differs."
            ),
        )

    @handler
    async def localize(
        self,
        state: TacticaGraphState,
        ctx: WorkflowContext[None, PersonalizedOverlay],
    ) -> None:
        if (
            state.director is None
            or state.evidence is None
            or state.draft is None
            or state.verification is None
            or not state.verification.is_verified
        ):
            raise RuntimeError("Localizer received an incomplete or unverified workflow state.")

        allowed_ids = set(state.evidence.evidence_event_ids) | set(
            state.moment.evidence_event_ids
        ) | {state.moment.primary_event.id}
        cited_ids = set(state.draft.cited_event_ids)
        if not cited_ids or not cited_ids.issubset(allowed_ids):
            logger.warning(
                "Skipping rich overlay for moment %s: narrator citations are missing or invalid.",
                state.moment.id,
            )
            return

        for user_ctx in state.user_contexts:
            agent_ctx = effective_agent_context(user_ctx, state.match_teams)
            prompt = (
                f"Verified Text: {state.draft.text}\n"
                f"Target Persona: {agent_ctx.persona.value}\n"
                f"Target Language: {language_name(agent_ctx.language)} "
                f"(code: {agent_ctx.language})\n"
                f"Write the entire localized text in {language_name(agent_ctx.language)}. "
                "Keep proper names and standard football abbreviations unchanged.\n"
                f"Favorite Club: {agent_ctx.favorite_club or 'None'}"
            )
            response = await self.agent.run(
                prompt, options={"response_format": LocalizedText}
            )
            localized = LocalizedText.model_validate_json(response.text)

            verification_prompt = (
                f"Verified source text: {state.draft.text}\n"
                f"Localized text: {localized.text}\n"
                f"Requested language: {language_name(agent_ctx.language)} "
                f"(code: {agent_ctx.language})\n"
                f"Primary event: {state.moment.primary_event.model_dump_json()}\n"
                f"Allowed evidence: {state.evidence.model_dump_json()}\n"
                f"Cited event IDs: {state.draft.cited_event_ids}"
            )
            verification_response = await self.verifier.run(
                verification_prompt,
                options={"response_format": VerificationResult},
            )
            localization_check = VerificationResult.model_validate_json(
                verification_response.text
            )
            if not localization_check.is_verified:
                logger.warning(
                    "Skipping localized rich overlay for moment %s and persona %s/%s: %s",
                    state.moment.id,
                    user_ctx.persona.value,
                    user_ctx.language,
                    localization_check.feedback or "localized text failed verification",
                )
                continue

            profile_id = hashlib.sha256(
                user_ctx.model_dump_json().encode("utf-8")
            ).hexdigest()[:10]
            trace = [*state.trace, "Localizer", "LocalizedTextVerifier"]
            overlay = Overlay(
                id=f"ov_{state.moment.id}_rich_{profile_id}",
                match_id=state.moment.match_id,
                timestamp=state.moment.timestamp,
                duration=8.0,
                type=OverlayType(state.director.overlay_type),
                priority=state.director.priority,
                language=user_ctx.language,
                persona=user_ctx.persona,
                text=localized.text,
                evidence_event_ids=state.draft.cited_event_ids,
                verified=True,
                meta={
                    "tier": "rich_agentic",
                    "agent_trace": trace,
                    "revisions": state.revision_count,
                    "chaos_index": state.evidence.chaos_index,
                    "control_index": state.evidence.control_index,
                    "controlling_team": state.evidence.controlling_team,
                    "momentum_score": state.evidence.momentum_score,
                },
            )
            await ctx.yield_output(
                PersonalizedOverlay(user_ctx=user_ctx, overlay=overlay)
            )
