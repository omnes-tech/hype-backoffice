import { clsx } from "clsx";

interface TabsProps {
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="w-full border-b border-neutral-200 bg-white">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              "px-6 py-4 text-sm font-medium transition-colors duration-150 whitespace-nowrap border-b-2",
              activeTab === tab.id
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-neutral-600 hover:text-neutral-950 hover:border-neutral-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

