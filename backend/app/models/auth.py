from pydantic import BaseModel, field_validator


class LoginRequest(BaseModel):
    user_name: str
    passcode: str

    @field_validator("user_name", "passcode")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Mag niet leeg zijn")
        return v.strip()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
