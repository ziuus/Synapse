import json
import sqlite3
import numpy as np
from pathlib import Path
import requests

class VectorMemory:
    def __init__(self, db_path="data/synapse.db"):
        self.db_path = db_path
        self.init_vector_db()

    def init_vector_db(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS embeddings (
                message_id TEXT PRIMARY KEY,
                vector TEXT,
                FOREIGN KEY (message_id) REFERENCES messages (id)
            )
        ''')
        conn.commit()
        conn.close()

    def get_embedding(self, text, model="nomic-embed-text"):
        try:
            res = requests.post("http://localhost:11434/api/embeddings", 
                                json={"model": model, "prompt": text})
            if res.status_code == 200:
                return res.json()["embedding"]
        except Exception as e:
            print(f"Embedding error: {e}")
        return None

    def store(self, message_id, text):
        embedding = self.get_embedding(text)
        if embedding:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute("INSERT OR REPLACE INTO embeddings (message_id, vector) VALUES (?, ?)",
                      (message_id, json.dumps(embedding)))
            conn.commit()
            conn.close()

    def search(self, query_text, limit=3):
        query_vec = self.get_embedding(query_text)
        if not query_vec:
            return []

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT m.*, e.vector FROM messages m JOIN embeddings e ON m.id = e.message_id")
        rows = c.fetchall()
        
        results = []
        for row in rows:
            vec = json.loads(row["vector"])
            # Simple Cosine Similarity
            similarity = np.dot(query_vec, vec) / (np.linalg.norm(query_vec) * np.linalg.norm(vec))
            results.append({"content": row["content"], "role": row["role"], "similarity": similarity})
        
        conn.close()
        # Sort by similarity
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:limit]
