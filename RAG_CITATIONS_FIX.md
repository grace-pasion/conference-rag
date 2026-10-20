# RAG Answer and Citation Fix

The app ranked talks by the average similarity of all their matching sentences. This could demote a talk with the strongest relevant sentence; for the prayer query, that was **“Prayers of Faith.”** The answer model then received less relevant talks and reasonably said the context did not answer the question. Source URLs were also missing from the search function's return data.

The fix ranks talks by their strongest sentence match, loads source URLs with the full talk text, and removes duplicate “By” prefixes from speaker labels. The `generate-answer` prompt now requires inline `[Talk Title — Speaker]` citations and was deployed to Supabase.

Verification confirmed the prayer query's top sentence came from “Prayers of Faith”; the deployed function returned the expected CORS preflight and rejected unauthenticated requests. The `app.js` updates are local and must be pushed to GitHub Pages for the live site to use the improved ranking and source links.

## Deployment Follow-Up

The live GitHub Pages `app.js` still uses the old average-similarity ranking. Redeploying the Supabase function updates only the backend; it does not publish the static frontend fix. From the repository root, publish the local frontend and this note with:

```powershell
git add app.js RAG_CITATIONS_FIX.md
git commit -m "Improve RAG retrieval ranking"
git push origin main
```

After GitHub Pages finishes deploying, hard-refresh the site. The local ranking fix selects talks by their strongest matching sentence, which keeps the top prayer match in the RAG context.
