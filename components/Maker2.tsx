import { useEffect, useState } from 'react';
import type { Experience } from '../lib/types';
import buildPrompt from '../utils/buildPrompt';

const STORAGE_KEY = 'maker2-experiences';

interface Card {
  id: string;
  text: string;
  loading?: boolean;
  plan?: string;
}

export default function Maker2() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [expId, setExpId] = useState('');
  const [count, setCount] = useState('1');
  const [reason, setReason] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [modalText, setModalText] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const list: Experience[] = JSON.parse(saved);
        setExperiences(list);
        if (list[0]) setExpId(list[0].id);
      } catch {}
    }
  }, []);

  const parseList = (text: string): string[] => {
    const lines = text
      .split(/\n+/)
      .map((l) => l.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
    return lines.length ? lines : [text];
  };

  const generate = async () => {
    const exp = experiences.find((e) => e.id === expId);
    if (!exp) return;
    setCards([]);
    const template = `Generate ${count} descriptions for the experience "${exp.title}" based on this reason: ${reason}.\n\nBase description: ${exp.description}\nUse cases: ${exp.useCases}\nMechanics: ${exp.mechanics}\nProvide the results as a numbered list.`;
    const prompt = buildPrompt(template, {});
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return;
    const list = parseList(data.result || '');
    setCards(list.map((t, i) => ({ id: i.toString(), text: t })));
  };

  const makeGame = async (card: Card) => {
    const exp = experiences.find((e) => e.id === expId);
    if (!exp) return;
    setCards((prev) => prev.map((c) => (c === card ? { ...c, loading: true } : c)));
    const template = `Create a detailed game plan using the following information.\nDescription: ${exp.description}\nUse Cases: ${exp.useCases}\nMechanics: ${exp.mechanics}\nThe plan should follow this instruction: ${exp.output}\nGame concept: ${card.text}`;
    const prompt = buildPrompt(template, {});
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setCards((prev) =>
        prev.map((c) => (c === card ? { ...c, loading: false, plan: data.result } : c))
      );
    } else {
      setCards((prev) => prev.map((c) => (c === card ? { ...c, loading: false } : c)));
    }
  };

  return (
    <div className="space-y-4">
      {experiences.length === 0 ? (
        <p>No experiences configured.</p>
      ) : (
        <>
          <div className="space-y-2">
            <select
              className="form-input-light"
              value={expId}
              onChange={(e) => setExpId(e.target.value)}
            >
              {experiences.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="form-input-light"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder="Number"
            />
            <textarea
              className="form-input-light"
              placeholder="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button onClick={generate} className="btn btn-blue">
              make
            </button>
          </div>
          {cards.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {cards.map((c) => (
                <div key={c.id} className="border p-4 rounded relative">
                  {c.loading && (
                    <div className="absolute top-2 right-2 h-5 w-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  )}
                  <h3 className="font-bold mb-2">{experiences.find((e) => e.id === expId)?.title}</h3>
                  <p className="mb-4">{c.text}</p>
                  <button
                    className="btn btn-primary"
                    disabled={c.loading}
                    onClick={() => (c.plan ? setModalText(c.plan) : makeGame(c))}
                  >
                    {c.plan ? 'see game plan' : 'make game'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {modalText && (
        <div className="modal-overlay" onClick={() => setModalText(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <pre className="whitespace-pre-wrap">{modalText}</pre>
            <button onClick={() => setModalText(null)} className="btn btn-neutral mt-4">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
