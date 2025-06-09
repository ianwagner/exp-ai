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

interface Branch {
  id: string;
  stepIndex: number;
  context: Record<string, any>;
  inputs: Record<string, string>;
  lastOutput?: string | string[];
}

const ExperienceMaker = () => {
  const [makerTypes, setMakerTypes] = useState<MakerType[]>(mockMakerTypes);
  const [makerTypeId, setMakerTypeId] = useState<string>(
    mockMakerTypes[0]?.id || ''
  );
  const [allSteps, setAllSteps] = useState<Step[]>(mockSteps);
  const [steps, setSteps] = useState<Step[]>(mockSteps);
  const [components, setComponents] = useState<Record<string, ComponentInstance[]>>(
    mockComponents
  );
  const [branches, setBranches] = useState<Branch[]>([{
    id: 'b0',
    stepIndex: 0,
    context: {},
    inputs: {},
  }]);
  const [loadingBranch, setLoadingBranch] = useState<string | null>(null);
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
      .filter(Boolean) as Step[];
    setSteps(selected);
    setBranches([{ id: 'b0', stepIndex: 0, context: {}, inputs: {} }]);

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

  const handleInputChange = (
    branchId: string,
    name: string,
    value: string
  ) => {
    setBranches((prev) => {
      const copy = prev.map((b) =>
        b.id === branchId ? { ...b, inputs: { ...b.inputs, [name]: value } } : b
      );
      return copy;
    });
  };

  const buildPromptForBranch = (branch: Branch, step: Step): string => {
    const template = step.template || '';
    return buildPrompt(template, branch.context);
  };

  const parseResult = (text: string, branching?: boolean): string | string[] => {
    if (branching) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed.map((v) => String(v));
      } catch {}
      const lines = text
        .split(/\n+/)
        .map((l) => l.trim().replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, ''))
        .filter(Boolean);
      return lines.length > 1 ? lines : [text];
    }
    return text;
  };

  const handleFormSubmit = (branch: Branch, step: Step) => {
    const inputs = extractInputs(step);
    const updates: Record<string, any> = {};
    inputs.forEach((inp) => {
      const val = branch.inputs[inp.name] || '';
      if (inp.type === 'component' && inp.componentType) {
        const inst = components[inp.componentType]?.find((c) => c.id === val);
        updates[inp.name] = inst ? inst.values : {};
      } else {
        updates[inp.name] = val;
      }
    });
    setBranches((prev) =>
      prev.map((b) =>
        b.id === branch.id
          ? { ...b, stepIndex: b.stepIndex + 1, inputs: {}, context: { ...b.context, ...updates } }
          : b
      )
    );
  };

  const runPromptStep = async (branch: Branch, step: Step) => {
    const prompt = buildPromptForBranch(branch, step);
    if (!prompt) return;
    setLoadingBranch(branch.id);
    setError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to generate');
      const parsed = parseResult(data.result || '', step.isBranching);
      if (step.isBranching && Array.isArray(parsed)) {
        setBranches((prev) => {
          const idx = prev.findIndex((b) => b.id === branch.id);
          if (idx === -1) return prev;
          const before = prev.slice(0, idx);
          const after = prev.slice(idx + 1);
          const newBranches: Branch[] = parsed.map((out, i) => ({
            id: `${branch.id}-${i}`,
            stepIndex: branch.stepIndex + 1,
            context: { ...branch.context, [step.outputName || step.id]: out },
            inputs: {},
            lastOutput: out,
          }));
          return [...before, ...newBranches, ...after];
        });
      } else {
        setBranches((prev) =>
          prev.map((b) =>
            b.id === branch.id
              ? {
                  ...b,
                  stepIndex: b.stepIndex + 1,
                  context: { ...b.context, [step.outputName || step.id]: parsed },
                  lastOutput: parsed,
                }
              : b
          )
        );
      }
    } catch (err: any) {
      setError(err.message || 'Request failed');
    }
    setLoadingBranch(null);
  };

  const handleSubmit = async (e: FormEvent, branch: Branch, step: Step) => {
    e.preventDefault();
    if (step.stepType === 'form') handleFormSubmit(branch, step);
    if (step.stepType === 'prompt') await runPromptStep(branch, step);
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
      {branches.map((branch) => {
        const step = steps[branch.stepIndex];
        if (!step) {
          return (
            <div key={branch.id} className={styles['step-form']}>
              {branch.lastOutput && (
                Array.isArray(branch.lastOutput) ? (
                  branch.lastOutput.map((v, i) => (
                    <textarea
                      key={i}
                      className={styles['step-textarea']}
                      readOnly
                      value={v}
                    />
                  ))
                ) : (
                  <textarea
                    className={styles['step-textarea']}
                    readOnly
                    value={branch.lastOutput as string}
                  />
                )
              )}
              <p>Flow complete</p>
            </div>
          );
        }
        const inputs = extractInputs(step);
        return (
          <form
            key={branch.id}
            onSubmit={(e) => handleSubmit(e, branch, step)}
            className={styles['step-form']}
          >
            {branch.lastOutput && (
              Array.isArray(branch.lastOutput) ? (
                branch.lastOutput.map((v, i) => (
                  <textarea
                    key={i}
                    className={styles['step-textarea']}
                    readOnly
                    value={v}
                  />
                ))
              ) : (
                <textarea
                  className={styles['step-textarea']}
                  readOnly
                  value={branch.lastOutput as string}
                />
              )
            )}
            <h3 className={styles['step-heading']}>{step.name}</h3>
            {step.stepType === 'form' && (
              <>
                <p className="mb-2">{step.text}</p>
                {inputs.map((inp) => (
                  <div key={inp.name}>
                    <label className={`${styles['step-label']} capitalize`}>
                      {inp.label || inp.name}
                    </label>
                    {inp.type === 'textarea' ? (
                      <textarea
                        className={styles['step-textarea']}
                        value={branch.inputs[inp.name] || ''}
                        onChange={(e) =>
                          handleInputChange(branch.id, inp.name, e.target.value)
                        }
                      />
                    ) : inp.type === 'component' ? (
                      <select
                        className={styles['step-select']}
                        value={branch.inputs[inp.name] || ''}
                        onChange={(e) =>
                          handleInputChange(branch.id, inp.name, e.target.value)
                        }
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
                        value={branch.inputs[inp.name] || ''}
                        onChange={(e) =>
                          handleInputChange(branch.id, inp.name, e.target.value)
                        }
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
                <button
                  type="submit"
                  className={styles['step-button']}
                  disabled={loadingBranch === branch.id}
                >
                  {loadingBranch === branch.id ? 'Running...' : step.buttonLabel || 'Generate'}
                </button>
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
