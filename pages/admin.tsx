import AdminPanel from '../components/AdminPanel';

export default function AdminPage() {
  return (
    <div className="min-h-screen flex items-center justify-center md:p-5">
      <main className="panel">
        <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
        <AdminPanel />
      </main>
    </div>
  );
}
