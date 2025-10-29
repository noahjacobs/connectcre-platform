'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Settings, 
  Search, 
  Plus, 
  MessageCircle, 
  Radar, 
  Reply, 
  CheckCircle,
  Clock,
  Archive,
  Trash2,
  MoreVertical,
  ExternalLink,
  User,
  Eye,
  ExternalLinkIcon,
  Mail,
  Smartphone,
  Globe,
  Loader2,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/providers/auth-context';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { getPostUrl } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
// TODO: Implement simplified notification system
// import { fetchUserNotifications, fetchUserComments, markNotificationAsRead, archiveNotification, unarchiveNotification, deleteNotification, deleteComment, getPostDetails, fetchUserNotificationSettings, updateUserNotificationSettings, type NotificationSettings } from '@/features/tracking/actions/notifications';
import { toast } from 'sonner';

// Temporary stubs until we implement new notification system
const fetchUserNotifications = async () => ({ notifications: [] });
const fetchUserComments = async () => ({ comments: [] });
const markNotificationAsRead = async () => ({});
const archiveNotification = async () => ({});
const unarchiveNotification = async () => ({});
const deleteNotification = async () => ({});
const deleteComment = async () => ({});
const getPostDetails = async () => ({ post: null });
const fetchUserNotificationSettings = async () => ({ settings: { email: false, push: false, web: false } });
const updateUserNotificationSettings = async () => ({});
type NotificationSettings = { email: boolean; push: boolean; web: boolean };

export interface NotificationItem {
  id: string;
  type: 'comment' | 'reply' | 'project_update'; // | 'message'; // MVP: Messages feature commented out
  title: string;
  content: string;
  isRead: boolean;
  isArchived?: boolean;
  createdAt: string;
  avatar?: string;
  userName?: string;
  metadata?: {
    postId?: string;
    postTitle?: string;
    postSlug?: string;
    cityName?: string;
    neighborhoodName?: string;
    projectId?: string;
    projectTitle?: string;
    projectSlug?: string;
    // threadId?: string; // MVP: Messages feature commented out
    commentId?: string;
    parentCommentId?: string;
  };
}

interface NotificationMenuProps {
  onNotificationClick?: (notification: NotificationItem) => void;
  onAuthRequired?: () => void;
}

