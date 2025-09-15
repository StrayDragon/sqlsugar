# Terminal SQL Extraction Feature

## Overview

SQLSugar now includes a powerful terminal SQL extraction feature that can parse SQLAlchemy logs from terminal output and extract SQL queries with properly injected parameters. This feature is particularly useful for debugging and analyzing database operations during development.

## Features

### 🚀 Key Capabilities

- **Multi-format SQLAlchemy Log Support**: Parses various SQLAlchemy log formats including INFO, DEBUG, and timestamped logs
- **Intelligent Parameter Parsing**: Handles tuple, dictionary, and list parameter formats
- **Smart Parameter Injection**: Safely injects parameters into SQL queries with proper escaping
- **Cross-platform Clipboard Support**: Works seamlessly on Linux, macOS, and Windows with multiple fallback options
- **Security-Focused**: Includes SQL injection protection and input validation
- **Performance Optimized**: Handles large terminal outputs efficiently with size limits

### 🔒 Security Features

- **SQL Injection Protection**: Detects and safely escapes potentially malicious parameter values
- **Input Validation**: Validates all input parameters before processing
- **Size Limits**: Prevents processing of excessively large inputs that could cause performance issues
- **Error Handling**: Graceful error handling prevents crashes from malformed inputs

## Usage

### Basic Usage

1. **Select SQLAlchemy log output** in your terminal
2. **Run the command**: `SQLSugar: Copy SQL (Injected)`
3. **Get the fully formed SQL** with parameters injected, copied to your clipboard

### Supported Log Formats

#### Standard SQLAlchemy Format
```
INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)
('Alice',)
```

#### Debug Format
```
DEBUG sqlalchemy.engine.Engine: SELECT * FROM users WHERE id = ?
(123,)
```

#### Timestamped Format
```
2024-01-15 10:30:45,123 INFO sqlalchemy.engine.Engine: UPDATE users SET name = ? WHERE id = ?
('Bob', 1)
```

#### Real-world Format with Performance Stats
```
2024-01-15 10:30:45,123 INFO sqlalchemy.engine.Engine: INSERT INTO users (name, email, age) VALUES (?, ?, ?)
2024-01-15 10:30:45,124 INFO sqlalchemy.engine.Engine [generated in 0.00015s] ('John Doe', 'john@example.com', 30)
```

### Parameter Formats Supported

#### Tuple Format
```
('Alice', 25, True)
('O\'Reilly', 'Developer with "quotes"')
```

#### Dictionary Format
```
{'user_id': 123, 'name': 'Alice', 'active': True}
```

#### List Format
```
[1, 2, 3, 4, 5]
```

## Configuration

### Extension Settings

The following configuration options are available in VS Code settings:

- `sqlsugar.enableWlCopyFallback`: Enable wl-copy fallback for clipboard operations on Wayland (default: `true`)

### Clipboard Command Priority

The extension tries clipboard methods in this order:

1. **VS Code Native API** (preferred)
2. **Platform-specific commands**:
   - **Linux**: `wl-copy` → `xclip` → `xsel`
   - **macOS**: `pbcopy`
   - **Windows**: `clip`

## Examples

### Basic SELECT Query
**Input:**
```
INFO sqlalchemy.engine.Engine: SELECT * FROM users WHERE id = ?
(123,)
```

**Output:**
```sql
SELECT * FROM users WHERE id = 123
```

### INSERT with Multiple Parameters
**Input:**
```
INFO sqlalchemy.engine.Engine: INSERT INTO users (name, email, age, is_active) VALUES (?, ?, ?, ?)
('Alice', 'alice@example.com', 25, True)
```

**Output:**
```sql
INSERT INTO users (name, email, age, is_active) VALUES ('Alice', 'alice@example.com', 25, 1)
```

### UPDATE with Named Parameters
**Input:**
```
INFO sqlalchemy.engine.Engine: UPDATE users SET name = :name, email = :email WHERE id = :id
{'name': 'Bob', 'email': 'bob@example.com', 'id': 456}
```

**Output:**
```sql
UPDATE users SET name = 'Bob', email = 'bob@example.com' WHERE id = 456
```

