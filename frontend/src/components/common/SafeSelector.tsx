import React from 'react';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { X, ChevronDown, Check } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface Option {
  label: string;
  value: string | number;
}

export interface SafeSelectorProps {
  label?: string;
  options: Option[];
  selectedValue: string | number;
  onValueChange: (value: any) => void;
  placeholder?: string;
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
  style?: any;
  triggerStyle?: any;
}

export default function SafeSelector({
  label,
  options,
  selectedValue,
  onValueChange,
  placeholder = 'Select option',
  visible,
  onOpen,
  onClose,
  style,
  triggerStyle,
}: SafeSelectorProps) {
  const selectedOption = options.find(o => o.value === selectedValue);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={[styles.trigger, triggerStyle]} onPress={onOpen} activeOpacity={0.7}>
        <Text 
          style={[styles.triggerText, !selectedOption && styles.placeholder]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={14} color="#64748b" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{label || 'Select Option'}</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item.value === selectedValue && styles.selectedOption
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    item.value === selectedValue && styles.selectedOptionText
                  ]}>
                    {item.label}
                  </Text>
                  {item.value === selectedValue && (
                    <Check size={18} color="#6366f1" />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.listContent}
              maxToRenderPerBatch={10}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: verticalScale(8),
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    minHeight: verticalScale(48),
  },
  triggerText: {
    fontSize: moderateScale(14),
    color: '#1e293b',
    fontWeight: '500',
  },
  placeholder: {
    color: '#94a3b8',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: scale(24),
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.7,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#1e293b',
  },
  listContent: {
    paddingVertical: verticalScale(8),
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
  },
  selectedOption: {
    backgroundColor: '#f5f7ff',
  },
  optionText: {
    fontSize: moderateScale(15),
    color: '#475569',
  },
  selectedOptionText: {
    color: '#6366f1',
    fontWeight: '600',
  },
});
