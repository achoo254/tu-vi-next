/**
 * The "Quẻ hôm nay" deck (content/que/que.json at the repository root, see its SOURCES.md): 64 written quẻ, one line
 * per major star of Mệnh and one for a Mệnh without one. About 9 kB gzip, its own chunk (loaded by `loadQueDeck`).
 */
import * as z from 'zod/mini';
import queFile from '../../../../content/que/que.json';

const text = z.string().check(z.minLength(1));

const QueSchema = z.strictObject({ title: text, verse: z.tuple([text, text]), meaning: text, advice: text });
const QueDeckSchema = z.strictObject({
  que: z.array(QueSchema).check(z.minLength(2)),
  stars: z.record(z.string(), text),
  noMajorStar: text,
});

export type Que = z.infer<typeof QueSchema>;
export type QueDeck = z.infer<typeof QueDeckSchema>;

/** The deck, checked against its schema (a broken file fails loudly, never shows half a quẻ). */
export function buildQueDeck(): QueDeck {
  return QueDeckSchema.parse(queFile);
}
