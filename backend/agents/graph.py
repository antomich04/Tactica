import os
from dotenv import load_dotenv
from agent_framework import WorkflowBuilder
from agent_framework.openai import OpenAIChatClient
from agents.state import TacticaGraphState
from agents.director.node import DirectorExecutor
from agents.analyst.node import AnalystExecutor
from agents.narrator.node import NarratorExecutor
from agents.verifier.node import VerifierExecutor
from agents.localizer.node import LocalizerExecutor

load_dotenv()

MAX_VERIFIER_REVISIONS = 2
_shared_client: OpenAIChatClient | None = None

def _get_openai_client() -> OpenAIChatClient:
    global _shared_client
    if _shared_client is None:
        api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
        model_name = (
            os.getenv("OPENAI_CHAT_MODEL_ID")
            or os.getenv("OPENAI_CHAT_MODEL")
            or os.getenv("OPENAI_MODEL")
            or "gpt-4o-mini"
        ).strip()
        base_url = os.getenv("OPENAI_BASE_URL")

        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is missing or empty. Check your backend/.env file.")

        _shared_client = OpenAIChatClient(
            model=model_name,
            api_key=api_key,
            base_url=base_url,
        )
    return _shared_client

def build_tactica_workflow():
    """Builds a fresh, isolated Workflow instance sharing the underlying OpenAIChatClient."""
    client = _get_openai_client()

    director = DirectorExecutor(client)
    analyst = AnalystExecutor(client)
    narrator = NarratorExecutor(client)
    verifier = VerifierExecutor(client)
    localizer = LocalizerExecutor(client)

    builder = WorkflowBuilder(start_executor=director)
    builder.max_iterations = 15

    builder.add_edge(
        director,
        analyst,
        condition=lambda s: isinstance(s, TacticaGraphState)
        and s.director is not None
        and s.director.route == "deep_analyst",
    )
    builder.add_edge(
        director,
        narrator,
        condition=lambda s: isinstance(s, TacticaGraphState)
        and s.director is not None
        and s.director.route == "fast_narrator",
    )

    builder.add_edge(analyst, narrator)
    builder.add_edge(narrator, verifier)

    builder.add_edge(
        verifier,
        narrator,
        condition=lambda s: isinstance(s, TacticaGraphState)
        and s.verification is not None
        and not s.verification.is_verified
        and s.revision_count <= MAX_VERIFIER_REVISIONS,
    )

    builder.add_edge(
        verifier,
        localizer,
        condition=lambda s: isinstance(s, TacticaGraphState)
        and s.verification is not None
        and s.verification.is_verified,
    )

    return builder.build()