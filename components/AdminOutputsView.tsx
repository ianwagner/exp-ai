import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { OutputRule } from '../lib/types';
import { mockOutputs } from '../data/mockFlow';

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
      {
        id: '',
        outputName: '',
        fromStep: '',
        fromOutput: '',
        triggerType: 'auto',
        buttonLabel: '',
        isBranching: false,
        uses: [],
        chatPromptTemplate: '',
        isNew: true,
      },
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
                <input
                  className="form-input-light"
                  placeholder="From Output"
                  value={item.fromOutput || ''}
                  onChange={(e) => handleChange(idx, 'fromOutput', e.target.value)}
                />
                <select
                  className="form-input-light"
                  value={item.triggerType || 'auto'}
                  onChange={(e) => handleChange(idx, 'triggerType', e.target.value)}
                >
                  <option value="auto">Auto</option>
                  <option value="button">Button</option>
                </select>
                {item.triggerType === 'button' && (
                  <input
                    className="form-input-light"
                    placeholder="Button Label"
                    value={item.buttonLabel || ''}
                    onChange={(e) => handleChange(idx, 'buttonLabel', e.target.value)}
                  />
                )}
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={item.isBranching || false}
                    onChange={(e) => handleChange(idx, 'isBranching', e.target.checked)}
                  />
                  <span>Branching Output</span>
                </label>
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

export default AdminOutputsView;
