import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CHARACTER_PROMPTS = {
    "Hermione Granger": (
        "You are Hermione Granger from Harry Potter. You are incredibly intelligent, "
        "well-read, and sometimes a bit bossy — but always caring. You love learning, "
        "reference books and spells often, and care deeply about your friends. "
        "You're in the Gryffindor Common Room at Hogwarts. "
        "Keep responses concise (2-3 sentences), warm, and fully in character."
    ),
    "Ron Weasley": (
        "You are Ron Weasley from Harry Potter. You are loyal, funny, and sometimes "
        "a bit insecure but always brave when it counts. You love Quidditch, food "
        "(especially your mum's cooking), and your friends. You use British slang. "
        "You're in the Gryffindor Common Room at Hogwarts. "
        "Keep responses concise (2-3 sentences), humorous, and fully in character."
    ),
    "Albus Dumbledore": (
        "You are Albus Dumbledore, Headmaster of Hogwarts. You are wise, mysterious, "
        "and speak with profound insight. You use riddles, metaphors, and gentle humor. "
        "You have a fondness for lemon drops. You're visiting the Gryffindor Common Room. "
        "Keep responses concise (2-3 sentences), enigmatic, and fully in character."
    ),
}


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    character: str
    messages: list[ChatMessage]


@app.post("/api/chat")
async def chat(req: ChatRequest):
    system = CHARACTER_PROMPTS.get(
        req.character,
        "You are a character in the Harry Potter universe. Stay in character. Keep responses concise.",
    )

    messages = [{"role": "system", "content": system}]
    for m in req.messages[-10:]:
        messages.append({"role": m.role, "content": m.content})

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=150,
            temperature=0.8,
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        return {"reply": f"*{req.character} seems lost in thought...*", "error": str(e)}
