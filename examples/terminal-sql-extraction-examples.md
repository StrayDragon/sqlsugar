# Terminal SQL Extraction Examples

This document provides comprehensive examples of how to use the terminal SQL extraction feature in various real-world scenarios.

## Basic Usage Examples

### Example 1: Simple SELECT Query
**Scenario**: Debugging a user lookup operation

**Log Input:**
```
INFO sqlalchemy.engine.Engine: SELECT * FROM users WHERE id = ?
(123,)
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output (copied to clipboard):**
```sql
SELECT * FROM users WHERE id = 123
```

**Use Case**: Copy the exact SQL to run in your database client for debugging

---

### Example 2: INSERT with Multiple Parameters
**Scenario**: Adding a new user to the database

**Log Input:**
```
INFO sqlalchemy.engine.Engine: INSERT INTO users (name, email, age, is_active, created_at) VALUES (?, ?, ?, ?, ?)
('Alice Johnson', 'alice@example.com', 28, True, '2024-01-15 10:30:45.123456')
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output:**
```sql
INSERT INTO users (name, email, age, is_active, created_at) VALUES ('Alice Johnson', 'alice@example.com', 28, 1, '2024-01-15 10:30:45.123456')
```

**Use Case**: Verify the exact INSERT statement being executed

---

### Example 3: UPDATE Operation
**Scenario**: Updating user information

**Log Input:**
```
INFO sqlalchemy.engine.Engine: UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?
('Alice Smith', 'alice.smith@example.com', '2024-01-15 11:00:00', 123)
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output:**
```sql
UPDATE users SET name = 'Alice Smith', email = 'alice.smith@example.com', updated_at = '2024-01-15 11:00:00' WHERE id = 123
```

**Use Case**: Debugging why an UPDATE operation isn't working as expected

---

## Advanced Examples

### Example 4: Complex JOIN Query
**Scenario**: Debugging a complex query with JOINs

**Log Input:**
```
INFO sqlalchemy.engine.Engine: SELECT u.name, u.email, p.title, p.created_at
FROM users u
LEFT JOIN posts p ON u.id = p.author_id
WHERE u.is_active = ? AND p.published = ?
(True, True)
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output:**
```sql
SELECT u.name, u.email, p.title, p.created_at
FROM users u
LEFT JOIN posts p ON u.id = p.author_id
WHERE u.is_active = 1 AND p.published = 1
```

**Use Case**: Analyzing complex queries for performance optimization

---

### Example 5: Named Parameters
**Scenario**: Using named parameters in queries

**Log Input:**
```
INFO sqlalchemy.engine.Engine: SELECT * FROM users WHERE name = :name AND age > :age AND status = :status
{'name': 'John Doe', 'age': 25, 'status': 'active'}
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output:**
```sql
SELECT * FROM users WHERE name = 'John Doe' AND age > 25 AND status = 'active'
```

**Use Case**: When your application uses named parameters for better readability

---

### Example 6: Bulk INSERT Operations
**Scenario**: Inserting multiple records

**Log Input:**
```
INFO sqlalchemy.engine.Engine: INSERT INTO products (name, price, category) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)
('Laptop', 999.99, 'Electronics', 'Mouse', 29.99, 'Electronics', 'Keyboard', 79.99, 'Electronics')
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output:**
```sql
INSERT INTO products (name, price, category) VALUES ('Laptop', 999.99, 'Electronics'), ('Mouse', 29.99, 'Electronics'), ('Keyboard', 79.99, 'Electronics')
```

**Use Case**: Verifying bulk insert operations

---

## Real-world Scenarios

### Scenario 1: Debugging a Failed Query
**Problem**: User registration is failing

