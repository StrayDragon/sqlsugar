def get_user_query():
    query = f'''
    SELECT id,
           name,
           email,
           created_at
    FROM users
    WHERE name = '{user_name}'
    AND active = {is_active}
    '''
    return query

def get_user_query_edited():
    query = f'''
    SELECT id,
           name,
           email,
           phone_number,
           created_at
    FROM users
    WHERE name = '{user_name}'
    AND active = {is_active}
    AND department = '{dept_name}'
    ORDER BY created_at DESC
    '''
    return query

def get_raw_query():
    query = r'''
    SELECT id,
           name,
           email,
           created_at
    FROM users
    WHERE path = 'C:\Users\{username}\Documents'
    AND active = 1
    '''
    return query

def get_raw_query_edited():
    query = r'''
    SELECT id,
           name,
           email,
           phone_number,
           created_at
    FROM users
    WHERE path = 'C:\Users\{username}\Documents'
    AND active = 1
    AND department = '{dept_name}'
    ORDER BY created_at DESC
    '''
    return query