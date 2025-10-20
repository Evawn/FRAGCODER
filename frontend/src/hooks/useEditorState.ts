// Custom hook to manage all editor state and business logic for the shader editor
// Encapsulates tab management, shader operations, compilation state, and dialog interactions

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CompilationError, Tab, ShaderData } from '../types';
import type { TabShaderData } from '../utils/GLSLCompiler';
import { useAuth } from '../AuthContext';
import { useDialogManager } from './useDialogManager';
import { DEFAULT_SHADER_CODES, getDefaultCode } from '../utils/defaultShaderCode';
import { logger } from '../utils/logger';
import {
  getShaderBySlug,
  updateShader,
  saveShader,
  cloneShader,
  deleteShader,
} from '../api/shaders';
import {
  determineCompilationStatus,
  apiShaderToShaderData,
  tabsToTabData,
  apiTabsToLocalTabs,
  distributeErrorsToTabs,
  showErrorAlert,
  sortTabsByCanonicalOrder,
} from '../utils/editorPageHelpers';

interface UseEditorStateProps {
  slug?: string;
  onCompile: (tabs: TabShaderData[]) => void;
  onAutoPlay?: () => void; // Called when compilation succeeds for auto-play logic
}

interface UseEditorStateReturn {
  // State
  shader: ShaderData | null;
  tabs: Tab[];
  activeTabId: string;
  localShaderTitle: string;
  shaderUrl: string | null;
  compilationErrors: CompilationError[];
  compilationSuccess: boolean | undefined;
  compilationTime: number;
  loading: boolean;
  isOwner: boolean;

  // Dialog management
  dialogManager: ReturnType<typeof useDialogManager>;

  // Tab actions
  onTabChange: (tabId: string) => void;
  onAddTab: (name: string) => void;
  onDeleteTab: (tabId: string) => void;
  onCodeChange: (newCode: string, tabId: string) => void;

  // Shader operations
  onCompile: () => void;
  onSave: (titleOverride?: string) => Promise<void>;
  onSaveAs: () => void;
  onRename: (newName: string) => Promise<void>;
  onClone: () => void;
  onCloneShader: () => Promise<void>;
  onDelete: () => void;
  onDeleteShader: () => Promise<void>;
  onSaveShader: (shaderName: string) => Promise<void>;

  // Compilation callback (for useWebGLRenderer)
  handleCompilationResult: (success: boolean, errors: CompilationError[], compilationTime: number) => void;

  // Loading
  loadShader: (slug: string) => Promise<void>;
}

