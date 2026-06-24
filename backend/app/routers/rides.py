from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user
from app.models.rides import (
    Ride, CreateRideRequest, ClaimSeatRequest, 
    RestaurantDriverRequest, LeaveRestaurantDriverRequest,
    RestaurantAssignRequest, RestaurantUnassignRequest
)
from app.core.database import supabase

router = APIRouter(prefix="/rides", tags=["rides"])

@router.get("/", response_model=list[Ride])
def list_rides(direction: str | None = None, _: str = Depends(get_current_user)) -> list[Ride]:
    query = supabase.table("rides").select("*").order("departure_time")
    if direction:
        query = query.eq("direction", direction)
    response = query.execute()
    return response.data

@router.post("/", response_model=Ride)
def create_ride(body: CreateRideRequest, _: str = Depends(get_current_user)) -> Ride:
    new_ride = body.model_dump()
    new_ride["passengers"] = []
    new_ride["restaurant_drivers"] = []
    
    response = supabase.table("rides").insert(new_ride).execute()
    return response.data[0]

@router.post("/{ride_id}/claim", response_model=Ride)
def claim_seat(ride_id: str, body: ClaimSeatRequest, _: str = Depends(get_current_user)) -> Ride:
    resp = supabase.table("rides").select("passengers, total_seats").eq("id", ride_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Ride not found")
        
    row = resp.data[0]
    passengers = row.get("passengers") or []
    
    if body.user_name not in passengers:
        if len(passengers) >= row.get("total_seats", 0):
            raise HTTPException(status_code=400, detail="Ride is full")
        passengers.append(body.user_name)
        resp = supabase.table("rides").update({"passengers": passengers}).eq("id", ride_id).execute()
        return resp.data[0]
    return resp.data[0]

@router.post("/{ride_id}/leave", response_model=Ride)
def leave_seat(ride_id: str, body: ClaimSeatRequest, _: str = Depends(get_current_user)) -> Ride:
    resp = supabase.table("rides").select("passengers").eq("id", ride_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Ride not found")
        
    passengers = resp.data[0].get("passengers") or []
    if body.user_name in passengers:
        passengers.remove(body.user_name)
        resp = supabase.table("rides").update({"passengers": passengers}).eq("id", ride_id).execute()
        return resp.data[0]
    return resp.data[0]

# --- RESTAURANT LOGIC ---

@router.post("/{ride_id}/restaurant-driver", status_code=status.HTTP_204_NO_CONTENT)
def add_restaurant_driver(ride_id: str, body: RestaurantDriverRequest, _: str = Depends(get_current_user)):
    resp = supabase.table("rides").select("restaurant_drivers").eq("id", ride_id).execute()
    drivers = resp.data[0].get("restaurant_drivers") or []
    
    if not any(d.get("name") == body.user_name for d in drivers):
        drivers.append({"name": body.user_name, "seats": body.seats, "passengers": []})
        supabase.table("rides").update({"restaurant_drivers": drivers}).eq("id", ride_id).execute()

@router.post("/{ride_id}/restaurant-driver/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_restaurant_driver(ride_id: str, body: LeaveRestaurantDriverRequest, _: str = Depends(get_current_user)):
    resp = supabase.table("rides").select("restaurant_drivers").eq("id", ride_id).execute()
    drivers = [d for d in (resp.data[0].get("restaurant_drivers") or []) if d.get("name") != body.user_name]
    supabase.table("rides").update({"restaurant_drivers": drivers}).eq("id", ride_id).execute()

@router.post("/{ride_id}/restaurant-driver/assign", status_code=status.HTTP_204_NO_CONTENT)
def assign_to_driver(ride_id: str, body: RestaurantAssignRequest, _: str = Depends(get_current_user)):
    resp = supabase.table("rides").select("restaurant_drivers").eq("id", ride_id).execute()
    drivers = resp.data[0].get("restaurant_drivers") or []
    
    # Remove user from any existing driver first to prevent duplicates
    for d in drivers:
        if body.user_name in d.get("passengers", []):
            d["passengers"].remove(body.user_name)
            
    # Add to new driver
    for d in drivers:
        if d.get("name") == body.driver_name:
            d.setdefault("passengers", []).append(body.user_name)
            break
            
    supabase.table("rides").update({"restaurant_drivers": drivers}).eq("id", ride_id).execute()

@router.post("/{ride_id}/restaurant-driver/unassign", status_code=status.HTTP_204_NO_CONTENT)
def unassign_from_driver(ride_id: str, body: RestaurantUnassignRequest, _: str = Depends(get_current_user)):
    resp = supabase.table("rides").select("restaurant_drivers").eq("id", ride_id).execute()
    drivers = resp.data[0].get("restaurant_drivers") or []
    
    for d in drivers:
        if body.user_name in d.get("passengers", []):
            d["passengers"].remove(body.user_name)
            
    supabase.table("rides").update({"restaurant_drivers": drivers}).eq("id", ride_id).execute()