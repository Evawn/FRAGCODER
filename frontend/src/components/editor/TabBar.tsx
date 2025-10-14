import { useState } from 'react';
import { Button } from '../ui/button';
import { Dropdown } from '../ui/Dropdown';
import type { DropdownOption } from '../ui/Dropdown';
import { DeleteTabDialog } from './DeleteTabDialog';
import type { Tab } from '../../types';
import { BACKGROUND_EDITOR } from '@/styles/editor_theme';

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
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);

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
      <div className="bg-transparent flex items-center pt-1 pb-1 px-2">


        {/* Tabs */}
        <div className="flex-1 flex items-center gap-1 relative">
          {tabs.map((tab, index) => {
            const isActive = activeTabId === tab.id;
            const isHovered = hoveredTabId === tab.id;
            const nextTab = tabs[index + 1];
            const nextTabIsActive = nextTab && activeTabId === nextTab.id;
            const nextTabIsHovered = nextTab && hoveredTabId === nextTab.id;

            // Show separator if both current and next tab are inactive and not hovered
            const showSeparator = !isActive && !isHovered && nextTab && !nextTabIsActive && !nextTabIsHovered;

            return (
              <div key={tab.id} className='h-auto w-32'>
                <div
                  className={`w-full px-2 z-10 rounded font-light text-large group relative cursor-pointer inline-flex items-center ${isActive
                    ? 'bg-background-editor text-foreground-highlighted hover:bg-background-editor hover:text-foreground-highlighted py-1 pb-1'
                    : 'bg-transparent text-foreground hover:bg-background-highlighted hover:text-foreground-highlighted py-1'
                    }`}
                  onClick={() => onTabChange(tab.id)}
                  onMouseEnter={() => setHoveredTabId(tab.id)}
                  onMouseLeave={() => setHoveredTabId(null)}
                >
                  {/* Error indicator dot */}
                  {tabHasErrors(tab) && (
                    <span
                      className="rounded-full bg-error mr-1 flex-shrink-0"
                      style={{ width: '6px', height: '6px' }}
                      title={`${tab.name} has compilation errors`}
                    />
                  )}
                  <span className="whitespace-nowrap" style={{ fontSize: '14px', lineHeight: '20px' }}>{tab.name}</span>
                  <div className="w-full" />
                  {tab.isDeletable && (
                    <button
                      onClick={(e) => handleDeleteTabClick(tab, e)}
                      className={`ml-1 rounded ${activeTabId == tab.id ? 'hover:bg-background-highlighted' : 'hover:bg-background'} p-1 opacity-0 group-hover:opacity-100`}
                      style={{ padding: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <svg className="text-muted-foreground group-hover:text-foreground-highlighted" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}

                  {/* Vertical separator line */}
                  {showSeparator && (
                    <div
                      className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-0.5 bg-lines"
                      style={{ height: '60%' }}
                    />
                  )}
                </div>
                <div className="w-full relative">
                  {/* Connecting rectangle under tab - always rendered, fades with opacity */}
                  <div
                    className={`absolute z-20 -bottom-1 left-0 right-0 h-2 bg-background-editor ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0'}`}
                  ></div>
                  {/* Left flare - inverted corner - always rendered, fades with opacity */}
                  <div
                    className={`absolute z-0 -bottom-1 left-0 w-2 h-2 -translate-x-full bg-background  ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <div
                      className="w-full h-full"
                      style={{
                        background: 'radial-gradient(circle at 0% 0%, transparent 8px, ' + BACKGROUND_EDITOR + ' 8px)'
                      }}
                    ></div>
                  </div>
                  {/* Right flare - inverted corner - always rendered, fades with opacity */}
                  <div
                    className={`absolute z-0 -bottom-1 right-0 w-2 h-2 translate-x-full bg-background ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <div
                      className="w-full h-full"
                      style={{
                        background: 'radial-gradient(circle at 100% 0%,transparent 8px, ' + BACKGROUND_EDITOR + ' 8px)'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Tab Button with Dropdown */}
        <div className="mr-1">
          <Dropdown options={addTabDropdownOptions} align="start" sideOffset={4}>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-muted-foreground bg-transparent hover:text-foreground-highlighted hover:bg-background focus:outline-none"
              style={{ width: '18px', height: '18px' }}
              title="Add new tab"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
          </Dropdown>
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
