import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  subtitleIcon?: LucideIcon | null;
  rightComponent?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgColor,
  subtitleIcon: SubtitleIcon,
  rightComponent,
}: PageHeaderProps) {
  return (
    <View style={styles.statsHeader}>
      <View style={styles.leftContent}>
        <View style={[styles.statsIcon, { backgroundColor: iconBgColor }]}>
          <Icon size={20} color={iconColor} />
        </View>
        <View>
          <Text style={styles.statsTitle}>{title}</Text>
          <View style={styles.statsRow}>
            {SubtitleIcon && <SubtitleIcon size={12} color="#64748b" />}
            <Text style={styles.statsSubtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>
      {rightComponent && <View>{rightComponent}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  statsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  leftContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statsIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statsTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statsSubtitle: { fontSize: 12, color: '#64748b' },
});
