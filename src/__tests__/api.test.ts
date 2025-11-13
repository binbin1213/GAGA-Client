/**
 * API 类型和函数测试
 */

import { isSuccessResponse, isErrorResponse } from '../types/api';
import type { GetKeysResponse, AuthResponse } from '../types/api';

describe('API Type Guards', () => {
  describe('isSuccessResponse', () => {
    it('应该识别成功响应 (status: ok)', () => {
      const response: GetKeysResponse = {
        status: 'ok',
        keys: [{ kid: 'test', key: 'test-key' }],
      };
      expect(isSuccessResponse(response)).toBe(true);
    });

    it('应该识别成功响应 (status: success)', () => {
      const response: AuthResponse = {
        status: 'success',
      };
      expect(isSuccessResponse(response)).toBe(true);
    });

    it('应该识别失败响应 (status: failed)', () => {
      const response: GetKeysResponse = {
        status: 'failed',
        message: 'Failed to get keys',
      };
      expect(isSuccessResponse(response)).toBe(false);
    });

    it('应该识别错误响应 (status: error)', () => {
      const response: AuthResponse = {
        status: 'error',
        message: 'Authentication error',
      };
      expect(isSuccessResponse(response)).toBe(false);
    });
  });

  describe('isErrorResponse', () => {
    it('应该识别失败响应 (status: failed)', () => {
      const response: GetKeysResponse = {
        status: 'failed',
        message: 'Failed',
      };
      expect(isErrorResponse(response)).toBe(true);
    });

    it('应该识别错误响应 (status: error)', () => {
      const response: AuthResponse = {
        status: 'error',
        message: 'Error',
      };
      expect(isErrorResponse(response)).toBe(true);
    });

    it('应该识别成功响应 (status: ok)', () => {
      const response: GetKeysResponse = {
        status: 'ok',
        keys: [],
      };
      expect(isErrorResponse(response)).toBe(false);
    });

    it('应该识别成功响应 (status: success)', () => {
      const response: AuthResponse = {
        status: 'success',
      };
      expect(isErrorResponse(response)).toBe(false);
    });
  });
});
