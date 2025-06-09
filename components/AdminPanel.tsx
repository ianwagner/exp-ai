import React, { useState } from 'react';
import AdminMakerTypesView from './AdminMakerTypesView';
import AdminComponentsView from './AdminComponentsView';
import AdminInstancesView from './AdminInstancesView';

const SETTINGS_PASSWORD = process.env.NEXT_PUBLIC_SETTINGS_PASSWORD;

type Tab = 'makers' | 'components' | 'instances';

const AdminPanel = () => {
  const [tab, setTab] = useState<Tab>('makers');
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
              className={`btn ${tab === 'makers' ? 'btn-primary' : 'btn-neutral'}`}
              onClick={() => setTab('makers')}
            >
              Maker Types
            </button>
            <button
              className={`btn ${tab === 'components' ? 'btn-primary' : 'btn-neutral'}`}
              onClick={() => setTab('components')}
            >
              Components
            </button>
            <button
              className={`btn ${tab === 'instances' ? 'btn-primary' : 'btn-neutral'}`}
              onClick={() => setTab('instances')}
            >
              Instances
            </button>
          </div>
          {tab === 'makers' && <AdminMakerTypesView />}
          {tab === 'components' && <AdminComponentsView />}
          {tab === 'instances' && <AdminInstancesView />}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
export { AdminMakerTypesView, AdminComponentsView, AdminInstancesView };
