# 🚀 Quick Start Guide - Enhanced Hustle Studio

## Immediate Actions

### 1. Start the Development Server
```bash
npm run dev
```

Configure your Gemini API key in `.env.local` (this file is gitignored) and it will be loaded automatically.

### 2. Test the New Features

#### A) Test Document Extraction
1. Open your browser and navigate to **Data Extraction**
2. Select document type (Invoice, Receipt, Bank Statement, etc.)
3. Upload a document image (PNG/JPG)
4. Watch the progress:
   - ⏳ "Uploading document..."
   - 🤖 "Extracting text with AI..."
   - ✅ "Data extracted successfully!"
5. Upload the **same file again** → Notice instant response from cache!

#### B) Check AI Configuration
1. Navigate to **Settings** page
2. Scroll to **AI Configuration** section
3. You should see:
   - 🟢 Active Provider: **Gemini**
   - Available models: gemini-1.5-pro, gemini-1.5-flash
   - Status badges and capabilities

### 3. Monitor Performance

Open browser **Developer Console** (F12) and look for:

```
[Cache] Hit: {...} // Document served from cache
[Cache] Miss: {...} // Fresh extraction performed
[RetryHelper] Attempt 1 failed, retrying... // Auto-retry in action
[Gemini] API call successful // API responses
```

## Key URLs

- **Home**: http://localhost:5173/
- **Data Extraction**: http://localhost:5173/data-extraction
- **Settings**: http://localhost:5173/settings

## Testing Cache Performance

Upload the same document twice to see caching in action:

1. **First upload**: Takes 3-5 seconds (OCR + extraction)
2. **Second upload**: < 100ms (served from cache)
3. Cache expires after **10 minutes**
4. Check console for `[Cache] Hit` messages

## Testing Retry Logic

To test automatic retry (simulated):
1. Turn off internet briefly
2. Try to extract a document
3. Turn internet back on before timeout
4. Watch retry logic recover automatically
5. Check console for `[RetryHelper]` messages

## What to Look For

### ✅ Success Indicators:
- AI Configuration shows Gemini as active provider
- Document uploads process successfully
- Cache hits appear in console for repeated uploads
- Toast notifications show detailed progress
- Extracted data displays correctly

### ⚠️ If Something's Wrong:
1. **"AI service not configured"** error
   - Check `.env.local` exists
   - Verify `VITE_GEMINI_API_KEY` is set
   
2. **Network errors**
   - Check internet connection
   - Retry logic should auto-recover
   - May show 3 retry attempts
   
3. **"No text content extracted"**
   - Ensure image is clear and readable
   - Try a different image
   - Check image file size (< 10MB recommended)

## Features to Try

### Document Extraction:
- ✅ Invoice data extraction
- ✅ Bank statement parsing
- ✅ Receipt processing
- ✅ Payslip data extraction
- ✅ Export to CSV/JSON
- ✅ Search and filter
- ✅ View extraction history

### CV Generator:
- ✅ AI-powered content enhancement
- ✅ 5 professional templates
- ✅ PDF export
- ✅ Cloud save
- ✅ Candidate management

## Performance Metrics to Monitor

| Feature | Expected Performance | Good Range |
|---------|---------------------|------------|
| Cache Hit | < 100ms | 50-150ms |
| Cache Miss (New Doc) | 3-5s | 2-7s |
| OCR Extraction | 2-4s | 1-5s |
| CV Generation | 3-5s | 2-8s |
| Retry Recovery | Auto | 3 attempts |

## Production Checklist

Before deploying:
- [ ] Test document extraction with various file types
- [ ] Verify cache working (upload same file twice)
- [ ] Check AI provider status in Settings
- [ ] Test export features (CSV/JSON)
- [ ] Verify CV generation and PDF export
- [ ] Test with slow network (retry logic)
- [ ] Check error messages are user-friendly
- [ ] Verify no API keys exposed in Network tab

## Next Steps

1. **Test thoroughly** with real documents
2. **Monitor cache hit rates** in console
3. **Check AI usage** metrics over time
4. **Adjust cache TTL** if needed (in `cache.js`)
5. **Fine-tune retry parameters** if needed (in `retryHelper.js`)

## Getting Help

If you see issues:
1. Check browser console for detailed logs
2. Look for `[DocumentExtractor]` prefixed messages
3. Check `[Cache]` and `[RetryHelper]` logs
4. Verify `.env.local` configuration

---

**Everything is ready to go! Start testing and enjoy the enhanced features! 🎉**
