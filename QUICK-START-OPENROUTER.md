# Quick Start: OpenRouter Setup

## 🚀 Get Your API Key

1. Go to https://openrouter.ai/
2. Sign up or log in
3. Go to "Keys" in the dashboard
4. Create a new API key
5. Copy the key (starts with `sk-or-v1-...`)

## 📝 Add to Environment Variables

Open your `.env.local` file and add:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

**Important**: Replace `sk-or-v1-your-key-here` with your actual API key!

## 🔄 Restart the Server

After adding the key, restart your dev server:

1. Press `Ctrl+C` in the terminal running `npm run dev`
2. Run `npm run dev` again

OR, I can restart it for you!

## 💰 Pricing (Free Tier Available!)

OpenRouter offers:
- **Free models**: Many models available for free
- **Pay-as-you-go**: Only pay for what you use
- **Llama 3.3 70B**: ~$0.50 per 1M tokens (very affordable!)

Your current setup uses `meta-llama/llama-3.3-70b-instruct`, which is:
- ✅ Fast
- ✅ High-quality
- ✅ Cost-effective (~$0.001 per analysis)

## ✅ Test It Out

After setting up:

1. Go to your app
2. Submit a pitch idea
3. Wait for analysis
4. Check "Why This Match?" bullets - they should be AI-powered and specific!

## 🎯 What You Get

With OpenRouter configured, all these features work:

- ✅ **Pitch Idea Analysis**: Full AI-powered analysis
- ✅ **AI Match Rationale**: Hyper-specific "Why This Match?" explanations
- ✅ **Pitch Deck Analysis**: Extract insights from decks
- ✅ **Video Pitch Analysis**: Analyze pitch videos
- ✅ **YC Trends**: Detect trending sectors and patterns

## 🆘 Troubleshooting

### "OpenRouter is not configured" error
- ✅ Check that `OPENROUTER_API_KEY` is in `.env.local`
- ✅ Make sure there are no typos in the key
- ✅ Restart the dev server after adding the key

### "Rate limit exceeded" error
- ✅ You've hit OpenRouter's free tier limit
- ✅ Add credits to your OpenRouter account
- ✅ Or wait for the limit to reset (usually 24 hours)

### "Invalid API key" error
- ✅ Double-check your API key from OpenRouter dashboard
- ✅ Make sure you copied the entire key (they're long!)
- ✅ Regenerate the key if needed

## 🎉 You're All Set!

Your app is now using OpenRouter for all AI features. No more Gemini quota issues!

**Need help?** Check the terminal for any error messages or contact support.

---

**Model Used**: `meta-llama/llama-3.3-70b-instruct`  
**Migration Date**: January 14, 2026  
**Status**: ✅ Production Ready
