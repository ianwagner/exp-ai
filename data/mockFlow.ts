import type { ComponentType, ComponentInstance, Step, MakerType } from '../lib/types';

// --- COMPONENT TYPE ---
export const componentType: ComponentType = {
  id: 'experience',
  name: 'Experience',
  fields: [
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'icon', label: 'Icon', type: 'image' },
    { name: 'image', label: 'Image URL', type: 'text' },
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
    icon: '🎮',
    image: '',
    description:
      'A fast-paced quiz game where users answer themed questions under time pressure.',
    useCases: 'Classroom warmups, social game nights, team-building events',
    mechanics:
      'Multiple choice questions, score tracking, increasing difficulty over time',
  },
};

// --- STEPS ---
export const stepIntro: Step = {
  id: 'intro',
  name: 'Intro',
  stepType: 'form',
  text: 'How many games do you want to create? And what experience type?',
  expectedInputs: [
    { name: 'numDescriptions', label: 'How many?', type: 'number' },
    { name: 'experienceType', label: 'Experience', type: 'component', componentType: 'experience' },
  ],
}; 

export const stepDescription: Step = {
  id: 'description',
  name: 'Generate Descriptions',
  stepType: 'prompt',
  template: `Generate {{numDescriptions}} unique game experiences based on this theme:
{{experienceType.description}}

Use cases: {{experienceType.useCases}}
Mechanics: {{experienceType.mechanics}}

Prefix each result with the icon {{experienceType.icon}} and include the name {{experienceType.name}}. Output each experience as a 1–2 sentence description in a numbered list.`,
  outputName: 'description',
  isBranching: true,
}; 

export const stepGamesBuild: Step = {
  id: 'gamesBuild',
  name: 'Create Game',
  stepType: 'prompt',
  template: `Take this experience description and generate a fully playable trivia game.

Description:
{{description}}

Mechanics to apply:
{{experienceType.mechanics}}

Output format:
- Game title (prefixed with {{experienceType.icon}} and the name {{experienceType.name}})
- Setup instructions
- 5 sample trivia questions with answers
- Scoring logic`,
  outputName: 'gamesBuild',
}; 

export const mockSteps = [stepIntro, stepDescription, stepGamesBuild];
export const mockComponents: Record<string, ComponentInstance[]> = {
  experience: [componentInstance],
};

export const mockMakerTypes: MakerType[] = [
  {
    id: 'default',
    name: 'Default Flow',
    steps: mockSteps.map((s) => s.id),
  },
];
