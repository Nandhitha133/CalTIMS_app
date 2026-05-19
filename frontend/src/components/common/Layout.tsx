import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  return (
    <SafeAreaView style={[styles.container, backgroundColor ? { backgroundColor } : null]}>
      <Header 
        title={title} 
        showSidebarButton={showSidebar} 
        showBackButton={showBackButton}
        onBackPress={onBackPress}
        onMenuPress={() => setSidebarVisible(true)} 
        user={user}
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
          user={user} 
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
    paddingBottom: 60,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
