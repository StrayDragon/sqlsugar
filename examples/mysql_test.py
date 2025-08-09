import os
import sys
import pymysql

# Optional: SQLAlchemy for text() with named placeholders like :id
try:
    from sqlalchemy import create_engine, text  # type: ignore
    _HAS_SQLALCHEMY = True
except Exception:
    _HAS_SQLALCHEMY = False


def get_conn_pymysql():
    host = os.getenv('MYSQL_HOST', '127.0.0.1')
    port = int(os.getenv('MYSQL_PORT', '3306'))
    user = os.getenv('MYSQL_USER', 'testuser')
    password = os.getenv('MYSQL_PASSWORD', 'testpass')
    db = os.getenv('MYSQL_DB', 'testdb')
    return pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=db,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
    )


def run_with_pymysql():
    print('=== PyMySQL examples ===')
    try:
        conn = get_conn_pymysql()
    except Exception as e:
        print('PyMySQL connection failed:', e)
        return

    with conn:
        with conn.cursor() as cur:
            # 1) Single-line SQL literal
            cur.execute("SELECT id, username FROM users ORDER BY id LIMIT 5")
            print('users(top5)=', cur.fetchall())

            # 2) Triple-quoted multi-line SQL literal
            multi_sql = (
                """
SELECT p.id, p.title, u.username
                FROM posts p
                JOIN users u ON u.id = p.user_id
                WHERE p.published_at IS NOT NULL
                AND p.content == ""
                AND p.published_at < NOW()
                AND p.id NOT IN (
                    SELECT post_id
                    FROM post_tags
                    WHERE tag_id IN (
                        SELECT id
                        FROM tags
                        WHERE name IN ('tag1', 'tag2')
                    )
                )
                ORDER BY p.id DESC
                LIMIT 5
                """
            )
            cur.execute(multi_sql)
            print('posts+users(top5)=', cur.fetchall())

            # 3) Positional placeholder (PyMySQL style: %s)
            cur.execute("SELECT id, title FROM posts WHERE user_id = %s ORDER BY id", (1,))
            print('posts(user_id=1)=', cur.fetchall())


def run_with_sqlalchemy():
    print('=== SQLAlchemy text() examples ===')
    if not _HAS_SQLALCHEMY:
        print('SQLAlchemy not installed, skip (pip install sqlalchemy pymysql)')
        return

    host = os.getenv('MYSQL_HOST', '127.0.0.1')
    port = int(os.getenv('MYSQL_PORT', '3306'))
    user = os.getenv('MYSQL_USER', 'testuser')
    password = os.getenv('MYSQL_PASSWORD', 'testpass')
    db = os.getenv('MYSQL_DB', 'testdb')

    url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{db}"
    engine = create_engine(url, future=True)

    with engine.connect() as conn:
        # 1) Single-line
        res = conn.execute(text("SELECT COUNT(*) AS cnt FROM users"))
        print('users.count=', res.scalar_one())

        # 2) Triple-quoted multi-line + named placeholder :id
        sql = text(
            """
            SELECT p.id, p.title, u.username
            FROM posts p
            JOIN users u ON u.id = p.user_id
            WHERE p.id = :id
            """
        )
        res = conn.execute(sql, {"id": 1})
        print('post(id=1)=', [dict(r._mapping) for r in res])

        # 3) Another text() with named placeholder :author
        res = conn.execute(text("SELECT COUNT(*) AS cnt FROM comments WHERE author = :author"), {"author": "bob"})
        print('comments.count(author=bob)=', res.scalar_one())


def main():
    run_with_pymysql()
    run_with_sqlalchemy()
    print('Done.')


if __name__ == '__main__':
    main()