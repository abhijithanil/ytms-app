import React from 'react';
import ChatPanel from './ChatPanel';

const TaskChatTab = ({ taskId }) => {
  return (
    <div className="h-96">
      <ChatPanel taskId={taskId} showOnlineUsers={false} className="h-full" />
    </div>
  );
};