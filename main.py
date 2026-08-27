from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sqlite3

app = FastAPI()


# =========================
# DATABASE SETUP
# =========================

conn = sqlite3.connect("tasks.db", check_same_thread=False)
conn.row_factory = sqlite3.Row

conn.execute("""
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0
)
""")

# Seed exactly 3 tasks only when the table is empty
count = conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]

if count == 0:
    conn.executemany(
        "INSERT INTO tasks (title, done) VALUES (?, ?)",
        [
            ("Learn FastAPI", 0),
            ("Build a Task API", 0),
            ("Test the API", 1)
        ]
    )
    conn.commit()


# =========================
# REQUEST MODELS
# =========================

class TaskCreate(BaseModel):
    title: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    done: bool | None = None


# =========================
# ROOT
# =========================

@app.get("/")
def root():
    return {
        "name": "Task API",
        "version": "1.0",
        "endpoints": ["/tasks"]
    }


# =========================
# GET ALL TASKS
# =========================

@app.get("/tasks")
def get_tasks():
    rows = conn.execute(
        "SELECT * FROM tasks"
    ).fetchall()

    return [
        {
            "id": row["id"],
            "title": row["title"],
            "done": bool(row["done"])
        }
        for row in rows
    ]


# =========================
# GET ONE TASK
# =========================

@app.get("/tasks/{id}")
def get_task(id: int):
    row = conn.execute(
        "SELECT * FROM tasks WHERE id = ?",
        (id,)
    ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    return {
        "id": row["id"],
        "title": row["title"],
        "done": bool(row["done"])
    }


# =========================
# CREATE TASK
# =========================

@app.post("/tasks", status_code=201)
def create_task(task: TaskCreate):

    if task.title is None or not task.title.strip():
        raise HTTPException(
            status_code=400,
            detail="Title is required and cannot be empty"
        )

    cursor = conn.execute(
        "INSERT INTO tasks (title, done) VALUES (?, ?)",
        (task.title, 0)
    )

    conn.commit()

    new_id = cursor.lastrowid

    return {
        "id": new_id,
        "title": task.title,
        "done": False
    }


# =========================
# UPDATE TASK
# =========================

@app.put("/tasks/{id}")
def update_task(id: int, task: TaskUpdate):

    if task.title is None or not task.title.strip():
        raise HTTPException(
            status_code=400,
            detail="Title is required and cannot be empty"
        )

    if task.done is None:
        raise HTTPException(
            status_code=400,
            detail="Done is required"
        )

    existing = conn.execute(
        "SELECT * FROM tasks WHERE id = ?",
        (id,)
    ).fetchone()

    if existing is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    conn.execute(
        """
        UPDATE tasks
        SET title = ?, done = ?
        WHERE id = ?
        """,
        (task.title, int(task.done), id)
    )

    conn.commit()

    return {
        "id": id,
        "title": task.title,
        "done": task.done
    }


# =========================
# DELETE TASK
# =========================

@app.delete("/tasks/{id}", status_code=204)
def delete_task(id: int):

    existing = conn.execute(
        "SELECT * FROM tasks WHERE id = ?",
        (id,)
    ).fetchone()

    if existing is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    conn.execute(
        "DELETE FROM tasks WHERE id = ?",
        (id,)
    )

    conn.commit()

    return None