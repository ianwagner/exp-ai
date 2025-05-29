/**
 * Replaces `{{placeholders}}` in the template with values from `context`.
 * Missing keys are replaced with an empty string.
 */
export function buildPrompt(
  template: string,
  context: Record<string, string | number>
): string {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) =>
    context[key.trim()]?.toString() ?? ''
  );
}

export default buildPrompt;
