from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any

class BaseLLMProvider(ABC):
    """
    Abstract Base Class defining the interface for LLM/RAG Operations.
    All providers (Gemini, OpenAI, Anthropic, Ollama, etc.) must implement this interface.
    """

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if the necessary configuration (like API Keys) is present for this provider."""
        pass

    @abstractmethod
    def get_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate a text embedding vector.
        Should fail gracefully and return None to prevent application crashes if issues arise.
        """
        pass

    @abstractmethod
    def generate_chat_response(
        self, prompt: str, context: str, history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Generate a RAG-based chat response with injected database context.
        """
        pass

    @abstractmethod
    def enhance_description(self, title: str, description: str) -> Dict[str, Any]:
        """
        Enhance a ticket title and description, returning a structured dict with fields:
        'enhanced_title', 'enhanced_description', 'suggested_priority', 'suggested_type'.
        """
        pass

    @abstractmethod
    def suggest_assignee(
        self, title: str, description: str, members: List[Dict[str, Any]], workloads: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Recommend an assignee from project members based on current workload and context.
        Returns a dict with fields: 'suggested_user_id', 'reasoning'.
        """
        pass
