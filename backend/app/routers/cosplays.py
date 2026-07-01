from fastapi import APIRouter, Depends, HTTPException, status

from app.constants import Tables
from app.core.database import supabase
from app.dependencies import get_current_user
from app.models.cosplay import Cosplay, CreateCosplayRequest

router = APIRouter(prefix="/cosplays", tags=["cosplays"])


@router.get("/", response_model=list[Cosplay])
def list_cosplays(_: str = Depends(get_current_user)):
    return (
        supabase.table(Tables.COSPLAYS)
        .select("*")
        .order("created_at", desc=True)
        .execute()
        .data
    )


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=Cosplay)
def create_cosplay(body: CreateCosplayRequest, _: str = Depends(get_current_user)):
    if not body.linked_event_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Selecteer minimaal één dag.",
        )
    resp = supabase.table(Tables.COSPLAYS).insert(body.model_dump()).execute()
    return resp.data[0]


@router.delete("/{cosplay_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cosplay(cosplay_id: str, _: str = Depends(get_current_user)):
    supabase.table(Tables.COSPLAYS).delete().eq("id", cosplay_id).execute()
