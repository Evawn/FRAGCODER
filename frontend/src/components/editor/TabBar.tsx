import { useState } from 'react';
import { Button } from '../ui/button';
import { Dropdown } from '../ui/Dropdown';
import type { DropdownOption } from '../ui/Dropdown';
import { DeleteTabDialog } from './DeleteTabDialog';
import type { Tab } from '../../types';
import { BACKGROUND_EDITOR } from '@/styles/editor_theme';
import { Monitor, Layers, FileText } from 'lucide-react';

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
  const [isNewTabButtonHovered, setIsNewTabButtonHovered] = useState(false);

  // Tab icon styling
  const tabIconProps = {
    size: 14,
    strokeWidth: 1.2,
    className: "mr-1.5 flex-shrink-0"
  };

  // Get icon for tab based on tab name
  const getTabIcon = (tabName: string) => {
    if (tabName === 'Image') {
      return <Monitor {...tabIconProps} />;
    } else if (tabName.startsWith('Buffer')) {
      return <Layers {...tabIconProps} />;
    } else if (tabName === 'Common') {
      return <FileText {...tabIconProps} />;
    }
    return null;
  };

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

  // Add tab dropdown options - filtered to show only tabs that don't exist yet
  const allPossibleTabs = ['Buffer A', 'Buffer B', 'Buffer C', 'Buffer D', 'Common'];
  const existingTabNames = new Set(tabs.map(tab => tab.name));
  const addTabDropdownOptions: DropdownOption[] = allPossibleTabs
    .filter(tabName => !existingTabNames.has(tabName))
    .map(tabName => ({
      text: tabName,
      callback: () => onAddTab(tabName),
      icon: tabName.startsWith('Buffer') ? Layers : FileText
    }));

  return (
    <>
      <div className="bg-transparent flex items-center pt-1 pb-1 px-2">


        {/* Tabs */}
        <div className="flex-1 flex items-center gap-1 relative">
          {tabs.map((tab, index) => {
            const isActive = activeTabId === tab.id;
            const isHovered = hoveredTabId === tab.id;
            const nextTab = tabs[index + 1];
            const isLastTab = index === tabs.length - 1;
            const nextTabIsActive = nextTab && activeTabId === nextTab.id;
            const nextTabIsHovered = nextTab && hoveredTabId === nextTab.id;

            // Show separator if both current and next tab/button are inactive and not hovered
            // For the last tab, the "next" element is the new tab button
            const showSeparator = !isActive && !isHovered && (
              isLastTab
                ? !isNewTabButtonHovered
                : (nextTab && !nextTabIsActive && !nextTabIsHovered)
            );

            return (
              <div key={tab.id} className='h-auto w-32'>
                <div
                  className={`w-full select-none px-2 z-10 rounded-md font-light text-large group relative cursor-pointer inline-flex items-center ${isActive
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
                  {/* Tab icon */}
                  {getTabIcon(tab.name)}
                  <span className="whitespace-nowrap" style={{ fontSize: '14px', lineHeight: '20px' }}>{tab.name}</span>
                  <div className="w-full" />
                  {tab.isDeletable && (
                    <button
                      onClick={(e) => handleDeleteTabClick(tab, e)}
                      className={`ml-1 rounded ${activeTabId == tab.id ? 'hover:bg-background-highlighted ' : 'hover:bg-background'} p-1 opacity-0 group-hover:opacity-100`}
                      style={{ padding: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <svg className="text-muted-foreground group-hover:text-foreground-highlighted" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}

                  {/* Vertical separator line */}
                  <div
                    className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-0.5 bg-lines transition-opacity duration-300"
                    style={{ height: '60%', opacity: showSeparator ? 1 : 0 }}
                  />
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
          {/* Add Tab Button with Dropdown */}
          <div
            className="z-10"
            onMouseEnter={() => setIsNewTabButtonHovered(true)}
            onMouseLeave={() => setIsNewTabButtonHovered(false)}
          >
            <Dropdown options={addTabDropdownOptions} sideOffset={4}>
              <Button
                //variant="ghost"
                size="sm"
                className="h-auto stroke-foreground bg-transparent hover:stroke-foreground-highlighted hover:text-foreground-highlighted hover:bg-background-highlighted focus:outline-none shadow-none rounded"
                style={{ width: '28px', height: '28px', padding: '4px' }}
                title="Add new tab"
              >
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Button>
            </Dropdown>
          </div>
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
