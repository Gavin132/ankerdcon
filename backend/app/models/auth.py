from pydantic import BaseModel


class LoginRequest(BaseModel):
    passphrase: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