**Log Input:**
```
ERROR sqlalchemy.engine.Engine: INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)
('newuser', 'newuser@example.com', 'hashed_password_123')
[SQL: INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)]
[parameters: ('newuser', 'newuser@example.com', 'hashed_password_123')]
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output:**
```sql
INSERT INTO users (username, email, password_hash) VALUES ('newuser', 'newuser@example.com', 'hashed_password_123')
```

**Action**: Run this SQL directly in your database client to see if there are constraint violations or other issues.

---

### Scenario 2: Performance Analysis
**Problem**: A query is running slowly

**Log Input:**
```
2024-01-15 10:30:45,123 INFO sqlalchemy.engine.Engine: SELECT o.id, o.created_at, u.name, p.total_amount
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN payments p ON o.id = p.order_id
WHERE o.status = ? AND o.created_at >= ?
('processing', '2024-01-01 00:00:00')
2024-01-15 10:30:45,456 INFO sqlalchemy.engine.Engine [generated in 2.345s]
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output:**
```sql
SELECT o.id, o.created_at, u.name, p.total_amount
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN payments p ON o.id = p.order_id
WHERE o.status = 'processing' AND o.created_at >= '2024-01-01 00:00:00'
```

**Action**: Run EXPLAIN ANALYZE on this query to identify performance bottlenecks.

---

### Scenario 3: Data Integrity Issues
**Problem**: Data is being corrupted or not saved correctly

**Log Input:**
```
INFO sqlalchemy.engine.Engine: UPDATE user_profiles SET bio = ?, preferences = ? WHERE user_id = ?
('Senior developer with 5+ years experience', '{"theme": "dark", "notifications": true, "language": "en"}', 123)
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output:**
```sql
UPDATE user_profiles SET bio = 'Senior developer with 5+ years experience', preferences = '{"theme": "dark", "notifications": true, "language": "en"}' WHERE user_id = 123
```

**Action**: Verify that the JSON structure and text formatting are correct.

---

## Edge Cases and Special Handling

### Example 7: Special Characters and Escaping
**Log Input:**
```
INFO sqlalchemy.engine.Engine: INSERT INTO posts (title, content) VALUES (?, ?)
('O\'Reilly\'s Guide: "Advanced" Techniques', 'This contains "quotes" and \n newlines \t tabs')
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output:**
```sql
INSERT INTO posts (title, content) VALUES ('O''Reilly''s Guide: "Advanced" Techniques', 'This contains "quotes" and
 newlines 	 tabs')
```

**Note**: Single quotes are properly escaped and special characters are preserved.

---

### Example 8: NULL Values and Edge Cases
**Log Input:**
```
INFO sqlalchemy.engine.Engine: UPDATE users SET name = ?, bio = ?, last_login = ? WHERE id = ?
(NULL, None, NULL, 123)
```

**Command**: `SQLSugar: Copy SQL (Injected)**

**Output:**
```sql
UPDATE users SET name = NULL, bio = NULL, last_login = NULL WHERE id = 123
```

**Note**: Both Python's `None` and SQL's `NULL` are handled correctly.

---

### Example 9: Scientific Notation and Large Numbers
**Log Input:**
```
INFO sqlalchemy.engine.Engine: INSERT INTO measurements (value, timestamp, precision) VALUES (?, ?, ?)
(1.23e-4, '2024-01-15 10:30:45.123456', 0.0000000001)
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output:**
```sql
INSERT INTO measurements (value, timestamp, precision) VALUES (0.000123, '2024-01-15 10:30:45.123456', 1e-10)
```

**Note**: Scientific notation is properly converted.

---

## Multi-line Log Examples

### Example 10: Multi-line SQL Statements
**Log Input:**
```
INFO sqlalchemy.engine.Engine: SELECT u.id, u.name, u.email,
       COUNT(p.id) as post_count,
       MAX(p.created_at) as last_post_date
FROM users u
LEFT JOIN posts p ON u.id = p.author_id
WHERE u.is_active = ?
GROUP BY u.id, u.name, u.email
(True)
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output:**
```sql
SELECT u.id, u.name, u.email,
       COUNT(p.id) as post_count,
       MAX(p.created_at) as last_post_date
FROM users u
LEFT JOIN posts p ON u.id = p.author_id
WHERE u.is_active = 1
GROUP BY u.id, u.name, u.email
```

**Note**: Multi-line SQL statements are properly preserved.

---

### Example 11: Complex Parameters with Nested Structures
**Log Input:**
```
INFO sqlalchemy.engine.Engine: INSERT INTO audit_logs (user_id, action, metadata, timestamp) VALUES (?, ?, ?, ?)
(123, 'user_preferences_updated', '{"old_settings": {"theme": "light", "notifications": false}, "new_settings": {"theme": "dark", "notifications": true}, "changed_fields": ["theme", "notifications"]}', '2024-01-15 10:30:45.123456')
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output:**
```sql
INSERT INTO audit_logs (user_id, action, metadata, timestamp) VALUES (123, 'user_preferences_updated', '{"old_settings": {"theme": "light", "notifications": false}, "new_settings": {"theme": "dark", "notifications": true}, "changed_fields": ["theme", "notifications"]}', '2024-01-15 10:30:45.123456')
```

