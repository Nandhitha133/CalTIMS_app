import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: string;
}

const badgeStyles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '600' },
});

const StatusBadge = memo(({ status }: StatusBadgeProps) => {
  const getColors = () => {
    switch (status?.toLowerCase()?.replace(' ', '_')) {
      case 'active':
      case 'approved': 
        return { bg: '#ecfdf5', text: '#10b981' };
      case 'inactive':
      case 'rejected':
      case 'error':
        return { bg: '#fef2f2', text: '#ef4444' };
      case 'pending':
      case 'submitted':
        return { bg: '#fff7ed', text: '#f59e0b' };
      case 'draft':
        return { bg: '#f1f5f9', text: '#64748b' };
      case 'admin_filled':
      case 'admin': 
        return { bg: '#eff6ff', text: '#2563eb' };
      case 'manager': return { bg: '#f5f3ff', text: '#7c3aed' };
      case 'hr': return { bg: '#fdf2f8', text: '#db2777' };
      case 'finance': return { bg: '#fff7ed', text: '#ea580c' };
      case 'employee': return { bg: '#f8fafc', text: '#64748b' };
      case 'intern': return { bg: '#f0fdfa', text: '#0d9488' };
      default: return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  const { bg, text } = getColors();
  return (
    <View style={[badgeStyles.badge, { backgroundColor: bg }]}>
      <Text style={[badgeStyles.text, { color: text }]}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : ''}
      </Text>
    </View>
  );
});

export default StatusBadge;
