import { useState } from 'react';
import templates from '../data/templates.json';

export default function Home() {
  const [templateName, setTemplateName] = useState(templates[0]?.name || '');
  const [brandTone, setBrandTone] = useState('');
  const [useCase, setUseCase] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ templateName, brandTone, useCase }),
    });
    const data = await res.json();
    if (data.result) setResult(data.result);
    setLoading(false);
  };

  return (
    <main className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Toy Box Game Generator</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Game Template</label>
          <select
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="border p-2 w-full"
          >
            {templates.map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">Brand Tone of Voice</label>
          <input
            type="text"
            value={brandTone}
            onChange={(e) => setBrandTone(e.target.value)}
            className="border p-2 w-full"
          />
        </div>
        <div>
          <label className="block mb-1">Describe Your Use Case</label>
          <textarea
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            className="border p-2 w-full"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2"
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Game'}
        </button>
      </form>
      {result && (
        <div className="mt-6 p-4 border rounded">
          <h2 className="font-bold mb-2">Result</h2>
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </main>
  );
}
