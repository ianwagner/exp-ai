export interface InputField {
  name: string;
  label?: string;
  type?: string;
  componentType?: string;
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
  /**
   * Step ID that triggers this rule. Mutually exclusive with `fromOutput`.
   */
  fromStep?: string;
  /**
   * Output ID that triggers this rule. Allows chaining outputs.
   */
  fromOutput?: string;
  uses: string[];
  chatPromptTemplate: string;
  /**
   * How this rule is triggered. Defaults to "auto" if not specified.
   */
  triggerType?: 'auto' | 'button';
  /**
   * Optional label when triggerType is "button".
   */
  buttonLabel?: string;
}
