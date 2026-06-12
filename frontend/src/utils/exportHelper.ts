import { Platform, PermissionsAndroid, Alert, Share, NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

const { FileViewer } = NativeModules;

/**
 * Converts data to a proper CSV string with BOM for Excel compatibility.
 */
export function convertToCSV(headers: string[], rows: any[][]): string {
  const BOM = '\uFEFF';
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        const str = String(cell ?? '').replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    )
  ].join('\n');
  return BOM + csvContent;
}

/**
 * Helper to handle file exports across all modules.
 * Saves the file directly to the device Downloads folder on Android,
 * and allows immediate viewing/opening using default document viewers!
 */
export async function exportFile(
  content: string,
  fileName: string,
  fileType: string,
  isBase64: boolean = false
): Promise<boolean> {
  console.log(`[exportFile] Starting export for: ${fileName} (Type: ${fileType}, isBase64: ${isBase64})`);

  if (!content || content.length === 0) {
    Alert.alert('Export Failed', 'The report content is empty.');
    return false;
  }

  try {
    // Automatically add BOM for CSV files to ensure overall compatibility with Excel and mobile Office apps
    let finalContent = content;
    if (fileType === 'text/csv' && !isBase64 && typeof content === 'string' && !content.startsWith('\uFEFF')) {
      finalContent = '\uFEFF' + content;
    }

    // 1. Web browser fallback (if running in a web platform context)
    const globalAny = globalThis as any;
    if (Platform.OS === 'web' && globalAny.document) {
      console.log('[exportFile] Web environment detected. Triggering browser download.');
      let blob;
      if (isBase64) {
        const byteCharacters = globalAny.atob(content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new globalAny.Blob([byteArray], { type: fileType });
      } else {
        blob = new globalAny.Blob([finalContent], { type: fileType });
      }

      const url = globalAny.URL.createObjectURL(blob);
      const link = globalAny.document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      globalAny.URL.revokeObjectURL(url);
      return true;
    }

    // 2. Android flow
    if (Platform.OS === 'android') {
      const downloadPath = `${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}`;

      // Request standard storage permission for Android 9 or below
      if (Platform.Version < 29) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Storage permission is required to save the report.');
          return false;
        }
      }

      try {
        console.log(`[exportFile] Trying direct write to Downloads folder: ${downloadPath}`);
        if (isBase64) {
          await RNFS.writeFile(downloadPath, content, 'base64');
        } else {
          await RNFS.writeFile(downloadPath, finalContent, 'utf8');
        }

        try {
          await RNFS.scanFile(downloadPath);
        } catch (e) {
          console.warn('[exportFile] Scan file failed', e);
        }

        Alert.alert(
          'Download Complete',
          `File has been saved successfully to your Downloads folder:\n\n${fileName}`,
          [
            { text: 'OK' },
            {
              text: 'Open File',
              onPress: async () => {
                try {
                  await FileViewer.openFile(downloadPath, fileType);
                } catch (openErr) {
                  Alert.alert('Error', 'No application found to open this file. You can open it from your device Downloads folder.');
                }
              }
            }
          ]
        );
        return true;
      } catch (writeError: any) {
        console.warn('[exportFile] Direct write to Downloads failed:', writeError);

        // Android 11+ Scoped Storage fallback: automatically write to Cache and ask to open
        try {
          const cachePath = Platform.OS === 'android' && RNFS.ExternalCachesDirectoryPath
            ? `${RNFS.ExternalCachesDirectoryPath}/${fileName}`
            : `${RNFS.CachesDirectoryPath}/${fileName}`;
          if (isBase64) {
            await RNFS.writeFile(cachePath, content, 'base64');
          } else {
            await RNFS.writeFile(cachePath, finalContent, 'utf8');
          }

          Alert.alert(
            'Download Complete',
            `File downloaded to secure Cache storage.\n\nWould you like to open it now?`,
            [
              { text: 'Cancel' },
              {
                text: 'Open File',
                onPress: async () => {
                  try {
                    await FileViewer.openFile(cachePath, fileType);
                  } catch (openErr) {
                    Alert.alert('Error', 'No application found to open this file.');
                  }
                }
              }
            ]
          );
        } catch (e) {
          Alert.alert('Error', 'Failed to save file to Cache.');
        }
        return true;
      }
    }

    // 3. iOS flow
    if (Platform.OS === 'ios') {
      const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      if (isBase64) {
        await RNFS.writeFile(cachePath, content, 'base64');
      } else {
        await RNFS.writeFile(cachePath, finalContent, 'utf8');
      }

      const shareResult = await Share.share({
        title: fileName,
        url: `file://${cachePath}`,
      });
      return shareResult.action === Share.sharedAction;
    }

    return true;
  } catch (error: any) {
    console.error('Export error:', error);
    Alert.alert('Export Failed', 'An error occurred while saving the file.');
    return false;
  }
}

