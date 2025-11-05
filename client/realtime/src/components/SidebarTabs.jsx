import React, { useState } from 'react';
import { MessageSquare, ListChecks, Notebook } from 'lucide-react';

const SidebarTabs = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0); 
  const tabs = [
    { name: 'Poll', icon: <ListChecks size={20} /> },
    { name: 'Chat', icon: <MessageSquare size={20} /> },
    { name: 'Notes', icon: <Notebook size={20} /> },
  ];

  const childrenArray = React.Children.toArray(children);

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg shadow-lg">
      <div className="flex border-b border-gray-700">
        {tabs.map((tab, index) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(index)}
            className={`
              flex-1 flex justify-center items-center gap-2 p-3 font-semibold
              ${activeTab === index 
                ? 'text-white border-b-2 border-blue-500' 
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            {tab.icon}
            {tab.name}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {childrenArray.map((child, index) => (
          <div 
            key={index} 
            className={activeTab === index ? 'block h-full' : 'hidden'}
          >
            {child}
          </div>
        ))}
      </div>

    </div>
  );
};

export default SidebarTabs;