import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, Send, SmilePlus } from "lucide-react"; // SmilePlus if emoji picker is added later

interface MessageInputProps {
  message: string;
  setMessage: (msg: string) => void;
  onSendMessage: () => void;
  isSending: boolean;
  disabled?: boolean;
  className?: string;
}

export function MessageInput({
  message,
  setMessage,
  onSendMessage,
  isSending,
  disabled = false,
  className
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    if (!isSending && message.trim()) {
      onSendMessage();
      // Blur input after sending to dismiss keyboard on mobile
      textareaRef.current?.blur();
    }
  };

  // Auto-resize textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height
      const scrollHeight = textarea.scrollHeight;
      // Apply max height constraint (e.g., equivalent to max-h-32 or 8rem)
      const maxHeight = 128; 
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`; 
    }
  }, [message]);

  return (
    <div className={cn(
      "p-2 bg-background shrink-0",
      className
    )}>
      <div className="flex gap-2 items-center">
        {/* Emoji button placeholder */}
        {/* <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg shrink-0">
          <SmilePlus className="h-5 w-5 text-muted-foreground" />
        </Button> */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={handleKeyDown}
          disabled={isSending || disabled}
          className={cn(
            "flex-1 min-h-[44px] max-h-32 px-3 py-2 text-base resize-none overflow-y-auto",
            "bg-muted border-transparent rounded-lg", // Subtle background, no border initially
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-input" // Ring and border on focus
          )}
          maxLength={2000}
          rows={1}
        />
        <Button
          onClick={handleSendMessage}
          disabled={isSending || !message.trim() || disabled}
          size="icon"
          className={cn(
             "h-10 w-10 rounded-lg shrink-0",
             "bg-primary text-primary-foreground hover:bg-primary/90", // Primary send button style
             "disabled:bg-muted disabled:text-muted-foreground disabled:opacity-50"
          )} 
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
} 