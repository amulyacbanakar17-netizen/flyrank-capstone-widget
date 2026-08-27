from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:dev@localhost:5432/tasks"
)


# =========================
# DATABASE SETUP
# =========================

def get_connection():
    return psycopg.connect(DATABASE_URL)


def setup_database():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                done BOOLEAN NOT NULL DEFAULT FALSE
            )
        """)

        count = conn.execute(
            "SELECT COUNT(*) FROM tasks"
        ).fetchone()[0]

        if count == 0:
            with conn.cursor() as cur:
              cur.executemany(
        "INSERT INTO tasks (title, done) VALUES (%s, %s)",
        [
            ("Learn FastAPI", False),
            ("Build a Task API", False),
            ("Test the API", True)
        ]
    )


setup_database()


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
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM tasks ORDER BY id"
        ).fetchall()

    return [
        {
            "id": row[0],
            "title": row[1],
            "done": row[2]
        }
        for row in rows
    ]


# =========================
# GET ONE TASK
# =========================

@app.get("/tasks/{id}")
def get_task(id: int):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM tasks WHERE id = %s",
            (id,)
        ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    return {
        "id": row[0],
        "title": row[1],
        "done": row[2]
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

    with get_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO tasks (title, done)
            VALUES (%s, %s)
            RETURNING id, title, done
            """,
            (task.title, False)
        ).fetchone()

    return {
        "id": row[0],
        "title": row[1],
        "done": row[2]
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

    with get_connection() as conn:
        existing = conn.execute(
            "SELECT * FROM tasks WHERE id = %s",
            (id,)
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )

        row = conn.execute(
            """
            UPDATE tasks
            SET title = %s, done = %s
            WHERE id = %s
            RETURNING id, title, done
            """,
            (task.title, task.done, id)
        ).fetchone()

    return {
        "id": row[0],
        "title": row[1],
        "done": row[2]
    }


# =========================
# DELETE TASK
# =========================

@app.delete("/tasks/{id}", status_code=204)
def delete_task(id: int):

    with get_connection() as conn:
        existing = conn.execute(
            "SELECT * FROM tasks WHERE id = %s",
            (id,)
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )

        conn.execute(
            "DELETE FROM tasks WHERE id = %s",
            (id,)
        )

    return None