/**
 * Request storage permission for Android
 */
export async function requestStoragePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      if (Platform.Version >= 29) return true;
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      return false;
    }
  }
  return true;
}

/**
 * Native File Downloader for Binary Files (PDFs, Images, etc)
 * Bypasses React Native's fetch which corrupts binary streams.
 */
export async function downloadFileFromUrl(
  url: string,
  fileName: string,
  fileType: string,
  headers: Record<string, string> = {}
): Promise<boolean> {
  console.log(`[downloadFileFromUrl] Starting direct native download for: ${fileName}`);

  try {
    const { FileViewer } = NativeModules;

    // 1. Android Flow
    if (Platform.OS === 'android') {
      const downloadPath = `${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}`;

      if (Platform.Version < 29) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Storage permission is required to save the report.');
          return false;
        }
      }

      try {
        const options = {
          fromUrl: url,
          toFile: downloadPath,
          headers
        };

        const res = await RNFS.downloadFile(options).promise;

        if (res.statusCode !== 200) throw new Error('Download failed with status: ' + res.statusCode);

        try { await RNFS.scanFile(downloadPath); } catch (e) { }

        Alert.alert('Download Complete', `File has been saved successfully to your Downloads folder:\n\n${fileName}`, [
          { text: 'OK' },
          {
            text: 'Open File', onPress: async () => {
              try { await FileViewer.openFile(downloadPath, fileType); }
              catch (e) { Alert.alert('PDF Viewer Required', 'No application found to open this PDF. Please install a PDF viewer (like Google PDF Viewer or Adobe Reader) to open it. The file is saved in your Downloads folder.'); }
            }
          }
        ]);
        return true;
      } catch (writeErr) {
        console.warn('Direct write failed, falling back to cache:', writeErr);
        // Fallback to cache
        const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
        await RNFS.downloadFile({ fromUrl: url, toFile: cachePath, headers }).promise;

        Alert.alert('Download Complete', `File downloaded securely.\n\nWould you like to open it now?`, [
          { text: 'Cancel' },
          {
            text: 'Open File', onPress: async () => {
              try { await FileViewer.openFile(cachePath, fileType); }
              catch (e) { Alert.alert('PDF Viewer Required', 'No application found to open this PDF. Please install a PDF viewer to open it.'); }
            }
          }
        ]);
        return true;
      }
    }

    // 2. iOS Flow
    if (Platform.OS === 'ios') {
      const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      const res = await RNFS.downloadFile({ fromUrl: url, toFile: cachePath, headers }).promise;

      if (res.statusCode !== 200) throw new Error('Download failed');

      const shareResult = await Share.share({ title: fileName, url: `file://${cachePath}` });
      return shareResult.action === Share.sharedAction;
    }

    return true;
  } catch (err: any) {
    console.error('Direct download error:', err);
    Alert.alert('Download Failed', 'Could not fetch the file from the server.');
    return false;
  }
}
