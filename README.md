# My TOIbox Game Generator

This is a simple Next.js application that generates game content using OpenAI ChatGPT.

## Development

1. Copy `.env.example` to `.env.local` and fill in the required keys.
2. Install dependencies with `npm install`.
3. Run the development server using `npm run dev`.

## Features

- Select a game template and generate content based on brand tone and use case.
- Example templates are stored in `data/templates.json`.
- API route `/api/generate` securely calls OpenAI using your API key.
- Firebase support is included for optional history storage.

## Deployment

Deploy this project on Vercel using the **Next.js** preset. When Vercel detects a
Next.js app it automatically handles the build output, so no `public` directory
is produced. A `vercel.json` file is unnecessary unless you need custom routing
or overrides, because the default Next.js configuration is applied
automatically. If you previously added a `vercel.json` with a custom
`outputDirectory`, remove those overrides or replace the file with:

```json
{
  "framework": "nextjs"
}
```

