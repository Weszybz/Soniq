import { StyleSheet, useColorScheme, View, Text } from 'react-native';
import { Colors } from '../constants/Colors';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useMemo, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';

const ThemedBottomSheet = forwardRef(({ children, ...rest }, ref) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const snapPoints = useMemo(() => ['40%']);

  const bottomSheetRef = useRef(null);

  useImperativeHandle(ref, () => ({
    expand: () => bottomSheetRef.current?.snapToIndex(1),
    close: () => bottomSheetRef.current?.close(),
  }));

  // backdrop
  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        enablePanDownToClose={true}
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
      handleIndicatorStyle={{ backgroundColor: theme.textSecondary }}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      style={{
        position: 'absolute',
        // bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        elevation: 9999,
      }}
    >
      <BottomSheetView style={styles.contentContainer}>
        {children ?? <View><Text style={{color: theme.textPrimary}}>Default content</Text></View>}
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