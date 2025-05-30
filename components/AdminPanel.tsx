import { useState, useEffect } from 'react';
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

const SETTINGS_PASSWORD = process.env.NEXT_PUBLIC_SETTINGS_PASSWORD;

type Tab = 'steps' | 'components' | 'outputs';

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
                <div className="space-y-2">
                  {(item.expectedInputs || []).map((inp, iIdx) => (
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

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
interface ComponentTypeItem extends ComponentType {
  isNew?: boolean;
  instances?: ComponentInstanceItem[];
  expanded?: boolean;
}

interface ComponentInstanceItem extends ComponentInstance {
  isNew?: boolean;
}

const blankField = (): InputField => ({ name: '', label: '', type: 'text' });

const AdminComponentsView = () => {
  const [types, setTypes] = useState<ComponentTypeItem[]>([
    {
      ...componentType,
      instances: [componentInstance as ComponentInstanceItem],
    } as ComponentTypeItem,
  ]);

  useEffect(() => {
    const fetchTypes = async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        return;
      }
      const snap = await getDocs(collection(db, 'components'));
      const list: ComponentTypeItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as Omit<ComponentType, 'id'>;
        list.push({ id: d.id, ...data });
      });
      setTypes(list);
    };
    fetchTypes();
  }, []);

  const loadInstances = async (index: number) => {
    const type = types[index];
    if (type.instances) {
      setTypes((prev) => {
        const copy = [...prev];
        copy[index].expanded = !copy[index].expanded;
        return copy;
      });
      return;
    }
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      setTypes((prev) => {
        const copy = [...prev];
        copy[index].expanded = true;
        return copy;
      });
      return;
    }
    const snap = await getDocs(collection(db, `components/${type.id}/instances`));
    const inst: ComponentInstanceItem[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<ComponentInstance, 'id'>;
      inst.push({ id: d.id, ...data });
    });
    setTypes((prev) => {
      const copy = [...prev];
      copy[index].instances = inst;
      copy[index].expanded = true;
      return copy;
    });
  };

  const handleTypeField = (
    index: number,
    field: keyof ComponentType,
    value: any
  ) => {
    setTypes((prev) => {
      const copy = [...prev];
      (copy[index] as any)[field] = value;
      return copy;
    });
  };

  const addFieldToType = (index: number) => {
    setTypes((prev) => {
      const copy = [...prev];
      const fields = copy[index].fields || [];
      copy[index].fields = [...fields, blankField()];
      return copy;
    });
  };

  const removeFieldFromType = (index: number, fieldIndex: number) => {
    setTypes((prev) => {
      const copy = [...prev];
      const fields = copy[index].fields || [];
      copy[index].fields = fields.filter((_, i) => i !== fieldIndex);
      return copy;
    });
  };

  const handleFieldChange = (
    typeIndex: number,
    fieldIndex: number,
    field: keyof InputField,
    value: string
  ) => {
    setTypes((prev) => {
      const copy = [...prev];
      const fields = copy[typeIndex].fields || [];
      fields[fieldIndex] = { ...fields[fieldIndex], [field]: value };
      copy[typeIndex].fields = fields;
      return copy;
    });
  };

  const handleInstanceChange = (
    typeIndex: number,
    instIndex: number,
    key: keyof ComponentInstance | string,
    value: any
  ) => {
    setTypes((prev) => {
      const copy = [...prev];
      const insts = copy[typeIndex].instances || [];
      const inst = { ...insts[instIndex] };
      if (key === 'id') {
        (inst as any)[key] = value;
      } else {
        inst.values = { ...inst.values, [key]: value };
      }
      insts[instIndex] = inst;
      copy[typeIndex].instances = insts;
      return copy;
    });
  };

  const saveType = async (type: ComponentTypeItem) => {
    if (!type.id) {
      alert('ID required');
      return;
    }
    const { id, isNew, instances, expanded, ...data } = type;
    await setDoc(doc(db, 'components', id), data);
    setTypes((prev) => prev.map((t) => (t === type ? { ...type, isNew: false } : t)));
  };

  const deleteType = async (index: number) => {
    const t = types[index];
    if (t.id) {
      await deleteDoc(doc(db, 'components', t.id));
    }
    setTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const addType = () => {
    setTypes((prev) => [
      ...prev,
      { id: '', name: '', fields: [], isNew: true },
    ]);
  };

  const saveInstance = async (typeIndex: number, inst: ComponentInstanceItem) => {
    const type = types[typeIndex];
    if (!type.id || !inst.id) {
      alert('IDs required');
      return;
    }
    const { id, isNew, ...data } = inst;
    await setDoc(doc(db, `components/${type.id}/instances`, id), {
      ...data,
      componentType: type.id,
    });
    setTypes((prev) => {
      const copy = [...prev];
      const instances = copy[typeIndex].instances || [];
      copy[typeIndex].instances = instances.map((i) =>
        i === inst ? { ...inst, isNew: false } : i
      );
      return copy;
    });
  };

  const deleteInstance = async (typeIndex: number, instIndex: number) => {
    const type = types[typeIndex];
    const inst = type.instances?.[instIndex];
    if (type.id && inst?.id) {
      await deleteDoc(doc(db, `components/${type.id}/instances`, inst.id));
    }
    setTypes((prev) => {
      const copy = [...prev];
      const instances = copy[typeIndex].instances || [];
      copy[typeIndex].instances = instances.filter((_, i) => i !== instIndex);
      return copy;
    });
  };

  const addInstance = (index: number) => {
    setTypes((prev) => {
      const copy = [...prev];
      const instances = copy[index].instances || [];
      copy[index].instances = [
        ...instances,
        { id: '', componentType: copy[index].id, values: {}, isNew: true },
      ];
      copy[index].expanded = true;
      return copy;
    });
  };

  return (
    <div>
      <ul className="space-y-4">
        {types.map((type, idx) => (
          <li key={idx} className="border rounded">
            <details className="p-2" open={type.isNew || type.expanded}>
              <summary
                className="cursor-pointer font-semibold"
                onClick={() =>
                  setTypes((prev) => {
                    const copy = [...prev];
                    copy[idx].expanded = !copy[idx].expanded;
                    return copy;
                  })
                }
              >
                {type.id || 'New Type'} {type.name && <span className="text-gray-500 ml-2">{type.name}</span>}
              </summary>
              <div className="space-y-2 mt-2">
                <input
                  className="form-input-light"
                  placeholder="Type ID"
                  value={type.id}
                  disabled={!type.isNew}
                  onChange={(e) => handleTypeField(idx, 'id', e.target.value)}
                />
                <input
                  className="form-input-light"
                  placeholder="Name"
                  value={type.name}
                  onChange={(e) => handleTypeField(idx, 'name', e.target.value)}
                />
            <div className="space-y-2">
              {(type.fields || []).map((f, fIdx) => (
                <div key={fIdx} className="flex space-x-2 items-center">
                  <input
                    className="form-input-light"
                    placeholder="Field Name"
                    value={f.name}
                    onChange={(e) => handleFieldChange(idx, fIdx, 'name', e.target.value)}
                  />
                  <input
                    className="form-input-light"
                    placeholder="Label"
                    value={f.label || ''}
                    onChange={(e) => handleFieldChange(idx, fIdx, 'label', e.target.value)}
                  />
                  <select
                    className="form-input-light"
                    value={f.type || 'text'}
                    onChange={(e) => handleFieldChange(idx, fIdx, 'type', e.target.value)}
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="number">Number</option>
                  </select>
                  <button
                    onClick={() => removeFieldFromType(idx, fIdx)}
                    className="btn btn-danger"
                  >
                    X
                  </button>
                </div>
              ))}
              <button onClick={() => addFieldToType(idx)} className="btn btn-blue">
                Add Field
              </button>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => saveType(type)} className="btn btn-success">
                Save Type
              </button>
              <button onClick={() => deleteType(idx)} className="btn btn-danger">
                Delete Type
              </button>
              <button
                onClick={() => loadInstances(idx)}
                className="btn btn-neutral"
              >
                {type.expanded ? 'Hide Instances' : 'Show Instances'}
              </button>
            </div>
            {type.expanded && (
              <div className="ml-4 border-l pl-4 space-y-4">
                {(type.instances || []).map((inst, iIdx) => (
                  <div key={iIdx} className="border p-2 rounded space-y-2">
                    <input
                      className="form-input-light"
                      placeholder="Instance ID"
                      value={inst.id}
                      disabled={!inst.isNew}
                      onChange={(e) =>
                        handleInstanceChange(idx, iIdx, 'id', e.target.value)
                      }
                    />
                    {(type.fields || []).map((f) => (
                      <div key={f.name}>
                        {f.type === 'textarea' ? (
                          <textarea
                            className="form-input-light h-24"
                            placeholder={f.label || f.name}
                            value={inst.values?.[f.name] || ''}
                            onChange={(e) =>
                              handleInstanceChange(idx, iIdx, f.name, e.target.value)
                            }
                          />
                        ) : (
                          <input
                            className="form-input-light"
                            placeholder={f.label || f.name}
                            value={inst.values?.[f.name] || ''}
                            onChange={(e) =>
                              handleInstanceChange(idx, iIdx, f.name, e.target.value)
                            }
                          />
                        )}
                      </div>
                    ))}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => saveInstance(idx, inst)}
                        className="btn btn-success"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => deleteInstance(idx, iIdx)}
                        className="btn btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addInstance(idx)} className="btn btn-blue">
                  Add Instance
                </button>
              </div>
            )}
            </div>
            </details>
          </li>
        ))}
      </ul>
      <button onClick={addType} className="btn btn-blue mt-4">
        Add Component Type
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
interface OutputItem extends OutputRule {
  isNew?: boolean;
}

const AdminOutputsView = () => {
  const [items, setItems] = useState<OutputItem[]>(
    mockOutputs as OutputItem[]
  );
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        return;
      }
      const snapshot = await getDocs(collection(db, 'outputs'));
      const list: OutputItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Omit<OutputItem, 'id' | 'isNew'>;
        list.push({ id: d.id, ...data, uses: data.uses ?? [] });
      });
      setItems(list);
    };
    fetchItems();
  }, []);

  const handleChange = (index: number, field: keyof OutputRule, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      (copy[index] as any)[field] = value;
      return copy;
    });
  };

  const handleUseChange = (
    ruleIndex: number,
    useIndex: number,
    value: string
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      const uses = copy[ruleIndex].uses || [];
      uses[useIndex] = value;
      copy[ruleIndex].uses = uses;
      return copy;
    });
  };

  const addUse = (ruleIndex: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const uses = copy[ruleIndex].uses || [];
      copy[ruleIndex].uses = [...uses, ''];
      return copy;
    });
  };

  const removeUse = (ruleIndex: number, useIndex: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const uses = copy[ruleIndex].uses || [];
      copy[ruleIndex].uses = uses.filter((_, i) => i !== useIndex);
      return copy;
    });
  };

  const saveItem = async (item: OutputItem) => {
    if (!item.id) {
      alert('ID is required');
      return;
    }
    const { id, isNew, ...data } = item;
    await setDoc(doc(db, 'outputs', id), data);
    setItems((prev) => prev.map((it) => (it === item ? { ...item, isNew: false } : it)));
  };

  const deleteItem = async (index: number) => {
    const it = items[index];
    if (it.id) {
      await deleteDoc(doc(db, 'outputs', it.id));
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: '', outputName: '', fromStep: '', uses: [], chatPromptTemplate: '', isNew: true },
    ]);
  };

  const highlightTemplate = (tpl: string | undefined, uses: string[] = []) => {
    return (tpl ?? '').split(/(\{\{.*?\}\})/g).map((part, i) => {
      if (/\{\{.*\}\}/.test(part)) {
        const key = part.replace(/\{\{|\}\}/g, '').trim();
        const matched = uses.includes(key) ? 'bg-green-100' : 'bg-yellow-100';
        return (
          <span key={i} className={matched + ' px-1 rounded'}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div>
      <ul className="space-y-4">
        {items.map((item, idx) => (
          <li key={idx} className="border rounded">
            <details className="p-2" open={expanded === idx || item.isNew}>
              <summary
                className="cursor-pointer font-semibold"
                onClick={() => setExpanded(expanded === idx ? null : idx)}
              >
                {item.id || 'New Rule'}{' '}
                {item.outputName && <span className="text-gray-500 ml-2">{item.outputName}</span>}
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
                  placeholder="Output Name"
                  value={item.outputName}
                  onChange={(e) => handleChange(idx, 'outputName', e.target.value)}
                />
                <input
                  className="form-input-light"
                  placeholder="From Step"
                  value={item.fromStep}
                  onChange={(e) => handleChange(idx, 'fromStep', e.target.value)}
                />
                <div className="space-y-2">
                  {(item.uses || []).map((u, uIdx) => (
                    <div key={uIdx} className="flex space-x-2 items-center">
                      <input
                        className="form-input-light"
                        placeholder="Uses"
                        value={u}
                        onChange={(e) => handleUseChange(idx, uIdx, e.target.value)}
                      />
                      <button
                        onClick={() => removeUse(idx, uIdx)}
                        className="btn btn-danger"
                      >
                        X
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addUse(idx)} className="btn btn-blue">
                    Add Use
                  </button>
                </div>
                <textarea
                  className="form-input-light h-24"
                  placeholder="Chat Prompt Template"
                  value={item.chatPromptTemplate}
                  onChange={(e) => handleChange(idx, 'chatPromptTemplate', e.target.value)}
                />
                <div className="text-sm whitespace-pre-wrap border p-2 rounded">
                  {highlightTemplate(item.chatPromptTemplate, item.uses || [])}
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => saveItem(item)} className="btn btn-success">Save</button>
                  <button onClick={() => deleteItem(idx)} className="btn btn-danger">Delete</button>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
      <button onClick={addItem} className="btn btn-blue mt-4">Add Output Rule</button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------
const AdminPanel = () => {
  const [tab, setTab] = useState<Tab>('steps');
  const [editMode, setEditMode] = useState(false);

  const requestEdit = () => {
    const pwd = window.prompt('Enter password');
    if (pwd === SETTINGS_PASSWORD) {
      setEditMode(true);
    } else if (pwd !== null) {
      alert('Incorrect password');
    }
  };

  return (
    <div className="p-4 space-y-4">
      {!editMode && (
        <button onClick={requestEdit} className="btn btn-neutral">
          Enter Edit Mode
        </button>
      )}
      {editMode && (
        <div>
          <div className="flex space-x-2 mb-4">
            <button
              className={`btn ${tab === 'steps' ? 'btn-primary' : 'btn-neutral'}`}
              onClick={() => setTab('steps')}
            >
              Steps
            </button>
            <button
              className={`btn ${tab === 'components' ? 'btn-primary' : 'btn-neutral'}`}
              onClick={() => setTab('components')}
            >
              Components
            </button>
            <button
              className={`btn ${tab === 'outputs' ? 'btn-primary' : 'btn-neutral'}`}
              onClick={() => setTab('outputs')}
            >
              Outputs
            </button>
          </div>
          {tab === 'steps' && <AdminStepsView />}
          {tab === 'components' && <AdminComponentsView />}
          {tab === 'outputs' && <AdminOutputsView />}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
export { AdminStepsView, AdminComponentsView, AdminOutputsView };
