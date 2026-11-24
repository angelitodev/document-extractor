const CONFIG: Record<string, Record<string, string | undefined>> = {
  ai: {
    API_KEY: process.env.OPEN_AI ?? process.env.OPENAI_API_KEY,
    MODEL: process.env.MODEL,
  },
};

function config(topic: string, key: string) {
  try {
    return CONFIG[topic]?.[key] ?? null;
  } catch {
    return null;
  }
}

export default config;
