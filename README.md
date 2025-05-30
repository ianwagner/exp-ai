# My TOIbox Game Generator

This is a simple Next.js application that generates game content using OpenAI ChatGPT.

## Development

1. Copy `.env.example` to `.env.local` and fill in the required keys.
2. Install dependencies with `npm install`, which uses the included `package-lock.json` to pin versions.
3. Run the development server using `npm run dev`.

This project recommends **Node.js 20**. Dependency versions are pinned in `package-lock.json`, so always install packages using the lockfile for reproducible builds.

### Required Environment Variables

The app expects the following variables in `.env.local`:

```
OPENAI_API_KEY
OPENAI_MODEL
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_SETTINGS_PASSWORD
```

`OPENAI_MODEL` is optional and defaults to `gpt-4` if not set.

`NEXT_PUBLIC_SETTINGS_PASSWORD` controls who can edit game types in the settings
dialog. Set it to any password you like.

## Features

- Select a game template and generate content based on brand tone and use case.
- Example templates are stored in `data/templates.json`.
- API route `/api/chat` securely calls OpenAI using your API key.
- Firebase support is included for optional history storage.
- Prompt templates support `{{key}}` placeholders and nested paths like `{{user.name}}`.

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

