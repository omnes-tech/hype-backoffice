import { clsx } from "clsx";

interface TabsProps {
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="w-full bg-white overflow-hidden">
      <div className="flex justify-between gap-0 overflow-x-auto overflow-y-hidden pt-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              "px-4 py-2 text-sm transition-colors duration-150 whitespace-nowrap border-b-3",
              activeTab === tab.id
                ? "border-primary-500 text-neutral-950 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-700 font-normal"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

