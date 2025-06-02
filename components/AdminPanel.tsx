import React, { useState } from 'react';
import AdminStepsView from './AdminStepsView';
import AdminComponentsView from './AdminComponentsView';
import AdminOutputsView from './AdminOutputsView';

const SETTINGS_PASSWORD = process.env.NEXT_PUBLIC_SETTINGS_PASSWORD;

type Tab = 'steps' | 'components' | 'outputs';

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