### Complex Query with Special Characters
**Input:**
```
INFO sqlalchemy.engine.Engine: INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)
('O\'Reilly\'s Guide', 'This is a "comprehensive" guide with\nnewlines and\ttabs', 789)
```

**Output:**
```sql
INSERT INTO posts (title, content, author_id) VALUES ('O''Reilly''s Guide', 'This is a "comprehensive" guide with
newlines and	tabs', 789)
```

## Security Considerations

### SQL Injection Protection

The extension includes robust protection against SQL injection attacks:

- **Pattern Detection**: Identifies common SQL injection patterns like `OR 1=1`, `DROP TABLE`, etc.
- **Safe Escaping**: Properly escapes all string literals to prevent injection
- **Input Validation**: Validates all inputs before processing

**Example of safe handling:**
```
Input: ('Robert'); DROP TABLE users; --
Output: INSERT INTO users (name) VALUES ('Robert''); DROP TABLE users; --')
```

### Performance Safeguards

- **Size Limits**: Maximum input size of 50KB and 1000 lines
- **Parameter Limits**: Maximum parameter string length of 10KB
- **Entry Limits**: Maximum 10 SQL entries processed per selection

## Troubleshooting

### Common Issues

#### 1. Nothing happens when I run the command
- **Cause**: No SQLAlchemy logs detected in selection
- **Solution**: Ensure you've selected actual SQLAlchemy log output

#### 2. SQL parameters are not injected
- **Cause**: Malformed parameter format or unsupported parameter type
- **Solution**: Check parameter format matches supported patterns

#### 3. Clipboard doesn't work
- **Cause**: No clipboard command available
- **Solution**: Install platform-specific clipboard tool:
  - **Linux**: `sudo apt install wl-clipboard` or `sudo apt install xclip`
  - **macOS**: `pbcopy` is usually pre-installed
  - **Windows**: `clip` is usually pre-installed

#### 4. Large terminal output is slow
- **Cause**: Processing very large selections
- **Solution**: Select only the relevant log entries, not the entire terminal output

### Debug Mode

Enable debug mode to see detailed processing information:

1. Open VS Code Command Palette
2. Run: `SQLSugar: Debug - Show Metrics`
3. Check the developer console for debug output

## Advanced Usage

### Custom Log Formats

The extension is designed to be flexible and can handle various log formats. If you encounter a format that isn't supported:

1. Check the debug output for parsing details
2. Ensure the log contains recognizable SQL keywords (SELECT, INSERT, etc.)
3. Verify parameters are in one of the supported formats

### Integration with Development Workflow

This feature integrates seamlessly with common development workflows:

1. **During debugging**: Select SQLAlchemy logs from your terminal output
2. **Copy to clipboard**: Use the extension command to get executable SQL
3. **Paste into database tool**: Use the SQL in your preferred database tool
4. **Optimize and test**: Test the actual query performance and results

## API Reference

### SQLLogParser Class

#### Methods

- `processSelectedText(text: string): ParsedSQL | null` - Main entry point for parsing
- `parseTerminalText(text: string): SQLLogEntry[]` - Parse terminal text into SQL entries
- `parseParameters(paramString: string): any[]` - Parse parameter strings into JavaScript objects
- `injectParameters(sql: string, parameters: any[]): ParsedSQL` - Inject parameters into SQL

### ParsedSQL Interface

```typescript
interface ParsedSQL {
    originalSQL: string;      // Original SQL with placeholders
    injectedSQL: string;      // SQL with parameters injected
    parameters: any[];        // Parsed parameters
    placeholderType: 'question' | 'named' | 'none';  // Type of placeholders
}
```

## Contributing

When contributing to this feature:

1. **Add comprehensive tests** for new functionality
2. **Consider security implications** of any parsing changes
3. **Test cross-platform compatibility** for clipboard operations
4. **Follow the existing code style** and patterns
5. **Update documentation** for any new features

## Future Enhancements

Planned improvements:

- [ ] Support for additional ORM log formats (Django ORM, Hibernate, etc.)
- [ ] Batch processing for multiple SQL statements
- [ ] SQL formatting options for the output
- [ ] Direct database execution capabilities
- [ ] Integration with SQLFluff for linting the extracted SQL
- [ ] Support for additional clipboard tools and platforms