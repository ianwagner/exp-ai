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
import styles from './StepRunner.module.css';

// Basic step runner that dynamically renders form inputs for each step.

const extractInputs = (step: Step): InputField[] => {
  return Array.isArray(step.expectedInputs) ? step.expectedInputs : [];
};

const StepRunner = () => {
  const [steps, setSteps] = useState<Step[]>(mockSteps);
  const [outputs, setOutputs] = useState<OutputRule[]>(mockOutputs);
  const [values, setValues] = useState<Record<string, string>>({});
  const [components, setComponents] = useState<
    Record<string, ComponentInstance[]>
  >(mockComponents);
  const [generated, setGenerated] = useState<Record<string, string | string[]>>({});
  const [itemOutputs, setItemOutputs] = useState<
    Record<string, Record<number, Record<string, string | string[]>>>
  >({});
  const [outputOrigins, setOutputOrigins] = useState<Record<string, string>>({});
  const [pendingButtons, setPendingButtons] = useState<
    { rule: OutputRule; stepId: string; sourceId: string; index?: number }[]
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
    outMap: Record<string, any>,
    extra: Record<string, any> = {}
  ) => {
    if (!rule || typeof rule.chatPromptTemplate !== 'string') return '';
    const template: string = rule.chatPromptTemplate;
    const inputs = extractInputs(
      steps.find((s) => s.id === stepId) || ({} as Step)
    );
    const context: Record<string, any> = { ...outMap, ...extra };
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

  const parseResult = (text: string, rule?: OutputRule): string | string[] => {
    if (rule?.isBranching) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed.map((v) => String(v));
      } catch {}
      const lines = text
        .split(/\n+/)
        .map((l) =>
          l.trim().replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '')
        )
        .filter(Boolean);
      return lines.length > 1 ? lines : [text];
    }
    return text;
  };

  const runOutputRule = async (
    rule: OutputRule,
    stepId: string,
    map: Record<string, any>,
    extra: Record<string, any> = {},
    parentId?: string,
    index?: number
  ): Promise<Record<string, any>> => {
    const prompt = buildRulePrompt(rule, stepId, map, extra);
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
      const rawResult = data.result || '';
      const parsed = parseResult(rawResult, rule);
      if (parentId != null && index !== undefined) {
        setItemOutputs((prev) => {
          const cur = prev[parentId] || {};
          const item = cur[index] || {};
          return {
            ...prev,
            [parentId]: { ...cur, [index]: { ...item, [rule.id]: parsed } },
          };
        });
      } else {
        const updated = { ...map, [rule.id]: parsed };
        setGenerated(updated);
        setOutputOrigins((prev) => ({ ...prev, [rule.id]: stepId }));
        map = updated;
      }

      for (const next of outputs.filter((o) => o.fromOutput === rule.id)) {
        if (Array.isArray(parsed)) {
          for (const [idx, item] of parsed.entries()) {
            if (next.triggerType === 'button') {
              setPendingButtons((prev) => [
                ...prev,
                { rule: next, stepId, sourceId: rule.id, index: idx },
              ]);
            } else {
              try {
                map = await runOutputRule(
                  next,
                  stepId,
                  map,
                  { [next.fromOutput || rule.id]: item },
                  rule.id,
                  idx
                );
              } catch (err: any) {
                setError(err.message || 'Request failed');
              }
            }
          }
        } else {
          if (next.triggerType === 'button') {
            setPendingButtons((prev) => [
              ...prev,
              { rule: next, stepId, sourceId: rule.id },
            ]);
          } else {
            try {
              map = await runOutputRule(
                next,
                stepId,
                map,
                { [next.fromOutput || rule.id]: parsed },
                rule.id
              );
            } catch (err: any) {
              setError(err.message || 'Request failed');
            }
          }
        }
      }
      setLoading(false);
      return map;
    } catch (err: any) {
      setError(err.message || 'Request failed');
      setLoading(false);
      return map;
    }
  };

  const runStep = async (e: FormEvent, step: Step) => {
    e.preventDefault();
    let map: Record<string, any> = { ...generated };
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
    let extra: Record<string, any> = {};
    if (btn.sourceId) {
      const val = generated[btn.sourceId];
      const item = Array.isArray(val)
        ? val[btn.index ?? 0]
        : val;
      extra[btn.rule.fromOutput || btn.sourceId] = item;
    }
    const map = await runOutputRule(
      btn.rule,
      btn.stepId,
      generated,
      extra,
      btn.sourceId,
      btn.index
    );
    setGenerated(map);
  };

  return (
    <div className="step-runner">
      {steps.map((step) => {
        const inputs = extractInputs(step);
        return (
          <form
            key={step.id}
            onSubmit={(e) => runStep(e, step)}
            className={styles["step-form"]}
          >
            <h3 className={styles["step-heading"]}>{step.id}</h3>
            {inputs.map((inp) => (
              <div key={inp.name}>
                <label className={`${styles["step-label"]} capitalize`}>
                  {inp.label || inp.name}
                </label>
                {inp.type === 'textarea' ? (
                  <textarea
                    className={styles["step-textarea"]}
                    value={values[`${step.id}:${inp.name}`] || ''}
                    onChange={(e) => handleChange(step.id, inp.name, e.target.value)}
                  />
                ) : inp.type === 'component' ? (
                  <select
                    className={styles["step-select"]}
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
                    className={styles["step-input"]}
                    value={values[`${step.id}:${inp.name}`] || ''}
                    onChange={(e) => handleChange(step.id, inp.name, e.target.value)}
                  />
                )}
              </div>
            ))}
            <button
              type="submit"
              className={styles["step-button"]}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </form>
        );
      })}
      {Object.entries(generated).map(([id, text]) => (
        <div key={id} className={styles["step-output"]}>
          <h4 className={styles["step-heading"]}>{id}</h4>
          {Array.isArray(text) ? (
            text.map((item, idx) => (
              <div key={idx} className={styles["step-output"]}>
                <textarea
                  className={styles["step-textarea"]}
                  value={item}
                  onChange={(e) =>
                    setGenerated((prev) => {
                      const arr = Array.isArray(prev[id]) ? [...(prev[id] as string[])] : [];
                      arr[idx] = e.target.value;
                      return { ...prev, [id]: arr };
                    })
                  }
                />
                {Object.entries(itemOutputs[id]?.[idx] || {}).map(
                  ([cid, val]) => (
                    <div key={cid} className={styles["step-output"]}>
                      <h5 className={styles["step-heading"]}>{cid}</h5>
                      {Array.isArray(val) ? (
                        val.map((v, vi) => (
                          <textarea
                            key={vi}
                            className={styles["step-textarea"]}
                            value={v as string}
                            readOnly
                          />
                        ))
                      ) : (
                        <textarea
                          className={styles["step-textarea"]}
                          value={val as string}
                          readOnly
                        />
                      )}
                    </div>
                  )
                )}
                {pendingButtons
                  .filter(
                    (b) => b.sourceId === id && b.index === idx
                  )
                  .map((b, bIdx) => (
                    <button
                      key={`${b.rule.id}-${bIdx}`}
                      onClick={() => handleButton(pendingButtons.indexOf(b))}
                      className={styles["step-button"]}
                      disabled={loading}
                    >
                      {loading ? 'Running...' : b.rule.buttonLabel || 'Run'}
                    </button>
                  ))}
              </div>
            ))
          ) : (
            <>
              <textarea
                className={styles["step-textarea"]}
                value={text as string}
                onChange={(e) =>
                  setGenerated((prev) => ({ ...prev, [id]: e.target.value }))
                }
              />
              {pendingButtons
                .filter((b) => b.sourceId === id && b.index === undefined)
                .map((b, bIdx) => (
                  <button
                    key={`${b.rule.id}-${bIdx}`}
                    onClick={() => handleButton(pendingButtons.indexOf(b))}
                    className={styles["step-button"]}
                    disabled={loading}
                  >
                    {loading ? 'Running...' : b.rule.buttonLabel || 'Run'}
                  </button>
                ))}
            </>
          )}
        </div>
      ))}
      {error && <div className="text-[#ff4d4f]">{error}</div>}
    </div>
  );
};

export default StepRunner;
