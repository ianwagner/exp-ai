import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadFile } from '../lib/firebaseHelpers';
import type {
  ComponentType,
  ComponentInstance,
  InputField,
} from '../lib/types';
import {
  componentType,
  componentInstance,
} from '../data/mockFlow';

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

  const handleFileChange = async (
    typeIndex: number,
    instIndex: number,
    field: string,
    file: File
  ) => {
    const type = types[typeIndex];
    const inst = type.instances?.[instIndex];
    if (!type.id || !inst?.id) {
      alert('Set IDs before uploading');
      return;
    }
    const path = `components/${type.id}/instances/${inst.id}/${field}`;
    const url = await uploadFile(file, path);
    handleInstanceChange(typeIndex, instIndex, field, url);
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
                        <option value="image">Image</option>
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
                            ) : f.type === 'image' ? (
                              <div className="space-y-1">
                                {inst.values?.[f.name] && (
                                  <img src={inst.values[f.name]} alt="" className="h-12" />
                                )}
                                <input
                                  type="file"
                                  className="form-input-light"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleFileChange(idx, iIdx, f.name, file);
                                    }
                                  }}
                                />
                              </div>
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

export default AdminComponentsView;
