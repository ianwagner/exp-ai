// firebaseSchema.ts

export interface StepInput {
  name: string;
  label?: string;
  type?: string;
}

export interface Step {
  id: string;
  expectedInputs?: Array<string | StepInput>;
  outputRule?: string;
  finalOutputRule?: string;
  [key: string]: any;
}

export interface ComponentInstance {
  id: string;
  [key: string]: any;
}

export interface ComponentType {
  id: string;
  [key: string]: any;
}

export interface OutputRule {
  id: string;
  template?: string;
  [key: string]: any;
}
