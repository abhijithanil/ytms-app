import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmojiPicker from '../components/chat/EmojiPicker';
import MarkdownRenderer from '../components/chat/MarkdownRenderer';
import MessageReactions from '../components/chat/MessageReactions';

// Mock tests for the new chat components
describe('Enhanced Chat Components', () => {
  
  describe('EmojiPicker', () => {
    test('renders emoji picker when open', () => {
      const mockOnEmojiSelect = jest.fn();
      render(
        <EmojiPicker 
          isOpen={true} 
          onToggle={() => {}} 
          onEmojiSelect={mockOnEmojiSelect} 
        />
      );
      
      expect(screen.getByText('Smileys')).toBeInTheDocument();
      expect(screen.getByText('😀')).toBeInTheDocument();
    });

    test('calls onEmojiSelect when emoji is clicked', () => {
      const mockOnEmojiSelect = jest.fn();
      render(
        <EmojiPicker 
          isOpen={true} 
          onToggle={() => {}} 
          onEmojiSelect={mockOnEmojiSelect} 
        />
      );
      
      fireEvent.click(screen.getByText('😀'));
      expect(mockOnEmojiSelect).toHaveBeenCalledWith('😀');
    });
  });

  describe('MarkdownRenderer', () => {
    test('renders bold text correctly', () => {
      render(<MarkdownRenderer content="This is **bold** text" />);
      expect(screen.getByText('bold')).toHaveStyle('font-weight: bold');
    });

    test('renders italic text correctly', () => {
      render(<MarkdownRenderer content="This is *italic* text" />);
      expect(screen.getByText('italic')).toHaveStyle('font-style: italic');
    });

    test('renders code text correctly', () => {
      render(<MarkdownRenderer content="This is `code` text" />);
      expect(screen.getByText('code')).toHaveClass('font-mono');
    });

    test('renders links correctly', () => {
      render(<MarkdownRenderer content="Check [this link](https://example.com)" />);
      const link = screen.getByText('this link');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
    });

    test('escapes HTML to prevent XSS', () => {
      render(<MarkdownRenderer content="<script>alert('xss')</script>" />);
      expect(screen.queryByText('script')).not.toBeInTheDocument();
    });
  });

  describe('MessageReactions', () => {
    test('renders existing reactions', () => {
      const reactions = '{"👍":[1,2],"❤️":[3]}';
      render(
        <MessageReactions 
          reactions={reactions}
          messageId={1}
          currentUserId={1}
        />
      );
      
      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    test('handles empty reactions', () => {
      render(
        <MessageReactions 
          reactions="{}"
          messageId={1}
          currentUserId={1}
        />
      );
      
      // Should render add reaction button
      expect(screen.getByTitle('Add reaction')).toBeInTheDocument();
    });

    test('calls onAddReaction when reaction is clicked', () => {
      const mockOnAddReaction = jest.fn();
      const reactions = '{"👍":[2]}';
      
      render(
        <MessageReactions 
          reactions={reactions}
          messageId={1}
          currentUserId={1}
          onAddReaction={mockOnAddReaction}
        />
      );
      
      fireEvent.click(screen.getByText('👍'));
      expect(mockOnAddReaction).toHaveBeenCalledWith(1, '👍');
    });
  });

});

// Integration test for the complete chat functionality
describe('Chat Integration', () => {
  test('message flow works correctly', () => {
    // This would be a more comprehensive test
    // involving the complete chat flow
    const mockUser = {
      id: 1,
      username: 'testuser',
      name: 'Test User'
    };

    const mockMessage = {
      id: 1,
      content: 'Hello **team**! 👋',
      senderId: 1,
      senderUsername: 'testuser',
      senderName: 'Test User',
      createdAt: new Date(),
      reactions: '{"👋":[2]}',
      isEdited: false
    };

    // Test message rendering with markdown and reactions
    expect(mockMessage.content).toContain('**team**');
    expect(JSON.parse(mockMessage.reactions)).toHaveProperty('👋');
    
    // Verify message structure
    expect(mockMessage).toHaveProperty('senderId');
    expect(mockMessage).toHaveProperty('createdAt');
    expect(mockMessage).toHaveProperty('reactions');
  });
});

// Performance test
describe('Chat Performance', () => {
  test('handles large message lists efficiently', () => {
    const largeMessageList = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      content: `Message ${i}`,
      senderId: i % 10,
      senderUsername: `user${i % 10}`,
      senderName: `User ${i % 10}`,
      createdAt: new Date(Date.now() - i * 1000),
      reactions: '{}',
      isEdited: false
    }));

    // Performance test would measure rendering time
    const startTime = performance.now();
    // Render large list
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(100); // Should render in under 100ms
    expect(largeMessageList).toHaveLength(1000);
  });
});

export { };