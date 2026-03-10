module.exports = {
  provider: process.env.AI_PROVIDER || 'openai', // 'openai' | 'groq' | 'rule-based'
  openai: {
    apiKey:    process.env.OPENAI_API_KEY,
    model:     'gpt-3.5-turbo',  // Cost-optimized
    maxTokens: 500
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model:  'llama3-8b-8192'     // Free-tier option
  }
};