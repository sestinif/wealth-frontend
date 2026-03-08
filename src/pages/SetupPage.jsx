from fastapi import FastAPI, Depends, HTTPException, status, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import Optional
import os

from auth import (
    Token, TokenData, create_token, decode_token, get_user,
    setup_required, create_first_user, authenticate, change_password,
    ACCESS_TOKEN_EXPIRE_DAYS
)
from data_manager import (
    get_purchases, add_purchase, update_purchase, delete_purchase,
    get_portfolio_summary
)
from prices import get_all_prices

app = FastAPI(title="Wealth API", version="2.0.0")

security = HTTPBearer()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    username = decode_token(token)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = get_user(username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/setup-required")
async def check_setup_required():
    return {"required": setup_required()}


@app.post("/auth/setup")
async def setup(username: str = Form(...), email: str = Form(...), password: str = Form(...)):
    if not setup_required():
        raise HTTPException(status_code=400, detail="Setup already completed")
    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="Missing required fields")
    if create_first_user(username, email, password):
        return {"message": "User created successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to create user")


@app.post("/auth/login", response_model=Token)
async def login(username: str = Form(...), password: str = Form(...)):
    user = authenticate(username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_token(
        data={"sub": user["username"]},
        expires_delta=timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user["username"]
    }


@app.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "email": current_user["email"],
        "created_at": current_user["created_at"]
    }


@app.post("/auth/change-password")
async def change_pwd(
    old_password: str,
    new_password: str,
    current_user: dict = Depends(get_current_user)
):
    if change_password(current_user["username"], old_password, new_password):
        return {"message": "Password changed successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to change password")


@app.get("/prices")
async def get_prices():
    return get_all_prices()


@app.get("/purchases")
async def list_purchases(current_user: dict = Depends(get_current_user)):
    return get_purchases()


@app.post("/purchases")
async def create_purchase(
    date: str,
    asset: str,
    amount_eur: float,
    price_eur: float,
    notes: str = "",
    current_user: dict = Depends(get_current_user)
):
    if asset not in ["BTC", "VUAA"]:
        raise HTTPException(status_code=400, detail="Invalid asset")
    
    purchase = add_purchase(date, asset, amount_eur, price_eur, notes)
    return purchase


@app.put("/purchases/{purchase_id}")
async def edit_purchase(
    purchase_id: str,
    date: str,
    asset: str,
    amount_eur: float,
    price_eur: float,
    notes: str = "",
    current_user: dict = Depends(get_current_user)
):
    if asset not in ["BTC", "VUAA"]:
        raise HTTPException(status_code=400, detail="Invalid asset")
    
    purchase = update_purchase(purchase_id, date, asset, amount_eur, price_eur, notes)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    return purchase


@app.delete("/purchases/{purchase_id}")
async def remove_purchase(
    purchase_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not delete_purchase(purchase_id):
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    return {"message": "Purchase deleted"}


@app.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    prices = get_all_prices()
    summary = get_portfolio_summary(prices)
    return {
        "prices": prices,
        "summary": summary,
        "purchases": get_purchases()
    }


@app.get("/reports/monthly")
async def get_monthly_report(
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user)
):
    purchases = get_purchases()
    prices = get_all_prices()
    
    month_purchases = [
        p for p in purchases
        if p["date"].startswith(f"{year:04d}-{month:02d}")
    ]
    
    total_invested = sum(p["amount_eur"] for p in month_purchases)
    
    btc_qty = sum(p["quantity"] for p in month_purchases if p["asset"] == "BTC")
    vuaa_qty = sum(p["quantity"] for p in month_purchases if p["asset"] == "VUAA")
    
    btc_value = btc_qty * prices["BTC"]
    vuaa_value = vuaa_qty * prices["VUAA"]
    total_value = btc_value + vuaa_value
    
    pnl = total_value - total_invested
    pnl_pct = (pnl / total_invested * 100) if total_invested > 0 else 0
    
    return {
        "period": f"{year:04d}-{month:02d}",
        "total_invested": round(total_invested, 2),
        "total_value": round(total_value, 2),
        "pnl": round(pnl, 2),
        "pnl_pct": round(pnl_pct, 2),
        "by_asset": {
            "BTC": {
                "qty": round(btc_qty, 8),
                "value": round(btc_value, 2),
                "invested": sum(p["amount_eur"] for p in month_purchases if p["asset"] == "BTC")
            },
            "VUAA": {
                "qty": round(vuaa_qty, 8),
                "value": round(vuaa_value, 2),
                "invested": sum(p["amount_eur"] for p in month_purchases if p["asset"] == "VUAA")
            }
        },
        "transactions": month_purchases
    }


@app.get("/reports/annual")
async def get_annual_report(
    year: int,
    current_user: dict = Depends(get_current_user)
):
    purchases = get_purchases()
    prices = get_all_prices()
    
    year_purchases = [
        p for p in purchases
        if p["date"].startswith(f"{year:04d}")
    ]
    
    total_invested = sum(p["amount_eur"] for p in year_purchases)
    
    btc_qty = sum(p["quantity"] for p in year_purchases if p["asset"] == "BTC")
    vuaa_qty = sum(p["quantity"] for p in year_purchases if p["asset"] == "VUAA")
    
    btc_value = btc_qty * prices["BTC"]
    vuaa_value = vuaa_qty * prices["VUAA"]
    total_value = btc_value + vuaa_value
    
    pnl = total_value - total_invested
    pnl_pct = (pnl / total_invested * 100) if total_invested > 0 else 0
    
    return {
        "period": f"{year:04d}",
        "total_invested": round(total_invested, 2),
        "total_value": round(total_value, 2),
        "pnl": round(pnl, 2),
        "pnl_pct": round(pnl_pct, 2),
        "by_asset": {
            "BTC": {
                "qty": round(btc_qty, 8),
                "value": round(btc_value, 2),
                "invested": sum(p["amount_eur"] for p in year_purchases if p["asset"] == "BTC")
            },
            "VUAA": {
                "qty": round(vuaa_qty, 8),
                "value": round(vuaa_value, 2),
                "invested": sum(p["amount_eur"] for p in year_purchases if p["asset"] == "VUAA")
            }
        },
        "transactions": year_purchases
    }


@app.get("/reports/lifetime")
async def get_lifetime_report(current_user: dict = Depends(get_current_user)):
    purchases = get_purchases()
    prices = get_all_prices()
    summary = get_portfolio_summary(prices)
    
    return {
        "period": "LIFETIME",
        "total_invested": summary["total_invested"],
        "total_value": summary["total_value"],
        "pnl": summary["pnl"],
        "pnl_pct": summary["pnl_pct"],
        "by_asset": summary["by_asset"],
        "transactions": purchases
    }