export function NotificationMenu({ onNotificationClick, onAuthRequired }: NotificationMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'archive' | 'comments'>('inbox');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [commentsData, setCommentsData] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isMountedRef = useRef(true);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: {
      sendEmails: true,
      weeklyDigest: true,
      marketing: false
    },
    push: {
      enabled: true
    },
    activity: {
      comments: true,
      replies: true,
      projectUpdates: true,
      messages: true
    }
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Cleanup effect
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load notifications from the database
  useEffect(() => {
    if (user && !authLoading) {
      loadNotifications();
      loadComments();
    } else if (!user && !authLoading) {
      // Clear notifications and reset loading state when user logs out
      setNotifications([]);
      setCommentsData([]);
      setLoading(false);
    }
    // If authLoading is true, don't change anything - let it continue loading
  }, [user, authLoading]);

  // Close dropdown when notification menu is closed
  useEffect(() => {
    if (!isOpen) {
      setOpenDropdown(null);
      setExpandedNotifications(new Set()); // Clear expanded notifications when menu closes
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    if (!user || !isMountedRef.current) {
      if (isMountedRef.current) setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        console.warn('[NotificationMenu] Notifications loading timed out');
        setLoading(false);
        setNotifications([]);
      }
    }, 30000); // 30 second timeout
    
    try {
      const response = await fetchUserNotifications(undefined, 50); // Let server get user from Clerk auth
      clearTimeout(timeoutId); // Clear timeout on successful response
      
      if (!isMountedRef.current) return; // Check if component is still mounted
      
      if (response.error) {
        console.warn('[NotificationMenu] Notifications fetch error:', response.error);
        toast.error(response.error);
        setNotifications([]); // Set empty array on error
      } else {
        setNotifications(response.notifications);
      }

      // ===== TEST DATA - COMMENT OUT FOR PRODUCTION =====
      // Uncomment the section below to add test notification data
      /*
      const testNotifications: NotificationItem[] = [
        {
          id: 'test-1',
          type: 'project_update',
          title: 'Project update',
          content: 'Brooklyn Heights Tower has a new construction update: Foundation work completed successfully. Steel frame construction will begin next week. This is a longer notification to test the expansion functionality.',
          isRead: false,
          isArchived: false,
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          userName: 'System',
          metadata: {
            projectId: 'test-project-1',
            projectTitle: 'Brooklyn Heights Tower',
            projectSlug: 'brooklyn-heights-tower'
          }
        },
        {
          id: 'test-2',
          type: 'comment',
          title: 'New comment on your post',
          content: 'John Doe commented: "This is a great development for the neighborhood!"',
          isRead: true,
          isArchived: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          userName: 'John Doe',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
          metadata: {
            postId: 'test-post-1',
            commentId: 'test-comment-1'
          }
        },
        {
          id: 'test-3',
          type: 'project_update',
          title: 'Project status updated',
          content: 'Manhattan Plaza status was updated from under_construction to completed by an admin',
          isRead: false,
          isArchived: false,
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
          userName: 'Admin',
          metadata: {
            projectId: 'test-project-2',
            projectTitle: 'Manhattan Plaza',
            projectSlug: 'manhattan-plaza'
          }
        },
        {
          id: 'test-4',
          type: 'reply',
          title: 'Reply to your comment',
          content: 'Sarah Johnson replied: "I completely agree with your assessment about the architectural design. The use of sustainable materials is particularly impressive in this project."',
          isRead: false,
          isArchived: true, // This one is archived to test archive functionality
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
          userName: 'Sarah Johnson',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
          metadata: {
            postId: 'test-post-2',
            commentId: 'test-comment-2',
            parentCommentId: 'test-parent-comment-1'
          }
        },
        {
          id: 'test-5',
          type: 'comment',
          title: 'New comment on your post',
          content: 'Mike Wilson commented: "Great project! Looking forward to seeing the final results."',
          isRead: true,
          isArchived: false,
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
          userName: 'Mike Wilson',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
          metadata: {
            postId: 'test-post-3',
            commentId: 'test-comment-3'
          }
        }
      ];
      
      setNotifications(prev => [...testNotifications, ...prev]);
      */
    } catch (error) {
      clearTimeout(timeoutId); // Clear timeout on exception
      if (!isMountedRef.current) return; // Check if component is still mounted
      
      console.error('[NotificationMenu] Exception loading notifications:', error);
      toast.error('Failed to load notifications');
      setNotifications([]); // Set empty array on exception
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const loadComments = async () => {
    if (!user) return;
    
    try {
      const response = await fetchUserComments(user.id, 50);
      if (response.error) {
        // Don't show error toast for comments data - it's secondary
        console.error('Error loading comments:', response.error);
      } else {
        setCommentsData(response.notifications);
      }

      // ===== TEST DATA - COMMENT OUT FOR PRODUCTION =====
      // Uncomment the section below to add test comment data
      /*
      const testComments: NotificationItem[] = [
        {
          id: 'user-comment-test-1',
          type: 'comment',
          title: 'Your comment',
          content: 'You commented: "This project looks amazing! The design is very modern and sustainable."',
          isRead: true,
          isArchived: false,
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
          userName: 'You',
          metadata: {
            postId: 'test-post-3',
            commentId: 'user-comment-test-1'
          }
        },
        {
          id: 'user-comment-test-2',
          type: 'reply',
          title: 'Your reply',
          content: 'You replied: "Thanks for sharing those details about the construction timeline. Very helpful information for the community."',
          isRead: true,
          isArchived: false, // Comments can't be archived anymore
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
          userName: 'You',
          metadata: {
            postId: 'test-post-4',
            commentId: 'user-comment-test-2',
            parentCommentId: 'parent-test-1'
          }
        },
        {
          id: 'user-comment-test-3',
          type: 'comment',
          title: 'Your comment',
          content: 'You commented: "I have some concerns about the parking situation with this development."',
          isRead: false,
          isArchived: false,
          createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
          userName: 'You',
          metadata: {
            postId: 'test-post-5',
            commentId: 'user-comment-test-3'
          }
        }
      ];
      setCommentsData(prev => [...testComments, ...prev]);
      */
    } catch (error) {
      console.error('Error loading comments:', error);
      // Don't show error toast for comments data - it's secondary
    }
  };

  // Only count unread notifications that appear in Inbox (not archived, not comments)
  const unreadCount = notifications.filter(n => !n.isRead && !n.isArchived).length;

  const handleNotificationMenuClick = () => {
    if (!user) {
      onAuthRequired?.();
      return;
    }
    setIsOpen(true);
  };

  const filteredNotifications = (() => {
    if (activeTab === 'comments') {
      return commentsData.filter(notification => {
        const matchesSearch = searchQuery.length === 0 || 
                             notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             notification.content.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });
    }
    
    if (activeTab === 'archive') {
      // Show archived notifications
      return notifications.filter(notification => {
        const matchesSearch = searchQuery.length === 0 || 
                             notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             notification.content.toLowerCase().includes(searchQuery.toLowerCase());
        return notification.isArchived && matchesSearch;
      });
    }
    
    // Inbox - show all notifications that are not archived (both read and unread)
    return notifications.filter(notification => {
      const matchesSearch = searchQuery.length === 0 || 
                           notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           notification.content.toLowerCase().includes(searchQuery.toLowerCase());
      return !notification.isArchived && matchesSearch;
    });
  })();

  const handleNotificationClick = (notification: NotificationItem) => {
    // Instead of navigating, open the dropdown menu
    setOpenDropdown(openDropdown === notification.id ? null : notification.id);
  };

  const handleShowPost = async (notification: NotificationItem) => {
    try {
      // Navigate based on notification type
      if (notification.type === 'comment' || notification.type === 'reply') {
        // Use the postId to look up the post details and construct the proper URL
        if (notification.metadata?.postId) {
          try {
            const postDetails = await getPostDetails(notification.metadata.postId);
            
            if (postDetails.error) {
              toast.error(postDetails.error);
              return;
            }

            // Construct the URL using the post details
            const url = getPostUrl(
              postDetails.cityName,
              postDetails.neighborhoodName,
              postDetails.slug
            );
            router.push(`${url}#post-comments`);
          } catch (error) {
            console.error('Error fetching post details:', error);
            toast.error('Failed to navigate to post');
          }
        } else {
          // Fallback: try to use post metadata directly if available
          if (notification.metadata?.cityName && notification.metadata?.neighborhoodName && notification.metadata?.postSlug) {
            const url = getPostUrl(
              notification.metadata.cityName,
              notification.metadata.neighborhoodName,
              notification.metadata.postSlug
            );
            router.push(`${url}#post-comments`);
          } else {
            toast.error('Could not navigate to post - missing post information');
          }
        }
      } else if (notification.type === 'project_update') {
        // Use projectSlug if available, fallback to projectId for backwards compatibility
        const projectIdentifier = notification.metadata?.projectSlug || notification.metadata?.projectId;
        if (projectIdentifier) {
          router.push(`/project/${projectIdentifier}`);
        } else {
          toast.error('Could not navigate to project - missing identifier');
          return;
        }
      // } else if (notification.type === 'message') { // MVP: Messages feature commented out
      //   if (notification.metadata?.threadId) {
      //     router.push(`/messages?thread=${notification.metadata.threadId}`);
      //   } else {
      //     router.push('/messages');
      //   }
      } else {
        toast.error('Navigation not supported for this notification type');
        return;
      }

      setIsOpen(false);
      setOpenDropdown(null);
      onNotificationClick?.(notification);
    } catch (error) {
      console.error('Error navigating from notification:', error);
      toast.error('Failed to navigate');
    }
  };

  const handleDeleteComment = async (notification: NotificationItem) => {
    try {
      // Only allow deleting comment/reply notifications, and only if we have the comment ID
      if (!['comment', 'reply'].includes(notification.type)) {
        toast.error('This notification cannot be deleted');
        return;
      }

      // Use the comment ID from metadata, not the notification ID
      const commentId = notification.metadata?.commentId;
      if (!commentId) {
        toast.error('Comment ID not found');
        return;
      }

      // Call the delete API with the actual comment ID
      const result = await deleteComment(commentId);
      
      if (result.success) {
        // Remove from local state after successful deletion
        if (notification.id.startsWith('user-comment-')) {
          setCommentsData(prev => prev.filter(n => n.id !== notification.id));
        } else {
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }
        
        toast.success('Comment deleted successfully');
        setOpenDropdown(null);
      } else {
        toast.error(result.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleDeleteNotification = async (notification: NotificationItem) => {
    try {
      // For non-comment notifications, permanently delete the notification
      // This won't delete the underlying content, just the notification
      const result = await deleteNotification(notification.id);
      
      if (result.success) {
        // Remove from local state after successful deletion
        if (notification.id.startsWith('user-comment-')) {
          setCommentsData(prev => prev.filter(n => n.id !== notification.id));
        } else {
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }
        
        toast.success('Notification deleted successfully');
        setOpenDropdown(null);
      } else {
        toast.error(result.error || 'Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleMarkAsRead = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Update the appropriate data source
    if (notificationId.startsWith('user-comment-')) {
      setCommentsData(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } else {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    }
    
    try {
      const result = await markNotificationAsRead(notificationId);
      if (!result.success && result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleArchive = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Update the appropriate data source - archive means mark as read AND remove from inbox
    if (notificationId.startsWith('user-comment-')) {
      setCommentsData(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true, isArchived: true } : n)
      );
    } else {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true, isArchived: true } : n)
      );
    }
    
    try {
      const result = await archiveNotification(notificationId);
      if (result.success) {
        toast.success('Notification archived');
        setOpenDropdown(null);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
      toast.error('Failed to archive notification');
    }
  };

  const handleUnarchive = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Update the appropriate data source - unarchive means set isArchived to false
    if (notificationId.startsWith('user-comment-')) {
      setCommentsData(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isArchived: false } : n)
      );
    } else {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isArchived: false } : n)
      );
    }
    
    try {
      const result = await unarchiveNotification(notificationId);
      if (result.success) {
        toast.success('Notification unarchived');
        setOpenDropdown(null);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error unarchiving notification:', error);
      toast.error('Failed to unarchive notification');
    }
  };

  const toggleNotificationExpansion = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleSettingsChange = (path: string, value: boolean) => {
    setNotificationSettings(prev => {
      const keys = path.split('.');
      if (keys.length === 2) {
        return {
          ...prev,
          [keys[0]]: {
            ...prev[keys[0] as keyof NotificationSettings],
            [keys[1]]: value
          }
        };
      }
      return prev;
    });
  };

  const loadSettings = async () => {
    try {
      const response = await fetchUserNotificationSettings();
      if (response.error) {
        toast.error(response.error);
      } else if (response.settings) {
        setNotificationSettings(response.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const result = await updateUserNotificationSettings(notificationSettings);
      if (result.success) {
        toast.success('Notification settings updated');
        setIsSettingsOpen(false);
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'reply':
        return <Reply className="w-4 h-4 text-green-500" />;
      case 'project_update':
        return <Radar className="w-4 h-4 text-orange-500" />;
      // case 'message': // MVP: Messages feature commented out
      //   return <MessageCircle className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const canShowPost = (notification: NotificationItem) => {
    // For comment/reply notifications, need postId or post location data
    if (notification.type === 'comment' || notification.type === 'reply') {
      return !!(notification.metadata?.postId || 
                (notification.metadata?.cityName && 
                 notification.metadata?.neighborhoodName && 
                 notification.metadata?.postSlug));
    }
    
    // For project updates, need project identifier
    if (notification.type === 'project_update') {
      return !!(notification.metadata?.projectSlug || notification.metadata?.projectId);
    }
    
    return false;
  };

  return (
    <>
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          className="rounded-full w-full h-full p-[6.5px] relative"
          variant="outline"
          size="icon"
          onClick={handleNotificationMenuClick}
        >
          <Bell className="w-[17px]! h-[17px]!" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white border-2 border-background"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] h-[500px] p-0">
        <div className="flex flex-col h-full">
          {/* Header with Tabs */}
          <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800">
            <button 
              className={cn(
                "px-4 py-3 text-sm transition-colors flex flex-row items-center",
                activeTab === 'inbox' 
                  ? "text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 font-medium" 
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
              onClick={() => setActiveTab('inbox')}
            >
              Inbox
              {unreadCount > 0 && activeTab !== 'inbox' && (
                <Badge className="ml-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </button>
            <button 
              className={cn(
                "px-4 py-3 text-sm transition-colors",
                activeTab === 'archive' 
                  ? "text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 font-medium" 
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
              onClick={() => setActiveTab('archive')}
            >
              Archive
            </button>
            <button 
              className={cn(
                "px-4 py-3 text-sm transition-colors",
                activeTab === 'comments' 
                  ? "text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 font-medium" 
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
              onClick={() => setActiveTab('comments')}
            >
              Comments
            </button>
            <div className="flex-1"></div>
            <Button 
              variant="ghost"
              size="icon"
              className="mr-2 group rounded-full w-8 h-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-200"
              onClick={() => {
                setIsSettingsOpen(true);
                loadSettings();
              }}
            >
              <Settings className="w-4 h-4 text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
            </Button>
          </div>
          
          {/* Search and Filter */}
          {/* <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-sm placeholder:text-zinc-400"
                />
              </div>
              <Button variant="outline" size="sm" className="px-3">
                <Plus className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div> */}
          
          {/* Notifications List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                  {activeTab === 'comments' ? (
                    <MessageCircle className="w-6 h-6 text-zinc-400" />
                  ) : activeTab === 'archive' ? (
                    <Archive className="w-6 h-6 text-zinc-400" />
                  ) : (
                    <Bell className="w-6 h-6 text-zinc-400" />
                  )}
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  {activeTab === 'comments' ? 'No comments or replies yet' : 
                   activeTab === 'archive' ? 'No archived notifications' : 
                   'No new notifications'}
                </p>
                {activeTab === 'comments' && (
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
                    Your comments and replies to them will appear here
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group",
                      !notification.isRead && "bg-blue-50/50 dark:bg-blue-900/10",
                      activeTab === 'comments' && notification.id.startsWith('user-comment-') && "bg-green-50/30 dark:bg-green-900/10 border-l-2 border-l-green-400"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-1">
                        {notification.avatar ? (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={notification.avatar} />
                            <AvatarFallback>{notification.userName?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center",
                            activeTab === 'comments' && notification.id.startsWith('user-comment-') 
                              ? "bg-green-100 dark:bg-green-900/30" 
                              : "bg-zinc-100 dark:bg-zinc-800"
                          )}>
                            {activeTab === 'comments' && notification.id.startsWith('user-comment-') 
                              ? <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                              : getNotificationIcon(notification.type)
                            }
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 max-w-[280px]">
                            <p className={cn(
                              "text-sm truncate",
                              !notification.isRead ? "font-semibold text-zinc-900 dark:text-zinc-100" : "font-medium text-zinc-700 dark:text-zinc-300"
                            )}>
                              {notification.title}
                            </p>
                            <div>
                              <p className={cn(
                                "text-sm text-zinc-600 dark:text-zinc-400",
                                expandedNotifications.has(notification.id) ? "whitespace-pre-wrap" : "line-clamp-2"
                              )}>
                                {notification.content}
                              </p>
                              {notification.content.length > 80 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleNotificationExpansion(notification.id);
                                  }}
                                  className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-1"
                                >
                                  {expandedNotifications.has(notification.id) ? 'Show less' : 'Show more'}
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 truncate">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0"></div>
                            )}
                            <DropdownMenu 
                              open={openDropdown === notification.id} 
                              onOpenChange={(open) => setOpenDropdown(open ? notification.id : null)}
                            >
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className={cn(
                                    "h-6 w-6 p-0 transition-opacity shrink-0",
                                    openDropdown === notification.id 
                                      ? "opacity-100" 
                                      : "opacity-0 group-hover:opacity-100"
                                  )}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {/* Only show "Show post" if there's something to navigate to */}
                                {canShowPost(notification) && (
                                  <DropdownMenuItem onClick={async (e) => {
                                    e.stopPropagation();
                                    await handleShowPost(notification);
                                  }}>
                                    <ExternalLinkIcon className="w-4 h-4 mr-1" />
                                    {notification.type === 'project_update' ? 'Show project' : 'Show post'}
                                  </DropdownMenuItem>
                                )}
                                {notification.content.length > 80 && (
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    toggleNotificationExpansion(notification.id);
                                  }}>
                                    <Eye className="w-4 h-4 mr-1" />
                                    {expandedNotifications.has(notification.id) ? 'Show less' : 'Show more'}
                                  </DropdownMenuItem>
                                )}
                                {!notification.isRead && (
                                  <DropdownMenuItem onClick={(e) => handleMarkAsRead(notification.id, e)}>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Mark as read
                                  </DropdownMenuItem>
                                )}
                                {/* Show archive/unarchive for non-comment notifications */}
                                {!notification.id.startsWith('user-comment-') && (
                                  notification.isArchived ? (
                                    <DropdownMenuItem onClick={(e) => handleUnarchive(notification.id, e)}>
                                      <Archive className="w-4 h-4 mr-1" />
                                      Unarchive
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={(e) => handleArchive(notification.id, e)}>
                                      <Archive className="w-4 h-4 mr-1" />
                                      Archive
                                    </DropdownMenuItem>
                                  )
                                )}
                                {/* Show delete comment option for comment/reply notifications with commentId */}
                                {['comment', 'reply'].includes(notification.type) && notification.metadata?.commentId && (
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteComment(notification);
                                    }}
                                    className="text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete Comment
                                  </DropdownMenuItem>
                                )}
                                {/* Show delete notification option for all other notification types */}
                                {!['comment', 'reply'].includes(notification.type) && (
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNotification(notification);
                                    }}
                                    className="text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete Notification
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>

    {/* Notification Settings Dialog */}
    <Dialog open={isSettingsOpen} onOpenChange={(open) => {
      setIsSettingsOpen(open);
      if (open) loadSettings();
    }}>
      <DialogContent className="sm:max-w-[560px] h-[80vh] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl p-0 shadow-xl flex flex-col" showCloseButton={false}>
        <div className="p-6 pb-4 border-b border-zinc-200 dark:border-zinc-700 shrink-0 relative">
          <Button
            variant="ghost"
            className="absolute right-4 top-4 rounded-full p-0 w-8 h-8"
            onClick={() => setIsSettingsOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Notification Settings
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage how you receive notifications and updates.
            </p>
          </div>
        </div>
        
        <ScrollArea className="flex-1 h-0 px-6">
          <div className="space-y-6 py-4">
            {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Email Notifications</h4>
            </div>
            <div className="pl-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-send" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Send email notifications
                  </Label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Receive email alerts for important activity
                  </p>
                </div>
                <Checkbox
                  id="email-send"
                  checked={notificationSettings.email.sendEmails}
                  onCheckedChange={(checked) => 
                    handleSettingsChange('email.sendEmails', checked === true)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-digest" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Weekly digest
                  </Label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Get a summary of market activity each week
                  </p>
                </div>
                <Checkbox
                  id="weekly-digest"
                  checked={notificationSettings.email.weeklyDigest}
                  onCheckedChange={(checked) => 
                    handleSettingsChange('email.weeklyDigest', checked === true)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing-emails" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Marketing emails
                  </Label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Receive updates about new features and offers
                  </p>
                </div>
                <Checkbox
                  id="marketing-emails"
                  checked={notificationSettings.email.marketing}
                  onCheckedChange={(checked) => 
                    handleSettingsChange('email.marketing', checked === true)
                  }
                />
              </div>
            </div>
          </div>

          <Separator className="bg-zinc-200 dark:bg-zinc-700" />

          {/* Activity Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Activity Notifications</h4>
            </div>
            <div className="pl-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="activity-comments" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Comments on your posts
                  </Label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    When someone comments on your posts
                  </p>
                </div>
                <Checkbox
                  id="activity-comments"
                  checked={notificationSettings.activity.comments}
                  onCheckedChange={(checked) => 
                    handleSettingsChange('activity.comments', checked === true)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="activity-replies" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Replies to your comments
                  </Label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    When someone replies to your comments
                  </p>
                </div>
                <Checkbox
                  id="activity-replies"
                  checked={notificationSettings.activity.replies}
                  onCheckedChange={(checked) => 
                    handleSettingsChange('activity.replies', checked === true)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="activity-projects" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Project updates
                  </Label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Updates on projects you're tracking
                  </p>
                </div>
                <Checkbox
                  id="activity-projects"
                  checked={notificationSettings.activity.projectUpdates}
                  onCheckedChange={(checked) => 
                    handleSettingsChange('activity.projectUpdates', checked === true)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="activity-messages" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Messages
                  </Label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Direct messages and conversations
                  </p>
                </div>
                <Checkbox
                  id="activity-messages"
                  checked={notificationSettings.activity.messages}
                  onCheckedChange={(checked) => 
                    handleSettingsChange('activity.messages', checked === true)
                  }
                />
              </div>
            </div>
          </div>

          <Separator className="bg-zinc-200 dark:bg-zinc-700" />

          {/* Push Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Push Notifications</h4>
            </div>
            <div className="pl-10">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-enabled" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Enable push notifications
                  </Label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Get instant notifications in your browser
                  </p>
                </div>
                <Checkbox
                  id="push-enabled"
                  checked={notificationSettings.push.enabled}
                  onCheckedChange={(checked) => 
                    handleSettingsChange('push.enabled', checked === true)
                  }
                />
              </div>
            </div>
          </div>

        </div>
        </ScrollArea>

        <div className="flex gap-3 p-6 pt-4 border-t border-zinc-200 dark:border-zinc-700 shrink-0">
          <Button 
            variant="outline" 
            onClick={() => setIsSettingsOpen(false)}
            className="flex-1 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            disabled={savingSettings}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveSettings}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            disabled={savingSettings}
          >
            {savingSettings ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
} 