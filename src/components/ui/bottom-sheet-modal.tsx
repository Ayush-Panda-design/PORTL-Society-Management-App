import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomSheetModal as GorhomBottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { useThemePalette } from '@/hooks/use-theme';
import { getTokens } from '@/theme/tokens';

interface Props {
  children: React.ReactNode;
  snapPoints?: string[];
  title?: string;
}

export const BottomSheetModal = forwardRef<GorhomBottomSheetModal, Props>(
  ({ children, snapPoints: providedSnapPoints }, ref) => {
    const snapPoints = useMemo(() => providedSnapPoints || ['50%', '90%'], [providedSnapPoints]);
    const { scheme, card, border } = useThemePalette();
    const tokens = getTokens(scheme);

    const renderBackdrop = (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
    );

    return (
      <GorhomBottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: card,
          ...tokens.elevation.level2,
        }}
        handleIndicatorStyle={{
          backgroundColor: border,
        }}
      >
        <BottomSheetView style={styles.contentContainer}>{children}</BottomSheetView>
      </GorhomBottomSheetModal>
    );
  },
);

BottomSheetModal.displayName = 'BottomSheetModal';

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 24,
  },
});
