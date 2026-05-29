import React, { useState, useEffect } from 'react';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { Sparkles, X } from 'lucide-react-native';
import { apiService } from '../../services/api';

const { width } = Dimensions.get('window');

interface Subscription {
  planType: string;
  status: string;
  trialEndDate: string;
}

interface TrialBannerProps {
  onClose?: () => void;
  onUpgradePress?: () => void;
}

export default function TrialBanner({ onClose, onUpgradePress }: TrialBannerProps) {
  const navigation = useNavigation();
  const [isVisible, setIsVisible] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [diffDays, setDiffDays] = useState(0);
  const [slideAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
    fetchSubscriptionFromAPI();
  }, []);

  useEffect(() => {
    if (isVisible && diffDays > 0) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, diffDays]);

  const loadSubscription = async () => {
    try {
      const subStr = await AsyncStorage.getItem('subscription');
      console.log('Loaded subscription from storage:', subStr);
      
      if (subStr) {
        const sub = JSON.parse(subStr);
        setSubscription(sub);
        
        // Calculate days remaining
        if (sub.trialEndDate) {
          const trialEndDate = new Date(sub.trialEndDate);
          const now = new Date();
          const diffTime = trialEndDate.getTime() - now.getTime();
          const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDiffDays(days > 0 ? days : 0);
          console.log('Trial days remaining:', days);
        }
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionFromAPI = async () => {
    try {
      // Corrected endpoint from /subscription/status to /subscriptions/current
      const response = await apiService.get<{ data: Subscription }>('/subscriptions/current');
      if (response && response.data) {
        const sub = response.data;
        setSubscription(sub);
        await AsyncStorage.setItem('subscription', JSON.stringify(sub));
        
        if (sub.trialEndDate) {
          const trialEndDate = new Date(sub.trialEndDate);
          const now = new Date();
          const diffTime = trialEndDate.getTime() - now.getTime();
          const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDiffDays(days > 0 ? days : 0);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription from API:', error);
    }
  };

  const isTrial = subscription?.planType === 'TRIAL' || subscription?.planType === 'FREE' || (!subscription?.planType);
  const isExpired = subscription?.status === 'EXPIRED';
  const shouldShow = isTrial && !isExpired && isVisible && diffDays > 0 && !loading;

  const handleUpgrade = () => {
    if (onUpgradePress) {
      onUpgradePress();
    } else {
      navigation.navigate('Subscription' as never);
    }
    handleClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={['#6366f1', '#4f46e5', '#4338ca']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <View style={styles.iconContainer}>
              <Sparkles size={14} color="#ffffff" />
            </View>
            <Text style={styles.mainText}>
              Your free trial expires in{' '}
              <Text style={styles.daysText}>{diffDays} day{diffDays !== 1 ? 's' : ''}</Text>
              <Text style={styles.separator}> . </Text>
              <Text style={styles.subText}>
                Upgrade to a Pro plan to unlock all features including Payroll and AI.
              </Text>
            </Text>
          </View>

          <View style={styles.rightSection}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.6}
            >
              <X size={18} color="#ffffff" opacity={0.8} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 1000,
    elevation: 1000,
  },
  gradient: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(16),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: scale(12),
  },
  iconContainer: {
    width: scale(28),
    height: verticalScale(28),
    borderRadius: scale(6),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
  },
  mainText: {
    color: '#ffffff',
    fontSize: moderateScale(13),
    fontWeight: '500',
    flexShrink: 1,
  },
  daysText: {
    fontWeight: '700',
  },
  separator: {
    opacity: 0.6,
    fontSize: moderateScale(16),
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: moderateScale(12),
    fontWeight: '400',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  upgradeButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(7),
    borderRadius: scale(20),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
    elevation: 3,
  },
  upgradeText: {
    color: '#4f46e5',
    fontSize: moderateScale(11),
    fontWeight: '800',
    letterSpacing: scale(0.5),
  },
  closeButton: {
    padding: scale(4),
  },
});