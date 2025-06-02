import { buildPrompt } from '../buildPrompt';

describe('buildPrompt', () => {
  it('replaces simple placeholders', () => {
    const result = buildPrompt('Hello {{name}}', { name: 'Alice' });
    expect(result).toBe('Hello Alice');
  });

  it('supports nested keys', () => {
    const result = buildPrompt('User: {{user.name}}, Age: {{user.age}}', {
      user: { name: 'John', age: 30 }
    });
    expect(result).toBe('User: John, Age: 30');
  });

  it('joins array values with newlines', () => {
    const result = buildPrompt('Items:\n{{items}}', { items: ['a', 'b', 'c'] });
    expect(result).toBe('Items\na\nb\nc');
  });

  it('replaces missing keys with empty string', () => {
    const result = buildPrompt('Hello {{missing}}', {});
    expect(result).toBe('Hello ');
  });
});
