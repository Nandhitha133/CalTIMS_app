import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

interface FooterProps {
  showCopyright?: boolean;
}

export default function Footer({ 
  showCopyright = true 
}: FooterProps) {
  return (
    <View style={styles.footer}>
      {showCopyright && (
        <View style={styles.copyrightContainer}>
          <Text style={styles.copyrightText}>
            © {new Date().getFullYear()} CALTIMS. All rights reserved.
          </Text>
          <Text style={styles.subtitle}>Securing workforce productivity in real-time.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  copyrightContainer: {
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#475569',
  },
  subtitle: {
    fontSize: moderateScale(9),
    color: '#94a3b8',
    marginTop: verticalScale(2),
  },
});
