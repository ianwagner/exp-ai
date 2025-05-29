/**
 * Replaces `{{placeholders}}` in the template with values from `context`.
 * Missing keys are replaced with an empty string.
 *
 * Supports dot notation to access nested values, e.g. `{{user.name}}`.
 */
export function buildPrompt(
  template: string,
  context: Record<string, any>
): string {
  return template.replace(/\{\{(.*?)\}\}/g, (_, rawKey) => {
    const parts = rawKey.trim().split('.');
    let value: any = context;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        value = '';
        break;
      }
    }
    return value?.toString?.() ?? '';
  });
}

export default buildPrompt;
