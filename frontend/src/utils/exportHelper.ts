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
  try {
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

    // 2. Determine path (Use Downloads on Android for better persistence)
    const targetPath = Platform.OS === 'android' 
      ? `${RNFS.DownloadDirectoryPath}/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    // 3. Write file
    if (isBase64) {
      await RNFS.writeFile(targetPath, content, 'base64');
    } else {
      await RNFS.writeFile(targetPath, content, 'utf8');
    }

    // 4. Share/Save file
    // On Android, we share a message with the path as a fallback 
    // and try to share the data URI for immediate opening.
    let base64Content = '';
    if (isBase64) {
      base64Content = content;
    } else {
      base64Content = await RNFS.readFile(targetPath, 'base64');
    }

    const shareOptions: any = {
      title: fileName,
      url: `data:${fileType};base64,${base64Content}`,
    };

    if (Platform.OS === 'android') {
      shareOptions.message = `File saved to Downloads: ${fileName}`;
    }

    await Share.share(shareOptions);

    return true;
  } catch (error: any) {
    console.error('Export error:', error);
    Alert.alert('Export Failed', 'An error occurred while sharing the file.');
    return false;
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
