// screens/login/SignupPage.tsx
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
  Dimensions,
  Animated,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Building2,
  Phone,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react-native';
import api from '../../services/api';

const { width, height } = Dimensions.get('window');

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name is required'),
  organizationName: z.string().min(2, 'Organization name is required'),
  phoneNumber: z.string().length(10, 'Phone number must be 10 digits').regex(/^\d+$/, 'Only digits allowed'),
  otp: z.string().length(6, 'Verification code must be 6 digits'),
});

type SignupFormData = {
  email: string;
  password: string;
  name: string;
  organizationName: string;
  phoneNumber: string;
  otp: string;
};

const GoogleIcon = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Text style={{ fontSize: 24, fontWeight: '900', color: '#4285F4' }}>G</Text>
    <Text style={{ fontSize: 24, fontWeight: '900', color: '#EA4335' }}>o</Text>
    <Text style={{ fontSize: 24, fontWeight: '900', color: '#FBBC05' }}>o</Text>
    <Text style={{ fontSize: 24, fontWeight: '900', color: '#4285F4' }}>g</Text>
    <Text style={{ fontSize: 24, fontWeight: '900', color: '#34A853' }}>l</Text>
    <Text style={{ fontSize: 24, fontWeight: '900', color: '#EA4335' }}>e</Text>
  </View>
);

