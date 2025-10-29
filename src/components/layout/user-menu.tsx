'use client';

import { useAuth } from "@/lib/providers/auth-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bookmark, LayoutDashboard, LogOut, User, UserPen } from "lucide-react";
import { ProfileEditModal } from "@/components/ui/profile-edit-modal";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const router = useRouter();

  if (!user) return null;

  const displayName = user.full_name || user.email?.split('@')[0] || 'U';

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={user.avatar_url || undefined} 
                alt={displayName} 
              />
              <AvatarFallback>
                {displayName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="end">
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <div className="h-px bg-muted my-2" />
          <div className="grid gap-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-2 py-1.5"
              onClick={() => setIsEditModalOpen(true)}
            >
              <UserPen className="h-4 w-4" />
              <span>Edit Profile</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-2 py-1.5"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </Button>
          </div>
          
          {/* Footer Links & Copyright */}
          <div className="h-px bg-muted" />
          <div className="p-0 text-center">
            <div className="flex justify-center items-center gap-4 mb-1">
              <Link href="/tou" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/privacy-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} DevProjects, Inc.
            </p>
          </div>
        </PopoverContent>
      </Popover>

      <ProfileEditModal 
        open={isEditModalOpen} 
        onOpenChange={setIsEditModalOpen}
      />
    </>
  );
} 