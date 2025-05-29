import type { NextApiRequest, NextApiResponse } from 'next';
import sendPrompt from '../../utils/sendPrompt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body as { prompt?: string };
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const result = await sendPrompt(prompt);
    res.status(200).json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Request failed' });
  }
}
