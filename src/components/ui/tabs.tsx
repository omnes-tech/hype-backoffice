import { clsx } from "clsx";

interface TabsProps {
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="w-full border-b border-neutral-200 bg-white">
      <div className="flex gap-0.5 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              "px-5 py-3.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

