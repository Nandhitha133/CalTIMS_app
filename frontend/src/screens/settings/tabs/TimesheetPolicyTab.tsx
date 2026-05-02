import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../../../components/common/Header';

export default function TimesheetPolicyTab() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <Header
        title="Timesheet Policy"
        showBackButton={true}
        showSidebarButton={false}
        onBackPress={() => navigation.navigate('Settings' as never)}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Timesheet Policy</Text>
        <Text style={styles.description}>Set up rules for time logging, approvals, and working hours.</Text>
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>Timesheet policies coming soon...</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  description: { fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 18 },
  placeholderCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  placeholderText: { fontSize: 14, color: '#94a3b8' },
});
