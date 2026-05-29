import React, { memo } from 'react';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';

interface DropdownModalProps {
  visible: boolean;
  onClose: () => void;
  options: { value: string; label: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  title: string;
}

const dropdownStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: 'white', borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), maxHeight: '70%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: scale(20), borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: moderateScale(18), fontWeight: '700', color: '#1e293b' },
  closeButton: { padding: scale(4) },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(20), paddingVertical: verticalScale(14), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  optionSelected: { backgroundColor: '#eff6ff' },
  optionText: { fontSize: moderateScale(15), color: '#1e293b' },
  optionTextSelected: { color: '#3b82f6', fontWeight: '600' },
  checkmark: { width: scale(8), height: verticalScale(8), borderRadius: scale(4), backgroundColor: '#3b82f6' },
});

const DropdownModal = memo(({ 
  visible, onClose, options, selectedValue, onSelect, title 
}: DropdownModalProps) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={dropdownStyles.overlay}>
      <View style={dropdownStyles.container}>
        <View style={dropdownStyles.header}>
          <Text style={dropdownStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={dropdownStyles.closeButton}>
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[dropdownStyles.option, selectedValue === option.value && dropdownStyles.optionSelected]}
              onPress={() => { onSelect(option.value); onClose(); }}
            >
              <Text style={[dropdownStyles.optionText, selectedValue === option.value && dropdownStyles.optionTextSelected]}>
                {option.label}
              </Text>
              {selectedValue === option.value && <View style={dropdownStyles.checkmark} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
));

export default DropdownModal;
