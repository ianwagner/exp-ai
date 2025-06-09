import { useState, useEffect, FormEvent } from 'react';
import {
  getSteps,
  getMakerTypes,
  getComponentInstances,
} from '../lib/firebaseHelpers';
import type {
  Step,
  InputField,
  ComponentInstance,
  MakerType,
} from '../lib/types';
import { mockSteps, mockComponents, mockMakerTypes } from '../data/mockFlow';
import buildPrompt from '../utils/buildPrompt';
import styles from './ExperienceMaker.module.css';

const extractInputs = (step: Step): InputField[] =>
  Array.isArray(step.expectedInputs) ? step.expectedInputs : [];

const ExperienceMaker = () => {
  const [makerTypes, setMakerTypes] = useState<MakerType[]>(mockMakerTypes);
  const [makerTypeId, setMakerTypeId] = useState<string>(
    mockMakerTypes[0]?.id || ''
  );
  const [allSteps, setAllSteps] = useState<Step[]>(mockSteps);
  const [steps, setSteps] = useState<Step[]>(mockSteps);
  const [values, setValues] = useState<Record<string, string>>({});
  const [components, setComponents] = useState<Record<string, ComponentInstance[]>>(mockComponents);
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;
      try {
        const [s, mts] = await Promise.all([getSteps(), getMakerTypes()]);
        if (s.length) {
          setAllSteps(s);
        }
        if (mts.length) {
          setMakerTypes(mts);
          setMakerTypeId(mts[0].id);
        }
      } catch (err) {
        console.error('Failed to load maker data', err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const mt = makerTypes.find((m) => m.id === makerTypeId);
    if (!mt) return;
    const selected = mt.steps
      .map((id) => allSteps.find((s) => s.id === id))
      .filter((Boolean)) as Step[];
    setSteps(selected);

    const compTypes = new Set<string>();
    selected.forEach((step) => {
      extractInputs(step).forEach((inp) => {
        if (inp.type === 'component' && inp.componentType) {
          compTypes.add(inp.componentType);
        }
      });
    });
    (async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;
      const entries = await Promise.all(
        Array.from(compTypes).map(async (t) => [t, await getComponentInstances(t)])
      );
      const map: Record<string, ComponentInstance[]> = {};
      entries.forEach(([t, inst]) => {
        map[t as string] = inst as ComponentInstance[];
      });
      setComponents(map);
    })();
  }, [makerTypeId, makerTypes, allSteps]);

  const handleChange = (stepId: string, name: string, val: string) => {
    setValues((prev) => ({ ...prev, [`${stepId}:${name}`]: val }));
  };

  const buildPromptForStep = (step: Step): string => {
    const template = step.template || '';
    const context: Record<string, any> = {};
    steps.forEach((s) => {
      extractInputs(s).forEach((inp) => {
        const key = inp.name;
        const val = values[`${s.id}:${key}`] || '';
        if (inp.type === 'component' && inp.componentType) {
          const inst = components[inp.componentType]?.find((c) => c.id === val);
          context[key] = inst ? inst.values : {};
        } else {
          context[key] = val;
        }
      });
    });
    Object.assign(context, outputs);
    return buildPrompt(template, context);
  };

  const runPromptStep = async (step: Step) => {
    const prompt = buildPromptForStep(step);
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
      setOutputs((prev) => ({ ...prev, [step.id]: data.result || '' }));
    } catch (err: any) {
      setError(err.message || 'Request failed');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: FormEvent, step: Step) => {
    e.preventDefault();
    if (step.stepType === 'prompt') await runPromptStep(step);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className={`${styles['step-label']} capitalize`}>Maker Type</label>
        <select
          className={styles['step-select']}
          value={makerTypeId}
          onChange={(e) => setMakerTypeId(e.target.value)}
        >
          {makerTypes.map((mt) => (
            <option key={mt.id} value={mt.id}>
              {mt.name}
            </option>
          ))}
        </select>
      </div>
      {steps.map((step) => {
        const inputs = extractInputs(step);
        return (
          <form key={step.id} onSubmit={(e) => handleSubmit(e, step)} className={styles['step-form']}>
            <h3 className={styles['step-heading']}>{step.name}</h3>
            {step.stepType === 'form' && (
              <>
                <p className="mb-2">{step.text}</p>
                {inputs.map((inp) => (
                  <div key={inp.name}>
                    <label className={`${styles['step-label']} capitalize`}>{inp.label || inp.name}</label>
                    {inp.type === 'textarea' ? (
                      <textarea
                        className={styles['step-textarea']}
                        value={values[`${step.id}:${inp.name}`] || ''}
                        onChange={(e) => handleChange(step.id, inp.name, e.target.value)}
                      />
                    ) : inp.type === 'component' ? (
                      <select
                        className={styles['step-select']}
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
                        className={styles['step-input']}
                        value={values[`${step.id}:${inp.name}`] || ''}
                        onChange={(e) => handleChange(step.id, inp.name, e.target.value)}
                      />
                    )}
                  </div>
                ))}
                <button type="submit" className={styles['step-button']}>
                  Next
                </button>
              </>
            )}
            {step.stepType === 'prompt' && (
              <>
                <button type="submit" className={styles['step-button']} disabled={loading}>
                  {loading ? 'Running...' : 'Run'}
                </button>
                {outputs[step.id] && (
                  <textarea className={styles['step-textarea']} readOnly value={outputs[step.id]} />
                )}
              </>
            )}
          </form>
        );
      })}
      {error && <div className="text-[#ff4d4f]">{error}</div>}
    </div>
  );
};

export default ExperienceMaker;
