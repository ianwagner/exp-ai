import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Step, ComponentType, ComponentInstance, InputField } from '../lib/types';
import { mockSteps, componentType, componentInstance, mockComponents } from '../data/mockFlow';

interface StepItem extends Step {
  isNew?: boolean;
}

const blankInput = (): InputField => ({ name: '', label: '', type: 'text', componentType: '' });

const AdminStepsView = () => {
  const [steps, setSteps] = useState<StepItem[]>(mockSteps as StepItem[]);
  const [componentTypes, setComponentTypes] = useState<ComponentType[]>([componentType]);
  const [componentInstances, setComponentInstances] = useState<Record<string, ComponentInstance[]>>(mockComponents);

  useEffect(() => {
    const fetchData = async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;
      const snap = await getDocs(collection(db, 'steps'));
      const list: StepItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as Omit<Step, 'id'>;
        list.push({ id: d.id, ...data });
      });
      setSteps(list);

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
    };
    fetchData();
  }, []);

  const handleChange = (index: number, field: keyof Step, value: any) => {
    setSteps((prev) => {
      const copy = [...prev];
      (copy[index] as any)[field] = value;
      return copy;
    });
  };

  const handleInputChange = (stepIdx: number, inputIdx: number, field: keyof InputField, value: string) => {
    setSteps((prev) => {
      const copy = [...prev];
      const inputs = copy[stepIdx].expectedInputs || [];
      inputs[inputIdx] = { ...inputs[inputIdx], [field]: value };
      copy[stepIdx].expectedInputs = inputs;
      return copy;
    });
  };

  const addInput = (stepIdx: number) => {
    setSteps((prev) => {
      const copy = [...prev];
      const inputs = copy[stepIdx].expectedInputs || [];
      copy[stepIdx].expectedInputs = [...inputs, blankInput()];
      return copy;
    });
  };

  const removeInput = (stepIdx: number, inputIdx: number) => {
    setSteps((prev) => {
      const copy = [...prev];
      const inputs = copy[stepIdx].expectedInputs || [];
      copy[stepIdx].expectedInputs = inputs.filter((_, i) => i !== inputIdx);
      return copy;
    });
  };

  const saveStep = async (item: StepItem) => {
    if (!item.id) { alert('ID required'); return; }
    const { id, isNew, ...data } = item;
    await setDoc(doc(db, 'steps', id), data);
    setSteps((prev) => prev.map((s) => (s === item ? { ...item, isNew: false } : s)));
  };

  const deleteStep = async (index: number) => {
    const it = steps[index];
    if (it.id) await deleteDoc(doc(db, 'steps', it.id));
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const addStep = () => {
    setSteps((prev) => [...prev, { id: '', name: '', stepType: 'form', expectedInputs: [], isNew: true }]);
  };

  return (
    <div>
      <ul className="space-y-4">
        {steps.map((step, idx) => (
          <li key={idx} className="border rounded">
            <details className="p-2" open={step.isNew}>
              <summary className="cursor-pointer font-semibold">
                {step.id || 'New Step'} {step.name && <span className="text-gray-500 ml-2">{step.name}</span>}
              </summary>
              <div className="space-y-2 mt-2">
                <input
                  className="form-input-light"
                  placeholder="ID"
                  value={step.id}
                  disabled={!step.isNew}
                  onChange={(e) => handleChange(idx, 'id', e.target.value)}
                />
                <input
                  className="form-input-light"
                  placeholder="Name"
                  value={step.name}
                  onChange={(e) => handleChange(idx, 'name', e.target.value)}
                />
                <select
                  className="form-input-light"
                  value={step.stepType}
                  onChange={(e) => handleChange(idx, 'stepType', e.target.value)}
                >
                  <option value="form">Form</option>
                  <option value="prompt">Prompt</option>
                </select>
                {step.stepType === 'form' && (
                  <textarea
                    className="form-input-light h-24"
                    placeholder="Text"
                    value={step.text || ''}
                    onChange={(e) => handleChange(idx, 'text', e.target.value)}
                  />
                )}
                {step.stepType === 'prompt' && (
                  <textarea
                    className="form-input-light h-24"
                    placeholder="Prompt Template"
                    value={step.template || ''}
                    onChange={(e) => handleChange(idx, 'template', e.target.value)}
                  />
                )}
                <input
                  className="form-input-light"
                  placeholder="Next Step ID"
                  value={step.next || ''}
                  onChange={(e) => handleChange(idx, 'next', e.target.value)}
                />
                <div className="space-y-2">
                  {(step.expectedInputs || []).map((inp, iIdx) => (
                    <div key={iIdx} className="flex space-x-2 items-center">
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
                        <option value="image">Image</option>
                        <option value="component">Component</option>
                      </select>
                      {inp.type === 'component' && (
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
                      )}
                      <button onClick={() => removeInput(idx, iIdx)} className="btn btn-danger">
                        X
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addInput(idx)} className="btn btn-blue">
                    Add Input
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => saveStep(step)} className="btn btn-success">
                    Save
                  </button>
                  <button onClick={() => deleteStep(idx)} className="btn btn-danger">
                    Delete
                  </button>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
      <button onClick={addStep} className="btn btn-blue mt-4">
        Add Step
      </button>
    </div>
  );
};

export default AdminStepsView;
