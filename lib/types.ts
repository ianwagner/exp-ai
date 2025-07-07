export interface InputField {
  name: string;
  label?: string;
  type?: string;
  componentType?: string;
}

export interface Step {
  id: string;
  name: string;
  stepType: 'form' | 'prompt';
  text?: string;
  template?: string;
  expectedInputs?: InputField[];
  /** Optional name for the output of this step. Defaults to the step id */
  outputName?: string;
  /** Whether the result should be treated as branching */
  isBranching?: boolean;
  /** How this step is triggered. Defaults to 'auto'. */
  triggerType?: 'auto' | 'button';
  /** Optional button label when triggerType is 'button' */
  buttonLabel?: string;
  /** Placeholder keys used within the template */
  uses?: string[];
}

export interface ComponentType {
  id: string;
  name: string;
  fields: InputField[];
}

export interface ComponentInstance {
  id: string;
  componentType: string;
  values: Record<string, any>;
}

export interface MakerType {
  id: string;
  name: string;
  steps: string[];
}

export interface Experience {
  id: string;
  title: string;
  description: string;
  useCases: string;
  mechanics: string;
  output: string;
}
