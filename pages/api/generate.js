import templates from '../../data/templates.json';
import buildPrompt from '../../utils/buildPrompt';
import { initFirebase, getDb } from '../../lib/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { templateName, brandTone, useCase } = req.body;
  let template = templates.find(t => t.name === templateName);

  if (!template) {
    // try to fetch from Firestore if available
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      };
      initFirebase(config);
      const db = getDb();
      try {
        const docSnap = await getDoc(doc(db, 'gameTypes', templateName));
        if (docSnap.exists()) {
          template = { name: templateName, ...docSnap.data() };
        }
      } catch (err) {
        console.error('Error fetching template from Firestore', err);
      }
    }

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
  }

  // Build a prompt string using the generic template replacer
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

  if (!process.env.OPENAI_API_KEY) {
    return res
      .status(500)
      .json({ error: 'OPENAI_API_KEY environment variable is not set' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ error: text });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // store history if firebase config is provided
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      };
      initFirebase(config);
      const db = getDb();
      await addDoc(collection(db, 'history'), {
        template: templateName,
        brandTone,
        useCase,
        result: content,
        createdAt: Date.now(),
      });
    }

    res.status(200).json({ result: content });
  } catch (err) {
    res.status(500).json({ error: 'Request failed' });
  }
}
