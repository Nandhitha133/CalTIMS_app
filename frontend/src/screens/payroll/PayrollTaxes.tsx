import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';

export const PayrollTaxes = () => (
  <View style={styles.container}>
    <Header title="Payroll Taxes" showSidebarButton />
    <View style={styles.content}>
      <Text style={styles.title}>Payroll Taxes</Text>
      <Text style={styles.subtitle}>This module is coming soon.</Text>
    </View>
    <Footer />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b' },
});
