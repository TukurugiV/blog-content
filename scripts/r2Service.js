import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';

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
 * ファイル名を安全にエンコードする
 */
function sanitizeFileName(fileName) {
  // 日本語文字を含むファイル名をURLエンコード
  const encoded = encodeURIComponent(fileName);
  // ファイルシステムで問題となる文字を置換
  return encoded
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 200); // ファイル名の長さ制限
}

/**
 * ファイルをCloudflare R2にアップロード
 */
export async function uploadToR2(fileBuffer, originalName, mimeType, category = 'files') {
  try {
    // ファイル名を生成（重複を避けるためハッシュを使用）
    const fileExtension = path.extname(originalName);
    const baseName = path.basename(originalName, fileExtension);
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex').substring(0, 8);
    
    // 日本語ファイル名に対応したファイル名生成
    const sanitizedBaseName = sanitizeFileName(baseName);
    const fileName = `${sanitizedBaseName}-${timestamp}-${hash}${fileExtension}`;
    
    // カテゴリ別のキー（パス）を設定
    const key = `${category}/${fileName}`;
    
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      // パブリックアクセス可能にする
      ACL: 'public-read',
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
    
    return result.Contents.map(item => {
      const fileName = path.basename(item.Key);
      // URLエンコードされたファイル名をデコード
      const decodedName = decodeURIComponent(fileName).replace(/_/g, ' ');
      
      return {
        name: decodedName,
        key: item.Key,
        size: formatFileSize(item.Size),
        lastModified: item.LastModified,
        url: R2_CONFIG.publicUrl 
          ? `${R2_CONFIG.publicUrl}/${item.Key}`
          : `https://pub-${R2_CONFIG.accountId}.r2.dev/${item.Key}`,
        category: item.Key.split('/')[0]
      };
    }).sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
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