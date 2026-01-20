# Google Gemini API Integration

## Overview

Hustle Studio now supports **Google Gemini Pro** as the primary AI provider for all AI-powered features. This integration provides cost-effective, high-performance AI capabilities with advanced multimodal support.

---

## Why Gemini?

### **Production-Ready Benefits**

✅ **Cost-Effective**: Gemini 1.5 Flash is significantly cheaper than GPT-4o-mini  
✅ **High Performance**: Fast response times suitable for production workloads  
✅ **Large Context**: Up to 2M tokens context window (Gemini 1.5 Pro)  
✅ **Multimodal**: Native support for text, images, and vision tasks  
✅ **Reliability**: Google's infrastructure with 99.9% uptime  
✅ **No Rate Limits**: More generous rate limits for production use  

### **Feature Comparison**

| Feature | Gemini 1.5 Flash | Gemini 1.5 Pro | GPT-4o-mini | GPT-4o |
|---------|------------------|----------------|-------------|--------|
| Cost per 1M tokens | $0.075 | $1.25 | $0.15 | $2.50 |
| Context window | 1M tokens | 2M tokens | 128K | 128K |
| Vision support | ✅ Native | ✅ Native | ✅ API | ✅ API |
| Response speed | ⚡ Fast | 🚀 Very Fast | 🐢 Moderate | 🐢 Slow |
| JSON mode | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

---

## Setup Guide

### 1. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Get API Key"**
4. Create a new API key or use existing one
5. Copy your API key

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Required: Gemini API Key
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Recommended: Set Gemini as default provider
VITE_AI_PROVIDER=gemini

# Optional: Keep OpenAI as fallback
VITE_OPENAI_API_KEY=your_openai_key_here
```

### 3. Verify Installation

The system will automatically:
- Detect the Gemini API key
- Route all AI requests through Gemini
- Fall back to OpenAI if Gemini is unavailable
- Log provider information in console

---

## Architecture

### Unified AI Client

All AI features use a **unified client** (`src/lib/aiClient.js`) that automatically routes requests:

```javascript
import { callAI } from './lib/aiClient';

// Automatically uses Gemini if configured
const response = await callAI(prompt, 'gemini-1.5-flash', {
  temperature: 0.7,
  tenantId,
  userId,
  assistant: 'strategy'
});
```

### Provider Selection Logic

```
1. Check VITE_AI_PROVIDER environment variable
2. If set to 'gemini' and VITE_GEMINI_API_KEY exists → Use Gemini
3. If set to 'openai' and VITE_OPENAI_API_KEY exists → Use OpenAI
4. If not set but VITE_GEMINI_API_KEY exists → Use Gemini (default)
5. Fall back to OpenAI
```

### Model Mapping

OpenAI models are automatically mapped to equivalent Gemini models:

| OpenAI Model | Gemini Equivalent |
|--------------|------------------|
| `gpt-4o` | `gemini-1.5-pro` |
| `gpt-4o-mini` | `gemini-1.5-flash` |
| `gpt-4` | `gemini-1.5-pro` |
| `gpt-3.5-turbo` | `gemini-1.5-flash` |

---

## Features Using Gemini

All AI-powered features now support Gemini:

### 1. **Document Data Extraction**
- Extract text from images (OCR)
- Parse invoices, bank statements, receipts
- Structure data from scanned documents
- **Model**: `gemini-1.5-flash`
- **Benefit**: Native vision support, no extra API calls

### 2. **Professional CV Generator**
- Generate compelling CV content
- Create ATS-friendly descriptions
- Highlight achievements professionally
- **Model**: `gemini-1.5-flash`
- **Benefit**: Cost-effective, fast generation

### 3. **AI Assistants**
- Strategy Coach
- Finance Analyst
- Inventory Manager
- Growth Coach
- General Assistant
- **Models**: `gemini-1.5-flash` (default), `gemini-1.5-pro` (strategy)
- **Benefit**: Lower costs for high-volume usage

### 4. **Marketing AI**
- Campaign suggestions
- Content generation
- Analytics insights
- **Model**: `gemini-1.5-flash`
- **Benefit**: Fast response times

### 5. **Analytics & Insights**
- Business metrics analysis
- Trend detection
- Forecasting
- **Model**: `gemini-1.5-flash`
- **Benefit**: Large context for historical data

---

## API Reference

### Gemini Client Functions

```javascript
import {
  callGemini,
  sendGeminiCompletion,
  isGeminiAvailable,
  getPreferredProvider,
  GEMINI_MODELS
} from './lib/geminiClient';
```

#### `callGemini(prompt, model, options)`

Simple prompt-based call to Gemini.

```javascript
const response = await callGemini(
  'Analyze this sales data...',
  'gemini-1.5-flash',
  {
    temperature: 0.7,
    tenantId: 'tenant-id',
    userId: 'user-id',
    assistant: 'strategy'
  }
);
```

#### `sendGeminiCompletion(options)`

Full chat completion with message history.

```javascript
const response = await sendGeminiCompletion({
  messages: [
    { role: 'system', content: 'You are a business analyst' },
    { role: 'user', content: 'Analyze this data' }
  ],
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  tenantId: 'tenant-id',
  userId: 'user-id'
});
```

#### `isGeminiAvailable()`

Check if Gemini is configured.

```javascript
if (isGeminiAvailable()) {
  console.log('Gemini is ready');
}
```

#### `getPreferredProvider()`

Get active AI provider.

```javascript
const provider = getPreferredProvider(); // 'gemini' or 'openai'
```

### Unified AI Client Functions

```javascript
import {
  callAI,
  sendAICompletion,
  getActiveProvider,
  getAvailableModels
} from './lib/aiClient';
```

#### `callAI(prompt, model, options)`

Automatically routes to best available provider.

```javascript
const response = await callAI(
  'Generate a summary...',
  'gemini-1.5-flash', // or 'gpt-4o-mini'
  {
    temperature: 0.7,
    tenantId,
    userId
  }
);
```

#### `getAvailableModels()`

Get models for active provider.

```javascript
const models = getAvailableModels();
// { fast: 'gemini-1.5-flash', powerful: 'gemini-1.5-pro', default: 'gemini-1.5-flash' }
```

---

## Vision & Multimodal Support

Gemini natively supports vision tasks without separate API calls.

### Example: Image Text Extraction

```javascript
import { callAI } from './lib/aiClient';

