"""FastAPI dependency providers shared across routers."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import supabase

_bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """Validate the Supabase JWT token and return the authenticated user's name."""
    token = credentials.credentials
    
    try:
        # Ask Supabase to validate the JWT token sent from the frontend
        auth_response = supabase.auth.get_user(token)
        user = auth_response.user
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found in auth provider",
            )
            
        # When logging in with Discord OAuth, Supabase stores their Discord details
        # inside the 'user_metadata' dictionary.
        # We can extract their name here so your routes continue to match seamlessly!
        user.id = user.user_metadata.get("full_name") or user.user_metadata.get("name")
        
        if not user.id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not resolve name from auth provider metadata",
            )
            
        return user.id

    except AuthApiError as e:
        # If the token is fake, altered, or expired, Supabase throws an AuthApiError
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e.message}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )