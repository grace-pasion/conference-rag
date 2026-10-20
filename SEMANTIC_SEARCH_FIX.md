# Semantic Search Timeout Fix

Semantic searches were timing out because PostgreSQL had no vector index for cosine-distance queries. A cosine HNSW index was added to the Supabase database:

```sql
CREATE INDEX sentence_embeddings_embedding_hnsw_idx
ON public.sentence_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 4, ef_construction = 8);
```

The smaller HNSW settings allowed the index to build within the project's database limits; they may reduce retrieval accuracy compared with the defaults. The change was made directly in Supabase and is **not** included in the schema-creation script.

Verification confirmed the index is valid, PostgreSQL uses it for the nearest-neighbor query, and `match_sentences` returned results. The measured query plan completed in about 2.3 ms.
