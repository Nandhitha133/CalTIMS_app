import os

files = [
    'OrganizationTab', 'BrandingTab', 'SubscriptionTab', 'UsersAndRolesTab',
    'PermissionAuditTab', 'TimesheetPolicyTab', 'LeavePolicyTab', 'PayrollPolicyTab',
    'PayslipTemplatesTab', 'ComplianceLocksTab', 'ReportsAutomationTab',
    'NotificationsTab', 'IntegrationsTab', 'OnboardingTab'
]

template = """import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function %s() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>%s</Text>
      <Text style={styles.description}>Configuration and settings for %s.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
  }
});
"""

for name in files:
    with open(f"tabs/{name}.tsx", "w") as f:
        title = name.replace("Tab", "")
        f.write(template % (name, title, title))
