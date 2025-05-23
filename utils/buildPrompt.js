export default function buildPrompt(template, brandTone, useCase) {
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
