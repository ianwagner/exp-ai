import ExperienceMaker from '../components/ExperienceMaker';

export default function MakerPage() {
  return (
    <div className="min-h-screen flex items-center justify-center md:p-5">
      <main className="panel">
        <h1 className="text-2xl font-bold mb-4">Experience Maker</h1>
        <ExperienceMaker />
      </main>
    </div>
  );
}
