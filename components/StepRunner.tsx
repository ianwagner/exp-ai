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
  const [steps, setSteps] = useState<Step[]>([]);
  const [outputs, setOutputs] = useState<OutputRule[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [components, setComponents] = useState<
    Record<string, ComponentInstance[]>
  >({});
  const [intermediate, setIntermediate] = useState<string>('');
  const [finalResult, setFinalResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finalStep = steps[steps.length - 1];

  useEffect(() => {
    const load = async () => {
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
    ruleId: string | undefined,
    stepId: string,
    extra?: Record<string, any>
  ) => {
    if (!ruleId) return '';
    const rule = outputs.find((o) => o.id === ruleId);
    if (!rule || typeof (rule as any).chatPromptTemplate !== 'string') return '';
    const template: string = (rule as any).chatPromptTemplate;
    const inputs = extractInputs(
      steps.find((s) => s.id === stepId) || ({} as Step)
    );
    const context: Record<string, any> = {};
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
    if (extra) {
      Object.assign(context, extra);
    }
    return buildPrompt(template, context);
  };

  const runStep = async (e: FormEvent, step: Step) => {
    e.preventDefault();
    const prompt = buildRulePrompt(step.output, step.id);
    if (!prompt) return;
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
      setIntermediate(data.result || '');
    } catch (err: any) {
      setError(err.message || 'Request failed');
    }
    setLoading(false);
  };

  const createFinal = async (step: Step) => {
    const prompt = buildRulePrompt(step.output, step.id, {
      description: intermediate,
    });
    if (!prompt) return;
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
      setFinalResult(data.result || '');
    } catch (err: any) {
      setError(err.message || 'Request failed');
    }
    setLoading(false);
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
      {intermediate && (
        <div className="space-y-2">
          <textarea
            className="form-control"
            value={intermediate}
            onChange={(e) => setIntermediate(e.target.value)}
          />
          {finalStep && (
            <button
              onClick={() => createFinal(finalStep)}
              className="btn btn-blue"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          )}
        </div>
      )}
      {finalResult && (
        <div className="mt-4 p-4 border rounded">
          <pre className="whitespace-pre-wrap">{finalResult}</pre>
        </div>
      )}
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
};

export default StepRunner;
