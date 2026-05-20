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
  employeeCard: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatarContainer: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#eef2ff', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: '#4f46e5' },
  cardInfo: { flex: 1 },
  employeeName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  employeeId: { fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  cardContent: {
    padding: 16,
    gap: 8,
  },
  cardDetails: { gap: 8, marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: '#475569', flex: 1 },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#f1f5f9', 
    backgroundColor: '#fafafa' 
  },
  footerLeft: { flex: 1 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
});

const EmployeeCard = memo(({ employee, onView, onEdit, onDelete, onToggleStatus, isToggling }: EmployeeCardProps) => (
  <View style={styles.employeeCard}>
    {/* Header */}
    <View style={styles.cardHeader}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{employee.name?.charAt(0).toUpperCase() || '?'}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.employeeName}>{employee.name}</Text>
        <Text style={styles.employeeId}>{employee.employeeId}</Text>
      </View>
      <StatusBadge status={employee.isActive ? 'active' : 'inactive'} />
    </View>

    {/* Content details */}
    <View style={styles.cardContent}>
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
        <View style={styles.badgeContainer}>
          <StatusBadge status={employee.role} />
        </View>
      </View>
    </View>

    {/* Footer */}
    <View style={styles.cardFooter}>
      <View style={styles.footerLeft} />
      <View style={styles.cardActions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f5f3ff' }]} onPress={() => onView(employee)}>
          <Eye size={16} color="#8b5cf6" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fffbeb' }]} onPress={() => onEdit(employee)}>
          <Pencil size={16} color="#f59e0b" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: employee.isActive ? '#fee2e2' : '#ecfdf5' }]} 
          onPress={() => onToggleStatus(employee)} 
          disabled={isToggling}
        >
          {employee.isActive ? <UserX size={16} color="#ef4444" /> : <UserCheck size={16} color="#10b981" />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]} onPress={() => onDelete(employee)}>
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  </View>
));

export default EmployeeCard;
