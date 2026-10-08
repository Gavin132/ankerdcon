from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class MealCategory(BaseModel):
    id: str
    name: str
    sort_order: int = 0
    has_signup: bool = True
    has_cost: bool = True
    has_transport: bool = True
    is_meal: bool = False


class CreateMealCategoryRequest(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    has_signup: bool = True
    has_cost: bool = True
    has_transport: bool = True
    is_meal: bool = False


class UpdateMealCategoryRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=40)
    sort_order: Optional[int] = None
    has_signup: Optional[bool] = None
    has_cost: Optional[bool] = None
    has_transport: Optional[bool] = None
    is_meal: Optional[bool] = None
