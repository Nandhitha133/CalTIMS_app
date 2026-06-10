import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { scale, verticalScale } from '../../utils/responsive';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from './Header';
import Footer from './Footer';
import CollapsibleSidebar from './CollapsibleSidebar';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  user: any;
  sidebarVisible: boolean;
  setSidebarVisible: (visible: boolean) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  showFooter?: boolean;
  showSidebar?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
  scrollable?: boolean;
  backgroundColor?: string;
}

export default function Layout({
  children,
  title,
  user,
  sidebarVisible,
  setSidebarVisible,
  refreshing = false,
  onRefresh,
  showFooter = true,
  showSidebar = true,
  showBackButton = false,
  onBackPress,
  scrollable = true,
  backgroundColor,
}: LayoutProps) {
  const [actualUser, setActualUser] = useState(user);

  useEffect(() => {
    // If the provided user is missing or incomplete (common when using empty authStore), 
    // fetch the real user from AsyncStorage to ensure correct role mapping across all screens.
    if (!user || !user.role || !user.name) {
      AsyncStorage.getItem('user').then(data => {
        if (data) {
          setActualUser(JSON.parse(data));
        }
      }).catch(err => console.warn('Layout: Error loading user', err));
    } else {
      setActualUser(user);
    }
  }, [user]);

  return (
    <SafeAreaView style={[styles.container, backgroundColor ? { backgroundColor } : null]}>
      <Header 
        title={title} 
        showSidebarButton={showSidebar} 
        showBackButton={showBackButton}
        onBackPress={onBackPress}
        onMenuPress={() => setSidebarVisible(true)} 
        user={actualUser}
      />
      
      {scrollable ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {children}
          </View>
        </ScrollView>
      ) : (
        <View style={[styles.container, styles.content]}>
          {children}
        </View>
      )}

      {showFooter && <Footer showCopyright={true} />}
      
      {showSidebar && (
        <CollapsibleSidebar 
          visible={sidebarVisible} 
          onClose={() => setSidebarVisible(false)} 
          user={actualUser} 
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(60),
  },
  content: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
  },
});
