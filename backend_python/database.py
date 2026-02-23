import psycopg2
import uuid

DB_CONFIG = {
    "host": "localhost",
    "database": "facedb",
    "user": "postgres",
    "password": "postgres"
}

def create_database()-> psycopg2.extensions.connection:

    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = True
    return conn



class Storage:
    conn: psycopg2.extensions.connection
    def __init__(self, conn: psycopg2.extensions.connection):
        self.conn = conn

    def create_person_table(self):
        raise Exception("unimplemented")

    def add_person(self, person_code: str, name: str, embedding):
        cur = self.conn.cursor()
        cur.execute("""
                INSERT INTO user_faces (id, user_id, embedding)
                VALUES (%s, %s, %s)
            """, (str(uuid.uuid4()), person_code, embedding.tolist()))


if __name__ == '__main__':
    db = create_database()
    print(db)