**Note**: Complex JSON objects are properly serialized and escaped.

---

## Security Examples

### Example 12: SQL Injection Attempts (Safe Handling)
**Log Input:**
```
INFO sqlalchemy.engine.Engine: SELECT * FROM users WHERE username = ?
('admin' OR '1'='1' -- )
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output:**
```sql
SELECT * FROM users WHERE username = 'admin'' OR ''1''=''''1'' -- '
```

**Note**: The injection attempt is safely escaped, preventing actual SQL injection.

---

### Example 13: Malicious Parameter Values
**Log Input:**
```
INFO sqlalchemy.engine.Engine: INSERT INTO comments (content, user_id) VALUES (?, ?)
('Great post! UNION SELECT username, password FROM users --', 123)
```

**Command**: `SQLSugar: Copy SQL (Injected)**

**Output:**
```sql
INSERT INTO comments (content, user_id) VALUES ('Great post! UNION SELECT username, password FROM users --', 123)
```

**Note**: The malicious content is safely escaped but preserved for debugging purposes.

---

## Performance Examples

### Example 14: Large Dataset Processing
**Log Input:**
```
INFO sqlalchemy.engine.Engine: SELECT COUNT(*) as total_users, AVG(age) as avg_age, MAX(created_at) as latest_user FROM users WHERE status = ?
('active')
2024-01-15 10:30:45,123 INFO sqlalchemy.engine.Engine [generated in 1.234s]
```

**Command**: `SQLSugar: Copy SQL (Injected)`

**Output:**
```sql
SELECT COUNT(*) as total_users, AVG(age) as avg_age, MAX(created_at) as latest_user FROM users WHERE status = 'active'
```

**Use Case**: Analyzing performance of aggregate queries on large datasets.

---

## Integration Workflows

### Workflow 1: Development Debugging
1. Run your application with SQLAlchemy logging enabled
2. Observe the query in your terminal
3. Select the SQLAlchemy log output
4. Use `SQLSugar: Copy SQL (Injected)`
5. Paste into your database client (psql, MySQL CLI, DBeaver, etc.)
6. Analyze and debug the query behavior

### Workflow 2: Performance Optimization
1. Enable SQLAlchemy logging with timing information
2. Run slow queries in your application
3. Copy the executed SQL with timing info
4. Run `EXPLAIN ANALYZE` on the query
5. Identify optimization opportunities
6. Test improvements

### Workflow 3: Data Validation
1. When data integrity issues occur
2. Copy the problematic SQL query
3. Run it manually to verify results
4. Compare expected vs actual results
5. Identify root cause

### Workflow 4: Security Auditing
1. Monitor SQL logs for unusual patterns
2. Use the extension to extract and analyze queries
3. Check for potential security vulnerabilities
4. Verify proper escaping and parameter handling

## Best Practices

1. **Select Relevant Logs**: Choose only the SQLAlchemy log entries you need, not entire terminal output
2. **Verify Results**: Always verify the extracted SQL in your database client
3. **Use Timing Information**: Pay attention to execution times for performance analysis
4. **Check Parameter Types**: Ensure parameters are correctly typed (strings, numbers, booleans)
5. **Test Edge Cases**: Test with special characters, NULL values, and large datasets
6. **Monitor Security**: Keep an eye on potential SQL injection attempts in your logs

## Troubleshooting Examples

### Problem: Nothing happens when I run the command
**Solution**: Ensure you're selecting actual SQLAlchemy log output, not just any text.

### Problem: Parameters are not injected correctly
**Solution**: Check that the parameter format matches one of the supported patterns (tuple, dict, list).

### Problem: The output SQL has syntax errors
**Solution**: Verify that the original SQL in your logs is valid and the parameters are correctly formatted.

### Problem: Large selections are slow
**Solution**: Select only the relevant log entries, not the entire terminal output.