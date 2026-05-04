import interfaces.db as db
import sys

if __name__ == "__main__":
    sessions = db.get_sessions()
    if not sessions:
        print("No sessions found to delete.")
        sys.exit(0)
    
    sid = sessions[0]['id']
    print(f"Attempting to delete session: {sid}")
    db.delete_session(sid)
    
    sessions_after = db.get_sessions()
    if any(s['id'] == sid for s in sessions_after):
        print("FAIL: Session still exists.")
    else:
        print("SUCCESS: Session deleted.")
