import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import buildPrompt from '../utils/buildPrompt';
import type {
  Step,
  ComponentType,
  ComponentInstance,
  OutputRule,
  InputField,
} from '../lib/types';
import {
  componentType,
  componentInstance,
  mockSteps,
  mockOutputs,
  mockComponents,
} from '../data/mockFlow';

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------
interface StepItem extends Step {
  isNew?: boolean;
}

const blankInput = (): InputField => ({
  name: '',
  label: '',
  type: 'text',
  componentType: '',
});

const AdminStepsView = () => {
  const [items, setItems] = useState<StepItem[]>(
    mockSteps as StepItem[]
  );
  const [componentTypes, setComponentTypes] = useState<ComponentType[]>([
    componentType,
  ]);
  const [componentInstances, setComponentInstances] = useState<
    Record<string, ComponentInstance[]>
  >(mockComponents);
  const [outputRules, setOutputRules] = useState<OutputRule[]>(mockOutputs);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [dragInput, setDragInput] = useState<{
    step: number;
    index: number;
  } | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        return;
      }
      const snapshot = await getDocs(collection(db, 'steps'));
      const list: StepItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Omit<StepItem, 'id' | 'isNew'>;
        list.push({ id: d.id, ...data, expectedInputs: data.expectedInputs ?? [] });
      });
      setItems(list);

      const compsSnap = await getDocs(collection(db, 'components'));
      const types: ComponentType[] = [];
      for (const docSnap of compsSnap.docs) {
        const data = docSnap.data() as Omit<ComponentType, 'id'>;
        types.push({ id: docSnap.id, ...data });
        const instSnap = await getDocs(collection(db, `components/${docSnap.id}/instances`));
        const instList: ComponentInstance[] = [];
        instSnap.forEach((di) => {
          const dData = di.data() as Omit<ComponentInstance, 'id'>;
          instList.push({ id: di.id, ...dData });
        });
        setComponentInstances((prev) => ({ ...prev, [docSnap.id]: instList }));
      }
      setComponentTypes(types);

      const outSnap = await getDocs(collection(db, 'outputs'));
      const outs: OutputRule[] = [];
      outSnap.forEach((d) => {
        const data = d.data() as Omit<OutputRule, 'id'>;
        outs.push({ id: d.id, ...data });
      });
      setOutputRules(outs);
    };
    fetchItems();
  }, []);

  const handleChange = (index: number, field: keyof Step, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      (copy[index] as any)[field] = value;
      return copy;
    });
  };

  const handleInputChange = (
    stepIndex: number,
    inputIndex: number,
    field: keyof InputField,
    value: string
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      const inputs = copy[stepIndex].expectedInputs || [];
      inputs[inputIndex] = { ...inputs[inputIndex], [field]: value };
      copy[stepIndex].expectedInputs = inputs;
      return copy;
    });
  };

  const addInput = (stepIndex: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const inputs = copy[stepIndex].expectedInputs || [];
      copy[stepIndex].expectedInputs = [...inputs, blankInput()];
      return copy;
    });
  };

  const deleteInput = (stepIndex: number, inputIndex: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const inputs = copy[stepIndex].expectedInputs || [];
      copy[stepIndex].expectedInputs = inputs.filter((_, i) => i !== inputIndex);
      return copy;
    });
  };

  const handleDragStart = (stepIdx: number, inputIdx: number) => {
    setDragInput({ step: stepIdx, index: inputIdx });
  };

  const handleDrop = (stepIdx: number, inputIdx: number) => {
    if (!dragInput || dragInput.step !== stepIdx) return;
    const from = dragInput.index;
    const to = inputIdx;
    if (from === to) {
      setDragInput(null);
      return;
    }
    setItems((prev) => {
      const copy = [...prev];
      const inputs = copy[stepIdx].expectedInputs || [];
      const [moved] = inputs.splice(from, 1);
      inputs.splice(to, 0, moved);
      copy[stepIdx].expectedInputs = inputs;
      return copy;
    });
    setDragInput(null);
  };

  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  const saveItem = async (item: StepItem) => {
    if (!item.id) {
      alert('ID is required');
      return;
    }
    const { id, isNew, ...data } = item;
    await setDoc(doc(db, 'steps', id), data);
    setItems((prev) => prev.map((it) => (it === item ? { ...item, isNew: false } : it)));
  };

  const deleteItem = async (index: number) => {
    const it = items[index];
    if (it.id) {
      await deleteDoc(doc(db, 'steps', it.id));
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const StepPreview = ({ step }: { step: Step }) => {
    const [values, setValues] = useState<Record<string, string>>({});
    const output = outputRules.find((o) => o.id === step.output);
    const template = output?.chatPromptTemplate || '';
    const inputs = step.expectedInputs || [];
    const build = () => {
      const ctx: Record<string, any> = {};
      inputs.forEach((inp) => {
        const val = values[inp.name] || '';
        if (inp.type === 'component' && inp.componentType) {
          const inst = componentInstances[inp.componentType]?.find((c) => c.id === val);
          ctx[inp.name] = inst ? inst.values : {};
        } else {
          ctx[inp.name] = val;
        }
      });
      return buildPrompt(template, ctx);
    };

    const prompt = build();

    const handle = (name: string, val: string) => {
      setValues((prev) => ({ ...prev, [name]: val }));
    };

    return (
      <div className="border p-2 rounded space-y-2 mt-2">
        {inputs.map((inp) => (
          <div key={inp.name} className="space-y-1">
            <label className="block text-sm">{inp.label || inp.name}</label>
            {inp.type === 'textarea' ? (
              <textarea
                className="form-input-light"
                value={values[inp.name] || ''}
                onChange={(e) => handle(inp.name, e.target.value)}
              />
            ) : inp.type === 'component' ? (
              <select
                className="form-input-light"
                value={values[inp.name] || ''}
                onChange={(e) => handle(inp.name, e.target.value)}
              >
                <option value="">Select...</option>
                {(componentInstances[inp.componentType || ''] || []).map((ci) => (
                  <option key={ci.id} value={ci.id}>
                    {ci.id}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="form-input-light"
                type={inp.type || 'text'}
                value={values[inp.name] || ''}
                onChange={(e) => handle(inp.name, e.target.value)}
              />
            )}
          </div>
        ))}
        <textarea className="form-input-light h-24" readOnly value={prompt} />
      </div>
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: '', name: '', text: '', output: '', expectedInputs: [], isNew: true },
    ]);
  };

  return (
    <div>
      <ul className="space-y-4">
        {items.map((item, idx) => (
          <li key={idx} className="border rounded">
            <details className="p-2" open={item.isNew}>
              <summary className="cursor-pointer font-semibold">
                {item.id || 'New Step'} {item.name && <span className="text-gray-500 ml-2">{item.name}</span>}
              </summary>
              <div className="space-y-2 mt-2">
                <input
                  className="form-input-light"
                  placeholder="ID"
                  value={item.id}
                  disabled={!item.isNew}
                  onChange={(e) => handleChange(idx, 'id', e.target.value)}
                />
                <input
                  className="form-input-light"
                  placeholder="Name"
                  value={item.name}
                  onChange={(e) => handleChange(idx, 'name', e.target.value)}
                />
                <textarea
                  className="form-input-light h-24"
                  placeholder="Text"
                  value={item.text}
                  onChange={(e) => handleChange(idx, 'text', e.target.value)}
                />
                <input
                  className="form-input-light"
                  placeholder="Output Rule ID"
                  value={item.output}
                  onChange={(e) => handleChange(idx, 'output', e.target.value)}
                />
                <div
                  className="space-y-2"
                  onDragOver={allowDrop}
                  onDrop={() => handleDrop(idx, (item.expectedInputs || []).length)}
                >
                  {(item.expectedInputs || []).map((inp, iIdx) => (
                    <div
                      key={iIdx}
                      className="flex space-x-2 items-center"
                      draggable
                      onDragStart={() => handleDragStart(idx, iIdx)}
                      onDragOver={allowDrop}
                      onDrop={() => handleDrop(idx, iIdx)}
                    >
                      <span className="cursor-move select-none">☰</span>
                      <input
                        className="form-input-light"
                        placeholder="Name"
                        value={inp.name}
                        onChange={(e) => handleInputChange(idx, iIdx, 'name', e.target.value)}
                      />
                      <input
                        className="form-input-light"
                        placeholder="Label"
                        value={inp.label || ''}
                        onChange={(e) => handleInputChange(idx, iIdx, 'label', e.target.value)}
                      />
                      <select
                        className="form-input-light"
                        value={inp.type || 'text'}
                        onChange={(e) => handleInputChange(idx, iIdx, 'type', e.target.value)}
                      >
                        <option value="text">Text</option>
                        <option value="textarea">Textarea</option>
                        <option value="number">Number</option>
                        <option value="component">Component</option>
                      </select>
                      {inp.type === 'component' && (
                        <>
                          <select
                            className="form-input-light"
                            value={inp.componentType || ''}
                            onChange={(e) => handleInputChange(idx, iIdx, 'componentType', e.target.value)}
                          >
                            <option value="">Select Type...</option>
                            {componentTypes.map((ct) => (
                              <option key={ct.id} value={ct.id}>
                                {ct.name}
                              </option>
                            ))}
                          </select>
                          {/* instance dropdown shown in preview */}
                        </>
                      )}
                      <button
                        onClick={() => deleteInput(idx, iIdx)}
                        className="btn btn-danger"
                      >
                        X
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addInput(idx)} className="btn btn-blue">Add Input</button>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => saveItem(item)} className="btn btn-success">Save</button>
                  <button onClick={() => deleteItem(idx)} className="btn btn-danger">Delete</button>
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(previewIndex === idx ? null : idx)}
                    className="btn btn-neutral"
                  >
                    Preview
                  </button>
                </div>
                {previewIndex === idx && <StepPreview step={item} />}
              </div>
            </details>
          </li>
        ))}
      </ul>
      <button onClick={addItem} className="btn btn-blue mt-4">
        Add Step
      </button>
    </div>
  );
};

export default AdminStepsView;
