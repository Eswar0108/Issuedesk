from app.core.config import settings
from app.services.llm.base import BaseLLMProvider
from app.services.llm.gemini import GeminiProvider
from app.services.llm.openai_provider import OpenAIProvider
from app.services.llm.ollama import OllamaProvider


class LLMProviderFactory:
    """
    Factory class to instantiate LLM Providers based on configuration settings.
    """

    @staticmethod
    def get_provider(provider_name: str) -> BaseLLMProvider:
        """
        Return the corresponding provider instance.
        
        Args:
            provider_name: The name of the provider (e.g. 'gemini', 'openai', 'ollama')
            
        Returns:
            An instance of BaseLLMProvider
        """
        name = provider_name.lower().strip()
        if name == "gemini":
            return GeminiProvider()
        elif name == "openai":
            return OpenAIProvider()
        elif name == "ollama":
            return OllamaProvider()
        else:
            raise ValueError(
                f"Unsupported LLM Provider: '{provider_name}'. "
                f"Currently supported options are: 'gemini', 'openai', 'ollama'."
            )
