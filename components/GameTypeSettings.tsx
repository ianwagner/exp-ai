import { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const SETTINGS_PASSWORD = process.env.NEXT_PUBLIC_SETTINGS_PASSWORD;

interface GameType {
  name: string;
  description: string;
  useCases: string;
  mechanics: string;
  isNew?: boolean;
}

const GameTypeSettings = () => {
  const [open, setOpen] = useState(false);
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchTypes = async () => {
      const snapshot = await getDocs(collection(db, 'gameTypes'));
      const items: GameType[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Partial<GameType>;
        items.push({
          name: docSnap.id,
          description: data.description || '',
          useCases: data.useCases || '',
          mechanics: data.mechanics || '',
        });
      });
      setGameTypes(items);
    };
    fetchTypes();
  }, [open]);

  const requestEdit = () => {
    const pwd = window.prompt('Enter password');
    if (pwd === SETTINGS_PASSWORD) {
      setEditMode(true);
    } else if (pwd !== null) {
      alert('Incorrect password');
    }
  };

  const handleChange = (index: number, field: keyof GameType, value: string) => {
    setGameTypes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const saveGameType = async (gt: GameType) => {
    if (!gt.name) {
      alert('Name is required');
      return;
    }
    await setDoc(doc(db, 'gameTypes', gt.name), {
      description: gt.description,
      useCases: gt.useCases,
      mechanics: gt.mechanics,
    });
  };

  const deleteGameType = async (index: number) => {
    const gt = gameTypes[index];
    if (gt.name) {
      await deleteDoc(doc(db, 'gameTypes', gt.name));
    }
    setGameTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const addGameType = () => {
    setGameTypes((prev) => [
      ...prev,
      { name: '', description: '', useCases: '', mechanics: '', isNew: true },
    ]);
    setEditMode(true);
  };

  return (
    <div>
      <button onClick={() => setOpen(true)} className="btn btn-neutral">Settings</button>
      {open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Game Types</h2>
              <button onClick={() => setOpen(false)} className="text-sm">Close</button>
            </div>
            <ul className="space-y-4">
              {gameTypes.map((gt, idx) => (
                <li key={idx} className="border p-2 rounded">
                  {editMode ? (
                    <div className="space-y-2">
                      <input
                        className="form-input-light"
                        placeholder="Name"
                        value={gt.name}
                        disabled={!gt.isNew}
                        onChange={(e) => handleChange(idx, 'name', e.target.value)}
                      />
                      <input
                        className="form-input-light"
                        placeholder="Description"
                        value={gt.description}
                        onChange={(e) => handleChange(idx, 'description', e.target.value)}
                      />
                      <input
                        className="form-input-light"
                        placeholder="Use Cases"
                        value={gt.useCases}
                        onChange={(e) => handleChange(idx, 'useCases', e.target.value)}
                      />
                      <input
                        className="form-input-light"
                        placeholder="Mechanics"
                        value={gt.mechanics}
                        onChange={(e) => handleChange(idx, 'mechanics', e.target.value)}
                      />
                      <div className="flex space-x-2">
                        <button onClick={() => saveGameType(gt)} className="btn btn-success">Save</button>
                        <button onClick={() => deleteGameType(idx)} className="btn btn-danger">Delete</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-bold capitalize">{gt.name}</h3>
                      <p>{gt.description}</p>
                      <p>{gt.useCases}</p>
                      <p>{gt.mechanics}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {editMode && (
              <button onClick={addGameType} className="btn btn-blue mt-4">Add Game Type</button>
            )}
            {!editMode && (
              <button onClick={requestEdit} className="btn btn-neutral mt-4">Edit</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameTypeSettings;
