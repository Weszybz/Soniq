import React, { createContext, useContext, useRef, useState } from 'react';
import ThemedBottomSheet from '../components/ThemedBottomSheet';

const BottomSheetRefContext = createContext(null);

export const BottomSheetProvider = ({ children }) => {
  const bottomSheetRef = useRef(null);
  const [content, setContent] = useState(null);

  return (
    <BottomSheetRefContext.Provider value={{ bottomSheetRef, setContent,
      expand: () => bottomSheetRef.current?.snapToIndex(0),
      expandLarge: () => bottomSheetRef.current?.snapToIndex(1),
      close: () => bottomSheetRef.current?.close(),
    }}>
      {children}
      <ThemedBottomSheet ref={bottomSheetRef}>
        {content}
      </ThemedBottomSheet>
    </BottomSheetRefContext.Provider>
  );
};

export const useBottomSheet = () => {
  const context = useContext(BottomSheetRefContext);
  if (!context) {
    throw new Error('useBottomSheet must be used within BottomSheetProvider');
  }
  return context;
};