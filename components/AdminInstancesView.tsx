import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadFile } from '../lib/firebaseHelpers';
import type { ComponentType, ComponentInstance } from '../lib/types';
import { componentType, componentInstance } from '../data/mockFlow';

interface InstanceItem extends ComponentInstance { isNew?: boolean; }

const AdminInstancesView = () => {
  const [types, setTypes] = useState<ComponentType[]>([componentType]);
  const [instances, setInstances] = useState<Record<string, InstanceItem[]>>({
    [componentType.id]: [componentInstance as InstanceItem],
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;
      const typeSnap = await getDocs(collection(db, 'components'));
      const t: ComponentType[] = [];
      const instMap: Record<string, InstanceItem[]> = {};
      for (const docSnap of typeSnap.docs) {
        const data = docSnap.data() as Omit<ComponentType, 'id'>;
        t.push({ id: docSnap.id, ...data });
        const instSnap = await getDocs(collection(db, `components/${docSnap.id}/instances`));
        const list: InstanceItem[] = [];
        instSnap.forEach((d) => {
          const dData = d.data() as Omit<ComponentInstance, 'id'>;
          list.push({ id: d.id, ...dData });
        });
        instMap[docSnap.id] = list;
      }
      setTypes(t);
      setInstances(instMap);
    };
    fetchData();
  }, []);

  const handleChange = (typeId: string, idx: number, key: string, value: any) => {
    setInstances((prev) => {
      const copy = { ...prev };
      const items = copy[typeId] || [];
      const inst = { ...items[idx] };
      if (key === 'id' || key === 'componentType') (inst as any)[key] = value;
      else inst.values = { ...inst.values, [key]: value };
      items[idx] = inst;
      copy[typeId] = items;
      return copy;
    });
  };

  const handleFile = async (typeId: string, idx: number, field: string, file: File) => {
    if (!instances[typeId][idx].id) { alert('Set ID first'); return; }
    const path = `components/${typeId}/instances/${instances[typeId][idx].id}/${field}`;
    const url = await uploadFile(file, path);
    handleChange(typeId, idx, field, url);
  };

  const saveInstance = async (typeId: string, inst: InstanceItem) => {
    if (!inst.id) { alert('ID required'); return; }
    const { id, isNew, ...data } = inst;
    await setDoc(doc(db, `components/${typeId}/instances`, id), { ...data, componentType: typeId });
    setInstances((prev) => {
      const copy = { ...prev };
      copy[typeId] = copy[typeId].map((i) => (i === inst ? { ...inst, isNew: false } : i));
      return copy;
    });
  };

  const deleteInstance = async (typeId: string, idx: number) => {
    const inst = instances[typeId][idx];
    if (inst.id) await deleteDoc(doc(db, `components/${typeId}/instances`, inst.id));
    setInstances((prev) => {
      const copy = { ...prev };
      copy[typeId] = copy[typeId].filter((_, i) => i !== idx);
      return copy;
    });
  };

  const addInstance = (typeId: string) => {
    setInstances((prev) => {
      const copy = { ...prev };
      const items = copy[typeId] || [];
      copy[typeId] = [...items, { id: '', componentType: typeId, values: {}, isNew: true }];
      return copy;
    });
  };

  return (
    <div>
      {types.map((type) => (
        <div key={type.id} className="border rounded mb-4 p-2">
          <h3 className="font-semibold mb-2">{type.name}</h3>
          {(instances[type.id] || []).map((inst, idx) => (
            <div key={idx} className="border p-2 rounded space-y-2 mb-2">
              <input
                className="form-input-light"
                placeholder="ID"
                value={inst.id}
                disabled={!inst.isNew}
                onChange={(e) => handleChange(type.id, idx, 'id', e.target.value)}
              />
              {(type.fields || []).map((f) => (
                <div key={f.name}>
                  {f.type === 'textarea' ? (
                    <textarea
                      className="form-input-light h-24"
                      placeholder={f.label || f.name}
                      value={inst.values[f.name] || ''}
                      onChange={(e) => handleChange(type.id, idx, f.name, e.target.value)}
                    />
                  ) : f.type === 'image' ? (
                    <div className="space-y-1">
                      {inst.values[f.name] && <img src={inst.values[f.name]} alt="" className="h-12" />}
                      <input
                        type="file"
                        className="form-input-light"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFile(type.id, idx, f.name, file);
                        }}
                      />
                    </div>
                  ) : (
                    <input
                      className="form-input-light"
                      placeholder={f.label || f.name}
                      value={inst.values[f.name] || ''}
                      onChange={(e) => handleChange(type.id, idx, f.name, e.target.value)}
                    />
                  )}
                </div>
              ))}
              <div className="flex space-x-2">
                <button onClick={() => saveInstance(type.id, inst)} className="btn btn-success">Save</button>
                <button onClick={() => deleteInstance(type.id, idx)} className="btn btn-danger">Delete</button>
              </div>
            </div>
          ))}
          <button onClick={() => addInstance(type.id)} className="btn btn-blue">Add Instance</button>
        </div>
      ))}
    </div>
  );
};

export default AdminInstancesView;
