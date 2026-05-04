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
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import api from '../../services/api';

const schema = z.object({
  password: z.string().min(8, 'Minimum 8 characters'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: "Passwords don't match", path: ['confirm'] });

type ResetPasswordFormData = {
  password: string;
  confirm: string;
};

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get token from route params
  const { token } = route.params as { token?: string } || {};

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      confirm: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      Alert.alert('Error', 'Invalid or missing reset token');
      return;
    }

    setIsLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { 
        password: data.password, 
        confirmPassword: data.confirm 
      });
      
      Alert.alert(
        'Success', 
        'Password reset successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login' as never)
          }
        ]
      );
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to reset password';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#ffffff' }}
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
              Security
            </Text>
            <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '500' }}>
              Reset your credentials. Choose a secure phrase.
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 24 }}>
            {/* New Password Field */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 8 }}>
                New Password
              </Text>
              <View style={{ position: 'relative' }}>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="••••••••"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showPassword}
                      style={{
                        height: 56,
                        backgroundColor: '#f1f5f9',
                        borderWidth: 1,
                        borderColor: errors.password ? '#ef4444' : '#e2e8f0',
                        borderRadius: 16,
                        paddingLeft: 16,
                        paddingRight: 48,
                        fontSize: 16,
                        color: '#0f172a',
                      }}
                    />
                  )}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 16, top: 18 }}
                >
                  {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4, marginLeft: 8 }}>
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Confirm Password Field */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 8 }}>
                Confirm Password
              </Text>
              <View style={{ position: 'relative' }}>
                <Controller
                  control={control}
                  name="confirm"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="••••••••"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showConfirmPassword}
                      style={{
                        height: 56,
                        backgroundColor: '#f1f5f9',
                        borderWidth: 1,
                        borderColor: errors.confirm ? '#ef4444' : '#e2e8f0',
                        borderRadius: 16,
                        paddingLeft: 16,
                        paddingRight: 48,
                        fontSize: 16,
                        color: '#0f172a',
                      }}
                    />
                  )}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: 16, top: 18 }}
                >
                  {showConfirmPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
              {errors.confirm && (
                <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4, marginLeft: 8 }}>
                  {errors.confirm.message}
                </Text>
              )}
            </View>

            {/* Submit Button */}
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
                marginTop: 8,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 }}>
                  Revise Credentials
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
              <Text style={{ color: '#3b82f6', fontWeight: '700', fontSize: 14 }}>
                Abort and return to login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}