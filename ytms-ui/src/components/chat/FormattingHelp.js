import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

const FormattingHelp = () => {
  const [isOpen, setIsOpen] = useState(false);

  const formatExamples = [
    {
      name: 'Bold',
      syntax: '**bold text**',
      example: '**This is bold**',
      description: 'Make text bold'
    },
    {
      name: 'Italic',
      syntax: '*italic text*',
      example: '*This is italic*',
      description: 'Make text italic'
    },
    {
      name: 'Inline Code',
      syntax: '`code`',
      example: '`console.log("hello")`',
      description: 'Format as inline code'
    },
    {
      name: 'Code Block',
      syntax: '```\ncode block\n```',
      example: '```\nfunction hello() {\n  console.log("Hello!");\n}\n```',
      description: 'Format as code block'
    },
    {
      name: 'Mentions',
      syntax: '@username',
      example: '@john',
      description: 'Mention a user'
    }
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
        title="Formatting help"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Message Formatting</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            You can format your messages using these syntax options:
          </p>
          
          <div className="space-y-3">
            {formatExamples.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                    {item.syntax}
                  </code>
                </div>
                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500 mb-1">Example:</p>
                  <code className="text-sm text-gray-800">{item.example}</code>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-blue-50 rounded-lg p-3">
            <h4 className="font-medium text-blue-900 mb-2">💡 Tips:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• You can combine formatting (e.g., **_bold italic_**)</li>
              <li>• Use reactions by hovering over messages</li>
              <li>• Press Shift+Enter for line breaks</li>
            </ul>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormattingHelp;