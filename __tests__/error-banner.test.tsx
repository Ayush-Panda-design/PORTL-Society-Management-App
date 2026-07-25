import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorBanner } from '@/components/visitors/error-banner';

describe('ErrorBanner', () => {
  it('renders the error message', () => {
    render(<ErrorBanner message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('calls onRetry when Try again is pressed', () => {
    const onRetry = jest.fn();
    render(<ErrorBanner message="Network error" onRetry={onRetry} />);
    fireEvent.press(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides Try again when onRetry is omitted', () => {
    render(<ErrorBanner message="Offline" />);
    expect(screen.queryByText('Try again')).toBeNull();
  });
});
