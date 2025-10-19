/**
 * Tests for Editor Page Helpers
 * Validates transformation utilities, error distribution, compilation status logic, and tab sorting
 */

import { describe, it, expect, vi } from 'vitest';
import {
  apiShaderToShaderData,
  distributeErrorsToTabs,
  determineCompilationStatus,
  sortTabsByCanonicalOrder,
  tabsToTabData,
  apiTabsToLocalTabs,
  calculatePanelMinSize,
  showErrorAlert,
} from './editorPageHelpers';
import type { Tab, CompilationError, Shader, TabData } from '../types';

describe('editorPageHelpers', () => {
  describe('apiShaderToShaderData', () => {
    it('should convert API Shader to ShaderData format', () => {
      const apiShader: Shader = {
        id: 'shader-123',
        slug: 'awesome-shader',
        title: 'Awesome Shader',
        description: 'A really cool shader',
        tabs: [
          { id: 'tab-1', name: 'Image', code: 'void mainImage() { }' },
          { id: 'tab-2', name: 'Buffer A', code: 'buffer code' }
        ],
        isPublic: true,
        compilationStatus: 'SUCCESS',
        compilationErrors: null,
        userId: 'user-456',
        forkedFrom: 'original-shader-789',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        lastSavedAt: '2024-01-02T00:00:00Z',
        user: {
          id: 'user-456',
          username: 'coolcoder'
        }
      };

      const result = apiShaderToShaderData(apiShader);

      expect(result.id).toBe('shader-123');
      expect(result.title).toBe('Awesome Shader');
      expect(result.code).toBe('void mainImage() { }'); // First tab code
      expect(result.description).toBe('A really cool shader');
      expect(result.isPublic).toBe(true);
      expect(result.userId).toBe('user-456');
      expect(result.forkedFrom).toBe('original-shader-789');
      expect(result.creatorUsername).toBe('coolcoder');
    });

    it('should fallback to default Image code when tabs array is empty', () => {
      const apiShader: Shader = {
        id: 'shader-123',
        slug: 'empty-shader',
        title: 'Empty Shader',
        description: null,
        tabs: [],
        isPublic: true,
        compilationStatus: 'PENDING',
        compilationErrors: null,
        userId: 'user-456',
        forkedFrom: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastSavedAt: '2024-01-01T00:00:00Z',
        user: {
          id: 'user-456',
          username: 'empty'
        }
      };

      const result = apiShaderToShaderData(apiShader);

      expect(result.code).toContain('mainImage');
      expect(result.description).toBeUndefined();
      expect(result.forkedFrom).toBeUndefined();
    });
  });

  describe('distributeErrorsToTabs', () => {
    it('should distribute errors to matching tabs by passName', () => {
      const tabs: Tab[] = [
        { id: '1', name: 'Image', code: 'code1', isDeletable: false, errors: [] },
        { id: '2', name: 'Buffer A', code: 'code2', isDeletable: true, errors: [] },
        { id: '3', name: 'Common', code: 'code3', isDeletable: false, errors: [] }
      ];

      const compilationErrors: CompilationError[] = [
        { line: 10, message: 'Error in Image', type: 'error', passName: 'Image' },
        { line: 20, message: 'Error in Buffer A', type: 'error', passName: 'Buffer A' },
        { line: 5, message: 'Error in Common', type: 'warning', passName: 'Common' }
      ];

      const result = distributeErrorsToTabs(tabs, compilationErrors);

      expect(result[0].errors).toHaveLength(1);
      expect(result[0].errors[0].message).toBe('Error in Image');
      expect(result[1].errors[0].message).toBe('Error in Buffer A');
      expect(result[2].errors[0].message).toBe('Error in Common');
    });

    it('should distribute errors without passName to all tabs', () => {
      const tabs: Tab[] = [
        { id: '1', name: 'Image', code: 'code1', isDeletable: false, errors: [] },
        { id: '2', name: 'Buffer A', code: 'code2', isDeletable: true, errors: [] }
      ];

      const compilationErrors: CompilationError[] = [
        { line: 15, message: 'Generic error', type: 'error' }
      ];

      const result = distributeErrorsToTabs(tabs, compilationErrors);

      expect(result[0].errors).toHaveLength(1);
      expect(result[1].errors).toHaveLength(1);
    });

    it('should return new tab objects without modifying originals', () => {
      const tabs: Tab[] = [
        { id: '1', name: 'Image', code: 'code1', isDeletable: false, errors: [] }
      ];

      const compilationErrors: CompilationError[] = [
        { line: 10, message: 'Error', type: 'error', passName: 'Image' }
      ];

      const result = distributeErrorsToTabs(tabs, compilationErrors);

      expect(result[0]).not.toBe(tabs[0]);
      expect(tabs[0].errors).toHaveLength(0);
      expect(result[0].errors).toHaveLength(1);
    });

    it('should handle mixed errors with and without passName', () => {
      const tabs: Tab[] = [
        { id: '1', name: 'Image', code: 'code1', isDeletable: false, errors: [] },
        { id: '2', name: 'Buffer A', code: 'code2', isDeletable: true, errors: [] }
      ];

      const compilationErrors: CompilationError[] = [
        { line: 10, message: 'Image specific', type: 'error', passName: 'Image' },
        { line: 15, message: 'Generic error', type: 'error' },
        { line: 20, message: 'Buffer A specific', type: 'error', passName: 'Buffer A' }
      ];

      const result = distributeErrorsToTabs(tabs, compilationErrors);

      expect(result[0].errors.map(e => e.message)).toEqual(['Image specific', 'Generic error']);
      expect(result[1].errors.map(e => e.message)).toEqual(['Generic error', 'Buffer A specific']);
    });
  });

  describe('determineCompilationStatus', () => {
    it('should return SUCCESS when compilationSuccess is true and no errors', () => {
      expect(determineCompilationStatus(true, [])).toBe('SUCCESS');
    });

    it('should return WARNING when compilationSuccess is true but has errors', () => {
      const errors: CompilationError[] = [
        { line: 10, message: 'Warning message', type: 'warning' }
      ];
      expect(determineCompilationStatus(true, errors)).toBe('WARNING');
    });

    it('should return ERROR when compilationSuccess is false', () => {
      expect(determineCompilationStatus(false, [])).toBe('ERROR');
      expect(determineCompilationStatus(false, [{ line: 1, message: 'err', type: 'error' }])).toBe('ERROR');
    });

    it('should return PENDING when compilationSuccess is undefined', () => {
      expect(determineCompilationStatus(undefined, [])).toBe('PENDING');
    });
  });

  describe('sortTabsByCanonicalOrder', () => {
    it('should sort tabs in canonical order: Image → Buffer A-D → Common', () => {
      const tabs: Tab[] = [
        { id: '1', name: 'Common', code: '', isDeletable: false, errors: [] },
        { id: '2', name: 'Buffer A', code: '', isDeletable: true, errors: [] },
        { id: '3', name: 'Image', code: '', isDeletable: false, errors: [] },
        { id: '4', name: 'Buffer D', code: '', isDeletable: true, errors: [] }
      ];

      const result = sortTabsByCanonicalOrder(tabs);

      expect(result.map(t => t.name)).toEqual(['Image', 'Buffer A', 'Buffer D', 'Common']);
    });

    it('should place unknown tab names at the end and not modify original array', () => {
      const tabs: Tab[] = [
        { id: '1', name: 'Unknown Tab', code: '', isDeletable: true, errors: [] },
        { id: '2', name: 'Image', code: '', isDeletable: false, errors: [] },
        { id: '3', name: 'Custom Buffer', code: '', isDeletable: true, errors: [] }
      ];

      const originalOrder = tabs.map(t => t.name);
      const result = sortTabsByCanonicalOrder(tabs);

      expect(result[0].name).toBe('Image');
      expect(result.slice(1).map(t => t.name)).toContain('Unknown Tab');
      expect(tabs.map(t => t.name)).toEqual(originalOrder); // Original unchanged
    });
  });

  describe('tabsToTabData', () => {
    it('should convert Tab[] to TabData[] by stripping UI properties', () => {
      const tabs: Tab[] = [
        { id: 'tab-1', name: 'Image', code: 'image code', isDeletable: false, errors: [] },
        { id: 'tab-2', name: 'Buffer A', code: 'buffer code', isDeletable: true, errors: [{ line: 1, message: 'error', type: 'error' }] }
      ];

      const result = tabsToTabData(tabs);

      expect(result).toEqual([
        { id: 'tab-1', name: 'Image', code: 'image code' },
        { id: 'tab-2', name: 'Buffer A', code: 'buffer code' }
      ]);
    });
  });

  describe('apiTabsToLocalTabs', () => {
    it('should convert TabData[] to Tab[] with UI properties and Image as non-deletable', () => {
      const apiTabs: TabData[] = [
        { id: 'tab-1', name: 'Image', code: 'image code' },
        { id: 'tab-2', name: 'Buffer A', code: 'buffer code' }
      ];

      const result = apiTabsToLocalTabs(apiTabs);

      expect(result).toEqual([
        { id: 'tab-1', name: 'Image', code: 'image code', isDeletable: false, errors: [] },
        { id: 'tab-2', name: 'Buffer A', code: 'buffer code', isDeletable: true, errors: [] }
      ]);
    });
  });

  describe('calculatePanelMinSize', () => {
    const originalInnerWidth = window.innerWidth;

    it('should return default 30% when not locked or no minWidth', () => {
      expect(calculatePanelMinSize(false, 800)).toBe(30);
      expect(calculatePanelMinSize(true, undefined)).toBe(30);
    });

    it('should calculate percentage when locked with minWidth and clamp to 30-70%', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1920 });
      expect(calculatePanelMinSize(true, 960)).toBe(50); // 960/1920 * 100 = 50%

      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 2000 });
      expect(calculatePanelMinSize(true, 400)).toBe(30); // Would be 20%, clamped to 30%

      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
      expect(calculatePanelMinSize(true, 900)).toBe(70); // Would be 90%, clamped to 70%

      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalInnerWidth });
    });
  });

  describe('showErrorAlert', () => {
    it('should display error message from Error instance', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      showErrorAlert(new Error('Something went wrong'), 'save shader');

      expect(alertSpy).toHaveBeenCalledWith('Failed to save shader: Something went wrong');
      alertSpy.mockRestore();
    });

    it('should display generic message for non-Error objects', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      showErrorAlert('string error', 'load shader');
      expect(alertSpy).toHaveBeenCalledWith('Failed to load shader. Please try again.');

      showErrorAlert(null, 'delete shader');
      expect(alertSpy).toHaveBeenCalledWith('Failed to delete shader. Please try again.');

      alertSpy.mockRestore();
    });
  });
});
