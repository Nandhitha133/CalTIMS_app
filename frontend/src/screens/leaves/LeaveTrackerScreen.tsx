// screens/leaves/LeaveTrackerScreen.tsx
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    StyleSheet,
    Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, differenceInCalendarDays } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    Plus,
    Calendar,
    X,
    FileText,
    Eye,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Ban,
    Send,
} from 'lucide-react-native';
import { leaveAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';

// Helper function to safely extract data from API response
const extractData = (response: any, defaultValue: any = null) => {
    if (!response) return defaultValue;
    if (response.data?.data) return response.data.data;
    if (response.data) return response.data;
    return response;
};

// Types
type LeaveBalance = Record<string, number>;

interface LeaveRequest {
    id: string;
    leaveId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    createdAt: string;
    approvedBy?: { name: string };
    rejectionReason?: string;
    cancellationReason?: string;
}

// Leave Balance Card
const BalanceCard = ({ title, value, color }: { title: string; value: number; color: string }) => (
    <View style={[styles.balanceCard, { borderTopColor: color }]}>
        <Text style={[styles.balanceValue, { color }]}>{value}</Text>
        <Text style={styles.balanceTitle}>{title}</Text>
        <Text style={styles.balanceLabel}>days left</Text>
    </View>
);

// Leave Request Card
const LeaveRequestCard = ({
    leave,
    onView,
    onCancel,
    isCancelling
}: {
    leave: LeaveRequest;
    onView: () => void;
    onCancel: () => void;
    isCancelling: boolean;
}) => {
    const getStatusColor = () => {
        switch (leave.status) {
            case 'approved': return '#10b981';
            case 'pending': return '#f59e0b';
            case 'rejected': return '#ef4444';
            case 'cancelled': return '#64748b';
            default: return '#64748b';
        }
    };

    return (
        <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
                <View>
                    <Text style={styles.leaveType}>{leave.leaveType.toUpperCase()}</Text>
                    <Text style={styles.leaveId}>ID: {leave.leaveId}</Text>
                </View>
                <View style={[styles.statusContainer, { backgroundColor: `${getStatusColor()}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor() }]}>
                        {leave.status.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View style={styles.requestDates}>
                <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>From</Text>
                    <Text style={styles.dateValue}>{format(new Date(leave.startDate), 'MMM dd, yyyy')}</Text>
                </View>
                <View style={styles.dateDivider} />
                <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>To</Text>
                    <Text style={styles.dateValue}>{format(new Date(leave.endDate), 'MMM dd, yyyy')}</Text>
                </View>
            </View>

            <View style={styles.requestFooter}>
                <View style={styles.daysContainer}>
                    <Calendar size={14} color="#64748b" />
                    <Text style={styles.daysText}>{leave.totalDays} day(s)</Text>
                </View>
                <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={onView} style={styles.actionButton}>
                        <Eye size={16} color="#3b82f6" />
                    </TouchableOpacity>
                    {leave.status === 'pending' && (
                        <TouchableOpacity
                            onPress={onCancel}
                            style={styles.actionButton}
                            disabled={isCancelling}
                        >
                            <Ban size={16} color="#ef4444" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

// Cancel Modal
const CancelModal = ({
    visible,
    onClose,
    onSubmit,
    isSubmitting
}: {
    visible: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    isSubmitting: boolean;
}) => {
    const [reason, setReason] = useState('');

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Cancel Leave Request</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.modalContent}>
                        <View style={styles.warningBox}>
                            <AlertCircle size={20} color="#f59e0b" />
                            <Text style={styles.warningText}>
                                Once cancelled, this request will be moved to history and cannot be reopened.
                            </Text>
                        </View>
                        <TextInput
                            style={styles.reasonInput}
                            placeholder="Reason for cancellation *"
                            placeholderTextColor="#94a3b8"
                            multiline
                            numberOfLines={3}
                            value={reason}
                            onChangeText={setReason}
                        />
                    </View>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, (!reason.trim() || isSubmitting) && styles.disabledButton]}
                            onPress={() => onSubmit(reason)}
                            disabled={!reason.trim() || isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Ban size={16} color="white" />
                                    <Text style={styles.submitButtonText}>Cancel Leave</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// Leave Details Modal
const LeaveDetailModal = ({ leave, visible, onClose }: { leave: LeaveRequest | null; visible: boolean; onClose: () => void }) => {
    if (!leave) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, styles.detailModal]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Leave Details</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.detailContent}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Leave ID</Text>
                                <Text style={styles.detailValue}>{leave.leaveId}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Leave Type</Text>
                                <Text style={[styles.detailValue, styles.capitalize]}>{leave.leaveType}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Duration</Text>
                                <Text style={styles.detailValue}>{leave.totalDays} day(s)</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>From</Text>
                                <Text style={styles.detailValue}>{format(new Date(leave.startDate), 'MMM dd, yyyy')}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>To</Text>
                                <Text style={styles.detailValue}>{format(new Date(leave.endDate), 'MMM dd, yyyy')}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Applied On</Text>
                                <Text style={styles.detailValue}>{format(new Date(leave.createdAt), 'MMM dd, yyyy')}</Text>
                            </View>
                            {leave.reason && (
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailLabel}>Reason</Text>
                                    <Text style={styles.detailText}>{leave.reason}</Text>
                                </View>
                            )}
                            {leave.rejectionReason && (
                                <View style={[styles.detailSection, styles.rejectionSection]}>
                                    <Text style={[styles.detailLabel, styles.rejectionLabel]}>Rejection Reason</Text>
                                    <Text style={styles.rejectionText}>{leave.rejectionReason}</Text>
                                </View>
                            )}
                            {leave.cancellationReason && (
                                <View style={[styles.detailSection, styles.cancellationSection]}>
                                    <Text style={[styles.detailLabel, styles.cancellationLabel]}>Cancellation Reason</Text>
                                    <Text style={styles.cancellationText}>{leave.cancellationReason}</Text>
                                </View>
                            )}
                            {leave.approvedBy && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Processed By</Text>
                                    <Text style={styles.detailValue}>{leave.approvedBy.name}</Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// Apply Leave Modal
const ApplyLeaveModal = ({
    visible,
    onClose,
    onSubmit,
    balance,
    leaveTypes,
    isSubmitting
}: {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    balance: LeaveBalance;
    leaveTypes: string[];
    isSubmitting: boolean;
}) => {
    const [leaveType, setLeaveType] = useState(leaveTypes[0] || 'annual');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [reason, setReason] = useState('');
    const [isHalfDay, setIsHalfDay] = useState(false);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const calculateDays = () => {
        if (isHalfDay) return 0.5;
        const diff = differenceInCalendarDays(endDate, startDate);
        return diff >= 0 ? diff + 1 : 0;
    };

    const days = calculateDays();
    const currentBalance = balance[leaveType as keyof LeaveBalance] || 0;
    const hasInsufficientBalance = days > currentBalance;

    const handleSubmit = () => {
        if (!reason.trim()) {
            Alert.alert('Error', 'Please provide a reason');
            return;
        }
        if (endDate < startDate) {
            Alert.alert('Error', 'End date must be after start date');
            return;
        }
        if (hasInsufficientBalance) {
            Alert.alert('Error', `Insufficient ${leaveType} leave balance`);
            return;
        }

        onSubmit({
            leaveType,
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            reason,
            isHalfDay,
            totalDays: days,
        });
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Apply for Leave</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.modalContent}>
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Leave Type *</Text>
                                <View style={styles.typeOptions}>
                                    {leaveTypes.map(type => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[styles.typeOption, leaveType === type && styles.typeOptionActive]}
                                            onPress={() => setLeaveType(type)}
                                        >
                                            <Text style={[styles.typeText, leaveType === type && styles.typeTextActive]}>
                                                {type.toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={styles.balanceText}>
                                    Balance: <Text style={{ color: hasInsufficientBalance ? '#ef4444' : '#10b981' }}>{currentBalance} days</Text>
                                </Text>
                            </View>

                            <View style={styles.formRow}>
                                <View style={[styles.formField, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>Start Date *</Text>
                                    <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
                                        <Calendar size={16} color="#64748b" />
                                        <Text style={styles.dateText}>{format(startDate, 'MMM dd, yyyy')}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={[styles.formField, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>End Date *</Text>
                                    <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
                                        <Calendar size={16} color="#64748b" />
                                        <Text style={styles.dateText}>{format(endDate, 'MMM dd, yyyy')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {showStartPicker && (
                                <DateTimePicker
                                    value={startDate}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, date) => {
                                        setShowStartPicker(false);
                                        if (date) setStartDate(date);
                                    }}
                                />
                            )}
                            {showEndPicker && (
                                <DateTimePicker
                                    value={endDate}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, date) => {
                                        setShowEndPicker(false);
                                        if (date) setEndDate(date);
                                    }}
                                />
                            )}

                            <View style={styles.formField}>
                                <TouchableOpacity style={styles.halfDayButton} onPress={() => setIsHalfDay(!isHalfDay)}>
                                    <View style={[styles.checkbox, isHalfDay && styles.checkboxChecked]} />
                                    <Text style={styles.halfDayText}>Apply as Half Day</Text>
                                </TouchableOpacity>
                            </View>

                            {days > 0 && (
                                <View style={[styles.daysInfo, hasInsufficientBalance && styles.daysInfoError]}>
                                    <Text style={styles.daysInfoText}>
                                        📅 {days} day(s) of {leaveType} leave
                                    </Text>
                                    {hasInsufficientBalance && (
                                        <Text style={styles.errorText}>Insufficient Balance</Text>
                                    )}
                                </View>
                            )}

                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Reason *</Text>
                                <TextInput
                                    style={styles.reasonInput}
                                    placeholder="Briefly describe the reason for leave..."
                                    placeholderTextColor="#94a3b8"
                                    multiline
                                    numberOfLines={3}
                                    value={reason}
                                    onChangeText={setReason}
                                />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, (isSubmitting || hasInsufficientBalance) && styles.disabledButton]}
                            onPress={handleSubmit}
                            disabled={isSubmitting || hasInsufficientBalance}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Send size={16} color="white" />
                                    <Text style={styles.submitButtonText}>Submit Application</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default function LeaveTrackerScreen({ navigation }: { navigation: any }) {
    const [user, setUser] = useState<any>(null);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [balance, setBalance] = useState<LeaveBalance>({ annual: 0, casual: 0, sick: 0 });
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<string[]>(['annual', 'casual', 'sick']);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pagination, setPagination] = useState<any>(null);

    const fetchLeaveTypes = async () => {
        try {
            const response = await settingsAPI.getTimesheetSettings();
            const settings = extractData(response);
            const types = settings?.eligibleLeaveTypes;
            if (types && types.length > 0) {
                setLeaveTypes(types);
            }
        } catch (error) {
            console.error('Error fetching leave types:', error);
        }
    };

    const fetchBalance = async (userId: string) => {
        try {
            const response = await leaveAPI.getBalance(userId);
            const data = extractData(response);
            setBalance(data || {});
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    };

    const fetchLeaves = async () => {
        try {
            setLoading(true);
            const response = await leaveAPI.getAll({ page, limit: 10 });

            // Handle paginated structure
            let leavesData = [];
            let paginationData = null;

            if (response && (response as any).data && !Array.isArray((response as any).data)) {
                leavesData = (response as any).data.data || [];
                paginationData = (response as any).data.pagination;
            } else {
                leavesData = extractData(response, []);
                paginationData = (response as any).pagination;
            }

            // Map IDs for compatibility and ensure all required fields
            const mappedLeaves = leavesData.map((l: any) => ({
                ...l,
                id: l.id || l._id,
            }));

            setLeaves(mappedLeaves);
            setPagination(paginationData);
            setTotalPages(paginationData?.totalPages || 1);
        } catch (error) {
            console.error('Error fetching leaves:', error);
            Alert.alert('Error', 'Failed to load leave requests');
        } finally {
            setLoading(false);
        }
    };

    const loadUserData = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                return parsedUser;
            }
            return null;
        } catch (error) {
            console.error('Error loading user data:', error);
            return null;
        }
    };

    const fetchAllData = async () => {
        const currentUser = await loadUserData();
        if (currentUser) {
            await Promise.all([
                fetchBalance(currentUser._id || currentUser.id),
                fetchLeaves(),
                fetchLeaveTypes(),
            ]);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchAllData();
        }, [page])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAllData();
        setRefreshing(false);
    };

    const handleApplyLeave = async (data: any) => {
        setIsSubmitting(true);
        try {
            const response = await leaveAPI.apply(data);
            if ((response as any)?.success !== false) {
                Alert.alert('Success', 'Leave application submitted!');
                setShowApplyModal(false);
                fetchAllData();
            }
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to submit leave request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelLeave = async (reason: string) => {
        if (!selectedLeave) return;
        setIsCancelling(true);
        try {
            await leaveAPI.cancel(selectedLeave.id, reason);
            Alert.alert('Success', 'Leave cancelled successfully');
            setShowCancelModal(false);
            setSelectedLeave(null);
            fetchAllData();
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to cancel leave');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleViewLeave = (leave: LeaveRequest) => {
        setSelectedLeave(leave);
        setShowDetailModal(true);
    };

    const handleCancelRequest = (leave: LeaveRequest) => {
        setSelectedLeave(leave);
        setShowCancelModal(true);
    };

    const stats = {
        total: leaves.length,
        pending: leaves.filter(l => l.status === 'pending').length,
        approved: leaves.filter(l => l.status === 'approved').length,
        rejected: leaves.filter(l => l.status === 'rejected').length,
    };

    return (
        <Layout
            title="Leave Tracker"
            user={user}
            sidebarVisible={sidebarVisible}
            setSidebarVisible={setSidebarVisible}
            refreshing={refreshing}
            onRefresh={onRefresh}
        >
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <PageHeader
                    title="Leave Tracker"
                    subtitle="Manage your leave requests and balances"
                    icon={Calendar}
                    iconColor="#3b82f6"
                    iconBgColor="#eff6ff"
                    rightComponent={
                        <TouchableOpacity style={styles.applyButton} onPress={() => setShowApplyModal(true)}>
                            <Plus size={16} color="white" />
                            <Text style={styles.applyButtonText}>Apply</Text>
                        </TouchableOpacity>
                    }
                />

                <View style={styles.content}>
                    {/* Balance Cards */}
                    <View style={styles.balanceContainer}>
                        {leaveTypes.map((type) => {
                            const label = type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                            const value = balance[type] || balance[type.toLowerCase()] || 0;

                            const colors: any = {
                                annual: '#10b981',
                                casual: '#3b82f6',
                                sick: '#f59e0b',
                                lop: '#ef4444',
                                medical: '#ec4899',
                                default: '#6366f1'
                            };

                            const color = colors[type.toLowerCase()] || colors.default;

                            return (
                                <BalanceCard
                                    key={type}
                                    title={label.includes('Leave') ? label : `${label} Leave`}
                                    value={value}
                                    color={color}
                                />
                            );
                        })}
                    </View>

                    {/* Stats */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: '#3b82f6' }]}>{stats.total}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.pending}</Text>
                            <Text style={styles.statLabel}>Pending</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.approved}</Text>
                            <Text style={styles.statLabel}>Approved</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.rejected}</Text>
                            <Text style={styles.statLabel}>Rejected</Text>
                        </View>
                    </View>

                    {/* Leave Requests List */}
                    <Text style={styles.sectionTitle}>Leave Applications</Text>

                    {loading && leaves.length === 0 ? (
                        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
                    ) : leaves.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Calendar size={48} color="#cbd5e1" />
                            <Text style={styles.emptyTitle}>No leave applications</Text>
                            <Text style={styles.emptyText}>Apply for your first leave request</Text>
                            <TouchableOpacity style={styles.emptyButton} onPress={() => setShowApplyModal(true)}>
                                <Plus size={16} color="white" />
                                <Text style={styles.emptyButtonText}>Apply for Leave</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            {leaves.map(leave => (
                                <LeaveRequestCard
                                    key={leave.id}
                                    leave={leave}
                                    onView={() => handleViewLeave(leave)}
                                    onCancel={() => handleCancelRequest(leave)}
                                    isCancelling={isCancelling}
                                />
                            ))}

                            {totalPages > 1 && (
                                <View style={styles.pagination}>
                                    <TouchableOpacity
                                        style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                                        onPress={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <Text style={styles.pageButtonText}>Previous</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
                                    <TouchableOpacity
                                        style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
                                        onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        <Text style={styles.pageButtonText}>Next</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Modals */}
            <ApplyLeaveModal
                visible={showApplyModal}
                onClose={() => setShowApplyModal(false)}
                onSubmit={handleApplyLeave}
                balance={balance}
                leaveTypes={leaveTypes}
                isSubmitting={isSubmitting}
            />

            <LeaveDetailModal
                leave={selectedLeave}
                visible={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedLeave(null);
                }}
            />

            <CancelModal
                visible={showCancelModal}
                onClose={() => {
                    setShowCancelModal(false);
                    setSelectedLeave(null);
                }}
                onSubmit={handleCancelLeave}
                isSubmitting={isCancelling}
            />
        </Layout>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { paddingHorizontal: 16, paddingBottom: 100 },
    applyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    applyButtonText: { color: 'white', fontWeight: '600', fontSize: 13 },

    balanceContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    balanceCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 12, alignItems: 'center', borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    balanceValue: { fontSize: 24, fontWeight: '800' },
    balanceTitle: { fontSize: 12, fontWeight: '600', color: '#1e293b', marginTop: 4 },
    balanceLabel: { fontSize: 10, color: '#64748b', marginTop: 2 },

    statsContainer: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 20, alignItems: 'center', justifyContent: 'space-around', borderWidth: 1, borderColor: '#e2e8f0' },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: { fontSize: 20, fontWeight: '800' },
    statLabel: { fontSize: 11, color: '#64748b', marginTop: 4 },
    statDivider: { width: 1, height: 30, backgroundColor: '#e2e8f0' },

    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 12 },

    requestCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    leaveType: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    leaveId: { fontSize: 10, color: '#64748b', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    statusContainer: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 10, fontWeight: '600' },
    requestDates: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    dateItem: { alignItems: 'center' },
    dateLabel: { fontSize: 10, color: '#64748b', marginBottom: 2 },
    dateValue: { fontSize: 12, fontWeight: '500', color: '#1e293b' },
    dateDivider: { width: 1, height: 20, backgroundColor: '#e2e8f0' },
    requestFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    daysContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    daysText: { fontSize: 12, color: '#64748b' },
    actionButtons: { flexDirection: 'row', gap: 8 },
    actionButton: { padding: 8, borderRadius: 8, backgroundColor: '#f8fafc' },

    loader: { padding: 40 },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0' },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 16 },
    emptyText: { fontSize: 13, color: '#64748b', marginTop: 8, textAlign: 'center' },
    emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 16 },
    emptyButtonText: { color: 'white', fontWeight: '600', fontSize: 13 },

    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 20 },
    pageButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    pageButtonDisabled: { opacity: 0.5 },
    pageButtonText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
    pageInfo: { fontSize: 13, color: '#64748b' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
    detailModal: { maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
    modalContent: { padding: 20 },
    modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' },

    formField: { marginBottom: 16 },
    formLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
    formRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },

    typeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    typeOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    typeOptionActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    typeText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
    typeTextActive: { color: 'white' },

    balanceText: { fontSize: 11, color: '#64748b', marginTop: 4 },

    dateButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, backgroundColor: '#f8fafc' },
    dateText: { fontSize: 14, color: '#1e293b', flex: 1 },

    halfDayButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#cbd5e1', backgroundColor: 'white' },
    checkboxChecked: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    halfDayText: { fontSize: 13, color: '#334155' },

    daysInfo: { backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, marginBottom: 16 },
    daysInfoError: { backgroundColor: '#fef2f2' },
    daysInfoText: { fontSize: 13, fontWeight: '500', color: '#3b82f6' },
    errorText: { fontSize: 11, color: '#ef4444', marginTop: 4 },

    reasonInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc', minHeight: 80, textAlignVertical: 'top' },

    cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
    cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
    submitButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 12 },
    disabledButton: { opacity: 0.5 },
    submitButtonText: { fontSize: 14, fontWeight: '700', color: 'white' },

    warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fef3c7' },
    warningText: { flex: 1, fontSize: 12, color: '#f59e0b', lineHeight: 16 },

    detailContent: { padding: 20, gap: 16 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    detailLabel: { fontSize: 12, color: '#64748b' },
    detailValue: { fontSize: 13, fontWeight: '500', color: '#1e293b' },
    detailSection: { padding: 12, backgroundColor: '#f8fafc', borderRadius: 12 },
    detailText: { fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 18 },
    rejectionSection: { backgroundColor: '#fef2f2' },
    rejectionLabel: { color: '#ef4444' },
    rejectionText: { fontSize: 13, color: '#ef4444', marginTop: 4 },
    cancellationSection: { backgroundColor: '#fffbeb' },
    cancellationLabel: { color: '#f59e0b' },
    cancellationText: { fontSize: 13, color: '#f59e0b', marginTop: 4 },
    capitalize: { textTransform: 'capitalize' },
});