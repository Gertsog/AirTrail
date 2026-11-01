import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { PlumeIcon, RefreshIcon } from './icons';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Страховка от падения MapLibre/рендера: показывает экран восстановления. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Ошибка интерфейса', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="boot boot--error">
          <div className="boot__logo boot__logo--error">
            <PlumeIcon size={34} />
          </div>
          <h1>Что-то пошло не так</h1>
          <p>{this.state.error.message}</p>
          <button type="button" className="boot__retry" onClick={() => window.location.reload()}>
            <RefreshIcon size={17} />
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
