import { useState, useEffect, FormEvent } from 'react';
import {
  getSteps,
  getOutputRules,
  getComponentInstances,
} from '../lib/firebaseHelpers';
import type {
  Step,
  OutputRule,
  InputField,
  ComponentInstance,
} from '../lib/types';
import {
  mockSteps,
  mockOutputs,
  mockComponents,
} from '../data/mockFlow';
import buildPrompt from '../utils/buildPrompt';

// Basic step runner that dynamically renders form inputs for each step.
// TODO: refine once the step and output schemas are finalized.

const extractInputs = (step: Step): InputField[] => {
  const list = step.expectedInputs as any[] | undefined;
  if (!Array.isArray(list)) return [];
  return list.map((item) =>
    typeof item === 'string' ? { name: item } : (item as InputField)
  );
};

const StepRunner = () => {
  const [steps, setSteps] = useState<Step[]>(mockSteps);
  const [outputs, setOutputs] = useState<OutputRule[]>(mockOutputs);
  const [values, setValues] = useState<Record<string, string>>({});
  const [components, setComponents] = useState<
    Record<string, ComponentInstance[]>
  >(mockComponents);
  const [generated, setGenerated] = useState<Record<string, string>>({});
  const [outputOrigins, setOutputOrigins] = useState<Record<string, string>>({});
  const [pendingButtons, setPendingButtons] = useState<
    { rule: OutputRule; stepId: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;
      try {
        const [s, o] = await Promise.all([getSteps(), getOutputRules()]);
        setSteps(s);
        setOutputs(o);

        const compTypes = new Set<string>();
        s.forEach((step) => {
          extractInputs(step).forEach((inp) => {
            if (inp.type === 'component' && inp.componentType) {
              compTypes.add(inp.componentType);
            }
          });
        });
        const entries = await Promise.all(
          Array.from(compTypes).map(async (t) => [t, await getComponentInstances(t)])
        );
        const map: Record<string, ComponentInstance[]> = {};
        entries.forEach(([t, inst]) => {
          map[t as string] = inst as ComponentInstance[];
        });
        setComponents(map);
      } catch (err) {
        console.error('Failed to load steps', err);
      }
    };
    load();
  }, []);

  const handleChange = (stepId: string, name: string, val: string) => {
    setValues((prev) => ({ ...prev, [`${stepId}:${name}`]: val }));
  };

  const buildRulePrompt = (
    rule: OutputRule,
    stepId: string,
    outMap: Record<string, string>
  ) => {
    if (!rule || typeof rule.chatPromptTemplate !== 'string') return '';
    const template: string = rule.chatPromptTemplate;
    const inputs = extractInputs(
      steps.find((s) => s.id === stepId) || ({} as Step)
    );
    const context: Record<string, any> = { ...outMap };
    inputs.forEach((inp) => {
      const key = inp.name;
      const rawVal = values[`${stepId}:${key}`] || '';
      if (inp.type === 'component' && inp.componentType) {
        const inst = components[inp.componentType]?.find((c) => c.id === rawVal);
        context[key] = inst ? inst.values : {};
      } else {
        context[key] = rawVal;
      }
    });
    return buildPrompt(template, context);
  };

  const runOutputRule = async (
    rule: OutputRule,
    stepId: string,
    map: Record<string, string>
  ): Promise<Record<string, string>> => {
    const prompt = buildRulePrompt(rule, stepId, map);
    if (!prompt) return map;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to generate');
      const result = data.result || '';
      const updated = { ...map, [rule.id]: result };
      setGenerated(updated);
      setOutputOrigins((prev) => ({ ...prev, [rule.id]: stepId }));
      for (const next of outputs.filter((o) => o.fromOutput === rule.id)) {
        if (next.triggerType === 'button') {
          setPendingButtons((prev) => [...prev, { rule: next, stepId }]);
        } else {
          await runOutputRule(next, stepId, updated);
        }
      }
      setLoading(false);
      return updated;
    } catch (err: any) {
      setError(err.message || 'Request failed');
      setLoading(false);
      return map;
    }
  };

  const runStep = async (e: FormEvent, step: Step) => {
    e.preventDefault();
    let map = { ...generated };
    const rules = outputs.filter((o) => o.fromStep === step.id);
    for (const rule of rules) {
      if (rule.triggerType === 'button') {
        setPendingButtons((prev) => [...prev, { rule, stepId: step.id }]);
      } else {
        map = await runOutputRule(rule, step.id, map);
      }
    }
    setGenerated(map);
  };

  const handleButton = async (index: number) => {
    const btn = pendingButtons[index];
    setPendingButtons((prev) => prev.filter((_, i) => i !== index));
    const map = await runOutputRule(btn.rule, btn.stepId, generated);
    setGenerated(map);
  };

  return (
    <div className="space-y-6">
      {steps.map((step) => {
        const inputs = extractInputs(step);
        return (
          <form
            key={step.id}
            onSubmit={(e) => runStep(e, step)}
            className="border p-4 rounded space-y-4"
          >
            <h3 className="font-bold capitalize">{step.id}</h3>
            {inputs.map((inp) => (
              <div key={inp.name}>
                <label className="block mb-1 capitalize">{inp.label || inp.name}</label>
                {inp.type === 'textarea' ? (
                  <textarea
                    className="form-control"
                    value={values[`${step.id}:${inp.name}`] || ''}
                    onChange={(e) => handleChange(step.id, inp.name, e.target.value)}
                  />
                ) : inp.type === 'component' ? (
                  <select
                    className="form-control"
                    value={values[`${step.id}:${inp.name}`] || ''}
                    onChange={(e) => handleChange(step.id, inp.name, e.target.value)}
                  >
                    <option value="">Select...</option>
                    {(components[inp.componentType || ''] || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={inp.type || 'text'}
                    className="form-control"
                    value={values[`${step.id}:${inp.name}`] || ''}
                    onChange={(e) => handleChange(step.id, inp.name, e.target.value)}
                  />
                )}
              </div>
            ))}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </form>
        );
      })}
      {Object.entries(generated).map(([id, text]) => (
        <div key={id} className="space-y-1">
          <h4 className="font-bold capitalize">{id}</h4>
          <textarea
            className="form-control"
            value={text}
            onChange={(e) =>
              setGenerated((prev) => ({ ...prev, [id]: e.target.value }))
            }
          />
        </div>
      ))}
      {pendingButtons.map((btn, idx) => (
        <button
          key={btn.rule.id}
          onClick={() => handleButton(idx)}
          className="btn btn-blue"
          disabled={loading}
        >
          {loading ? 'Running...' : btn.rule.buttonLabel || 'Run'}
        </button>
      ))}
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
};

export default StepRunner;
