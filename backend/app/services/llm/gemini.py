import logging
from typing import Optional, List, Dict, Any
import google.generativeai as genai
from fastapi import HTTPException, status
from app.core.config import settings
from app.services.llm.base import BaseLLMProvider

logger = logging.getLogger(__name__)

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini implementation of the LLM Provider interface.
    """

    def is_configured(self) -> bool:
        return bool(settings.GEMINI_API_KEY)

    def _ensure_configured(self):
        if not self.is_configured():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Gemini API key is not configured. "
                    "Please get a free API key from Google AI Studio (https://aistudio.google.com/) "
                    "and set GEMINI_API_KEY in your backend/.env file."
                ),
            )

    def get_embedding(self, text: str) -> Optional[List[float]]:
        if not self.is_configured() or not text:
            return None

        try:
            truncated_text = text[:10000]
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=truncated_text,
                task_type="retrieval_document",
            )
            return result.get("embedding")
        except Exception as e:
            logger.error(f"Gemini embedding generation failed: {str(e)}")
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
                "1. Answer user queries accurately based ONLY on the provided database context. If the answer "
                "cannot be found or inferred from the context, state that you do not have enough information.\n"
                "2. Format your response in clean, beautiful Markdown. Use bullet points, code snippets, "
                "and bold text where appropriate to make responses readable.\n"
                "3. If referring to a specific issue, mention its code (e.g., PROJ-5) and title.\n"
                "4. Be helpful, professional, and concise."
            )

            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=system_instruction,
            )

            full_prompt = (
                f"=== DATABASE CONTEXT (PROJECT ISSUES AND COMMENTS) ===\n"
                f"{context}\n"
                f"=====================================================\n\n"
            )

            if history:
                full_prompt += "=== RECENT CHAT HISTORY ===\n"
                for msg in history:
                    role = "User" if msg.get("role") == "user" else "Assistant"
                    full_prompt += f"{role}: {msg.get('content')}\n"
                full_prompt += "===========================\n\n"

            full_prompt += f"User's Question: {prompt}\n\nAnswer:"

            response = model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini generate_chat_response failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gemini API model error: {str(e)}",
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
                "Response MUST be in raw JSON format (do not wrap in ```json or other markups):"
            )

            model = genai.GenerativeModel(model_name="gemini-1.5-flash")
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            import json
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini enhance_description failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to auto-enhance description using Gemini: {str(e)}",
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
                "Response MUST be in raw JSON format (do not wrap in ```json or other markups):"
            )

            model = genai.GenerativeModel(model_name="gemini-1.5-flash")
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )

            import json
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini suggest_assignee failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get assignee suggestion using Gemini: {str(e)}",
            )
