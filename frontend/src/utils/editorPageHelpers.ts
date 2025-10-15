import type { CompilationError, Tab, ShaderData, TabData, CompilationStatus, Shader } from '../types';
import { DEFAULT_SHADER_CODES } from './defaultShaderCode';

/**
 * Determines compilation status based on success and errors
 */
export function determineCompilationStatus(
  compilationSuccess: boolean | undefined,
  compilationErrors: CompilationError[]
): CompilationStatus {
  if (compilationSuccess === true) {
    return compilationErrors.length > 0 ? 'WARNING' : 'SUCCESS';
  } else if (compilationSuccess === false) {
    return 'ERROR';
  }
  return 'PENDING';
}

/**
 * Converts API Shader format to local ShaderData format
 * Used when loading a shader from the backend
 */
export function apiShaderToShaderData(apiShader: Shader): ShaderData {
  return {
    id: apiShader.id,
    title: apiShader.title,
    code: apiShader.tabs[0]?.code || DEFAULT_SHADER_CODES.Image,
    description: apiShader.description || undefined,
    isPublic: apiShader.isPublic,
    userId: apiShader.userId,
    forkedFrom: apiShader.forkedFrom || undefined,
  };
}

/**
 * Converts local Tab[] format to API TabData[] format
 * Used when saving shaders to the backend
 */
export function tabsToTabData(tabs: Tab[]): TabData[] {
  return tabs.map(tab => ({
    id: tab.id,
    name: tab.name,
    code: tab.code
  }));
}

/**
 * Converts API TabData[] format to local Tab[] format
 * Used when loading tabs from the backend
 */
export function apiTabsToLocalTabs(apiTabs: TabData[]): Tab[] {
  return apiTabs.map(tab => ({
    id: tab.id,
    name: tab.name,
    code: tab.code,
    isDeletable: tab.name !== 'Image',
    errors: []
  }));
}

/**
 * Distributes compilation errors to their corresponding tabs
 * Filters errors by passName and assigns them to the matching tab
 */
export function distributeErrorsToTabs(
  tabs: Tab[],
  compilationErrors: CompilationError[]
): Tab[] {
  return tabs.map(tab => {
    const tabErrors = compilationErrors.filter(error =>
      !error.passName || error.passName === tab.name
    );
    return { ...tab, errors: tabErrors };
  });
}

/**
 * Calculates the minimum panel size percentage based on resolution lock
 * Used for maintaining aspect ratio when resolution is locked
 */
export function calculatePanelMinSize(
  locked: boolean,
  minWidth: number | undefined
): number {
  if (locked && minWidth) {
    const viewportWidth = window.innerWidth;
    return Math.max(30, Math.min(70, (minWidth / viewportWidth) * 100));
  }
  return 30; // default minimum size
}

/**
 * Sorts tabs in canonical order: Image → Buffer A → B → C → D → Common
 * Maintains consistent tab ordering regardless of creation/deletion sequence
 */
export function sortTabsByCanonicalOrder(tabs: Tab[]): Tab[] {
  const tabOrder = ['Image', 'Buffer A', 'Buffer B', 'Buffer C', 'Buffer D', 'Common'];
  const orderMap = new Map(tabOrder.map((name, index) => [name, index]));

  return [...tabs].sort((a, b) => {
    const orderA = orderMap.get(a.name) ?? 999;
    const orderB = orderMap.get(b.name) ?? 999;
    return orderA - orderB;
  });
}

/**
 * Displays a standardized error alert message
 * Formats error messages consistently across all operations
 */
export function showErrorAlert(error: unknown, operation: string): void {
  if (error instanceof Error) {
    alert(`Failed to ${operation}: ${error.message}`);
  } else {
    alert(`Failed to ${operation}. Please try again.`);
  }
}
