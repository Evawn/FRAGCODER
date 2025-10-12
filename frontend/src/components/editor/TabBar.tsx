import { useState } from 'react';
import { Button } from '../ui/button';
import { Dropdown } from '../ui/Dropdown';
import type { DropdownOption } from '../ui/Dropdown';
import { DeleteTabDialog } from './DeleteTabDialog';
import type { CompilationError } from '../../utils/GLSLCompiler';

// Tab interface
export interface Tab {
  id: string;
  name: string;
  code: string;
  isDeletable: boolean;
  errors: CompilationError[];
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onAddTab: (tabName: string) => void;
  onDeleteTab: (tabId: string) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onTabChange,
  onAddTab,
  onDeleteTab,
}: TabBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tabToDelete, setTabToDelete] = useState<Tab | null>(null);

  // Check if a tab has errors
  const tabHasErrors = (tab: Tab): boolean => {
    return tab.errors.length > 0;
  };

  // Handle tab deletion
  const handleDeleteTabClick = (tab: Tab, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabToDelete(tab);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTab = () => {
    if (tabToDelete) {
      onDeleteTab(tabToDelete.id);
    }
    setShowDeleteConfirm(false);
    setTabToDelete(null);
  };

  // Add tab dropdown options
  const addTabDropdownOptions: DropdownOption[] = [
    { text: 'Buffer A', callback: () => onAddTab('Buffer A') },
    { text: 'Buffer B', callback: () => onAddTab('Buffer B') },
    { text: 'Buffer C', callback: () => onAddTab('Buffer C') },
    { text: 'Buffer D', callback: () => onAddTab('Buffer D') },
    { text: 'Common', callback: () => onAddTab('Common') }
  ];

  return (
    <>
      <div className="bg-gray-800 border-b border-gray-700 flex items-center px-1" style={{ height: '30px' }}>
        {/* Add Tab Button with Dropdown */}
        <div className="mr-1">
          <Dropdown options={addTabDropdownOptions} align="start" sideOffset={4}>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-gray-400 bg-transparent hover:text-gray-200 hover:bg-gray-700 focus:outline-none"
              style={{ width: '18px', height: '18px' }}
              title="Add new tab"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
          </Dropdown>
        </div>

        {/* Tabs */}
        <div className="flex-1 flex items-center overflow-x-auto" style={{ gap: '2px' }}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`h-auto px-2 rounded-t transition-colors group relative cursor-pointer inline-flex items-center ${activeTabId === tab.id
                ? 'bg-gray-900 text-white hover:bg-gray-900'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-gray-100'
                }`}
              style={{ height: '30px', minWidth: 'fit-content' }}
              onClick={() => onTabChange(tab.id)}
            >
              {/* Error indicator dot */}
              {tabHasErrors(tab) && (
                <span
                  className="rounded-full bg-red-500 mr-1 flex-shrink-0"
                  style={{ width: '4px', height: '4px' }}
                  title={`${tab.name} has compilation errors`}
                />
              )}
              <span className="whitespace-nowrap" style={{ fontSize: '14px', lineHeight: '20px' }}>{tab.name}</span>
              {tab.isDeletable && (
                <button
                  onClick={(e) => handleDeleteTabClick(tab, e)}
                  className="ml-1 rounded hover:bg-gray-500 transition-colors"
                  style={{ padding: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg className="text-gray-400 group-hover:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '10px', height: '10px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete Tab Confirmation Dialog */}
      <DeleteTabDialog
        tabName={tabToDelete?.name}
        onDelete={confirmDeleteTab}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  );
}
