import React from 'react';
import { View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { scale } from '../../utils/responsive';

interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'large', color = '#6366f1', style }) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
});

export default Spinner;