export default function SignupPage() {
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      organizationName: '',
      phoneNumber: '',
      otp: '',
    },
  });

  const formValues = watch();

  const handleSendOTP = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Error', 'Please enter a valid work email');
      return;
    }

    setIsSendingOTP(true);
    try {
      await api.post('/auth/send-verification-otp', { email });
      setEmailSent(true);
      Alert.alert('Success', 'Verification code sent to your email');
    } catch (error: any) {
      console.log('OTP Send Error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to send code';
      Alert.alert('Error', message);
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleVerifyOTP = async (email: string, otp: string) => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Enter 6-digit code');
      return;
    }

    setIsVerifyingOTP(true);
    try {
      const verifyRes = await api.post('/auth/verify-verification-otp', { email, otp });
      console.log('OTP Verification Response:', verifyRes);
      setEmailVerified(true);
      Alert.alert('Success', 'Email verified successfully!');
    } catch (error: any) {
      console.log('OTP Verify Error:', error);
      const message = error.response?.data?.message || error.message || 'Invalid code';
      Alert.alert('Error', message);
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const onSubmit = async (data: SignupFormData) => {
    if (!emailVerified) {
      Alert.alert('Error', 'Please verify your email first');
      return;
    }

    console.log('Sending Registration Data:', JSON.stringify(data, null, 2));
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        confirmPassword: data.password // Many backends require this
      };
      const response = await api.post('/auth/register', payload);
      console.log('Registration Success:', response);
      Alert.alert(
        'Success',
        'Account created successfully! Please log in.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login' as never),
          },
        ]
      );
    } catch (error: any) {
      console.log('Registration Error Details:', {
        message: error.message,
        data: error.response?.data,
        status: error.status
      });

      const { message, errors: serverErrors } = error.response?.data || {};

      if (serverErrors && typeof serverErrors === 'object') {
        Object.entries(serverErrors).forEach(([field, msg]) => {
          setError(field as keyof SignupFormData, { 
            type: 'server', 
            message: msg as string 
          });
        });
        
        // Show the first error in an alert for immediate feedback
        const firstError = Object.values(serverErrors)[0] as string;
        Alert.alert('Registration Failed', firstError || 'Please correct the errors below.');
      } else {
        const fallbackMsg = message || error.message || 'Registration failed. Please try again.';
        Alert.alert('Registration Failed', fallbackMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    // For mobile, you'd typically use the proper OAuth flow
    // This redirects to the backend endpoint, but for a real app,
    // you'd want to use react-native-app-auth or similar
    try {
      // Implementation would depend on your OAuth setup
      // This is a placeholder for the actual OAuth implementation
      Alert.alert(
        'Social Login',
        `Redirecting to ${provider} authentication...`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', 'Social login failed');
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
              marginBottom: 24,
            }}
          >
            <ArrowLeft size={20} color="#3b82f6" />
            <Text style={{ color: '#3b82f6', fontWeight: '700', fontSize: 14 }}>Back</Text>
          </TouchableOpacity>

          {/* Header Section */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: 40, fontWeight: '800', color: '#0f172a', marginBottom: 12, textAlign: 'center' }}>
              Join CalTIMS
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', textAlign: 'center' }}>
              Please enter your details to create an account.
            </Text>
            <View style={{ width: 64, height: 4, backgroundColor: '#3b82f6', borderRadius: 2, marginTop: 16 }} />
          </View>

          {/* Social Login Buttons */}
          <View style={{ marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => handleSocialLogin('google')}
              disabled={isSocialLoading}
              activeOpacity={0.7}
              style={{
                height: 56,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                backgroundColor: 'white',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
                opacity: isSocialLoading ? 0.5 : 1,
                marginBottom: 12,
              }}
            >
              <GoogleIcon />
              <Text style={{ marginLeft: 12, fontWeight: '600', color: '#334155', fontSize: 14 }}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
              <Text style={{ marginHorizontal: 16, fontSize: 12, fontWeight: '600', color: '#94a3b8' }}>
                or sign up with email
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
            </View>
          </View>

          {/* Signup Form */}
          <View style={{ gap: 20 }}>
            {/* Full Name Field */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>
                FULL NAME
              </Text>
              <View style={{ position: 'relative' }}>
                <User
                  size={18}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: 16, top: 18, zIndex: 1 }}
                />
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="John Doe"
                      placeholderTextColor="#94a3b8"
                      style={{
                        height: 56,
                        backgroundColor: '#f1f5f9',
                        borderWidth: 1,
                        borderColor: errors.name ? '#ef4444' : '#e2e8f0',
                        borderRadius: 16,
                        paddingLeft: 48,
                        paddingRight: 16,
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#0f172a',
                      }}
                    />
                  )}
                />
              </View>
              {errors.name && (
                <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600', marginTop: 4, marginLeft: 8 }}>
                  {errors.name.message}
                </Text>
              )}
            </View>

            {/* Company Name & Phone Number Row */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>
                  ORGANIZATION
                </Text>
                <View style={{ position: 'relative' }}>
                  <Building2
                    size={18}
                    color="#94a3b8"
                    style={{ position: 'absolute', left: 16, top: 18, zIndex: 1 }}
                  />
                  <Controller
                    control={control}
                    name="organizationName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        placeholder="Company"
                        placeholderTextColor="#94a3b8"
                        style={{
                          height: 56,
                          backgroundColor: '#f1f5f9',
                          borderWidth: 1,
                          borderColor: errors.organizationName ? '#ef4444' : '#e2e8f0',
                          borderRadius: 16,
                          paddingLeft: 48,
                          paddingRight: 16,
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0f172a',
                        }}
                      />
                    )}
                  />
                </View>
                {errors.organizationName && (
                  <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600', marginTop: 4, marginLeft: 8 }}>
                    {errors.organizationName.message}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>
                  PHONE
                </Text>
                <View style={{ position: 'relative' }}>
                  <Phone
                    size={18}
                    color="#94a3b8"
                    style={{ position: 'absolute', left: 16, top: 18, zIndex: 1 }}
                  />
                  <Controller
                    control={control}
                    name="phoneNumber"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        onBlur={onBlur}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                          onChange(cleaned);
                        }}
                        value={value}
                        placeholder="10-digit"
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                        maxLength={10}
                        style={{
                          height: 56,
                          backgroundColor: '#f1f5f9',
                          borderWidth: 1,
                          borderColor: errors.phoneNumber ? '#ef4444' : '#e2e8f0',
                          borderRadius: 16,
                          paddingLeft: 48,
                          paddingRight: 16,
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0f172a',
                        }}
                      />
                    )}
                  />
                </View>
                {errors.phoneNumber && (
                  <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600', marginTop: 4, marginLeft: 8 }}>
                    {errors.phoneNumber.message}
                  </Text>
                )}
              </View>
            </View>

            {/* Email with Verification */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>
                WORK EMAIL
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
                      editable={!emailVerified}
                      style={{
                        height: 56,
                        backgroundColor: emailVerified ? '#f0fdf4' : '#f1f5f9',
                        borderWidth: 1,
                        borderColor: emailVerified ? '#22c55e' : errors.email ? '#ef4444' : '#e2e8f0',
                        borderRadius: 16,
                        paddingLeft: 48,
                        paddingRight: emailVerified ? 48 : 80,
                        fontSize: 14,
                        fontWeight: '600',
                        color: emailVerified ? '#166534' : '#0f172a',
                        opacity: emailVerified ? 0.8 : 1,
                      }}
                    />
                  )}
                />
                {!emailVerified && (
                  <TouchableOpacity
                    onPress={() => handleSendOTP(formValues.email)}
                    disabled={isSendingOTP || !formValues.email}
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: 4,
                      bottom: 4,
                      paddingHorizontal: 12,
                      backgroundColor: '#0f172a',
                      borderRadius: 12,
                      justifyContent: 'center',
                      alignItems: 'center',
                      opacity: isSendingOTP || !formValues.email ? 0.5 : 1,
                    }}
                  >
                    {isSendingOTP ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={{ color: 'white', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
                        {emailSent ? 'RESEND' : 'VERIFY'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                {emailVerified && (
                  <View style={{ position: 'absolute', right: 16, top: 16 }}>
                    <CheckCircle2 size={24} color="#22c55e" />
                  </View>
                )}
              </View>
              {errors.email && (
                <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600', marginTop: 4, marginLeft: 8 }}>
                  {errors.email.message}
                </Text>
              )}
            </View>

            {/* OTP Verification */}
            {emailSent && !emailVerified && (
              <View
                style={{
                  padding: 16,
                  backgroundColor: '#eff6ff',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#bfdbfe',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#1e40af', letterSpacing: 1, marginBottom: 12 }}>
                  SECURITY CODE
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Controller
                    control={control}
                    name="otp"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        placeholder="000000"
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        maxLength={6}
                        style={{
                          flex: 1,
                          height: 56,
                          backgroundColor: 'white',
                          borderWidth: 1,
                          borderColor: '#bfdbfe',
                          borderRadius: 12,
                          textAlign: 'center',
                          fontSize: 20,
                          fontWeight: '900',
                          letterSpacing: 8,
                          color: '#0f172a',
                        }}
                      />
                    )}
                  />
                  <TouchableOpacity
                    onPress={() => handleVerifyOTP(formValues.email, formValues.otp)}
                    disabled={isVerifyingOTP || !formValues.otp}
                    style={{
                      paddingHorizontal: 24,
                      height: 56,
                      backgroundColor: '#3b82f6',
                      borderRadius: 12,
                      justifyContent: 'center',
                      alignItems: 'center',
                      opacity: isVerifyingOTP || !formValues.otp ? 0.5 : 1,
                    }}
                  >
                    {isVerifyingOTP ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={{ color: 'white', fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>
                        CHECK
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#1e40af', marginTop: 8, letterSpacing: 1 }}>
                  Check your inbox for the 6-digit code
                </Text>
              </View>
            )}

            {/* Password Field - Only shown when email verified or not sent */}
            {(!emailSent || emailVerified) && (
              <View>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>
                  PASSWORD
                </Text>
                <View style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    color="#94a3b8"
                    style={{ position: 'absolute', left: 16, top: 18, zIndex: 1 }}
                  />
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
                        editable={emailVerified}
                        style={{
                          height: 56,
                          backgroundColor: emailVerified ? '#f1f5f9' : '#f8fafc',
                          borderWidth: 1,
                          borderColor: errors.password ? '#ef4444' : '#e2e8f0',
                          borderRadius: 16,
                          paddingLeft: 48,
                          paddingRight: 48,
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0f172a',
                          opacity: emailVerified ? 1 : 0.5,
                        }}
                      />
                    )}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 16, top: 18 }}
                    disabled={!emailVerified}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={emailVerified ? '#94a3b8' : '#cbd5e1'} />
                    ) : (
                      <Eye size={18} color={emailVerified ? '#94a3b8' : '#cbd5e1'} />
                    )}
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600', marginTop: 4, marginLeft: 8 }}>
                    {errors.password.message}
                  </Text>
                )}
                {!emailVerified && emailSent && (
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#94a3b8', marginTop: 4, marginLeft: 8, letterSpacing: 1 }}>
                    VERIFY EMAIL TO SET PASSWORD
                  </Text>
                )}
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading || !emailVerified}
              activeOpacity={0.9}
              style={{ marginTop: 16 }}
            >
              <View
                style={{
                  height: 56,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#3b82f6',
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                  opacity: isLoading || !emailVerified ? 0.7 : 1,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 16, letterSpacing: 1 }}>
                    Create Organization
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={{ marginTop: 32, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b' }}>
                Already have an account?
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#3b82f6' }}>
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}