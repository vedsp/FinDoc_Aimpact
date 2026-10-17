import os
import sys
import threading
import webbrowser
import time
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import settings
from app.core.database import engine, Base
from app.api import auth, documents, demo

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS for React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(demo.router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health():
    return {"status": "healthy"}

# --- SERVE REACT FRONTEND (For Standalone Mode) ---
# Determine where the static files are (works both in dev and when packaged as .exe)
if getattr(sys, 'frozen', False):
    # Running as compiled PyInstaller executable
    frontend_dir = os.path.join(sys._MEIPASS, "frontend_dist")
else:
    # Running in normal development mode
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist")

# Only mount static files if the frontend has been built
if os.path.exists(frontend_dir):
    # Mount the assets directory (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dir, "assets")), name="assets")
    
    # Catch-all route to serve React's index.html for client-side routing
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        requested_file = os.path.join(frontend_dir, full_path)
        # If specific file is requested (like favicon, logo), serve it
        if os.path.isfile(requested_file):
            return FileResponse(requested_file)
        # Otherwise fall back to index.html to let React Router handle the path
        return FileResponse(os.path.join(frontend_dir, "index.html"))
else:
    @app.get("/")
    def root():
        return {"message": "API is running. Frontend build not found. Run 'npm run build' in the frontend folder."}


# --- STANDALONE ENTRY POINT ---
def open_browser():
    time.sleep(1.5) # Give the server a second to start
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == "__main__":
    if getattr(sys, 'frozen', False):
        # We are running as a packaged .exe!
        threading.Thread(target=open_browser, daemon=True).start()
        # Run uvicorn without auto-reload
        uvicorn.run(app, host="127.0.0.1", port=8000)
    else:
        # We are running in normal dev mode
        uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
