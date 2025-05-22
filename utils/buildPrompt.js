export default function buildPrompt(template, brandTone, useCase) {
  if (!template) {
    return '';
  }
  const tone = brandTone ? `Tone: ${brandTone}.` : '';
  const usage = useCase ? `Use case: ${useCase}.` : '';
  return `${template.description}\n${tone}\n${usage}\n\nInstructions: ${template.formatInstruction}`.trim();
}
