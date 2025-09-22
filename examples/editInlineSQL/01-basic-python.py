def get_user_query():
    query = '''
    SELECT id,
           name,
           created_at,
           age
    FROM users
    WHERE active = 1
    AND status = 11
'''
    return query

def get_user_query_edited():
    query = '''
    SELECT id,
           name,
           email,
           created_at
    FROM users
    WHERE active = 1
    ORDER BY created_at DESC
    '''
    return query