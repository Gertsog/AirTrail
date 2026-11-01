import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Broken(): never {
  throw new Error('Тестовое падение');
}

describe('ErrorBoundary', () => {
  it('renders a recovery screen instead of a white page', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'Что-то пошло не так' })).toBeInTheDocument();
    expect(screen.getByText('Тестовое падение')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Перезагрузить/ })).toBeInTheDocument();
    errorSpy.mockRestore();
  });
});
