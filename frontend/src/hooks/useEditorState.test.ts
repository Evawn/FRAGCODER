/**
 * Tests for useEditorState Hook
 * Validates state management, tab operations, shader CRUD, and compilation handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEditorState } from './useEditorState';
import type { CompilationError, Shader, TabData } from '../types';
import type { TabShaderData } from '../utils/GLSLCompiler';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../api/shaders', () => ({
  getShaderBySlug: vi.fn(),
  updateShader: vi.fn(),
  saveShader: vi.fn(),
  cloneShader: vi.fn(),
  deleteShader: vi.fn(),
}));

vi.mock('../utils/editorPageHelpers', () => ({
  determineCompilationStatus: vi.fn((success) => success ? 'SUCCESS' : 'ERROR'),
  apiShaderToShaderData: vi.fn((shader) => ({
    id: shader.id,
    title: shader.title,
    code: shader.tabs[0]?.code || '',
    description: shader.description,
    isPublic: shader.isPublic,
    userId: shader.userId,
    forkedFrom: shader.forkedFrom,
    creatorUsername: shader.user?.username,
  })),
  tabsToTabData: vi.fn((tabs) => tabs.map(({ id, name, code }) => ({ id, name, code }))),
  apiTabsToLocalTabs: vi.fn((tabs) => tabs.map((tab) => ({
    ...tab,
    isDeletable: tab.name !== 'Image',
    errors: [],
  }))),
  distributeErrorsToTabs: vi.fn((tabs, errors) => tabs.map(tab => ({ ...tab, errors }))),
  showErrorAlert: vi.fn(),
  sortTabsByCanonicalOrder: vi.fn((tabs) => [...tabs]),
  DEFAULT_SHADER_CODES: { Image: 'void mainImage() {}' },
  getDefaultCode: vi.fn((name) => `// ${name} code`),
}));

// Import mocked modules
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import * as shaderApi from '../api/shaders';
import * as helpers from '../utils/editorPageHelpers';

describe('useEditorState', () => {
  const mockNavigate = vi.fn();
  const mockOnCompile = vi.fn();
  const mockOnAutoPlay = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
    (useAuth as any).mockReturnValue({
      user: null,
      token: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization & Loading', () => {
    it('should initialize with default state for new shader (no slug)', () => {
      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      expect(result.current.shader).toBeNull();
      expect(result.current.shaderUrl).toBeNull();
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0].name).toBe('Image');
      expect(result.current.activeTabId).toBe('1');
      expect(result.current.loading).toBe(true);
    });

    it('should trigger compilation for default shader on mount', async () => {
      renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      // Wait for async operations to complete
      await waitFor(() => {
        expect(mockOnCompile).toHaveBeenCalled();
      });
    });

    it('should load existing shader by slug', async () => {
      const mockShader: Shader = {
        id: 'shader-1',
        slug: 'test-shader',
        title: 'Test Shader',
        description: 'A test',
        tabs: [
          { id: 'tab-1', name: 'Image', code: 'main code' },
          { id: 'tab-2', name: 'Buffer A', code: 'buffer code' },
        ],
        isPublic: true,
        compilationStatus: 'SUCCESS',
        compilationErrors: null,
        userId: 'user-1',
        forkedFrom: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastSavedAt: '2024-01-01T00:00:00Z',
        user: { id: 'user-1', username: 'tester' },
      };

      (shaderApi.getShaderBySlug as any).mockResolvedValue(mockShader);

      const { result } = renderHook(() =>
        useEditorState({
          slug: 'test-shader',
          onCompile: mockOnCompile,
        })
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(shaderApi.getShaderBySlug).toHaveBeenCalledWith('test-shader');
      expect(result.current.shader).toBeDefined();
      expect(result.current.shader?.title).toBe('Test Shader');
      expect(result.current.shaderUrl).toBe('test-shader');
      expect(result.current.tabs).toHaveLength(2);
    });

    it('should handle shader load error and navigate to /new', async () => {
      (shaderApi.getShaderBySlug as any).mockRejectedValue(new Error('Not found'));
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      renderHook(() =>
        useEditorState({
          slug: 'missing-shader',
          onCompile: mockOnCompile,
        })
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/new');
      });

      expect(alertSpy).toHaveBeenCalledWith('Failed to load shader. It may not exist or may be private.');
      alertSpy.mockRestore();
    });
  });

  describe('Tab Management', () => {
    it('should add a new tab with correct defaults', () => {
      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      act(() => {
        result.current.onAddTab('Buffer A');
      });

      expect(result.current.tabs).toHaveLength(2);
      expect(result.current.tabs[1].name).toBe('Buffer A');
      expect(result.current.tabs[1].isDeletable).toBe(true);
      expect(result.current.activeTabId).toBe(result.current.tabs[1].id);
    });

    it('should prevent duplicate tab creation', () => {
      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      act(() => {
        result.current.onAddTab('Image'); // Duplicate name
      });

      expect(result.current.tabs).toHaveLength(1); // Should not add duplicate
    });

    it('should delete a tab and switch to first tab if active', () => {
      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      // Add a tab first
      act(() => {
        result.current.onAddTab('Buffer A');
      });

      const tabToDeleteId = result.current.tabs[1].id;
      const firstTabId = result.current.tabs[0].id;

      act(() => {
        result.current.onDeleteTab(tabToDeleteId);
      });

      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.activeTabId).toBe(firstTabId);
    });

    it('should change code within a specific tab', () => {
      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      const tabId = result.current.tabs[0].id;
      const newCode = 'void mainImage() { fragColor = vec4(1.0); }';

      act(() => {
        result.current.onCodeChange(newCode, tabId);
      });

      expect(result.current.tabs[0].code).toBe(newCode);
    });

    it('should change active tab', () => {
      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      // Add a tab
      act(() => {
        result.current.onAddTab('Buffer A');
      });

      const firstTabId = result.current.tabs[0].id;

      act(() => {
        result.current.onTabChange(firstTabId);
      });

      expect(result.current.activeTabId).toBe(firstTabId);
    });
  });

  describe('Compilation Flow', () => {
    it('should handle compilation results and update state', () => {
      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      const errors: CompilationError[] = [
        { line: 10, message: 'Syntax error', type: 'error', passName: 'Image' },
      ];

      act(() => {
        result.current.handleCompilationResult(false, errors, 42);
      });

      expect(result.current.compilationSuccess).toBe(false);
      expect(result.current.compilationErrors).toEqual(errors);
      expect(result.current.compilationTime).toBe(42);
    });

    it('should call onAutoPlay callback on successful compilation', () => {
      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
          onAutoPlay: mockOnAutoPlay,
        })
      );

      act(() => {
        result.current.handleCompilationResult(true, [], 100);
      });

      expect(mockOnAutoPlay).toHaveBeenCalledTimes(1);
      expect(result.current.compilationSuccess).toBe(true);
    });

    it('should not call onAutoPlay on failed compilation', () => {
      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
          onAutoPlay: mockOnAutoPlay,
        })
      );

      const errors: CompilationError[] = [{ line: 5, message: 'Error', type: 'error' }];

      act(() => {
        result.current.handleCompilationResult(false, errors, 50);
      });

      expect(mockOnAutoPlay).not.toHaveBeenCalled();
    });

    it('should trigger compilation when onCompile is called', () => {
      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      mockOnCompile.mockClear();

      act(() => {
        result.current.onCompile();
      });

      expect(mockOnCompile).toHaveBeenCalled();
      expect(helpers.tabsToTabData).toHaveBeenCalled();
    });
  });

  describe('Shader Operations (Authenticated)', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: { id: 'user-1', username: 'testuser' },
        token: 'test-token',
      });
    });

    it('should save existing shader successfully', async () => {
      const mockShader: Shader = {
        id: 'shader-1',
        slug: 'test-shader',
        title: 'Test Shader',
        description: null,
        tabs: [{ id: 'tab-1', name: 'Image', code: 'code' }],
        isPublic: true,
        compilationStatus: 'SUCCESS',
        compilationErrors: null,
        userId: 'user-1',
        forkedFrom: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastSavedAt: '2024-01-01T00:00:00Z',
        user: { id: 'user-1', username: 'testuser' },
      };

      (shaderApi.getShaderBySlug as any).mockResolvedValue(mockShader);
      (shaderApi.updateShader as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useEditorState({
          slug: 'test-shader',
          onCompile: mockOnCompile,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Set compilation success
      act(() => {
        result.current.handleCompilationResult(true, [], 100);
      });

      await act(async () => {
        await result.current.onSave();
      });

      // Wait for the save operation to complete
      await waitFor(() => {
        expect(shaderApi.updateShader).toHaveBeenCalledWith(
          'test-shader',
          expect.objectContaining({
            name: 'Test Shader',
            compilationStatus: 'SUCCESS',
          }),
          'test-token'
        );
      });
    });

    it('should handle save error', async () => {
      const mockShader: Shader = {
        id: 'shader-1',
        slug: 'test-shader',
        title: 'Test Shader',
        description: null,
        tabs: [{ id: 'tab-1', name: 'Image', code: 'code' }],
        isPublic: true,
        compilationStatus: 'SUCCESS',
        compilationErrors: null,
        userId: 'user-1',
        forkedFrom: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastSavedAt: '2024-01-01T00:00:00Z',
        user: { id: 'user-1', username: 'testuser' },
      };

      (shaderApi.getShaderBySlug as any).mockResolvedValue(mockShader);
      (shaderApi.updateShader as any).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useEditorState({
          slug: 'test-shader',
          onCompile: mockOnCompile,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.onSave();
      });

      await waitFor(() => {
        expect(helpers.showErrorAlert).toHaveBeenCalled();
      });
    });

    it('should clone shader and navigate to cloned shader', async () => {
      const mockShader: Shader = {
        id: 'shader-1',
        slug: 'test-shader',
        title: 'Test Shader',
        description: null,
        tabs: [{ id: 'tab-1', name: 'Image', code: 'code' }],
        isPublic: true,
        compilationStatus: 'SUCCESS',
        compilationErrors: null,
        userId: 'user-2',
        forkedFrom: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastSavedAt: '2024-01-01T00:00:00Z',
        user: { id: 'user-2', username: 'otheruser' },
      };

      (shaderApi.getShaderBySlug as any).mockResolvedValue(mockShader);
      (shaderApi.cloneShader as any).mockResolvedValue({
        shader: { slug: 'cloned-shader' },
      });

      const { result } = renderHook(() =>
        useEditorState({
          slug: 'test-shader',
          onCompile: mockOnCompile,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.onCloneShader();
      });

      expect(shaderApi.cloneShader).toHaveBeenCalledWith('test-shader', 'test-token');
      expect(mockNavigate).toHaveBeenCalledWith('/shader/cloned-shader');
    });

    it('should delete shader and navigate to home', async () => {
      const mockShader: Shader = {
        id: 'shader-1',
        slug: 'test-shader',
        title: 'Test Shader',
        description: null,
        tabs: [{ id: 'tab-1', name: 'Image', code: 'code' }],
        isPublic: true,
        compilationStatus: 'SUCCESS',
        compilationErrors: null,
        userId: 'user-1',
        forkedFrom: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastSavedAt: '2024-01-01T00:00:00Z',
        user: { id: 'user-1', username: 'testuser' },
      };

      (shaderApi.getShaderBySlug as any).mockResolvedValue(mockShader);
      (shaderApi.deleteShader as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useEditorState({
          slug: 'test-shader',
          onCompile: mockOnCompile,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.onDeleteShader();
      });

      expect(shaderApi.deleteShader).toHaveBeenCalledWith('test-shader', 'test-token');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should save new shader and navigate to new URL', async () => {
      (shaderApi.saveShader as any).mockResolvedValue({
        shader: { slug: 'new-shader-slug' },
      });

      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Set compilation success
      act(() => {
        result.current.handleCompilationResult(true, [], 100);
      });

      await act(async () => {
        await result.current.onSaveShader('My New Shader');
      });

      expect(shaderApi.saveShader).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My New Shader',
          isPublic: true,
          compilationStatus: 'SUCCESS',
        }),
        'test-token'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/shader/new-shader-slug');
    });

    it('should rename shader by updating local title and saving', async () => {
      const mockShader: Shader = {
        id: 'shader-1',
        slug: 'test-shader',
        title: 'Old Title',
        description: null,
        tabs: [{ id: 'tab-1', name: 'Image', code: 'code' }],
        isPublic: true,
        compilationStatus: 'SUCCESS',
        compilationErrors: null,
        userId: 'user-1',
        forkedFrom: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastSavedAt: '2024-01-01T00:00:00Z',
        user: { id: 'user-1', username: 'testuser' },
      };

      (shaderApi.getShaderBySlug as any).mockResolvedValue(mockShader);
      (shaderApi.updateShader as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useEditorState({
          slug: 'test-shader',
          onCompile: mockOnCompile,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.onRename('New Title');
      });

      expect(result.current.localShaderTitle).toBe('New Title');

      await waitFor(() => {
        expect(shaderApi.updateShader).toHaveBeenCalledWith(
          'test-shader',
          expect.objectContaining({
            name: 'New Title',
          }),
          'test-token'
        );
      });
    });
  });

  describe('Dialog Interactions', () => {
    it('should open save as dialog when user is authenticated', async () => {
      (useAuth as any).mockReturnValue({
        user: { id: 'user-1', username: 'testuser' },
        token: 'test-token',
      });

      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.onSaveAs();
      });

      expect(result.current.dialogManager.openDialog).toBe('saveAs');
    });

    it('should open signin dialog first when user not authenticated for save as', async () => {
      (useAuth as any).mockReturnValue({
        user: null,
        token: null,
      });

      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.onSaveAs();
      });

      expect(result.current.dialogManager.openDialog).toBe('signin');
    });

    it('should open clone dialog when user is authenticated', async () => {
      (useAuth as any).mockReturnValue({
        user: { id: 'user-1', username: 'testuser' },
        token: 'test-token',
      });

      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.onClone();
      });

      expect(result.current.dialogManager.openDialog).toBe('clone');
    });

    it('should open signin dialog first when user not authenticated for clone', async () => {
      (useAuth as any).mockReturnValue({
        user: null,
        token: null,
      });

      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.onClone();
      });

      expect(result.current.dialogManager.openDialog).toBe('signin');
    });

    it('should open delete dialog', async () => {
      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.onDelete();
      });

      expect(result.current.dialogManager.openDialog).toBe('delete');
    });
  });

  describe('Computed State', () => {
    it('should calculate isOwner as true when user owns shader', async () => {
      (useAuth as any).mockReturnValue({
        user: { id: 'user-1', username: 'testuser' },
        token: 'test-token',
      });

      const mockShader: Shader = {
        id: 'shader-1',
        slug: 'test-shader',
        title: 'Test Shader',
        description: null,
        tabs: [{ id: 'tab-1', name: 'Image', code: 'code' }],
        isPublic: true,
        compilationStatus: 'SUCCESS',
        compilationErrors: null,
        userId: 'user-1', // Same as authenticated user
        forkedFrom: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastSavedAt: '2024-01-01T00:00:00Z',
        user: { id: 'user-1', username: 'testuser' },
      };

      (shaderApi.getShaderBySlug as any).mockResolvedValue(mockShader);

      const { result } = renderHook(() =>
        useEditorState({
          slug: 'test-shader',
          onCompile: mockOnCompile,
        })
      );

      await waitFor(() => {
        expect(result.current.isOwner).toBe(true);
      });
    });

    it('should calculate isOwner as false when user does not own shader', async () => {
      (useAuth as any).mockReturnValue({
        user: { id: 'user-1', username: 'testuser' },
        token: 'test-token',
      });

      const mockShader: Shader = {
        id: 'shader-1',
        slug: 'test-shader',
        title: 'Test Shader',
        description: null,
        tabs: [{ id: 'tab-1', name: 'Image', code: 'code' }],
        isPublic: true,
        compilationStatus: 'SUCCESS',
        compilationErrors: null,
        userId: 'user-2', // Different from authenticated user
        forkedFrom: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastSavedAt: '2024-01-01T00:00:00Z',
        user: { id: 'user-2', username: 'otheruser' },
      };

      (shaderApi.getShaderBySlug as any).mockResolvedValue(mockShader);

      const { result } = renderHook(() =>
        useEditorState({
          slug: 'test-shader',
          onCompile: mockOnCompile,
        })
      );

      await waitFor(() => {
        expect(result.current.isOwner).toBe(false);
      });
    });

    it('should calculate isOwner as false when user is not authenticated', async () => {
      (useAuth as any).mockReturnValue({
        user: null,
        token: null,
      });

      const { result } = renderHook(() =>
        useEditorState({
          slug: undefined,
          onCompile: mockOnCompile,
        })
      );

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isOwner).toBe(false);
    });

    it('should sync localShaderTitle with shader title', async () => {
      const mockShader: Shader = {
        id: 'shader-1',
        slug: 'test-shader',
        title: 'Test Shader Title',
        description: null,
        tabs: [{ id: 'tab-1', name: 'Image', code: 'code' }],
        isPublic: true,
        compilationStatus: 'SUCCESS',
        compilationErrors: null,
        userId: 'user-1',
        forkedFrom: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastSavedAt: '2024-01-01T00:00:00Z',
        user: { id: 'user-1', username: 'testuser' },
      };

      (shaderApi.getShaderBySlug as any).mockResolvedValue(mockShader);

      const { result } = renderHook(() =>
        useEditorState({
          slug: 'test-shader',
          onCompile: mockOnCompile,
        })
      );

      await waitFor(() => {
        expect(result.current.localShaderTitle).toBe('Test Shader Title');
      });
    });
  });
});
