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
  next?: string | null;
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
