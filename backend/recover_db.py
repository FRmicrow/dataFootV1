import sqlite3
import sys

def recover():
    try:
        print("Starting recovery import...")
        conn = sqlite3.connect('database_recovered.sqlite')
        cursor = conn.cursor()
        
        with open('recovery.sql', 'r', encoding='utf-8') as f:
            sql = f.read()
            cursor.executescript(sql)
        
        conn.commit()
        conn.close()
        print("Recovery complete!")
    except Exception as e:
        print(f"Error during recovery: {e}")

if __name__ == "__main__":
    recover()
