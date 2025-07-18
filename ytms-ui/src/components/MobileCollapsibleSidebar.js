import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Info, 
  FileVideo, 
  Volume2
} from 'lucide-react';

const MobileCollapsibleSidebar = ({ 
  task, 
  user, 
  metadata, 
  revisions, 
  audioInstructions,
  children 
}) => {
  const [expandedSections, setExpandedSections] = useState({
    taskInfo: false,
    revisions: false,
    audio: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const sections = [
    {
      key: 'taskInfo',
      title: 'Task Information',
      icon: Info,
      count: null,
      component: children[0] // TaskInfoSidebar
    },
    {
      key: 'revisions',
      title: 'Revisions History',
      icon: FileVideo,
      count: revisions?.length || 0,
      component: children[1] // RevisionsList
    },
    {
      key: 'audio',
      title: 'Audio Instructions',
      icon: Volume2,
      count: audioInstructions?.length || 0,
      component: children[2] // AudioInstructions
    }
  ];

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const Icon = section.icon;
        const isExpanded = expandedSections[section.key];
        
        return (
          <div key={section.key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Collapsible Header */}
            <button
              onClick={() => toggleSection(section.key)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <Icon className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <span className="font-medium text-gray-900 text-sm">{section.title}</span>
                {section.count !== null && (
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                    {section.count}
                  </span>
                )}
              </div>
              <div className="flex-shrink-0 ml-2">
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </button>
            
            {/* Collapsible Content */}
            {isExpanded && (
              <div className="border-t border-gray-200">
                {section.component}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MobileCollapsibleSidebar;