import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export type PickResult = { uri: string } | null;
export type PickMultiResult = { uris: string[] } | null;

/**
 * カメラ撮影 or 写真ライブラリ選択のアクションシートを表示
 * 1枚選択用
 */
export function pickImageWithChoice(): Promise<PickResult> {
  return new Promise((resolve) => {
    Alert.alert('画像を選択', '', [
      {
        text: '📷 カメラで撮影',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('権限エラー', 'カメラへのアクセスを許可してください');
            resolve(null);
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (result.canceled) { resolve(null); return; }
          resolve({ uri: result.assets[0].uri });
        },
      },
      {
        text: '🖼️ 写真から選択',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('権限エラー', 'カメラロールへのアクセスを許可してください');
            resolve(null);
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (result.canceled) { resolve(null); return; }
          resolve({ uri: result.assets[0].uri });
        },
      },
      { text: 'キャンセル', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

/**
 * カメラ撮影 or 写真ライブラリ選択のアクションシート
 * 複数枚選択用（ライブラリのみ複数対応、カメラは1枚ずつ）
 */
export function pickMultiImagesWithChoice(maxSelection: number = 20): Promise<PickMultiResult> {
  return new Promise((resolve) => {
    Alert.alert('画像を追加', '', [
      {
        text: '📷 カメラで撮影（1枚）',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('権限エラー', 'カメラへのアクセスを許可してください');
            resolve(null);
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (result.canceled) { resolve(null); return; }
          resolve({ uris: [result.assets[0].uri] });
        },
      },
      {
        text: '🖼️ 写真から選択（複数可）',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('権限エラー', 'カメラロールへのアクセスを許可してください');
            resolve(null);
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsMultipleSelection: true,
            selectionLimit: maxSelection,
          });
          if (result.canceled) { resolve(null); return; }
          resolve({ uris: result.assets.map(a => a.uri) });
        },
      },
      { text: 'キャンセル', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
