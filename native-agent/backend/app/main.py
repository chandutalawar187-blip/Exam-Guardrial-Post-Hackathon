# backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import events, sessions, reports

app = FastAPI(title='ExamGuardrail API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'https://your-dashboard.render.com'
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(events.router, prefix='/api', tags=['Events'])
app.include_router(sessions.router, prefix='/api', tags=['Sessions'])
app.include_router(reports.router, prefix='/api', tags=['Reports'])


@app.get('/health')
async def health():
    return {'status': 'ok', 'version': '1.0.0'}


# Run: uvicorn app.main:app --reload --port 8000
