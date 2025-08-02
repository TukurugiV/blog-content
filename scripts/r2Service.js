import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Cloudflare R2 configuration
const R2_CONFIG = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  bucketName: process.env.R2_BUCKET_NAME || 'blog-files',
  publicUrl: process.env.R2_PUBLIC_URL || 'https://files.tukurugi.uk', // カスタムドメインまたはR2の公開URL
};

// S3互換クライアントの設定（Cloudflare R2用）
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

/**
 * ファイルをCloudflare R2にアップロード
 */
export async function uploadToR2(fileBuffer, originalName, mimeType, category = 'files') {
  try {
    // UUIDでファイル名を生成（拡張子のみ保持）
    const fileExtension = path.extname(originalName);
    const uuid = uuidv4();
    const fileName = `${uuid}${fileExtension}`;
    
    // カテゴリ別のキー（パス）を設定
    const key = `${category}/${fileName}`;
    
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      // パブリックアクセス可能にする
      ACL: 'public-read',
      // 元のファイル名をメタデータとして保存
      Metadata: {
        'original-name': encodeURIComponent(originalName),
        'upload-timestamp': new Date().toISOString()
      }
    });
    
    console.log(`Uploading file to R2: ${key}`);
    const result = await r2Client.send(uploadCommand);
    
    // 公開URLを構築
    const publicUrl = R2_CONFIG.publicUrl 
      ? `${R2_CONFIG.publicUrl}/${key}`
      : `https://pub-${R2_CONFIG.accountId}.r2.dev/${key}`;
    
    return {
      success: true,
      fileName,
      key,
      url: publicUrl,
      size: fileBuffer.length,
      originalName,
      mimeType,
      category,
      etag: result.ETag
    };
  } catch (error) {
    console.error('Error uploading to R2:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * R2からファイル一覧を取得
 */
export async function listR2Files(category = null) {
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_CONFIG.bucketName,
      Prefix: category ? `${category}/` : undefined,
      MaxKeys: 100,
    });
    
    const result = await r2Client.send(listCommand);
    
    if (!result.Contents) {
      return [];
    }
    
    // 各ファイルのメタデータを取得して元のファイル名を復元
    const filePromises = result.Contents.map(async (item) => {
      try {
        // HeadObjectCommandでメタデータを取得
        const headCommand = new HeadObjectCommand({
          Bucket: R2_CONFIG.bucketName,
          Key: item.Key,
        });
        const headResult = await r2Client.send(headCommand);
        
        // メタデータから元のファイル名を取得
        const originalName = headResult.Metadata && headResult.Metadata['original-name'] 
          ? decodeURIComponent(headResult.Metadata['original-name'])
          : path.basename(item.Key); // フォールバック
        
        return {
          name: originalName,
          key: item.Key,
          size: formatFileSize(item.Size),
          lastModified: item.LastModified,
          url: R2_CONFIG.publicUrl 
            ? `${R2_CONFIG.publicUrl}/${item.Key}`
            : `https://pub-${R2_CONFIG.accountId}.r2.dev/${item.Key}`,
          category: item.Key.split('/')[0]
        };
      } catch (error) {
        console.warn(`Failed to get metadata for ${item.Key}:`, error.message);
        // メタデータ取得に失敗した場合はUUIDファイル名をそのまま使用
        return {
          name: path.basename(item.Key),
          key: item.Key,
          size: formatFileSize(item.Size),
          lastModified: item.LastModified,
          url: R2_CONFIG.publicUrl 
            ? `${R2_CONFIG.publicUrl}/${item.Key}`
            : `https://pub-${R2_CONFIG.accountId}.r2.dev/${item.Key}`,
          category: item.Key.split('/')[0]
        };
      }
    });
    
    const files = await Promise.all(filePromises);
    return files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  } catch (error) {
    console.error('Error listing R2 files:', error);
    return [];
  }
}

/**
 * ファイルサイズをフォーマット
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * カテゴリ別のファイル分類
 */
export function getCategoryFromMimeType(mimeType, fileName) {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  
  const ext = path.extname(fileName).toLowerCase();
  if (['.pdf', '.doc', '.docx', '.txt', '.zip', '.rar'].includes(ext)) {
    return 'downloads';
  }
  
  return 'files';
}

/**
 * R2設定の検証
 */
export function validateR2Config() {
  const requiredFields = ['accountId', 'accessKeyId', 'secretAccessKey', 'bucketName'];
  const missingFields = requiredFields.filter(field => !R2_CONFIG[field]);
  
  if (missingFields.length > 0) {
    console.warn(`Missing R2 configuration fields: ${missingFields.join(', ')}`);
    return false;
  }
  
  return true;
}