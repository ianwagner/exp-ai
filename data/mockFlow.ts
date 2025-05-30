import type { ComponentType, ComponentInstance, Step, OutputRule } from '../lib/types';

// --- COMPONENT TYPE ---
export const componentType: ComponentType = {
  id: 'experience',
  name: 'Experience',
  fields: [
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'useCases', label: 'Use Cases', type: 'textarea' },
    { name: 'mechanics', label: 'Mechanics', type: 'textarea' },
  ],
};

// --- COMPONENT INSTANCE ---
export const componentInstance: ComponentInstance = {
  id: 'mytrivia',
  componentType: 'experience',
  values: {
    name: 'MyTrivia',
    description:
      'A fast-paced quiz game where users answer themed questions under time pressure.',
    useCases: 'Classroom warmups, social game nights, team-building events',
    mechanics:
      'Multiple choice questions, score tracking, increasing difficulty over time',
  },
};

// --- STEP: Ask for number of games + experience type ---
export const step: Step = {
  id: 'intro',
  name: 'Intro',
  text: 'How many games do you want to create? And what experience type?',
  expectedInputs: [
    { name: 'numDescriptions', label: 'How many?', type: 'number' },
    {
      name: 'experienceType',
      label: 'Experience',
      type: 'component',
      componentType: 'experience',
    },
  ],
  output: 'description',
};

// --- OUTPUT RULE 1: Description Generator ---
export const descriptionOutput: OutputRule = {
  id: 'description',
  outputName: 'description',
  fromStep: 'intro',
  triggerType: 'auto',
  uses: [
    'numDescriptions',
    'experienceType.description',
    'experienceType.useCases',
    'experienceType.mechanics',
  ],
  chatPromptTemplate: `
Generate {{numDescriptions}} unique game experiences based on this theme:
{{experienceType.description}}

Use cases: {{experienceType.useCases}}
Mechanics: {{experienceType.mechanics}}

Output each experience as a 1–2 sentence description in a numbered list.
  `.trim(),
};

// --- OUTPUT RULE 2: Game Builder ---
export const gameBuildOutput: OutputRule = {
  id: 'gamesBuild',
  outputName: 'gamesBuild',
  fromOutput: 'description',
  triggerType: 'button',
  buttonLabel: 'Create Game',
  uses: ['description', 'experienceType.mechanics'],
  chatPromptTemplate: `
Take this experience description and generate a fully playable trivia game.

Description:
{{description}}

Mechanics to apply:
{{experienceType.mechanics}}

Output format:
- Game title
- Setup instructions
- 5 sample trivia questions with answers
- Scoring logic
  `.trim(),
};

export const mockSteps = [step];
export const mockOutputs = [descriptionOutput, gameBuildOutput];
export const mockComponents: Record<string, ComponentInstance[]> = {
  experience: [componentInstance],
};