export function useEditorState({
  slug,
  onCompile: rendererCompile,
  onAutoPlay,
}: UseEditorStateProps): UseEditorStateReturn {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [shaderUrl, setShaderUrl] = useState<string | null>(slug || null);

  const [shader, setShader] = useState<ShaderData | null>(null);
  const [compilationErrors, setCompilationErrors] = useState<CompilationError[]>([]);
  const [compilationSuccess, setCompilationSuccess] = useState<boolean | undefined>(undefined);
  const [compilationTime, setCompilationTime] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Tab management state
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', name: 'Image', code: DEFAULT_SHADER_CODES.Image, isDeletable: false, errors: [] }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');

  // Dialog management
  const dialogManager = useDialogManager();

  // Local shader title
  const [localShaderTitle, setLocalShaderTitle] = useState(shader?.title || 'Untitled...');

  // Calculate whether current user owns the shader
  const isOwner = useMemo(() => {
    return !!(user && shader && user.id === shader.userId);
  }, [user, shader]);

  // Handle compilation results - updates state and calls auto-play callback
  const handleCompilationResult = useCallback((success: boolean, errors: CompilationError[], compilationTime: number) => {
    setCompilationErrors(errors);
    setCompilationSuccess(success);
    setCompilationTime(compilationTime);

    // Call auto-play callback if compilation succeeds
    if (success && onAutoPlay) {
      onAutoPlay();
    }
  }, [onAutoPlay]);

  // Initialize shader on mount or slug change
  useEffect(() => {
    if (slug) {
      loadShader(slug);
    } else {
      // No slug means new shader - reset to defaults
      setShaderUrl(null);
      setShader(null);
      const defaultTabs = [{ id: '1', name: 'Image', code: DEFAULT_SHADER_CODES.Image, isDeletable: false, errors: [] }];
      setTabs(defaultTabs);

      // Show loading screen and trigger compilation for default shader
      setLoading(true);
      setTimeout(() => {
        const tabsData = tabsToTabData(defaultTabs);
        rendererCompile(tabsData);
        setLoading(false);
      }, 0);
    }
  }, [slug, rendererCompile]);

  const loadShader = async (slug: string) => {
    setLoading(true);
    try {
      // Fetch shader data from backend
      const apiShader = await getShaderBySlug(slug);

      // Convert API Shader format to ShaderData format for ShaderEditor
      setShader(apiShaderToShaderData(apiShader));

      // Load tabs from shader data and sort them in canonical order
      const loadedTabs = apiTabsToLocalTabs(apiShader.tabs);
      setTabs(sortTabsByCanonicalOrder(loadedTabs));

      // Trigger compilation after loading (using imperative method)
      const tabsData = tabsToTabData(loadedTabs);
      rendererCompile(tabsData);

      // Set URL to indicate this is a saved shader
      setShaderUrl(slug);

    } catch (error) {
      logger.error('Failed to load shader', error);
      alert('Failed to load shader. It may not exist or may be private.');
      // Navigate back to new shader page on error
      navigate('/new');
    } finally {
      setLoading(false);
    }
  };

  // Sync local shader title with shader prop
  useEffect(() => {
    if (shader?.title) {
      setLocalShaderTitle(shader.title);
    }
  }, [shader?.title]);

  // Update tabs with incoming compilation errors and maintain sort order
  useEffect(() => {
    setTabs(prevTabs => sortTabsByCanonicalOrder(distributeErrorsToTabs(prevTabs, compilationErrors)));
  }, [compilationErrors]);

  // Tab management handlers
  const handleAddTab = useCallback((name: string) => {
    // Prevent duplicate tabs - check if tab with this name already exists
    const tabExists = tabs.some(tab => tab.name === name);
    if (tabExists) {
      return;
    }

    const newTab: Tab = {
      id: Date.now().toString(),
      name,
      code: getDefaultCode(name),
      isDeletable: true,
      errors: []
    };
    setTabs(prev => sortTabsByCanonicalOrder([...prev, newTab]));
    setActiveTabId(newTab.id);
  }, [tabs]);

  const handleDeleteTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== tabId);
      // If deleting active tab, switch to first tab
      if (activeTabId === tabId) {
        setActiveTabId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeTabId]);

  const handleCodeChange = useCallback((newCode: string, tabId: string) => {
    setTabs(prevTabs => prevTabs.map(tab =>
      tab.id === tabId ? { ...tab, code: newCode } : tab
    ));
  }, []);

  const handleCompile = useCallback(() => {
    // Convert tabs to TabShaderData format and compile imperatively
    const tabsData = tabsToTabData(tabs);
    rendererCompile(tabsData);
  }, [tabs, rendererCompile]);

  // Business logic handlers
  const handleSaveAsClick = useCallback(() => {
    if (!user) {
      // Not signed in - show sign in dialog first, then save as dialog after sign-in
      dialogManager.openSignIn(() => dialogManager.openSaveAs());
    } else {
      // Already signed in - show save as dialog directly
      dialogManager.openSaveAs();
    }
  }, [user, dialogManager]);

  const handleSave = useCallback(async (titleOverride?: string) => {
    try {
      // Check if we have a shader and slug
      if (!shader || !slug) {
        throw new Error('No shader to save');
      }

      // Check if user is authenticated
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Always trigger compilation before saving
      handleCompile();

      // Wait for compilation to complete
      await new Promise(resolve => setTimeout(resolve, 150));

      // Determine compilation status
      const status = determineCompilationStatus(compilationSuccess, compilationErrors);

      // Prepare tabs data and update data
      const tabsData = tabsToTabData(tabs);
      const updateData = {
        name: titleOverride ?? localShaderTitle,
        tabs: tabsData,
        compilationStatus: status,
      };

      // Save via API
      await updateShader(slug, updateData, token);

    } catch (error) {
      logger.error('Failed to save shader', error);
      showErrorAlert(error, 'save shader');
    }
  }, [shader, slug, token, handleCompile, compilationSuccess, compilationErrors, localShaderTitle, tabs]);

  const handleRenameShader = useCallback(async (newName: string) => {
    // Update local title immediately (for UI)
    setLocalShaderTitle(newName);

    // Trigger save with the new name directly (to avoid async state issues)
    await handleSave(newName);
  }, [handleSave]);

  const handleCloneClick = useCallback(() => {
    if (!user) {
      // Not signed in - show sign in dialog first, then clone dialog after sign-in
      dialogManager.openSignIn(() => dialogManager.openClone());
    } else {
      // Already signed in - show clone dialog directly
      dialogManager.openClone();
    }
  }, [user, dialogManager]);

  const handleCloneShader = useCallback(async () => {
    try {
      // Check if we have a shader and slug
      if (!shader || !slug) {
        throw new Error('No shader to clone');
      }

      // Check if user is authenticated
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Clone via API
      const response = await cloneShader(slug, token);

      // Navigate to the cloned shader's URL
      const clonedSlug = response.shader.slug;
      navigate(`/shader/${clonedSlug}`);

    } catch (error) {
      logger.error('Failed to clone shader', error);

      // Re-throw error to be caught by dialog
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to clone shader. Please try again.');
      }
    }
  }, [shader, slug, token, navigate]);

  const handleDeleteShader = useCallback(async () => {
    try {
      // Check if we have a shader and slug
      if (!shader || !slug) {
        throw new Error('No shader to delete');
      }

      // Check if user is authenticated
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Delete via API
      await deleteShader(slug, token);

      // Navigate to home page
      navigate('/');

    } catch (error) {
      logger.error('Failed to delete shader', error);

      // Re-throw error to be caught by dialog
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to delete shader. Please try again.');
      }
    }
  }, [shader, slug, token, navigate]);

  const handleSaveShader = useCallback(async (shaderName: string) => {
    try {
      // Trigger compilation if not already compiled or if code has changed
      // This ensures we have accurate compilation status before saving
      if (compilationSuccess === undefined) {
        handleCompile();
        // Wait a moment for compilation to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check if user is authenticated
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Determine compilation status
      const status = determineCompilationStatus(compilationSuccess, compilationErrors);

      // Prepare shader data
      const tabsData = tabsToTabData(tabs);
      const shaderData = {
        name: shaderName,
        tabs: tabsData,
        isPublic: true,
        compilationStatus: status,
        compilationErrors: compilationErrors.length > 0 ? compilationErrors : undefined
      };

      // Save new shader via API
      const response = await saveShader(shaderData, token);

      // Navigate to the saved shader's URL
      const newSlug = response.shader.slug;
      navigate(`/shader/${newSlug}`);

    } catch (error) {
      logger.error('Failed to save new shader', error);
      showErrorAlert(error, 'save shader');
    }
  }, [compilationSuccess, handleCompile, compilationErrors, tabs, token, navigate]);

  return {
    // State
    shader,
    tabs,
    activeTabId,
    localShaderTitle,
    shaderUrl,
    compilationErrors,
    compilationSuccess,
    compilationTime,
    loading,
    isOwner,

    // Dialog management
    dialogManager,

    // Tab actions
    onTabChange: setActiveTabId,
    onAddTab: handleAddTab,
    onDeleteTab: handleDeleteTab,
    onCodeChange: handleCodeChange,

    // Shader operations
    onCompile: handleCompile,
    onSave: handleSave,
    onSaveAs: handleSaveAsClick,
    onRename: handleRenameShader,
    onClone: handleCloneClick,
    onCloneShader: handleCloneShader,
    onDelete: () => dialogManager.openDelete(),
    onDeleteShader: handleDeleteShader,
    onSaveShader: handleSaveShader,

    // Compilation callback (for useWebGLRenderer)
    handleCompilationResult,

    // Loading
    loadShader,
  };
}
