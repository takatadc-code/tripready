import * as DocumentPicker from 'expo-document-picker';

export type DocumentPickResult = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
} | null;

/**
 * PDFファイルを選択
 */
export async function pickDocument(): Promise<DocumentPickResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType || 'application/pdf',
      size: asset.size || 0,
    };
  } catch (error) {
    console.error('Document pick error:', error);
    return null;
  }
}
