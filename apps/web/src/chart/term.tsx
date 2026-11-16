import { type ReactNode, useId, useState } from 'react';

/**
 * A term of the art (a palace's Hán Việt name, a star, a brightness, the cục) that opens a one-line gloss when tapped,
 * so a reader who does not know Tử Vi is never left with a word they cannot read. The gloss follows the term in the
 * text flow (no popup to dismiss); a second tap hides it.
 */
export function Term({ children, gloss, lang }: { children: ReactNode; gloss: string; lang?: string }): ReactNode {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="term">
      <button type="button" className="term-button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)} lang={lang}>
        {children}
      </button>
      <span id={id} className="term-gloss" hidden={!open}>
        {gloss}
      </span>
    </span>
  );
}
