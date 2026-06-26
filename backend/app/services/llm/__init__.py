from app.core.config import settings
from app.services.llm.factory import LLMProviderFactory

# Instantiate the active singleton provider based on configurations at startup.
# Business logic can import this variable directly: from app.services.llm import llm_provider
llm_provider = LLMProviderFactory.get_provider(settings.LLM_PROVIDER)


def get_llm_provider():
    """
    Retrieve the active LLM Provider instance dynamically.
    Useful for testing or if configurations change at runtime.
    """
    return LLMProviderFactory.get_provider(settings.LLM_PROVIDER)
