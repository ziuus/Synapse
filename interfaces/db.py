import sqlite3
import uuid
import json
from datetime import datetime
from pathlib import Path

DB_PATH = Path("data/synapse.db")

def init_db():
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT,
            role TEXT DEFAULT 'generalist',
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        )
    ''')
    # ...
    # Migration: Ensure role column exists
    try:
        c.execute("ALTER TABLE sessions ADD COLUMN role TEXT DEFAULT 'generalist'")
        conn.commit()
    except sqlite3.OperationalError:
        pass
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            role TEXT,
            content TEXT,
            model TEXT,
            latency REAL,
            created_at TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions (id)
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS knowledge (
            id TEXT PRIMARY KEY,
            fact TEXT,
            category TEXT,
            created_at TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS traits (
            name TEXT PRIMARY KEY,
            value TEXT
        )
    ''')
    conn.commit()
    
    # Migration: Ensure latency column exists in messages table
    try:
        c.execute("ALTER TABLE messages ADD COLUMN latency REAL DEFAULT 0.0")
        conn.commit()
    except sqlite3.OperationalError:
        pass # Already exists
        
    conn.close()

def create_session(title="New Chat"):
    session_id = str(uuid.uuid4())
    now = datetime.now()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
              (session_id, title, now, now))
    conn.commit()
    conn.close()
    return session_id

def get_sessions():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM sessions ORDER BY updated_at DESC")
    sessions = [dict(row) for row in c.fetchall()]
    conn.close()
    return sessions

def get_messages(session_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC", (session_id,))
    messages = [dict(row) for row in c.fetchall()]
    conn.close()
    return messages

def add_message(session_id, role, content, model=None, latency=0.0):
    msg_id = str(uuid.uuid4())
    now = datetime.now()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO messages (id, session_id, role, content, model, latency, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
              (msg_id, session_id, role, content, model, latency, now))
    c.execute("UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id))
    
    # Auto-generate title for first user message if title is "New Chat"
    if role == "user":
        c.execute("SELECT title, (SELECT COUNT(*) FROM messages WHERE session_id = ?) as msg_count FROM sessions WHERE id = ?", (session_id, session_id))
        row = c.fetchone()
        if row and row[0] == "New Chat" and row[1] == 1:
            # First message, update title
            new_title = content[:30] + "..." if len(content) > 30 else content
            c.execute("UPDATE sessions SET title = ? WHERE id = ?", (new_title, session_id))
            
    conn.commit()
    conn.close()

def delete_session(session_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    c.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()

def update_session_title(session_id, title):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE sessions SET title = ? WHERE id = ?", (title, session_id))
    conn.commit()
    conn.close()

def get_session(session_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def update_session_role(session_id, role):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE sessions SET role = ? WHERE id = ?", (role, session_id))
    conn.commit()
    conn.close()

def get_total_messages():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM messages")
    count = c.fetchone()[0]
    conn.close()
    return count

def get_activity_score(hour_ago=0):
    # Returns number of messages in a given 10-min window for visualization
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Simple mock-less logic: count messages in specific recent intervals
    c.execute("SELECT COUNT(*) FROM messages WHERE created_at > datetime('now', ?)", (f'-{ (hour_ago+1)*10 } minutes',))
    count = c.fetchone()[0]
    conn.close()
    return min(100, count * 10 + 20) # Normalize for bar chart (20 is baseline)

# Initialize on module load
init_db()
