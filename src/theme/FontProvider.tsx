import { flags } from '@/constants/flags';
import { useFonts } from 'expo-font';
import React from 'react';

// Map of font families to require statements (replace with actual paths or Base64 if needed)
const fontMap = {
  Inter: require('../../assets/fonts/Inter-Regular.ttf'),
  Merriweather: require('../../assets/fonts/Merriweather-Regular.ttf'),
};

/**
 * Loads custom fonts before rendering children. If the editorial redesign flag is disabled,
 * the provider simply renders its children without waiting for fonts.
 */
export const FontProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontsLoaded] = useFonts(fontMap);

  // If redesign is disabled, skip the gate.
  if (!flags.enableEditorialRedesign) {
    return <>{children}</>;
  }

  // While fonts are loading, render nothing (or a loading indicator if desired).
  if (!fontsLoaded) {
    return null;
  }

  return <>{children}</>;
};
