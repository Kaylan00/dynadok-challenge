import os

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

LANGUAGE_NAMES = {
    "pt": "Portuguese",
    "en": "English",
    "es": "Spanish",
}

PROMPT_TEMPLATE = (
    "Write a concise summary of the following text and translate it to {language}.\n"
    "Return ONLY the summary, with no labels or additional commentary.\n\n"
    "Text:\n{text}\n\n"
    "Summary:"
)


class LLMService:
    def __init__(self) -> None:
        hf_token = os.getenv("HF_TOKEN")
        if not hf_token:
            raise RuntimeError("HF_TOKEN is required")

        self.llm = ChatOpenAI(
            model="Qwen/Qwen2.5-7B-Instruct-Turbo",
            temperature=0.5,
            api_key=hf_token,  # type: ignore
            base_url="https://router.huggingface.co/together/v1",
        )
        self.prompt = PromptTemplate.from_template(PROMPT_TEMPLATE)
        self.chain = self.prompt | self.llm | StrOutputParser()

    def summarize(self, text: str, lang: str) -> str:
        language = LANGUAGE_NAMES.get(lang, "English")
        try:
            result = self.chain.invoke({"text": text, "language": language})
            return result.strip()
        except Exception as e:
            raise RuntimeError(f"LLM call failed: {e}") from e
