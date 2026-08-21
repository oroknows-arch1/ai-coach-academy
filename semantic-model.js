(() => {
  'use strict';
  const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
  const LIBRARY_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2';
  let extractorPromise = null;
  let status = { state: 'idle', modelId: MODEL_ID, runtime: 'Transformers.js 3.7.2 / WASM', error: null };

  async function load() {
    if (!extractorPromise) {
      status = { ...status, state: 'loading', error: null };
      extractorPromise = import(LIBRARY_URL)
        .then(({ pipeline, env }) => {
          env.allowLocalModels = false;
          return pipeline('feature-extraction', MODEL_ID, { dtype: 'q8', device: 'wasm' });
        })
        .then(extractor => { status = { ...status, state: 'ready' }; return extractor; })
        .catch(error => {
          extractorPromise = null;
          status = { ...status, state: 'failed', error: String(error?.message || error) };
          throw error;
        });
    }
    return extractorPromise;
  }

  async function embed(texts) {
    const extractor = await load();
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    return output.tolist();
  }

  window.ACADEMY_SEMANTIC_MODEL = { embed, load, getStatus: () => ({ ...status }), MODEL_ID, LIBRARY_URL };
})();
