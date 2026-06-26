import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Switch,
  Alert
} from 'react-native';
import {
  Briefcase,
  Clock,
  Calendar,
  Save,
  Plus,
  Trash2
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { policyAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';

export default function PayrollPolicy() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      setLoading(true);
      const res: any = await policyAPI.getPolicy();
      const policyData = res?.data?.data || res?.data || res;
      if (policyData) {
        setFormData(policyData);
      }
    } catch (err) {
      console.error('Failed to load policy', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await policyAPI.updatePolicy(formData);
      Alert.alert('Success', 'Organization Policy Extracted to Core');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update Policy: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePayrollChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, payroll: { ...prev.payroll, [field]: value } }));
  };

  const handleAttendanceChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, attendance: { ...prev.attendance, [field]: value } }));
  };

  const addLeaveType = () => {
    setFormData((prev: any) => ({
      ...prev,
      leave: {
        ...prev.leave,
        types: [...(prev.leave?.types || []), { name: 'New Type', paid: false }]
      }
    }));
  };

  const updateLeaveType = (idx: number, field: string, value: any) => {
    const updatedTypes = [...formData.leave.types];
    updatedTypes[idx][field] = value;
    setFormData((prev: any) => ({ ...prev, leave: { ...prev.leave, types: updatedTypes } }));
  };

  const removeLeaveType = (idx: number) => {
    const updatedTypes = formData.leave.types.filter((_: any, i: number) => i !== idx);
    setFormData((prev: any) => ({ ...prev, leave: { ...prev.leave, types: updatedTypes } }));
  };

  if (loading || !formData) {
    return (
      <Layout title="Payroll Policy" user={user} sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      </Layout>
    );
  }

  return (
    <Layout title="Payroll Policy" user={user} refreshing={loading} onRefresh={fetchPolicy} sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Payroll Logic */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#eef2ff' }]}>
              <Briefcase size={20} color="#4f46e5" />
            </View>
            <Text style={styles.cardTitle}>Payroll Logic</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Working Days Per Month</Text>
            <TextInput
              style={styles.input}
              value={formData.payroll.workingDaysPerMonth?.toString() || ''}
              onChangeText={(v) => handlePayrollChange('workingDaysPerMonth', Number(v))}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Working Hours Per Day</Text>
            <TextInput
              style={styles.input}
              value={formData.payroll.workingHoursPerDay?.toString() || ''}
              onChangeText={(v) => handlePayrollChange('workingHoursPerDay', Number(v))}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Salary Proration Enable</Text>
            <Switch
              value={formData.payroll.salaryProration || false}
              onValueChange={(v) => handlePayrollChange('salaryProration', v)}
              trackColor={{ false: '#cbd5e1', true: '#4f46e5' }}
            />
          </View>
        </View>

        {/* Attendance Policy */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#fff1f2' }]}>
              <Clock size={20} color="#e11d48" />
            </View>
            <Text style={styles.cardTitle}>Clock Integrity</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Min. Hours / Day for Present</Text>
            <TextInput
              style={styles.input}
              value={formData.attendance.minHoursPerDay?.toString() || ''}
              onChangeText={(v) => handleAttendanceChange('minHoursPerDay', Number(v))}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Allow Half-Day Markings</Text>
            <Switch
              value={formData.attendance.allowHalfDay || false}
              onValueChange={(v) => handleAttendanceChange('allowHalfDay', v)}
              trackColor={{ false: '#cbd5e1', true: '#e11d48' }}
            />
          </View>
        </View>

        {/* Leave Policy */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#ecfdf5' }]}>
              <Calendar size={20} color="#10b981" />
            </View>
            <Text style={styles.cardTitle}>Leave Taxonomy</Text>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Allow Negative Global Balance</Text>
            <Switch
              value={formData.leave?.allowNegativeBalance || false}
              onValueChange={(v) => setFormData((prev: any) => ({ ...prev, leave: { ...prev.leave, allowNegativeBalance: v } }))}
              trackColor={{ false: '#cbd5e1', true: '#10b981' }}
            />
          </View>

          <View style={styles.leaveHeader}>
            <Text style={styles.label}>Leave Categories</Text>
            <TouchableOpacity style={styles.addBtn} onPress={addLeaveType}>
              <Plus size={14} color="#10b981" />
              <Text style={styles.addBtnText}>Add Node</Text>
            </TouchableOpacity>
          </View>

          {formData.leave?.types?.map((type: any, idx: number) => (
            <View key={idx} style={styles.leaveTypeRow}>
              <TextInput
                style={styles.leaveInput}
                value={type.name}
                onChangeText={(v) => updateLeaveType(idx, 'name', v)}
              />
              <View style={styles.paidSwitch}>
                <Text style={styles.paidText}>Paid</Text>
                <Switch
                  value={type.paid || false}
                  onValueChange={(v) => updateLeaveType(idx, 'paid', v)}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                />
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => removeLeaveType(idx)}>
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Save size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Policy Configuration</Text>
            </>
          )}
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 12, padding: 12, fontSize: 14, color: '#1e293b' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#334155' },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { color: '#10b981', fontSize: 12, fontWeight: '700' },
  leaveTypeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 8, gap: 8 },
  leaveInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  paidSwitch: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paidText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  deleteBtn: { padding: 8, backgroundColor: '#fef2f2', borderRadius: 8 },
  saveBtn: { backgroundColor: '#4f46e5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
