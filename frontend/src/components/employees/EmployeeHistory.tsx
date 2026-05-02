import React, { useState, useEffect, memo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { format } from 'date-fns';
import { auditAPI } from '../../services/endpoints';

interface AuditLog {
  _id: string;
  action: string;
  createdAt: string;
  userId: { name: string };
  details?: { changes?: Record<string, { old: any; new: any }> };
}

interface EmployeeHistoryProps {
  entityId: string;
}

const EmployeeHistory = memo(({ entityId }: EmployeeHistoryProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const response = await auditAPI.getAll({ entityType: 'Employee', entityId, limit: 20 });
      setLogs((response as any)?.data?.data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [entityId]);

  if (loading) return <View style={{ padding: 20, alignItems: 'center' }}><ActivityIndicator size="small" color="#3b82f6" /></View>;
  if (!logs.length) return <Text style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>No history available for this employee.</Text>;

  return (
    <View style={{ gap: 12 }}>
      {logs.map(log => (
        <View key={log._id} style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e293b' }}>{log.action}</Text>
          <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            {format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')} by {log.userId?.name || 'System'}
          </Text>
          {log.details?.changes && Object.entries(log.details.changes).map(([field, vals]) => (
            <View key={field} style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginBottom: 4 }}>{field}:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 11, color: '#ef4444', textDecorationLine: 'line-through' }}>{String(vals.old)}</Text>
                <Text style={{ fontSize: 11, color: '#64748b' }}>→</Text>
                <Text style={{ fontSize: 11, color: '#10b981' }}>{String(vals.new)}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
});

export default EmployeeHistory;
