import * as assert from 'assert';

// Simple test to verify test infrastructure is working
suite('Extension Test Suite', () => {
  test('Test infrastructure should work', () => {
    assert.ok(true, 'Basic test assertion should pass');
  });

  test('Math should work', () => {
    assert.strictEqual(2 + 2, 4, 'Basic math should work');
  });

  test('Strings should work', () => {
    const testString = 'Hello World';
    assert.ok(testString.includes('Hello'), 'String operations should work');
  });
});
