from pydantic import BaseModel, Field


class SavedWordCreate(BaseModel):
    word: str = Field(min_length=1, max_length=120)
    translation: str = Field(default="", max_length=300)
    phonetic: str | None = Field(default=None, max_length=120)
    audio_url: str | None = Field(default=None, max_length=500)
    part_of_speech: str | None = Field(default=None, max_length=50)
    definition: str | None = None
    example: str | None = None
    example_translation: str | None = None
    synonyms: list[str] = Field(default_factory=list)
    note: str | None = None


class SavedWordUpdate(BaseModel):
    note: str | None = Field(default=None, max_length=2000)
    translation: str | None = Field(default=None, max_length=300)
