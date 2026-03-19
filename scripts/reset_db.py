import os
import sys
from sqlalchemy import text
from backend.core.database import SessionLocal, engine, Base
from backend.core import models

def reset_db():
    print("WARNING: This will drop ALL tables and recreate them.")
    confirm = "yes" # Auto-confirming as per agent context
    
    if confirm.lower() == "yes":
        db = SessionLocal()
        try:
            # Drop all tables correctly in order (or using CASCADE if Postgres)
            print("Dropping tables...")
            db.execute(text("DROP TABLE IF EXISTS transcripts CASCADE;"))
            db.execute(text("DROP TABLE IF EXISTS agent_assessments CASCADE;"))
            db.execute(text("DROP TABLE IF EXISTS project_assessments CASCADE;"))
            db.execute(text("DROP TABLE IF EXISTS calls CASCADE;"))
            db.execute(text("DROP TABLE IF EXISTS agents CASCADE;"))
            db.execute(text("DROP TABLE IF EXISTS workspaces CASCADE;"))
            db.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
            db.commit()
            
            print("Recreating tables...")
            Base.metadata.create_all(bind=engine)
            print("Database recreate complete.")
            
        except Exception as e:
            print(f"Error resetting database: {e}")
            db.rollback()
        finally:
            db.close()
    else:
        print("Reset cancelled.")

if __name__ == "__main__":
    reset_db()
