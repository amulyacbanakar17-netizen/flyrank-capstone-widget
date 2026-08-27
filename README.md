# Task API - SQLite

A simple FastAPI CRUD Task API migrated from in-memory storage to SQLite.

## Why SQLite?

SQLite was chosen because it is a single-file database with zero setup and the data survives server restarts.

## Database

The database file is:

`tasks.db`

It is created automatically when the application starts if it does not already exist. The `tasks` table is also created automatically, and three example tasks are seeded only when the table is empty.

## Run the Project

Start the FastAPI server with:

```bash
uvicorn main:app --reload