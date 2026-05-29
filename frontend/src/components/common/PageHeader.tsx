import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { LucideIcon, Menu } from 'lucide-react-native';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  subtitleIcon?: LucideIcon | null;
  onMenuPress?: () => void;
  rightElement?: React.ReactNode;
  rightComponent?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor = '#3b82f6',
  iconBgColor = '#eff6ff',
  subtitleIcon: SubtitleIcon,
  onMenuPress,
  rightElement,
  rightComponent,
}: PageHeaderProps) {
  const right = rightElement || rightComponent;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.leftSection}>
          {onMenuPress && (
            <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
              <Menu size={24} color="#1e293b" />
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              {Icon && (
                <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
                  <Icon size={18} color={iconColor} />
                </View>
              )}
              <Text style={styles.title}>{title}</Text>
            </View>
            {subtitle && (
              <View style={styles.subtitleRow}>
                {SubtitleIcon && <SubtitleIcon size={12} color="#64748b" style={styles.subtitleIcon} />}
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
            )}
          </View>
        </View>
        {right && <View style={styles.rightSection}>{right}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: verticalScale(16),
    backgroundColor: '#f8fafc',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    marginRight: scale(12),
    padding: scale(4),
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  iconContainer: {
    width: scale(32),
    height: verticalScale(32),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(2),
  },
  subtitle: {
    fontSize: moderateScale(12),
    color: '#64748b',
    fontWeight: '500',
  },
  subtitleIcon: {
    marginRight: scale(4),
  },
  rightSection: {
    marginLeft: scale(12),
  },
});
