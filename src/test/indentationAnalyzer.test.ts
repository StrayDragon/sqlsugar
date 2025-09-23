import * as assert from 'assert';

import { IndentationPatternAnalyzer } from '../indentationAnalyzer';

suite('Indentation Pattern Analysis Tests', () => {

  test('should detect simple uniform indentation pattern', () => {
    const text = `    SELECT id
    FROM users
    WHERE active = 1`;

    const analyzer = new IndentationPatternAnalyzer();
    const pattern = analyzer.analyze(text);

    assert.strictEqual(pattern.type, 'uniform');
    assert.strictEqual(pattern.baseIndent, '    ');
    assert.strictEqual(pattern.consistency, 1.0);
  });

  test('should detect continuation indentation pattern', () => {
    const text = `SELECT u.id,
       u.name,
       u.email,
       u.age,
       p.bio,
       p.avatar_url
FROM users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.active = TRUE
   AND u.age >= :min_age
   AND u.status = 'active'
ORDER BY u.name`;

    const analyzer = new IndentationPatternAnalyzer();
    const pattern = analyzer.analyze(text);

    assert.strictEqual(pattern.type, 'continuation');
    assert.strictEqual(pattern.baseIndent, '   ');
    assert.ok(pattern.levels.length > 1);
    assert.ok(pattern.consistency > 0.8);
  });

  test('should detect mixed indentation with tabs and spaces', () => {
    const text = `\tSELECT id,
\t\t   name,
\t\t   email
\tFROM users
\tWHERE active = 1`;

    const analyzer = new IndentationPatternAnalyzer();
    const pattern = analyzer.analyze(text);

    assert.strictEqual(pattern.type, 'mixed');
    assert.ok(pattern.consistency < 0.9);
  });

  test('should detect SQL keyword alignment pattern', () => {
    const text = `    SELECT u.id,
           u.name,
           u.email
      FROM users
     WHERE u.active = TRUE
       AND u.age >= 18
  ORDER BY u.name`;

    const analyzer = new IndentationPatternAnalyzer();
    const pattern = analyzer.analyze(text);

    assert.strictEqual(pattern.type, 'keyword-aligned');
    assert.ok(pattern.keywordAlignments.has('SELECT'));
    assert.ok(pattern.keywordAlignments.has('FROM'));
    assert.ok(pattern.keywordAlignments.has('WHERE'));
  });

  test('should detect continuation line pattern', () => {
    const text = `    SELECT id, name, email,
           phone, address,
           created_at
    FROM users`;

    const analyzer = new IndentationPatternAnalyzer();
    const pattern = analyzer.analyze(text);

    assert.strictEqual(pattern.type, 'continuation');
    assert.ok(pattern.continuationIndent > pattern.baseIndent.length);
  });

  test('should generate consistent indentation for new lines', () => {
    const originalText = `    SELECT u.id,
           u.name,
           u.email
    FROM users
    WHERE u.active = TRUE
      AND u.age >= :min_age`;

    const analyzer = new IndentationPatternAnalyzer();
    const pattern = analyzer.analyze(originalText);

    // Test generating indentation for new WHERE clause
    const newWhereIndent = analyzer.getIndentationForNewLine('WHERE', pattern);
    assert.strictEqual(newWhereIndent, '    ');

    // Test generating indentation for new SELECT field
    const newSelectIndent = analyzer.getIndentationForNewLine('field', pattern);
    assert.strictEqual(newSelectIndent, '           ');

    // Test generating indentation for new JOIN clause
    const newJoinIndent = analyzer.getIndentationForNewLine('JOIN', pattern);
    assert.strictEqual(newJoinIndent, '    ');
  });

  test('should preserve empty lines in pattern', () => {
    const text = `    SELECT id,
           name
           
    FROM users
    
    WHERE active = 1`;

    const analyzer = new IndentationPatternAnalyzer();
    const pattern = analyzer.analyze(text);

    assert.ok(pattern.emptyLines.length > 0);
    assert.strictEqual(pattern.emptyLines[0], 2); // Line index 2 is empty
  });

  test('should handle edge case with no indentation', () => {
    const text = `SELECT id, name
FROM users
WHERE active = 1`;

    const analyzer = new IndentationPatternAnalyzer();
    const pattern = analyzer.analyze(text);

    assert.strictEqual(pattern.type, 'none');
    assert.strictEqual(pattern.baseIndent, '');
  });

  test('should detect pattern consistency score', () => {
    const consistentText = `    SELECT id,
           name,
           email
    FROM users
    WHERE active = 1`;

    const inconsistentText = `    SELECT id,
         name,
                email
  FROM users
       WHERE active = 1`;

    const analyzer = new IndentationPatternAnalyzer();
    const consistentPattern = analyzer.analyze(consistentText);
    const inconsistentPattern = analyzer.analyze(inconsistentText);

    assert.ok(consistentPattern.consistency > inconsistentPattern.consistency);
    assert.ok(consistentPattern.consistency > 0.8);
    assert.ok(inconsistentPattern.consistency < 0.8);
  });
});
