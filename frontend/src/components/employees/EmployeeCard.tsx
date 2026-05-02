import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Mail, Building2, Briefcase, Eye, Pencil, Trash2, UserX, UserCheck } from 'lucide-react-native';
import StatusBadge from '../common/StatusBadge';

interface EmployeeCardProps {
  employee: any;
  onView: (employee: any) => void;
  onEdit: (employee: any) => void;
  onDelete: (employee: any) => void;
  onToggleStatus: (employee: any) => void;
  isToggling: boolean;
}

const styles = StyleSheet.create({
  employeeCard: { backgroundColor: 'white', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#3b82f6' },
  cardInfo: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  employeeId: { fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  cardDetails: { gap: 8, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: '#475569', flex: 1 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  actionBtn: { padding: 8, minWidth: 40, alignItems: 'center' },
});

const EmployeeCard = memo(({ employee, onView, onEdit, onDelete, onToggleStatus, isToggling }: EmployeeCardProps) => (
  <View style={styles.employeeCard}>
    <View style={styles.cardHeader}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{employee.name?.charAt(0) || '?'}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.employeeName}>{employee.name}</Text>
        <Text style={styles.employeeId}>{employee.employeeId}</Text>
      </View>
      <StatusBadge status={employee.isActive ? 'active' : 'inactive'} />
    </View>

    <View style={styles.cardDetails}>
      <View style={styles.detailRow}>
        <Mail size={14} color="#64748b" />
        <Text style={styles.detailText}>{employee.email}</Text>
      </View>
      <View style={styles.detailRow}>
        <Building2 size={14} color="#64748b" />
        <Text style={styles.detailText}>{employee.department || '—'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Briefcase size={14} color="#64748b" />
        <Text style={styles.detailText}>{employee.designation || '—'}</Text>
      </View>
      <View style={styles.detailRow}>
        <StatusBadge status={employee.role} />
      </View>
    </View>

    <View style={styles.cardActions}>
      <TouchableOpacity style={styles.actionBtn} onPress={() => onView(employee)}>
        <Eye size={18} color="#64748b" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(employee)}>
        <Pencil size={18} color="#f59e0b" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={() => onToggleStatus(employee)} disabled={isToggling}>
        {employee.isActive ? <UserX size={18} color="#ef4444" /> : <UserCheck size={18} color="#10b981" />}
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(employee)}>
        <Trash2 size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  </View>
));

export default EmployeeCard;
