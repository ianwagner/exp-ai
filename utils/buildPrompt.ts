/**
 * Build the string sent to OpenAI by combining a template with optional
 * branding information.
 *
 * Example:
 * ```ts
 * const prompt = buildPrompt(template, 'playful', 'marketing');
 * ```
 *
 * The template must include a `description` and may specify
 * `formatInstruction`, `useCases` or `mechanics`. When `brandTone` or
 * `useCase` are omitted those lines are simply left out. If `template` is
 * undefined the function returns an empty string.
 */
export interface Template {
  description: string;
  formatInstruction?: string;
  useCases?: string;
  mechanics?: string;
}

export default function buildPrompt(
  template: Template | undefined,
  brandTone?: string,
  useCase?: string
): string {
  if (!template) {
    return '';
  }
  const tone = brandTone ? `Tone: ${brandTone}.` : '';
  const usage = useCase ? `Use case: ${useCase}.` : '';
  let extra = '';
  if (template.formatInstruction) {
    extra = `Instructions: ${template.formatInstruction}`;
  } else {
    const cases = template.useCases ? `Use Cases: ${template.useCases}` : '';
    const mech = template.mechanics ? `Game Mechanics: ${template.mechanics}` : '';
    extra = `${cases}\n${mech}`.trim();
  }
  return `${template.description}\n${tone}\n${usage}\n\n${extra}`.trim();
}
