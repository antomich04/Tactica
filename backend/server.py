from fastapi import FastAPI
from routes.overlays_stream import router as overlays_router

app = FastAPI()
app.include_router(overlays_router)

@app.get("/health")
def health_check():
    return {"status": "healthy"}