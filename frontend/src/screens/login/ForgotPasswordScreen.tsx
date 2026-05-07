// screens/login/ForgotPasswordPage.tsx
import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import {
  Mail,
  ArrowLeft,
  Key,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react-native';
import api from '../../services/api';

const { width } = Dimensions.get('window');

// Validation schemas for each step
const emailSchema = z.object({
  email: z.string().email('Enter a valid email')
});

const otpSchema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit code')
});

const passwordSchema = z.object({
  password: z.string().min(8, 'Minimum 8 characters'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ['confirm']
});

type EmailFormData = { email: string };
type OTPFormData = { otp: string };
type PasswordFormData = { password: string; confirm: string };

export default function ForgotPasswordPage() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Progress bar animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [1, 3],
    outputRange: ['33%', '100%'],
    extrapolate: 'clamp',
  });

  const animateTransition = (nextStep: number) => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -30,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => setStep(nextStep));
  };

  // --- Step 1: Send OTP ---
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' }
  });

  const handleSendOTP = async (data: EmailFormData) => {
    setIsSending(true);
    try {
      const trimmedEmail = data.email.trim().toLowerCase();
      console.log('Sending Forgot Password OTP to:', trimmedEmail);
      await api.post('/auth/forgot-password-otp', { email: trimmedEmail });
      setEmail(trimmedEmail);
      animateTransition(2);
      Alert.alert('Success', 'Recovery code sent to your email');
    } catch (error: any) {
      console.log('Forgot Password OTP Error:', {
        message: error.message,
        data: error.response?.data,
        status: error.status
      });
      const message = error.response?.data?.message || 'Failed to send code';
      Alert.alert('Error', message);
    } finally {
      setIsSending(false);
    }
  };

  // --- Step 2: Verify OTP ---
  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' }
  });

  const handleVerifyOTP = async (data: OTPFormData) => {
    setIsVerifying(true);
    try {
      console.log('Verifying OTP for:', email);
      const response: any = await api.post('/auth/verify-reset-otp', {
        email,
        otp: data.otp
      });

      console.log('OTP Verification Full Response:', JSON.stringify(response, null, 2));

      // Capture token with extreme robustness
      const serverToken =
        response?.data?.token ||
        response?.data?.resetToken ||
        response?.data?.reset_token ||
        response?.data?.verificationToken ||
        response?.data?.data?.token ||
        response?.data?.data?.resetToken ||
        response?.data?.data?.verificationToken ||
        response?.token ||
        response?.resetToken ||
        response?.reset_token ||
        (typeof response?.data === 'string' && response.data.length > 10 ? response.data : null) ||
        (response?.data?.id && typeof response.data.id === 'string' ? response.data.id : null);

      if (serverToken) {
        console.log('Successfully captured reset token');
        setOtp(serverToken);
      } else {
        console.log('No specific token found, continuing with 6-digit code');
        setOtp(data.otp);
      }

      animateTransition(3);
      Alert.alert('Success', 'Code verified. Set your new password.');
    } catch (error: any) {
      console.log('OTP Verification Error:', {
        message: error.message,
        data: error.response?.data,
        status: error.status
      });
      const message = error.response?.data?.message || 'Invalid code';
      Alert.alert('Error', message);
    } finally {
      setIsVerifying(false);
    }
  };

  // --- Step 3: Reset Password ---
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' }
  });

  const handleResetPassword = async (data: PasswordFormData) => {
    setIsResetting(true);
    const isOTP = /^\d{6}$/.test(otp);

    // Create an exhaustive payload to cover all possible backend naming conventions
    const payload = {
      email,
      user_email: email,
      otp: isOTP ? otp : undefined,
      OTP: isOTP ? otp : undefined,
      code: isOTP ? otp : undefined,
      otpCode: isOTP ? otp : undefined,
      otp_code: isOTP ? otp : undefined,
      verificationCode: isOTP ? otp : undefined,
      verification_code: isOTP ? otp : undefined,
      token: otp,
      resetToken: otp,
      reset_token: otp,
      verificationToken: otp,
      verification_token: otp,
      password: data.password,
      newPassword: data.password,
      new_password: data.password,
      confirmPassword: data.confirm || data.password,
      confirm_password: data.confirm || data.password,
      password_confirmation: data.confirm || data.password,
      confirm: data.confirm || data.password
    };

    console.log('Resetting Password - isOTP:', isOTP, 'Payload:', JSON.stringify(payload, null, 2));

    try {
      // Strategy 1: Specialized OTP reset endpoint
      console.log('Attempting Strategy 1: /auth/reset-password-with-otp');
      await api.post('/auth/reset-password-with-otp', payload);
      handleResetSuccess();
    } catch (error: any) {
      console.log('Strategy 1 failed:', error.response?.data?.message || error.message);

      try {
        // Strategy 2: URL-parameter based reset (standard pattern)
        console.log(`Attempting Strategy 2: /auth/reset-password/${otp}`);
        await api.post(`/auth/reset-password/${otp}`, {
          email,
          password: data.password,
          confirmPassword: data.confirm || data.password
        });
        handleResetSuccess();
      } catch (secondaryError: any) {
        console.log('Strategy 2 failed:', secondaryError.response?.data?.message || secondaryError.message);

        try {
          // Strategy 3: Standard POST endpoint with token in body
          console.log('Attempting Strategy 3: /auth/reset-password (body-only)');
          await api.post('/auth/reset-password', payload);
          handleResetSuccess();
        } catch (tertiaryError: any) {
          console.log('Strategy 3 failed:', tertiaryError.response?.data?.message || tertiaryError.message);

          try {
            // Strategy 4: Another common variant
            console.log('Attempting Strategy 4: /auth/reset-password-otp');
            await api.post('/auth/reset-password-otp', payload);
            handleResetSuccess();
          } catch (quaternaryError: any) {
            console.log('Strategy 4 failed:', quaternaryError.response?.data?.message || quaternaryError.message);

            // Final failure notification - try to show the most useful error
            const finalMessage =
              quaternaryError.response?.data?.message ||
              tertiaryError.response?.data?.message ||
              secondaryError.response?.data?.message ||
              error.response?.data?.message ||
              'Reset failed: ' + (quaternaryError.response?.data?.error || 'Token invalid or expired');

            Alert.alert('Error', finalMessage);
          }
        }
      }
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetSuccess = () => {
    Alert.alert(
      'Success',
      'Password updated! You can now log in.',
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login' as never),
        },
      ]
    );
  };

  const handleResendOTP = async () => {
    setIsSending(true);
    try {
      await api.post('/auth/forgot-password-otp', { email });
      Alert.alert('Success', 'New recovery code sent');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to resend code';
      Alert.alert('Error', message);
    } finally {
      setIsSending(false);
    }
  };

  const renderStep1 = () => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
        gap: 24,
      }}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <View
          style={{
            width: 72,
            height: 72,
            backgroundColor: '#eff6ff',
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Key size={36} color="#3b82f6" />
        </View>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#0f172a', marginBottom: 8, letterSpacing: -0.5 }}>
          Recovery
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', textAlign: 'center', lineHeight: 20 }}>
          Enter your email to receive{'\n'}a recovery code.
        </Text>
      </View>

      {/* Form */}
      <View style={{ gap: 16 }}>
        <View>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 2, marginBottom: 8, marginLeft: 4 }}>
            WORK EMAIL
          </Text>
          <View style={{ position: 'relative' }}>
            <Mail
              size={18}
              color="#94a3b8"
              style={{ position: 'absolute', left: 16, top: 18, zIndex: 1 }}
            />
            <Controller
              control={emailForm.control}
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
                  autoFocus
                  style={{
                    height: 56,
                    backgroundColor: '#f1f5f9',
                    borderWidth: 1,
                    borderColor: emailForm.formState.errors.email ? '#ef4444' : '#e2e8f0',
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
          {emailForm.formState.errors.email && (
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#ef4444', marginTop: 4, marginLeft: 8, letterSpacing: 1 }}>
              {emailForm.formState.errors.email.message}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={emailForm.handleSubmit(handleSendOTP)}
          disabled={isSending}
          activeOpacity={0.9}
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
            opacity: isSending ? 0.7 : 1,
            flexDirection: 'row',
            gap: 8,
          }}
        >
          {isSending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14, letterSpacing: 2 }}>
                SEND CODE
              </Text>
              <ChevronRight size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
        gap: 24,
      }}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <View
          style={{
            width: 72,
            height: 72,
            backgroundColor: '#f0fdf4',
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <ShieldCheck size={36} color="#22c55e" />
        </View>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 8, letterSpacing: -0.5 }}>
          Verify Code
        </Text>
        <View style={{ paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', textAlign: 'center', lineHeight: 20 }}>
            We've sent a 6-digit code to{'\n'}
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>{email}</Text>
          </Text>
        </View>
      </View>

      {/* Form */}
      <View style={{ gap: 16 }}>
        <View>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 2, marginBottom: 8, marginLeft: 4, textAlign: 'center' }}>
            OTP CODE
          </Text>
          <Controller
            control={otpForm.control}
            name="otp"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                onBlur={onBlur}
                onChangeText={(text) => {
                  // Only allow digits
                  const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                  onChange(cleaned);
                }}
                value={value}
                placeholder="000000"
                placeholderTextColor="#cbd5e1"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                style={{
                  height: 64,
                  backgroundColor: '#f1f5f9',
                  borderWidth: 1,
                  borderColor: otpForm.formState.errors.otp ? '#ef4444' : '#e2e8f0',
                  borderRadius: 16,
                  textAlign: 'center',
                  fontSize: 24,
                  fontWeight: '900',
                  letterSpacing: 16,
                  color: '#0f172a',
                }}
              />
            )}
          />
          {otpForm.formState.errors.otp && (
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#ef4444', marginTop: 4, marginLeft: 8, textAlign: 'center', letterSpacing: 1 }}>
              {otpForm.formState.errors.otp.message}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={otpForm.handleSubmit(handleVerifyOTP)}
          disabled={isVerifying}
          activeOpacity={0.9}
          style={{
            height: 56,
            backgroundColor: '#22c55e',
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#22c55e',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
            opacity: isVerifying ? 0.7 : 1,
            flexDirection: 'row',
            gap: 8,
          }}
        >
          {isVerifying ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14, letterSpacing: 2 }}>
                VERIFY & CONTINUE
              </Text>
              <ChevronRight size={20} color="white" />
            </>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => animateTransition(1)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <ArrowLeft size={14} color="#94a3b8" />
            <Text style={{ color: '#94a3b8', fontWeight: '600', fontSize: 12, letterSpacing: 1 }}>
              INCORRECT EMAIL?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResendOTP}
            disabled={isSending}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <RefreshCw size={14} color="#3b82f6" />
            )}
            <Text style={{ color: '#3b82f6', fontWeight: '600', fontSize: 12, letterSpacing: 1 }}>
              RESEND
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
        gap: 24,
      }}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <View
          style={{
            width: 72,
            height: 72,
            backgroundColor: '#fef3c7',
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Lock size={36} color="#f59e0b" />
        </View>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 8, letterSpacing: -0.5 }}>
          Set New Password
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', textAlign: 'center', lineHeight: 20 }}>
          Pick something secure that{'\n'}you haven't used before.
        </Text>
      </View>

      {/* Form */}
      <View style={{ gap: 16 }}>
        <View>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 2, marginBottom: 8, marginLeft: 4 }}>
            NEW PASSWORD
          </Text>
          <View style={{ position: 'relative' }}>
            <Lock
              size={18}
              color="#94a3b8"
              style={{ position: 'absolute', left: 16, top: 18, zIndex: 1 }}
            />
            <Controller
              control={passwordForm.control}
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
                    borderColor: passwordForm.formState.errors.password ? '#ef4444' : '#e2e8f0',
                    borderRadius: 16,
                    paddingLeft: 48,
                    paddingRight: 48,
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#0f172a',
                  }}
                />
              )}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 16, top: 18 }}
            >
              {showPassword ? (
                <EyeOff size={18} color="#94a3b8" />
              ) : (
                <Eye size={18} color="#94a3b8" />
              )}
            </TouchableOpacity>
          </View>
          {passwordForm.formState.errors.password && (
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#ef4444', marginTop: 4, marginLeft: 8, letterSpacing: 1 }}>
              {passwordForm.formState.errors.password.message}
            </Text>
          )}
        </View>

        <View>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 2, marginBottom: 8, marginLeft: 4 }}>
            CONFIRM PASSWORD
          </Text>
          <View style={{ position: 'relative' }}>
            <Lock
              size={18}
              color="#94a3b8"
              style={{ position: 'absolute', left: 16, top: 18, zIndex: 1 }}
            />
            <Controller
              control={passwordForm.control}
              name="confirm"
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
                    borderColor: passwordForm.formState.errors.confirm ? '#ef4444' : '#e2e8f0',
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
          {passwordForm.formState.errors.confirm && (
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#ef4444', marginTop: 4, marginLeft: 8, letterSpacing: 1 }}>
              {passwordForm.formState.errors.confirm.message}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={passwordForm.handleSubmit(handleResetPassword)}
          disabled={isResetting}
          activeOpacity={0.9}
          style={{
            height: 56,
            backgroundColor: '#f59e0b',
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#f59e0b',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
            opacity: isResetting ? 0.7 : 1,
            flexDirection: 'row',
            gap: 8,
          }}
        >
          {isResetting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <CheckCircle2 size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14, letterSpacing: 2 }}>
                UPDATE PASSWORD
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

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
            onPress={() => {
              if (step === 1) {
                navigation.goBack();
              } else {
                animateTransition(step - 1);
              }
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: 24,
            }}
          >
            <ArrowLeft size={20} color="#3b82f6" />
            <Text style={{ color: '#3b82f6', fontWeight: '700', fontSize: 14 }}>
              {step === 1 ? 'Back' : 'Previous Step'}
            </Text>
          </TouchableOpacity>

          {/* Progress Indicator */}
          <View style={{ marginBottom: 32 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              {[1, 2, 3].map((s) => (
                <View
                  key={s}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: s <= step ? '#3b82f6' : '#e2e8f0',
                  }}
                />
              ))}
            </View>
            <View style={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
              <Animated.View
                style={{
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  borderRadius: 2,
                  width: progressWidth,
                }}
              />
            </View>
          </View>

          {/* Step Content */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {/* Footer */}
          <View style={{ marginTop: 48, paddingTop: 32, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login' as never)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <ArrowLeft size={18} color="#94a3b8" />
              <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 12, letterSpacing: 2 }}>
                RETURN TO SIGN IN
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}