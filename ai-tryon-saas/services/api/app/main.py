from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes.auth import router as auth_router
from app.routes.entities import router as entities_router
from app.routes.client_auth import router as client_auth_router
from app.routes.widget import router as widget_router

_cors_list = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_list or ["http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "AI Try-On API is running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
    }


app.include_router(auth_router)
app.include_router(client_auth_router)
app.include_router(widget_router)
app.include_router(entities_router)
