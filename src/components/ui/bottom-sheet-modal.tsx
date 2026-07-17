import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomSheetModal as GorhomBottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';

interface Props {
  children: React.ReactNode;
  snapPoints?: string[];
  title?: string;
}

export const BottomSheetModal = forwardRef<GorhomBottomSheetModal, Props>(
  ({ children, snapPoints: providedSnapPoints }, ref) => {
    const snapPoints = useMemo(() => providedSnapPoints || ['50%', '90%'], [providedSnapPoints]);
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const renderBackdrop = (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
    );

    return (
      <GorhomBottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: isDark ? '#161616' : '#ffffff',
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? '#333' : '#ccc',
        }}
      >
        <BottomSheetView style={styles.contentContainer}>
          {children}
        </BottomSheetView>
      </GorhomBottomSheetModal>
    );
  }
);

BottomSheetModal.displayName = 'BottomSheetModal';

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 24,
  },
});
