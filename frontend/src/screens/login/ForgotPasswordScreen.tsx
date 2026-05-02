import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import { Mail, ArrowLeft } from 'lucide-react-native';
import api from '../../services/api';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type ForgotPasswordFormData = {
  email: string;
};

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', data);
      setSent(true);
      Alert.alert('Success', 'Reset link sent to your email');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to send reset link. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ alignItems: 'center', gap: 24 }}>
          <View
            style={{
              width: 80,
              height: 80,
              backgroundColor: '#ecfdf5',
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Mail size={32} color="#059669" />
          </View>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#0f172a' }}>Check your email</Text>
            <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', paddingHorizontal: 24 }}>
              A password recovery link has been dispatched to your corporate email address.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login' as never)}
            style={{
              width: '100%',
              height: 56,
              backgroundColor: '#3b82f6',
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#3b82f6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Return to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: 32,
            }}
          >
            <ArrowLeft size={20} color="#3b82f6" />
            <Text style={{ color: '#3b82f6', fontWeight: '700', fontSize: 14 }}>Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={{ marginBottom: 48 }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
              Recovery
            </Text>
            <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '500' }}>
              Lost access? Enter your email to begin restoration.
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 24 }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 8 }}>
                Work Email
              </Text>
              <View style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: 16, top: 18, zIndex: 1 }}
                />
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="name@company.com"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={{
                        height: 56,
                        backgroundColor: '#f1f5f9',
                        borderWidth: 1,
                        borderColor: errors.email ? '#ef4444' : '#e2e8f0',
                        borderRadius: 16,
                        paddingLeft: 48,
                        paddingRight: 16,
                        fontSize: 16,
                        color: '#0f172a',
                      }}
                    />
                  )}
                />
              </View>
              {errors.email && (
                <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4, marginLeft: 8 }}>
                  {errors.email.message}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              style={{
                height: 56,
                backgroundColor: '#3b82f6',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#3b82f6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 }}>
                  Send Reset Link
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={{ marginTop: 48, paddingTop: 32, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login' as never)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <ArrowLeft size={18} color="#3b82f6" />
              <Text style={{ color: '#3b82f6', fontWeight: '700', fontSize: 14 }}>Back to login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}