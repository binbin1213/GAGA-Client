/**
 * DRM 解密密钥获取工具
 */

import { logInfo, logError } from './logger';

/**
 * 从 PSSH 和 License URL 获取解密密钥
 * @param pssh PSSH box (base64 编码)
 * @param licenseUrl License Server URL
 * @returns KID:KEY 格式的密钥数组
 */
export async function getDecryptionKeys(
  pssh: string,
  licenseUrl: string
): Promise<string[]> {
  try {
    logInfo(`开始获取解密密钥`);
    logInfo(`PSSH: ${pssh}`);
    logInfo(`License URL: ${licenseUrl}`);

    // 解析 PSSH 获取 KID
    const kid = extractKidFromPssh(pssh);
    if (!kid) {
      throw new Error('无法从 PSSH 中提取 KID');
    }

    logInfo(`提取的 KID: ${kid}`);

    // 向 License Server 请求密钥
    const response = await fetch(licenseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: base64ToArrayBuffer(pssh),
    });

    if (!response.ok) {
      throw new Error(`License Server 返回错误: ${response.status}`);
    }

    const licenseData = await response.arrayBuffer();
    
    // 从 License 响应中提取密钥
    const key = extractKeyFromLicense(licenseData);
    if (!key) {
      throw new Error('无法从 License 响应中提取密钥');
    }

    logInfo(`获取的 KEY: ${key}`);

    // 返回 KID:KEY 格式
    return [`${kid}:${key}`];
  } catch (error) {
    logError('获取解密密钥失败', error);
    throw error;
  }
}

/**
 * 从 PSSH box 中提取 KID
 */
function extractKidFromPssh(pssh: string): string | null {
  try {
    const buffer = base64ToArrayBuffer(pssh);
    const view = new DataView(buffer);
    
    // PSSH box 结构:
    // 4 bytes: box size
    // 4 bytes: box type ('pssh')
    // 1 byte: version
    // 3 bytes: flags
    // 16 bytes: system ID
    // 如果 version > 0:
    //   4 bytes: KID count
    //   16 bytes * count: KIDs
    
    let offset = 8; // 跳过 size 和 type
    const version = view.getUint8(offset);
    offset += 4; // 跳过 version 和 flags
    offset += 16; // 跳过 system ID
    
    if (version > 0) {
      const kidCount = view.getUint32(offset);
      offset += 4;
      
      if (kidCount > 0) {
        // 读取第一个 KID (16 bytes)
        const kidBytes = new Uint8Array(buffer, offset, 16);
        return arrayBufferToHex(kidBytes.buffer);
      }
    }
    
    // 如果 version 0，尝试从 data 中查找 KID
    // 这需要解析 protobuf 格式，比较复杂
    // 暂时返回 null，让用户手动提供
    return null;
  } catch (error) {
    logError('解析 PSSH 失败', error);
    return null;
  }
}

/**
 * 从 License 响应中提取密钥
 */
function extractKeyFromLicense(licenseData: ArrayBuffer): string | null {
  try {
    // License 响应通常是 protobuf 格式
    // 这里需要根据具体的 DRM 系统来解析
    // 暂时返回 null，需要更详细的实现
    
    // TODO: 实现 Widevine/PlayReady license 解析
    logInfo('License 数据长度:', licenseData.byteLength);
    
    return null;
  } catch (error) {
    logError('解析 License 失败', error);
    return null;
  }
}

/**
 * Base64 转 ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * ArrayBuffer 转 Hex 字符串
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
