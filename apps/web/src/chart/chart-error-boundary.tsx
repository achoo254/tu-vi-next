import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ChartErrorBoundaryProps {
  /** The friendly message and retry button, in the UI language. */
  fallback(retry: () => void): ReactNode;
  children: ReactNode;
}

/** Keeps a failure while drawing one chart from blanking the page; "retry" draws it again. */
export class ChartErrorBoundary extends Component<ChartErrorBoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('chart failed to render', error instanceof Error ? error.message : typeof error, info.componentStack ?? '');
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback(() => this.setState({ failed: false })) : this.props.children;
  }
}
