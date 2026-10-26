import { DrizzleQueryError } from 'drizzle-orm/errors';
import { describe, expect, it } from 'vitest';
import { safeErrorText } from './log-error';

describe('error text for the journal', () => {
  it('drops the parameters of a failed query', () => {
    const cause = Object.assign(new Error('relation "charts" does not exist'), { code: '42P01' });
    const error = new DrizzleQueryError('insert into "charts" ("name", "year") values ($1, $2)', ['Nguyễn Văn A', 1990], cause);
    expect(error.message).toContain('Nguyễn Văn A');
    const text = safeErrorText(error);
    expect(text).toBe('query failed: Error 42P01 relation "charts" does not exist');
    expect(text).not.toContain('Nguyễn Văn A');
    expect(text).not.toContain('1990');
  });

  it('keeps name and message of other errors', () => {
    expect(safeErrorText(new TypeError('x is not a function'))).toBe('TypeError: x is not a function');
    expect(safeErrorText('weird')).toBe('string');
  });
});
