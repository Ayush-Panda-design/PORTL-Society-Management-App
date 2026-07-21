import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';
import { logger } from '@/lib/logger';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('Unhandled render error', error, { componentStack: info.componentStack });
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View className="flex-1 items-center justify-center bg-surface px-8">
          <Text className="mb-2 text-center text-xl font-semibold text-foreground">Something went wrong</Text>
          <Text className="mb-8 text-center text-base opacity-70 text-foreground">
            Portl hit an unexpected error. You can try again — if it keeps happening, contact your society admin.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={this.handleRetry}
            className="rounded-xl px-6 py-3"
            style={{ backgroundColor: Brand.primary }}>
            <Text className="text-base font-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
