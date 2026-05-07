import { Platform, PermissionsAndroid, Alert, Share } from 'react-native';
import RNFS from 'react-native-fs';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

/**
 * Helper to handle file exports across all modules
 * Uses data URIs to ensure full content is shared on both Android and iOS
 * without requiring additional native modules.
 */
export async function exportFile(
  content: string,
  fileName: string,
  fileType: 'text/csv' | 'application/pdf' | 'application/vnd.ms-excel',
  isBase64: boolean = false
): Promise<boolean> {
  console.log(`[exportFile] Exporting ${fileName} (Type: ${fileType}, isBase64: ${isBase64}, Length: ${content?.length || 0})`);
  if (!content || content.length === 0) {
    Alert.alert('Export Failed', 'The report content is empty. Please check your data.');
    return false;
  }

  try {
    // 0. Handle Web Export
    if (Platform.OS === 'web') {
      const globalAny = globalThis as any;
      let blob: any;
      
      if (isBase64) {
        // Convert base64 to blob
        const byteCharacters = globalAny.atob(content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new globalAny.Blob([byteArray], { type: fileType });
      } else {
        blob = new globalAny.Blob([content], { type: fileType });
      }
      
      const url = globalAny.URL.createObjectURL(blob);
      const link = globalAny.document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      globalAny.URL.revokeObjectURL(url);
      return true;
    }

    // 1. Request Permissions for Android (only for older versions)
    if (Platform.OS === 'android' && Platform.Version < 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Storage permission is required.');
        return false;
      }
    }

    // 2. Determine paths
    const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
    const downloadPath = Platform.OS === 'android' 
      ? `${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    const targetPath = Platform.OS === 'android' ? downloadPath : cachePath;

    // 3. Write file
    console.log(`[exportFile] Writing to: ${targetPath}`);
    if (isBase64) {
      await RNFS.writeFile(targetPath, content, 'base64');
    } else {
      await RNFS.writeFile(targetPath, content, 'utf8');
    }

    // 4. Handle Android Download Notification/Indexing
    if (Platform.OS === 'android') {
      try {
        await RNFS.scanFile(targetPath);
        console.log('[exportFile] File scanned successfully');
      } catch (e) {
        console.warn('[exportFile] Scan file failed', e);
      }
      
      Alert.alert(
        'Download Complete',
        `File has been saved to your Downloads folder:\n\n${fileName}`,
        [
          { text: 'OK' },
          { 
            text: 'Share', 
            onPress: async () => {
              const base64 = isBase64 ? content : await RNFS.readFile(targetPath, 'base64');
              const dataUri = `data:${fileType};base64,${base64.replace(/\s/g, '')}`;
              Share.share({ title: fileName, message: dataUri, url: dataUri });
            }
          }
        ]
      );
      return true;
    }

    // 5. iOS Sharing (Works well with file:// URIs)
    if (Platform.OS === 'ios') {
      const shareResult = await Share.share({
        title: fileName,
        url: `file://${targetPath}`,
      });
      return shareResult.action === Share.sharedAction;
    }

    return true;
  } catch (error: any) {
    console.error('Export error:', error);
    
    // Fallback: If public directory fails, try cache directory
    if (Platform.OS !== 'web') {
      try {
        const fallbackPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
        if (isBase64) {
          await RNFS.writeFile(fallbackPath, content, 'base64');
        } else {
          await RNFS.writeFile(fallbackPath, content, 'utf8');
        }
        
        const base64 = isBase64 ? content : await RNFS.readFile(fallbackPath, 'base64');
        const dataUri = `data:${fileType};base64,${base64.replace(/\s/g, '')}`;
        await Share.share({ title: fileName, message: dataUri, url: dataUri });
        return true;
      } catch (innerError) {
        Alert.alert('Export Failed', 'An error occurred while saving the file.');
        return false;
      }
    } else {
      Alert.alert('Export Failed', 'An error occurred during download.');
      return false;
    }
  }
}

/**
 * Request storage permission for Android
 */
export async function requestStoragePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      if (Platform.Version >= 33) return true;
      const result = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
      return result === RESULTS.GRANTED;
    } catch (error) {
      return false;
    }
  }
  return true;
}
