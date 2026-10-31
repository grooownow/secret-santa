// A deterministic, dependency-free lexical ranker for skill descriptions.
//
// This is a routing smoke test, not semantics. It catches exactly two real
// failure modes: a description that lacks the vocabulary users actually say
// (the skill never ranks), and a description that has drifted into a
// neighbor's vocabulary (two skills compete). Anything requiring meaning is
// the behavioral tier's job.

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "when",
  "use",
  "from",
  "into",
  "its",
  "are",
  "was",
  "not",
  "but",
  "you",
  "your",
  "our",
  "their",
  "them",
  "has",
  "have",
  "had",
  "been",
  "will",
  "would",
  "should",
  "can",
  "could",
  "all",
  "any",
  "each",
  "per",
  "via",
  "also",
  "than",
  "then",
  "only",
  "just",
  "plus",
  "what",
  "which",
  "how",
  "why",
  "does",
  "did",
  "get",
  "got",
]);

const MIN_TOKEN_LENGTH = 3;

export function stem(token: string): string {
  if (token.length > 4 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("ly")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= MIN_TOKEN_LENGTH && !STOP.has(t))
    .map(stem);
}

export interface Corpus {
  idf: Map<string, number>;
  vectors: Map<string, Map<string, number>>;
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
  return tf;
}

function weight(
  tf: Map<string, number>,
  idf: Map<string, number>,
): Map<string, number> {
  const vector = new Map<string, number>();
  for (const [term, count] of tf) {
    const w = idf.get(term);
    // A term absent from the corpus carries no discriminating power here.
    if (w !== undefined) vector.set(term, count * w);
  }
  return vector;
}

export function buildCorpus(docs: { name: string; text: string }[]): Corpus {
  const frequencies = new Map<string, Map<string, number>>();
  const documentFrequency = new Map<string, number>();

  for (const doc of docs) {
    const tf = termFrequency(tokenize(doc.text));
    frequencies.set(doc.name, tf);
    for (const term of tf.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const total = docs.length;
  const idf = new Map<string, number>();
  for (const [term, df] of documentFrequency) {
    idf.set(term, Math.log((total + 1) / (df + 1)) + 1);
  }

  const vectors = new Map<string, Map<string, number>>();
  for (const [name, tf] of frequencies) vectors.set(name, weight(tf, idf));

  return { idf, vectors };
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, wa] of a) {
    normA += wa * wa;
    const wb = b.get(term);
    if (wb !== undefined) dot += wa * wb;
  }
  for (const wb of b.values()) normB += wb * wb;

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function descriptionVector(
  name: string,
  corpus: Corpus,
): Map<string, number> | undefined {
  return corpus.vectors.get(name);
}

export function rankSkills(prompt: string, corpus: Corpus): string[] {
  const query = weight(termFrequency(tokenize(prompt)), corpus.idf);
  return [...corpus.vectors.entries()]
    .map(([name, vector]) => ({ name, score: cosine(query, vector) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((entry) => entry.name);
}
