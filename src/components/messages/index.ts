// Export all components and utilities from the messages feature

// Types
export * from './types';

// Components (selective exports for public API)
export { MessageTab } from './components/message-tab';
export { ThreadList } from './components/thread-list';
export { ActiveThreadView } from './components/active-thread-view';
export { MessageBubble } from './components/message-bubble';
export { MessageInput } from './components/message-input';
export { MessageHeader } from './components/message-header';
export { MessageList } from './components/message-list';
export { MessageIdentitySelector } from './components/message-identity-selector';

// Utils (if needed externally)
export { groupMessagesByDate, formatMessageTime, getInitials } from './utils'; 