import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const SETTINGS_PASSWORD = process.env.NEXT_PUBLIC_SETTINGS_PASSWORD;

type Tab = 'steps' | 'components' | 'outputs';

interface GenericItem {
  id: string;
  data: string;
  isNew?: boolean;
}

const AdminStepsView = () => {
  const [items, setItems] = useState<GenericItem[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      const snapshot = await getDocs(collection(db, 'steps'));
      const list: GenericItem[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, data: JSON.stringify(d.data(), null, 2) });
      });
      setItems(list);
    };
    fetchItems();
  }, []);

  const handleChange = (index: number, field: keyof GenericItem, value: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const saveItem = async (item: GenericItem) => {
    if (!item.id) {
      alert('ID is required');
      return;
    }
    await setDoc(doc(db, 'steps', item.id), JSON.parse(item.data || '{}'));
    setItems((prev) =>
      prev.map((it) => (it === item ? { ...item, isNew: false } : it))
    );
  };

  const deleteItem = async (index: number) => {
    const it = items[index];
    if (it.id) {
      await deleteDoc(doc(db, 'steps', it.id));
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { id: '', data: '{}', isNew: true }]);
  };

  return (
    <div>
      <ul className="space-y-4">
        {items.map((item, idx) => (
          <li key={idx} className="border p-2 rounded space-y-2">
            <input
              className="form-input-light"
              placeholder="ID"
              value={item.id}
              disabled={!item.isNew}
              onChange={(e) => handleChange(idx, 'id', e.target.value)}
            />
            <textarea
              className="form-input-light h-32"
              value={item.data}
              onChange={(e) => handleChange(idx, 'data', e.target.value)}
            />
            <div className="flex space-x-2">
              <button onClick={() => saveItem(item)} className="btn btn-success">
                Save
              </button>
              <button onClick={() => deleteItem(idx)} className="btn btn-danger">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button onClick={addItem} className="btn btn-blue mt-4">
        Add Step
      </button>
    </div>
  );
};

interface ComponentTypeItem extends GenericItem {
  instances?: GenericItem[];
  expanded?: boolean;
}

const AdminComponentsView = () => {
  const [types, setTypes] = useState<ComponentTypeItem[]>([]);

  useEffect(() => {
    const fetchTypes = async () => {
      const snap = await getDocs(collection(db, 'components'));
      const list: ComponentTypeItem[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, data: JSON.stringify(d.data(), null, 2) });
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
    const snap = await getDocs(collection(db, `components/${type.id}/instances`));
    const inst: GenericItem[] = [];
    snap.forEach((d) => {
      inst.push({ id: d.id, data: JSON.stringify(d.data(), null, 2) });
    });
    setTypes((prev) => {
      const copy = [...prev];
      copy[index].instances = inst;
      copy[index].expanded = true;
      return copy;
    });
  };

  const handleTypeChange = (
    index: number,
    field: keyof GenericItem,
    value: string
  ) => {
    setTypes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const saveType = async (type: ComponentTypeItem) => {
    if (!type.id) {
      alert('ID required');
      return;
    }
    await setDoc(doc(db, 'components', type.id), JSON.parse(type.data || '{}'));
    setTypes((prev) =>
      prev.map((t) => (t === type ? { ...type, isNew: false } : t))
    );
  };

  const deleteType = async (index: number) => {
    const t = types[index];
    if (t.id) {
      await deleteDoc(doc(db, 'components', t.id));
    }
    setTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const addType = () => {
    setTypes((prev) => [...prev, { id: '', data: '{}', isNew: true }]);
  };

  const handleInstChange = (
    typeIndex: number,
    instIndex: number,
    field: keyof GenericItem,
    value: string
  ) => {
    setTypes((prev) => {
      const copy = [...prev];
      const instances = copy[typeIndex].instances || [];
      instances[instIndex] = { ...instances[instIndex], [field]: value };
      copy[typeIndex].instances = instances;
      return copy;
    });
  };

  const saveInstance = async (typeIndex: number, inst: GenericItem) => {
    const type = types[typeIndex];
    if (!type.id || !inst.id) {
      alert('IDs required');
      return;
    }
    await setDoc(
      doc(db, `components/${type.id}/instances`, inst.id),
      JSON.parse(inst.data || '{}')
    );
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
      copy[index].instances = [...instances, { id: '', data: '{}', isNew: true }];
      copy[index].expanded = true;
      return copy;
    });
  };

  return (
    <div>
      <ul className="space-y-4">
        {types.map((type, idx) => (
          <li key={idx} className="border p-2 rounded space-y-2">
            <input
              className="form-input-light"
              placeholder="Type ID"
              value={type.id}
              disabled={!type.isNew}
              onChange={(e) => handleTypeChange(idx, 'id', e.target.value)}
            />
            <textarea
              className="form-input-light h-32"
              value={type.data}
              onChange={(e) => handleTypeChange(idx, 'data', e.target.value)}
            />
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
                        handleInstChange(idx, iIdx, 'id', e.target.value)
                      }
                    />
                    <textarea
                      className="form-input-light h-24"
                      value={inst.data}
                      onChange={(e) =>
                        handleInstChange(idx, iIdx, 'data', e.target.value)
                      }
                    />
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
                <button
                  onClick={() => addInstance(idx)}
                  className="btn btn-blue"
                >
                  Add Instance
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <button onClick={addType} className="btn btn-blue mt-4">
        Add Component Type
      </button>
    </div>
  );
};

const AdminOutputsView = () => {
  const [items, setItems] = useState<GenericItem[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      const snapshot = await getDocs(collection(db, 'outputs'));
      const list: GenericItem[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, data: JSON.stringify(d.data(), null, 2) });
      });
      setItems(list);
    };
    fetchItems();
  }, []);

  const handleChange = (index: number, field: keyof GenericItem, value: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const saveItem = async (item: GenericItem) => {
    if (!item.id) {
      alert('ID is required');
      return;
    }
    await setDoc(doc(db, 'outputs', item.id), JSON.parse(item.data || '{}'));
    setItems((prev) =>
      prev.map((it) => (it === item ? { ...item, isNew: false } : it))
    );
  };

  const deleteItem = async (index: number) => {
    const it = items[index];
    if (it.id) {
      await deleteDoc(doc(db, 'outputs', it.id));
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { id: '', data: '{}', isNew: true }]);
  };

  return (
    <div>
      <ul className="space-y-4">
        {items.map((item, idx) => (
          <li key={idx} className="border p-2 rounded space-y-2">
            <input
              className="form-input-light"
              placeholder="ID"
              value={item.id}
              disabled={!item.isNew}
              onChange={(e) => handleChange(idx, 'id', e.target.value)}
            />
            <textarea
              className="form-input-light h-32"
              value={item.data}
              onChange={(e) => handleChange(idx, 'data', e.target.value)}
            />
            <div className="flex space-x-2">
              <button onClick={() => saveItem(item)} className="btn btn-success">
                Save
              </button>
              <button onClick={() => deleteItem(idx)} className="btn btn-danger">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button onClick={addItem} className="btn btn-blue mt-4">
        Add Output Rule
      </button>
    </div>
  );
};

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
