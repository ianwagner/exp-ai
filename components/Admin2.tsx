import { useState, useEffect } from 'react';
import type { Experience } from '../lib/types';
import {
  getExperiences,
  setExperience,
  deleteExperience,
} from '../lib/firebaseHelpers';

const blankExp = (): Omit<Experience, 'id'> => ({
  title: '',
  description: '',
  useCases: '',
  mechanics: '',
  output: '',
});

export default function Admin2() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [form, setForm] = useState<Omit<Experience, 'id'>>(blankExp());

  useEffect(() => {
    const load = async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;
      try {
        const list = await getExperiences();
        if (list.length) setExperiences(list);
      } catch (err) {
        console.error('Failed to load experiences', err);
      }
    };
    load();
  }, []);

  const handleChange = (field: keyof Omit<Experience, 'id'>, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const addExperience = async () => {
    if (!form.title) return;
    const newExp: Experience = { id: Date.now().toString(), ...form };
    setExperiences((prev) => [...prev, newExp]);
    setForm(blankExp());
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      await setExperience(newExp);
    }
  };

  const removeExp = async (id: string) => {
    setExperiences((prev) => prev.filter((e) => e.id !== id));
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      await deleteExperience(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Add Experience</h2>
        <input
          className="form-input-light"
          placeholder="Title"
          value={form.title}
          onChange={(e) => handleChange('title', e.target.value)}
        />
        <input
          className="form-input-light"
          placeholder="Description"
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
        />
        <input
          className="form-input-light"
          placeholder="Use Cases"
          value={form.useCases}
          onChange={(e) => handleChange('useCases', e.target.value)}
        />
        <input
          className="form-input-light"
          placeholder="Mechanics"
          value={form.mechanics}
          onChange={(e) => handleChange('mechanics', e.target.value)}
        />
        <input
          className="form-input-light"
          placeholder="Output"
          value={form.output}
          onChange={(e) => handleChange('output', e.target.value)}
        />
        <button onClick={addExperience} className="btn btn-blue">
          Save
        </button>
      </div>
      {experiences.length > 0 && (
        <div>
          <h2 className="text-xl font-bold">Experiences</h2>
          <ul className="space-y-2">
            {experiences.map((exp) => (
              <li key={exp.id} className="border p-2 rounded flex justify-between items-center">
                <span>{exp.title}</span>
                <button onClick={() => removeExp(exp.id)} className="btn btn-danger">Delete</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
