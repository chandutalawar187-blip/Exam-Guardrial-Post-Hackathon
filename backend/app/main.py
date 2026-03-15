from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import events, sessions, reports, auth, students, questions, admin, exams, submissions

app = FastAPI(title='ExamGuardrail', version='2.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*']
)

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(events.router)
app.include_router(reports.router)
app.include_router(students.router)
app.include_router(questions.router)
app.include_router(admin.router)
app.include_router(exams.router)
app.include_router(submissions.router)


@app.get('/health')
async def health():
    return {'status': 'ok', 'version': '2.0.0'}
