import sys
import os
sys.path.append(os.getcwd())
import interfaces.db as db

sessions = db.get_sessions()
if not sessions:
    print("No sessions to delete")
    sys.exit(0)

id_to_delete = sessions[0]['id']
print(f"Deleting session: {id_to_delete}")
db.delete_session(id_to_delete)

new_sessions = db.get_sessions()
if any(s['id'] == id_to_delete for s in new_sessions):
    print("FAILED: Session still exists")
else:
    print("SUCCESS: Session deleted")
