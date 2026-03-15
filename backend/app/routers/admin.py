from fastapi import APIRouter
from app.db.supabase_client import get_db

router = APIRouter(prefix='/api/admin', tags=['admin'])


@router.get('/reports')
async def get_all_reports():
    try:
        db = get_db()
        result = db.table('credibility_reports').select('*').order('generated_at', desc=True).execute()
        return result.data
    except Exception as e:
        print(f'[admin] GET /reports error: {e}')
        return []
