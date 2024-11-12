import uvicorn
from app import create_app
from app.db.database import init_db

app = create_app()
# Initialize database on startup
@app.on_event("startup")
async def startup():
    init_db()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)