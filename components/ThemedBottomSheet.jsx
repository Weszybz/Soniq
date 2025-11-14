import { StyleSheet, useColorScheme, View, Text } from 'react-native';
import { Colors } from '../constants/Colors';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useMemo, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';

const ThemedBottomSheet = forwardRef((props, ref) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const snapPoints = useMemo(() => ['25%', '40%', '70%'], []);

  const bottomSheetRef = useRef(null);

  useImperativeHandle(ref, () => ({
    expand: () => bottomSheetRef.current?.snapToIndex(2),
    close: () => bottomSheetRef.current?.close(),
  }));

  // backdrop
  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={1}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: theme.navBackground }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.contentContainer}>
        <Text style={{ color: theme.textPrimary }}>
          This is the bottom sheet
        </Text>
      </BottomSheetView>
    </BottomSheet>
  );
});

export default ThemedBottomSheet;

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});