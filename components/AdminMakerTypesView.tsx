import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { MakerType, Step } from '../lib/types';
import { mockMakerTypes, mockSteps } from '../data/mockFlow';

interface MakerTypeItem extends MakerType {
  isNew?: boolean;
}

const AdminMakerTypesView = () => {
  const [makerTypes, setMakerTypes] = useState<MakerTypeItem[]>(
    mockMakerTypes as MakerTypeItem[]
  );
  const [steps, setSteps] = useState<Step[]>(mockSteps);

  useEffect(() => {
    const fetchData = async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;
      const mtSnap = await getDocs(collection(db, 'makerTypes'));
      const list: MakerTypeItem[] = [];
      mtSnap.forEach((d) => {
        const data = d.data() as Omit<MakerType, 'id'>;
        list.push({ id: d.id, ...data });
      });
      if (list.length) setMakerTypes(list);

      const stepSnap = await getDocs(collection(db, 'steps'));
      const s: Step[] = [];
      stepSnap.forEach((docSnap) => {
        const data = docSnap.data() as Omit<Step, 'id'>;
        s.push({ id: docSnap.id, ...data });
      });
      if (s.length) setSteps(s);
    };
    fetchData();
  }, []);

  const handleChange = (
    idx: number,
    field: keyof MakerType,
    value: any
  ) => {
    setMakerTypes((prev) => {
      const copy = [...prev];
      (copy[idx] as any)[field] = value;
      return copy;
    });
  };

  const handleStepsChange = (idx: number, opts: HTMLOptionsCollection) => {
    const vals = Array.from(opts)
      .filter((o) => o.selected)
      .map((o) => o.value);
    handleChange(idx, 'steps', vals);
  };

  const saveMakerType = async (mt: MakerTypeItem) => {
    if (!mt.id) {
      alert('ID required');
      return;
    }
    const { id, isNew, ...data } = mt;
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      await setDoc(doc(db, 'makerTypes', id), data);
    }
    setMakerTypes((prev) => prev.map((m) => (m === mt ? { ...mt, isNew: false } : m)));
  };

  const deleteMakerType = async (idx: number) => {
    const mt = makerTypes[idx];
    if (mt.id && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      await deleteDoc(doc(db, 'makerTypes', mt.id));
    }
    setMakerTypes((prev) => prev.filter((_, i) => i !== idx));
  };

  const addMakerType = () => {
    setMakerTypes((prev) => [...prev, { id: '', name: '', steps: [], isNew: true }]);
  };

  return (
    <div>
      <ul className="space-y-4">
        {makerTypes.map((mt, idx) => (
          <li key={idx} className="border p-2 rounded">
            <div className="space-y-2">
              <input
                className="form-input-light"
                placeholder="ID"
                value={mt.id}
                disabled={!mt.isNew}
                onChange={(e) => handleChange(idx, 'id', e.target.value)}
              />
              <input
                className="form-input-light"
                placeholder="Name"
                value={mt.name}
                onChange={(e) => handleChange(idx, 'name', e.target.value)}
              />
              <select
                multiple
                className="form-input-light h-32"
                value={mt.steps}
                onChange={(e) => handleStepsChange(idx, e.target.options)}
              >
                {steps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="flex space-x-2">
                <button onClick={() => saveMakerType(mt)} className="btn btn-success">
                  Save
                </button>
                <button onClick={() => deleteMakerType(idx)} className="btn btn-danger">
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <button onClick={addMakerType} className="btn btn-blue mt-4">
        Add Maker Type
      </button>
    </div>
  );
};

export default AdminMakerTypesView;