const response = await callAI(
  'Extract all text from this image',
  'gemini-1.5-flash',
  {
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract text from this document' },
          { 
            type: 'image_url', 
            image_url: { 
              url: 'data:image/jpeg;base64,...' 
            } 
          }
        ]
      }
    ]
  }
);
```

The unified client automatically converts this to Gemini's inline_data format.

---

## Cost Optimization

### Token Usage Tracking

All Gemini requests are logged with token usage:

```javascript
// Automatic logging to Firestore
{
  tenantId: 'tenant-id',
  userId: 'user-id',
  model: 'gemini-1.5-flash',
  tokens: 1234,
  provider: 'gemini',
  assistant: 'document-extractor',
  timestamp: '2026-01-20T...'
}
```

### Cost Comparison Example

**Document Extraction (1000 documents/month)**

| Provider | Model | Tokens per doc | Monthly Tokens | Monthly Cost |
|----------|-------|----------------|----------------|--------------|
| Gemini | 1.5 Flash | 2000 | 2M | **$0.15** |
| OpenAI | GPT-4o-mini | 2000 | 2M | $0.30 |
| OpenAI | GPT-4o | 2000 | 2M | $5.00 |

**Savings with Gemini**: 50% compared to GPT-4o-mini, 97% compared to GPT-4o

---

## Error Handling

The unified client automatically handles errors and falls back when needed:

```javascript
try {
  const response = await callAI(prompt, 'gemini-1.5-flash', options);
} catch (error) {
  if (error.message.includes('Gemini API')) {
    // Gemini failed, system auto-falls back to OpenAI
    console.log('Using OpenAI fallback');
  }
}
```

---

## Performance Monitoring

### Response Time Tracking

```javascript
const startTime = Date.now();
const response = await callAI(prompt, model, options);
const duration = Date.now() - startTime;

console.log(`AI response time: ${duration}ms`);
// Gemini 1.5 Flash: ~500-1500ms
// GPT-4o-mini: ~1000-3000ms
```

### Quality Evaluation

Both providers use the same quality evaluation system:

```javascript
// Automatic quality scoring
{
  relevance: 0.95,
  completeness: 0.92,
  accuracy: 0.98,
  provider: 'gemini',
  model: 'gemini-1.5-flash'
}
```

---

## Migration Guide

### From OpenAI to Gemini

**Before:**
```javascript
import { callOpenAI } from './lib/openaiClient';

