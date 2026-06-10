import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions
} from 'react-native';
import { X, Download } from 'lucide-react-native';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

interface StatementPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  onDownload?: () => void;
  payslip: any;
  currencySymbol: string;
  settings?: any;
}

const numberToWords = (num: number): string => {
  if (!num || num === 0) return 'Zero';
  
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return str.trim();
};

export default function StatementPreviewModal({ visible, onClose, onDownload, payslip, currencySymbol, settings }: StatementPreviewModalProps) {
  if (!payslip) return null;

  const companyName = settings?.organization?.companyName || 'TIMS CORPORATION Ltd.';
  const empName = payslip.employeeInfo?.name || payslip.user?.name || 'Employee';
  const empId = payslip.employeeInfo?.employeeId || payslip.employeeId || 'N/A';
  const designation = payslip.employeeInfo?.designation || payslip.role || 'N/A';
  const department = payslip.employeeInfo?.department || 'N/A';
  
  const bankName = payslip.bankDetails?.bankName || payslip.employeeInfo?.bankName || payslip.user?.bankName || 'N/A';
  const accNo = payslip.bankDetails?.accountNumber || payslip.employeeInfo?.accountNumber || payslip.user?.accountNumber || 'N/A';
  const maskedAcc = accNo.length > 4 ? '*'.repeat(accNo.length - 4) + accNo.slice(-4) : accNo;
  
  const workingDays = payslip.breakdown?.workingDays || payslip.workingDays || 30;
  const payableDays = payslip.breakdown?.payableDays || payslip.payableDays || workingDays;

  const gross = payslip.grossYield || payslip.breakdown?.earnings?.grossEarnings || payslip.breakdown?.grossPay || payslip.grossEarnings || payslip.grossPay || 0;
  const totalDed = payslip.liability || payslip.breakdown?.deductions?.totalDeductions || payslip.breakdown?.totalDeductions || payslip.totalDeductions || 0;
  const net = payslip.netPay || payslip.breakdown?.netPay || payslip.breakdown?.netSalary || 0;

  const monthLabel = payslip.month ? new Date(2026, payslip.month - 1).toLocaleString('default', { month: 'long' }) : 'Unknown';
  const yearLabel = payslip.year || new Date().getFullYear();

  const words = `${numberToWords(Math.floor(net))} ${currencySymbol === '₹' ? 'Rupees' : 'Dollars'} Only`;

  // Dynamic lists mapping (like the web view)
  const earningsList = (Array.isArray(payslip.breakdown?.earnings) ? payslip.breakdown.earnings : payslip.breakdown?.earnings?.components || [])
      .filter((comp: any) => !comp.hidden && !comp.name?.includes('Metadata'));

  const deductionsList = (Array.isArray(payslip.breakdown?.deductions) ? payslip.breakdown.deductions : payslip.breakdown?.deductions?.components || [])
      .filter((comp: any) => !comp.hidden && !comp.name?.toLowerCase().includes('gratuity') && !comp.name?.includes('Metadata'));

  const hasLop = payslip.attendance?.lopDays > 0 && payslip.breakdown?.lopDeduction > 0;
  if (hasLop) {
    deductionsList.push({ name: 'Attendance Adjustment', value: payslip.breakdown.lopDeduction, isLop: true });
  }

  const additionsList = payslip.breakdown?.earnings?.additionalAdditions || [];

  // Match rows for left and right columns
  const rowCount = Math.max(earningsList.length + additionsList.length, deductionsList.length);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Statement View</Text>
              <Text style={styles.headerSub}>EMPLOYEE REF: {empId}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {onDownload && (
                <TouchableOpacity onPress={onDownload} style={styles.downloadBtn}>
                  <Download size={20} color="#4f46e5" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.paper}>
              
              {/* Paper Header */}
              <View style={styles.paperHeaderRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.companyName} numberOfLines={2} adjustsFontSizeToFit>{companyName.toUpperCase()}</Text>
                  <Text style={styles.docType}>EMPLOYEE PAYOUT STATEMENT</Text>
                  <Text style={styles.docSub}>Status: Authenticated Document</Text>
                </View>
                <View style={{ alignItems: 'flex-end', flex: 0.8 }}>
                  <Text style={styles.periodValue}>{monthLabel} {yearLabel}</Text>
                  <Text style={styles.periodLabel}>CYCLE ID: {payslip._id ? payslip._id.substring(0, 8).toUpperCase() : 'N/A'}</Text>
                </View>
              </View>

              {/* Info Grids */}
              <View style={styles.infoRow}>
                <View style={styles.infoCol}>
                  <Text style={styles.sectionHeader}>EMPLOYEE DETAILS</Text>
                  <View style={styles.detailRow}><Text style={styles.detailLbl}>Employee ID</Text><Text style={styles.detailVal}>{empId}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLbl}>Full Name</Text><Text style={styles.detailVal}>{empName}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLbl}>Department</Text><Text style={styles.detailVal}>{department}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLbl}>Designation</Text><Text style={styles.detailVal}>{designation}</Text></View>
                </View>
                
                <View style={styles.infoCol}>
                  <Text style={styles.sectionHeader}>FINANCIAL CONTEXT</Text>
                  <View style={styles.detailRow}><Text style={styles.detailLbl}>Working Days</Text><Text style={styles.detailVal}>{workingDays} Days</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLbl}>Payable Days</Text><Text style={[styles.detailVal, { color: '#4f46e5' }]}>{payableDays} Days</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLbl}>Bank Interface</Text><Text style={styles.detailVal}>{bankName}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLbl}>Account No.</Text><Text style={styles.detailVal}>{maskedAcc}</Text></View>
                </View>
              </View>

              {/* Financial Table */}
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.thLeft, { color: '#10b981' }]}>EARNINGS BREAKDOWN</Text>
                  <Text style={[styles.thRight, { color: '#10b981' }]}>AMOUNT</Text>
                  <View style={styles.vDivider} />
                  <Text style={[styles.thLeft, { color: '#ef4444' }]}>DEDUCTION LIABILITIES</Text>
                  <Text style={[styles.thRight, { color: '#ef4444' }]}>AMOUNT</Text>
                </View>

                {Array.from({ length: rowCount }).map((_, idx) => {
                  const isAdditionsPhase = idx >= earningsList.length;
                  const eComp = !isAdditionsPhase ? earningsList[idx] : null;
                  const addComp = isAdditionsPhase ? additionsList[idx - earningsList.length] : null;
                  const dComp = deductionsList[idx];

                  return (
                    <View key={idx} style={styles.tRow}>
                      <Text style={styles.tdLeft}>
                        {eComp ? eComp.name : addComp ? addComp.name + ' (Net Add)' : ''}
                      </Text>
                      <Text style={styles.tdRight}>
                        {eComp ? currencySymbol + (eComp.value || eComp.calculatedValue || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) 
                         : addComp ? '+' + currencySymbol + (addComp.value || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) : ''}
                      </Text>
                      
                      <View style={styles.vDivider} />
                      
                      <Text style={[styles.tdLeft, dComp?.isLop && { fontStyle: 'italic', color: '#f87171' }]}>{dComp ? dComp.name : ''}</Text>
                      <Text style={[styles.tdRight, { color: '#ef4444' }]}>
                        {dComp ? '-' + currencySymbol + (dComp.value || dComp.calculatedValue || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) : ''}
                      </Text>
                    </View>
                  );
                })}

                {/* Footer Row */}
                <View style={[styles.tRow, { backgroundColor: '#f8fafc', borderBottomWidth: 0 }]}>
                  <Text style={[styles.tdLeft, { color: '#10b981', fontWeight: '800' }]}>Gross Earning</Text>
                  <Text style={[styles.tdRight, { color: '#10b981', fontWeight: '800' }]}>{currencySymbol}{gross.toLocaleString(undefined, {minimumFractionDigits: 2})}</Text>
                  <View style={styles.vDivider} />
                  <Text style={[styles.tdLeft, { color: '#ef4444', fontWeight: '800' }]}>Total Liability</Text>
                  <Text style={[styles.tdRight, { color: '#ef4444', fontWeight: '800' }]}>-{currencySymbol}{totalDed.toLocaleString(undefined, {minimumFractionDigits: 2})}</Text>
                </View>
              </View>

              {/* Net Banner */}
              <View style={styles.netBanner}>
                <View>
                  <Text style={styles.netBannerLbl}>AUTHENTICATED NET DISBURSEMENT</Text>
                  <Text style={styles.netBannerVal}>{currencySymbol}{net.toLocaleString(undefined, {minimumFractionDigits: 2})}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', flex: 1, paddingLeft: 16 }}>
                  <Text style={styles.amountWordsLbl}>AMOUNT IN WORDS</Text>
                  <Text style={styles.amountWordsVal} numberOfLines={2} adjustsFontSizeToFit>{words}</Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.footerRow}>
                <View>
                  <Text style={styles.footerLeft}>THIS IS A SYSTEM GENERATED STATEMENT</Text>
                  <Text style={styles.footerLeft}>AND DOES NOT REQUIRE SIGNATURE.</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.authSig}>VERIFIED DOCUMENT</Text>
                  <Text style={styles.footerLeft}>© {new Date().getFullYear()} {companyName.toUpperCase()}</Text>
                </View>
              </View>
              
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  headerSub: { fontSize: 10, fontWeight: '800', color: '#94a3b8', marginTop: 2, letterSpacing: 0.5 },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  paper: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  paperHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 16
  },
  companyName: { fontSize: 20, fontWeight: '900', color: '#4f46e5', letterSpacing: -0.5 },
  docType: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 1, marginTop: 4 },
  docSub: { fontSize: 9, fontWeight: '700', color: '#94a3b8', letterSpacing: 1, marginTop: 2 },
  
  periodValue: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  periodLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', letterSpacing: 1, marginTop: 4 },

  infoRow: {
    flexDirection: 'column',
    gap: 20,
    marginBottom: 24
  },
  infoCol: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3b82f6',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 6,
    marginBottom: 10
  },
  detailRow: { flexDirection: 'row', marginBottom: 6, justifyContent: 'space-between' },
  detailLbl: { flex: 1, fontSize: 11, fontWeight: '600', color: '#64748b' },
  detailVal: { flex: 1.2, fontSize: 11, fontWeight: '800', color: '#0f172a', textAlign: 'right' },

  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 10
  },
  thLeft: { flex: 1.5, fontSize: 9, fontWeight: '800', paddingLeft: 12, letterSpacing: 0.5 },
  thRight: { flex: 1, fontSize: 9, fontWeight: '800', textAlign: 'right', paddingRight: 12, letterSpacing: 0.5 },
  vDivider: { width: 1, backgroundColor: '#e2e8f0' },
  tRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 10
  },
  tdLeft: { flex: 1.5, fontSize: 10, fontWeight: '600', color: '#64748b', paddingLeft: 12 },
  tdRight: { flex: 1, fontSize: 10, fontWeight: '800', color: '#0f172a', textAlign: 'right', paddingRight: 12 },

  netBanner: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  netBannerLbl: { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  netBannerVal: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 4, letterSpacing: -1 },
  amountWordsLbl: { fontSize: 8, fontWeight: '800', color: '#64748b', letterSpacing: 0.5, marginBottom: 4 },
  amountWordsVal: { fontSize: 10, fontWeight: '700', color: '#fff', textAlign: 'right', fontStyle: 'italic' },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10
  },
  footerLeft: { fontSize: 8, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.5 },
  authSig: { fontSize: 10, fontWeight: '800', color: '#10b981', marginBottom: 2, letterSpacing: 1 }
});
