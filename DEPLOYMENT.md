# Deployment Guide

This project can be deployed to Vercel to enable AI generation on the production site.

## Prerequisites

- A Vercel account (free at https://vercel.com)
- Your Google Gemini API key

## Deployment Steps

### 1. Install Vercel CLI (if not already installed)

```bash
npm install -g vercel
```

### 2. Deploy to Vercel

```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? Select your account
- Link to existing project? **No**
- Project name? Press Enter for default or enter a custom name
- Directory? Press Enter (current directory)
- Override settings? **No**

### 3. Configure Environment Variable

Add your Gemini API key as an environment variable:

```bash
vercel env add GEMINI_API_KEY
```

When prompted:
- Enter the value: Your Gemini API key (get it from https://aistudio.google.com/apikey)
- Environments: Select **Production**, **Preview**, and **Development**

### 4. Redeploy with Environment Variable

```bash
vercel --prod
```

### 5. Test Your Deployment

Visit your Vercel URL (displayed after deployment completes) and test the AI generation feature.

## How It Works

- **Frontend**: The React app checks if it's running in production without an API key
- **Backend**: If so, it calls the `/api/generate` serverless function on Vercel
- **Serverless Function**: The function uses the `GEMINI_API_KEY` from environment variables to generate content
- **CORS**: The API is configured to accept requests from any origin

## Local Development

For local development, continue using `.env.local`:

```bash
npm run dev
```

The app will use the local Gemini service directly when the API key is available in the environment.

## GitHub Pages

The existing GitHub Pages deployment at `https://j1767309.github.io/pnpizza_Social/` will continue to work, but will need to call your Vercel API endpoint. The app automatically detects when it's in production without an API key and uses the API service instead.

## Troubleshooting

- **API Key Error**: Make sure the environment variable is set in Vercel dashboard
- **CORS Issues**: The API allows all origins by default; check browser console for details
- **Timeout**: The function has a 60-second timeout configured in `vercel.json`
- **Image Generation Fails**: Ensure you're using a valid Gemini API key with Imagen enabled
