export interface InputField {
  name: string;
  label?: string;
  type?: string;
}

export interface Step {
  id: string;
  name: string;
  text: string;
  expectedInputs?: InputField[];
  output: string;
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

export interface OutputRule {
  id: string;
  outputName: string;
  fromStep: string;
  uses: string[];
  chatPromptTemplate: string;
}