const response = await callOpenAI(prompt, 'gpt-4o-mini', options);
```

**After:**
```javascript
import { callAI } from './lib/aiClient';

const response = await callAI(prompt, 'gemini-1.5-flash', options);
// Or keep using 'gpt-4o-mini' - it auto-maps to Gemini!
```

### Response Format

Both providers return compatible formats:

```javascript
{
  choices: [
    {
      message: {
        role: 'assistant',
        content: 'Response text...'
      }
    }
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 200,
    total_tokens: 300
  }
}
```

---

## Troubleshooting

### Common Issues

**Issue**: "Gemini API key is not configured"
```bash
# Solution: Add to .env
VITE_GEMINI_API_KEY=your_key_here
```

**Issue**: Requests still using OpenAI
```bash
# Solution: Set provider explicitly
VITE_AI_PROVIDER=gemini
```

**Issue**: Rate limit errors
```bash
# Solution: Gemini has higher limits, but if hit:
# 1. Add retry logic (already included)
# 2. Use exponential backoff
# 3. Contact Google for limit increase
```

**Issue**: Response format errors
```bash
# Solution: The unified client handles conversion
# No changes needed to your code
```

---

## Best Practices

### 1. **Model Selection**

- Use **`gemini-1.5-flash`** for:
  - Document extraction
  - CV generation
  - Quick responses
  - High-volume tasks

- Use **`gemini-1.5-pro`** for:
  - Complex strategy analysis
  - Long-context tasks (>100K tokens)
  - Critical business decisions

### 2. **Temperature Settings**

```javascript
// Structured data extraction
temperature: 0.1  // Low - deterministic

// Creative content
temperature: 0.7  // Medium - balanced

// Brainstorming
temperature: 0.9  // High - creative
```

### 3. **System Prompts**

```javascript
// Be specific about output format
systemPrompt: 'Return only valid JSON without markdown'

// Guide the tone
systemPrompt: 'You are a professional business analyst'

// Set constraints
systemPrompt: 'Provide concise responses under 500 words'
```

### 4. **Error Recovery**

```javascript
const maxRetries = 3;
let attempt = 0;

while (attempt < maxRetries) {
  try {
    return await callAI(prompt, model, options);
  } catch (error) {
    attempt++;
    if (attempt === maxRetries) throw error;
    await new Promise(r => setTimeout(r, 1000 * attempt));
  }
}
```

---

## Advanced Features

### Custom System Instructions

```javascript
const response = await callGemini(prompt, 'gemini-1.5-pro', {
  systemPrompt: `You are a CFO analyst specializing in SaaS metrics.
  
  Guidelines:
  - Use financial terminology
  - Provide actionable insights
  - Include confidence scores
  - Cite relevant metrics`,
  temperature: 0.3
});
```

### Streaming Responses

```javascript
// Future feature - coming soon
const stream = await callGeminiStream(prompt, model, options);

for await (const chunk of stream) {
  console.log(chunk.text);
}
```

---

## Security Considerations

### API Key Protection

```javascript
// ✅ Good: Server-side only
// server/api/ai.js
const apiKey = process.env.VITE_GEMINI_API_KEY;

// ❌ Bad: Never expose in client code
// Don't commit .env files
```

### Data Privacy

- All requests are logged with tenant isolation
- Personal data is never stored in audit logs
- Sensitive fields are automatically redacted
- GDPR compliant data handling

---

## Support & Resources

### Official Documentation
- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Pricing Calculator](https://ai.google.dev/pricing)

### Internal Resources
- [Unified AI Client](src/lib/aiClient.js)
- [Gemini Client](src/lib/geminiClient.js)
- [OpenAI Client](src/lib/openaiClient.js)

### Getting Help
1. Check error messages in browser console
2. Verify API key is correct
3. Check [status.google.com](https://status.google.com)
4. Contact support team

---

## Changelog

### Version 4.2 (January 2026)
- ✨ Added Gemini API integration
- ✨ Created unified AI client
- ✨ Automatic provider fallback
- ✨ Model mapping for compatibility
- ✨ Native vision support
- 🔧 Updated all AI features to use Gemini
- 📚 Comprehensive documentation

---

Last Updated: January 20, 2026  
Version: 4.2  
Provider: Google Gemini 1.5
