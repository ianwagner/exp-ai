export default function buildPrompt(template, arg1 = {}, arg2 = undefined) {
  if (!template) return '';

  // Handle string templates with {{var}} placeholders
  if (typeof template === 'string') {
    const vars = typeof arg1 === 'object' && arg1 !== null ? arg1 : {};
    return template.replace(/{{(.*?)}}/g, (_, key) => vars[key.trim()] ?? '');
  }

  const brandTone = typeof arg1 === 'string' ? arg1 : '';
  const useCase = typeof arg2 === 'string' ? arg2 : '';

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
