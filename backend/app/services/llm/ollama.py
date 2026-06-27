import logging
import socket
import json
from typing import Optional, List, Dict, Any
from openai import OpenAI
from fastapi import HTTPException, status
from app.services.llm.base import BaseLLMProvider
from app.core.config import settings

logger = logging.getLogger(__name__)


class OllamaProvider(BaseLLMProvider):
    """
    Ollama implementation of the LLM Provider interface.
    Runs completely offline and free on localhost:11434.
    
    Default models:
    - Text: 'llama3.1:8b' (configurable via OLLAMA_MODEL)
    - Embeddings: 'nomic-embed-text' (configurable via OLLAMA_EMBED_MODEL)
    """

    def __init__(self):
        self._client = None
        self.model_name = settings.OLLAMA_MODEL
        self.embed_model_name = settings.OLLAMA_EMBED_MODEL

    @property
    def client(self) -> OpenAI:
        """Get the OpenAI client configured for Ollama instance."""
        if self._client is None:
            self._ensure_configured()
            self._client = OpenAI(
                base_url=settings.OLLAMA_BASE_URL,
                api_key="ollama"  # dummy key required by SDK
            )
        return self._client

    def is_configured(self) -> bool:
        """Check if Ollama server is running by attempting to connect to the configured base URL."""
        try:
            from urllib.parse import urlparse
            import urllib.request
            
            # Extract the base address (e.g., http://localhost:11434)
            parsed = urlparse(settings.OLLAMA_BASE_URL)
            base_addr = f"{parsed.scheme}://{parsed.netloc}"
            
            # Send a quick request to check if it responds (accepting standard HTTP statuses)
            req = urllib.request.Request(base_addr, method="GET")
            with urllib.request.urlopen(req, timeout=1.0) as response:
                return response.status in (200, 404, 403)
        except Exception:
            return False

    def _ensure_configured(self):
        if not self.is_configured():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Ollama server is not responding at {settings.OLLAMA_BASE_URL}. "
                    "To use offline free models:\n"
                    "1. Make sure Ollama app is running locally.\n"
                    "2. If deployed to the web, make sure you are exposing Ollama "
                    "using a public tunnel (like Ngrok) and have set OLLAMA_BASE_URL in the variables."
                ),
            )

    def get_embedding(self, text: str) -> Optional[List[float]]:
        if not self.is_configured() or not text:
            return None

        try:
            truncated_text = text[:10000]
            response = self.client.embeddings.create(
                input=[truncated_text],
                model=self.embed_model_name
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Ollama embedding generation failed: {str(e)}")
            # If the user has Ollama running but lacks the embedding model, try pulling it or warn
            logger.warning(
                f"Make sure you have downloaded the embedding model by running: 'ollama pull {self.embed_model_name}'"
            )
            return None

    def generate_chat_response(
        self, prompt: str, context: str, history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        self._ensure_configured()

        try:
            system_instruction = (
                f"You are {settings.AI_NAME}, a premium intelligent helper built into the IssueDesk Bug Tracker. "
                "You help developers, managers, and viewers navigate, understand, and summarize their issues, "
                "projects, members, and comment logs.\n\n"
                "RULES:\n"
                "1. Answer user queries accurately using the provided database context. The context contains the COMPLETE, EXHAUSTIVE, and EXACT list of all issues, statistics, and comments for this project. You have full visibility into all project data. When asked for counts, totals, or lists (e.g., 'how many critical bugs', 'high priority issues'), calculate and report the exact numbers directly from the statistical summary and issue list provided. NEVER state that information is insufficient if the query can be answered from the context.\n"
                "2. Format your response in clean, beautiful Markdown. Use bullet points, code snippets, "
                "and bold text where appropriate to make responses readable.\n"
                "3. If referring to a specific issue, mention its code (e.g., PROJ-5) and title.\n"
                "4. Be helpful, professional, and concise."
            )

            messages = [
                {"role": "system", "content": system_instruction}
            ]

            user_payload = (
                f"=== DATABASE CONTEXT (PROJECT ISSUES AND COMMENTS) ===\n"
                f"{context}\n"
                f"=====================================================\n\n"
            )

            if history:
                user_payload += "=== RECENT CHAT HISTORY ===\n"
                for msg in history:
                    role = "user" if msg.get("role") == "user" else "assistant"
                    user_payload += f"{role.capitalize()}: {msg.get('content')}\n"
                user_payload += "===========================\n\n"

            user_payload += f"User's Question: {prompt}\n\nAnswer:"
            messages.append({"role": "user", "content": user_payload})

            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"Ollama generate_chat_response failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    f"Ollama model error: {str(e)}. "
                    f"Please make sure you have pulled the model by running: 'ollama pull {self.model_name}'"
                ),
            )

    def enhance_description(self, title: str, description: str) -> Dict[str, Any]:
        self._ensure_configured()

        try:
            prompt = (
                "You are an expert product manager and QA engineer. Review the following bug report/ticket draft:\n"
                f"Title: {title}\n"
                f"Draft Description: {description}\n\n"
                "Please output a JSON response containing three fields:\n"
                "1. 'enhanced_title': A clean, concise title.\n"
                "2. 'enhanced_description': A beautifully structured Markdown description including:\n"
                "   - **Summary**: Brief summary of the ticket.\n"
                "   - **Steps to Reproduce** (if a bug) or **User Story** (if a feature).\n"
                "   - **Expected Behavior** vs **Actual Behavior**.\n"
                "   - **Technical Details/Notes**.\n"
                "3. 'suggested_priority': One of 'low', 'medium', 'high', 'critical'.\n"
                "4. 'suggested_type': One of 'bug', 'feature', 'task', 'improvement'.\n\n"
                "Your response MUST be raw JSON and nothing else. Do not include markdown code block syntax (like ```json)."
            )

            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.choices[0].message.content or "{}"
            # Clean content in case Ollama wraps it in ```json ... ```
            content_cleaned = content.strip()
            if content_cleaned.startswith("```"):
                content_cleaned = content_cleaned.replace("```json", "").replace("```", "").strip()
                
            return json.loads(content_cleaned)
        except Exception as e:
            logger.error(f"Ollama enhance_description failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to auto-enhance description using local Ollama: {str(e)}",
            )

    def suggest_assignee(
        self, title: str, description: str, members: List[Dict[str, Any]], workloads: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        self._ensure_configured()

        try:
            members_str = "\n".join([f"- ID {m['id']}: {m['username']} ({m['role']})" for m in members])
            workloads_str = "\n".join([f"- Member ID {w['user_id']} has {w['count']} active/in-progress issues" for w in workloads])

            prompt = (
                "Review the following new issue:\n"
                f"Title: {title}\n"
                f"Description: {description}\n\n"
                "Here are the project members:\n"
                f"{members_str}\n\n"
                "Here is their current active workload (number of open or in_progress tickets assigned to them):\n"
                f"{workloads_str}\n\n"
                "Analyze this ticket's content and the team's workload. Recommend who should be assigned to this ticket.\n"
                "Keep in mind:\n"
                "- Match the ticket description terms to likely roles or matching previous assignments if logical.\n"
                "- Avoid overloading members who already have many active tasks.\n"
                "- If all else is equal, distribute workload evenly.\n\n"
                "Please output a JSON response containing two fields:\n"
                "1. 'suggested_user_id': Integer ID of the recommended user (must be one of the member IDs provided, or null if no recommendation).\n"
                "2. 'reasoning': A short 1-2 sentence explanation of why this member is suggested.\n\n"
                "Your response MUST be raw JSON and nothing else. Do not include markdown code block syntax (like ```json)."
            )

            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}]
            )

            content = response.choices[0].message.content or "{}"
            # Clean content in case Ollama wraps it in ```json ... ```
            content_cleaned = content.strip()
            if content_cleaned.startswith("```"):
                content_cleaned = content_cleaned.replace("```json", "").replace("```", "").strip()

            return json.loads(content_cleaned)
        except Exception as e:
            logger.error(f"Ollama suggest_assignee failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get assignee suggestion using local Ollama: {str(e)}",
            )
