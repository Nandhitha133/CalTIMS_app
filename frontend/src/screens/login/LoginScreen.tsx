import React, { useState, useEffect, useRef } from 'react';
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
  Linking,
  Animated,
  StyleSheet,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Mail, Lock, Eye, EyeOff, ChevronRight, Square, CheckSquare } from 'lucide-react-native';
import api, { BASE_URL } from '../../services/api';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean(),
});

type LoginFormData = z.infer<typeof schema>;

const GoogleIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

export default function LoginScreen() {
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });



  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    loadRememberedEmail();
  }, []);

  const loadRememberedEmail = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('rememberedEmail');
      if (savedEmail) {
        setValue('email', savedEmail);
        setValue('rememberMe', true);
      }
    } catch (error) {
      console.error('Error loading remembered email:', error);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await api.post<any>('/auth/login', data);
      
      let accessToken, refreshToken, user;
      
      if (response.data && response.data.data) {
        accessToken = response.data.data.accessToken;
        refreshToken = response.data.data.refreshToken;
        user = response.data.data.user;
      } else if (response.data && response.data.accessToken) {
        accessToken = response.data.accessToken;
        refreshToken = response.data.refreshToken;
        user = response.data.user;
      } else if (response.accessToken) {
        accessToken = response.accessToken;
        refreshToken = response.refreshToken;
        user = response.user;
      } else {
        throw new Error('Unable to extract tokens from response');
      }
      
      if (!accessToken || !user) {
        throw new Error('Missing access token or user data');
      }
      
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken || '');
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      if (data.rememberMe) {
        await AsyncStorage.setItem('rememberedEmail', data.email);
      } else {
        await AsyncStorage.removeItem('rememberedEmail');
      }
      
      if (user.role === 'super_admin' || user.role === 'admin') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'AdminDashboard' as never }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' as never }],
        });
      }
    } catch (error: any) {
      let message = 'Invalid email or password';
      if (error.message) message = error.message;
      if (error.response?.data?.message) message = error.response.data.message;
      
      Alert.alert('Login Failed', message);
      setError('email', { message: 'Invalid credentials' });
      setError('password', { message: 'Invalid credentials' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async () => {
    try {
      const googleAuthUrl = `${BASE_URL}/auth/google?platform=mobile`;
      await Linking.openURL(googleAuthUrl);
    } catch (error) {
      Alert.alert('Error', 'Could not start Google Sign In. Please try again.');
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword' as never);
  };

  const handleSignUp = () => {
    navigation.navigate('Signup' as never);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.titleSection}>
                <Text style={styles.title}>Sign In</Text>
                <View style={styles.titleUnderline} />
              </View>
            </View>

            {/* Google Sign In Button */}
            <TouchableOpacity
              onPress={handleSocialLogin}
              activeOpacity={0.9}
              style={styles.googleButton}
            >
              <LinearGradient
                colors={['#2196f3', '#1976d2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.googleGradient}
              >
                <View style={styles.googleIconContainer}>
                  <GoogleIcon />
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR USE YOUR WORK ACCOUNT</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Login Form */}
            <View style={styles.form}>
              {/* Email Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Work Email</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#94a3b8" style={styles.inputIcon} />
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
                        style={[
                          styles.input,
                          errors.email && styles.inputError,
                        ]}
                      />
                    )}
                  />
                </View>
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email.message}</Text>
                )}
              </View>

              {/* Password Field */}
              <View style={styles.inputGroup}>
                <View style={styles.passwordHeader}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TouchableOpacity onPress={handleForgotPassword}>
                    <Text style={styles.forgotPassword}>Forgot?</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#94a3b8" style={styles.inputIcon} />
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
                        style={[
                          styles.input,
                          errors.password && styles.inputError,
                        ]}
                      />
                    )}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#94a3b8" />
                    ) : (
                      <Eye size={20} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password.message}</Text>
                )}
              </View>

              {/* Remember Me Checkbox */}
              <Controller
                control={control}
                name="rememberMe"
                render={({ field: { onChange, value } }) => (
                  <TouchableOpacity 
                    style={styles.rememberRow} 
                    onPress={() => onChange(!value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.checkbox}>
                      {value ? (
                        <CheckSquare size={20} color="#2196f3" />
                      ) : (
                        <Square size={20} color="#94a3b8" />
                      )}
                    </View>
                    <Text style={styles.rememberText}>Remember my email address</Text>
                  </TouchableOpacity>
                )}
              />

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit(onSubmit)}
                disabled={isLoading}
                activeOpacity={0.9}
                style={styles.submitButton}
              >
                <LinearGradient
                  colors={['#2196f3', '#1976d2', '#0d47a1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Sign In to Portal</Text>
                      <ChevronRight size={22} color="white" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                New organization?{' '}
                <Text style={styles.footerLink} onPress={handleSignUp}>
                  Start 28-day free trial
                </Text>
              </Text>
              <Text style={styles.footerNote}>
                Securing workforce productivity in real-time.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  titleSection: {
    marginBottom: 8,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  titleUnderline: {
    width: 64,
    height: 4,
    backgroundColor: '#2196f3',
    borderRadius: 2,
  },
  googleButton: {
    marginBottom: 32,
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  googleGradient: {
    height: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleIconContainer: {
    backgroundColor: 'white',
    padding: 6,
    borderRadius: 8,
  },
  googleButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.5,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
    marginLeft: 4,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPassword: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2196f3',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 64,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingLeft: 48,
    paddingRight: 48,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 8,
  },
  submitButton: {
    marginTop: 8,
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitGradient: {
    height: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  footer: {
    marginTop: 48,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    gap: 12,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  footerLink: {
    color: '#2196f3',
    fontWeight: '800',
  },
  footerNote: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  checkbox: {
    marginRight: 8,
  },
  rememberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
});