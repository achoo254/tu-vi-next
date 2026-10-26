import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartErrorBoundary } from './chart-error-boundary';

afterEach(cleanup);

let fail = true;
function Board(): string {
  if (fail) throw new Error('boom');
  return 'board';
}

describe('chart error boundary', () => {
  it('shows the message instead of a blank page, and draws again on retry', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ChartErrorBoundary fallback={(retry) => <button onClick={retry}>retry</button>}>
        <Board />
      </ChartErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: 'retry' })).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'retry' }));
    expect(screen.getByText('board')).toBeTruthy();
    quiet.mockRestore();
  });
});
