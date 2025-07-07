import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import templates from '../data/templates.json';
import GameTypeSettings from '../components/GameTypeSettings';
import { db } from '../lib/firebase';
import buildPrompt from '../utils/buildPrompt';

export default function Home() {
  const [gameTypes, setGameTypes] = useState(templates);
  const [templateName, setTemplateName] = useState(templates[0]?.name || '');
  const [brandTone, setBrandTone] = useState('');
  const [useCase, setUseCase] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGameTypes = async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;
      try {
        const snapshot = await getDocs(collection(db, 'gameTypes'));
        const items = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({ name: docSnap.id, ...data });
        });
        if (items.length) {
          setGameTypes(items);
          setTemplateName(items[0].name);
        }
      } catch (err) {
        console.error('Failed to fetch game types', err);
      }
    };
    fetchGameTypes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    setError('');
    try {
      const template = gameTypes.find((t) => t.name === templateName) || {};

      const context = {
        brandTone: brandTone || '',
        useCase: useCase || '',
        formatInstruction: template.formatInstruction || '',
        useCases: template.useCases || '',
        mechanics: template.mechanics || '',
        description: template.description || '',
      };

      const templateString = [
        '{{description}}',
        brandTone ? 'Tone: {{brandTone}}.' : '',
        useCase ? 'Use case: {{useCase}}.' : '',
        '',
        template.formatInstruction
          ? 'Instructions: {{formatInstruction}}'
          : [
              template.useCases ? 'Use Cases: {{useCases}}' : '',
              template.mechanics ? 'Game Mechanics: {{mechanics}}' : '',
            ]
              .filter(Boolean)
              .join('\n'),
      ]
        .filter(Boolean)
        .join('\n')
        .trim();

      const prompt = buildPrompt(templateString, context);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to generate');
      }
      if (data?.result) setResult(data.result);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center md:p-5">
      <main className="panel">
      <h1 className="text-2xl font-bold mb-4">My TOIbox Game Generator</h1>
      <GameTypeSettings />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Game Template</label>
          <select
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="form-control"
          >
            {gameTypes.map((t) => (
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
            className="form-control"
          />
        </div>
        <div>
          <label className="block mb-1">Describe Your Use Case</label>
          <textarea
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            className="form-control"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary block mx-auto"
          disabled={loading}
        >
          {loading ? 'Generating...' : 'GENERATE'}
        </button>
      </form>
      {error && (
        <div className="mt-4 text-red-500">{error}</div>
      )}
      {result && (
        <div className="mt-6 p-4 border rounded">
          <h2 className="font-bold mb-2">Result</h2>
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}
      </main>
    </div>
  );
}
