import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Info, Check } from "lucide-react";
import type { UserCompany } from '@/hooks/use-user-companies';
import { getInitials } from "../utils";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChevronDown, User, Building2, ChevronUp, X } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Participant } from '../types';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from '@/lib/providers/auth-context';
import { CheckCircle } from 'lucide-react';

interface MessageIdentitySelectorProps {
    userCompanies: UserCompany[];
    viewingIdentity: Participant | null;
    className?: string;
    currentUser: Participant | null;
    onSelectIdentity: (identity: Participant) => void;
}

export function MessageIdentitySelector({ 
    userCompanies, 
    viewingIdentity,
    className,
    currentUser,
    onSelectIdentity
}: MessageIdentitySelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!currentUser) return null;

    const handleSelectUser = () => {
        if (currentUser) {
            onSelectIdentity(currentUser);
            setIsOpen(false); 
        }
    };

    const handleSelectCompany = (company: UserCompany) => {
        const companyParticipant: Participant = { 
            type: 'company', 
            id: company.id, 
            name: company.name, 
            avatar_url: company.logo_url || null 
        };
        onSelectIdentity(companyParticipant);
        setIsOpen(false); 
    };

    const IdentityOptions = () => (
        <div className="space-y-1">
            {/* User Option */}
            {currentUser && (
                <Button 
                    variant={viewingIdentity?.type === 'user' ? "secondary" : "ghost"} 
                    className="w-full justify-start h-10 px-3 gap-3" 
                    onClick={handleSelectUser}
                >
                    <Avatar className="h-7 w-7">
                        {currentUser.avatar_url ? (
                            <AvatarImage src={currentUser.avatar_url} alt={currentUser.name || 'Personal Profile'} />
                        ) : (
                            <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                                {getInitials(currentUser.name || 'Personal Profile')}
                            </AvatarFallback>
                        )}
                    </Avatar>
                    <span className="text-sm font-medium">{currentUser.name || 'Personal Profile'}</span>
                    {viewingIdentity?.type === 'user' && (
                        <Check className="h-4 w-4 ml-auto text-primary" />
                    )}
                </Button>
            )}

            {/* Separator if companies exist */}
            {currentUser && userCompanies.length > 0 && <Separator className="my-1" />}

            {/* Company Options */}
            {userCompanies.map((company) => (
                <Button 
                    key={company.id}
                    variant={viewingIdentity?.type === 'company' && viewingIdentity.id === company.id ? "secondary" : "ghost"}
                    className="w-full justify-start h-10 px-3 gap-3"
                    onClick={() => handleSelectCompany(company)}
                >
                    <Avatar className="h-7 w-7">
                        {company.logo_url ? (
                            <AvatarImage src={company.logo_url} alt={company.name || 'Company'} />
                        ) : (
                            <AvatarFallback className="text-xs bg-gray-200 dark:bg-zinc-700">
                                {getInitials(company.name)}
                            </AvatarFallback>
                        )}
                    </Avatar>
                    <span className="text-sm font-medium truncate">{company.name}</span>
                    {viewingIdentity?.type === 'company' && viewingIdentity.id === company.id && (
                        <Check className="h-4 w-4 ml-auto text-primary" />
                    )}
                </Button>
            ))}
        </div>
    );

    return (
        <>
            {/* Current Identity Display */}
            <Card className={cn("w-full", className)}>
                <div 
                    className="flex items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-xl" 
                    onClick={() => setIsOpen(!isOpen)} 
                    role="button" 
                    aria-expanded={isOpen} 
                    aria-controls="identity-options"
                >
                    <span className="text-sm font-medium text-gray-600 dark:text-zinc-300 mr-3">Send as:</span>
                    {viewingIdentity && (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Avatar className="h-6 w-6">
                                {viewingIdentity.type === 'company' && viewingIdentity.logo_url ? (
                                    <AvatarImage src={viewingIdentity.logo_url} alt={viewingIdentity.name || 'Company'} />
                                ) : viewingIdentity.type === 'user' && viewingIdentity.avatar_url ? (
                                    <AvatarImage src={viewingIdentity.avatar_url} alt={viewingIdentity.name || 'Personal Profile'} />
                                ) : (
                                    <AvatarFallback className="text-xs bg-muted">{getInitials(viewingIdentity.name || 'Personal Profile')}</AvatarFallback>
                                )}
                            </Avatar>
                            <span className="text-sm font-medium truncate">{viewingIdentity.name || 'Personal Profile'}</span>
                        </div>
                    )} 
                    <div className="ml-auto pl-2">
                        {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                    </div>
                </div>
            </Card>

            {isOpen && (
                <div id="identity-options" className="border-t border-gray-200 dark:border-zinc-700">
                    <ScrollArea className="max-h-[calc(100vh-var(--header-height,64px)-var(--tab-height,48px)-2rem-200px)]">
                        <div className="space-y-1 p-2">
                            {/* User Option */}
                            {currentUser && (
                                <Button 
                                    variant={viewingIdentity?.type === 'user' ? "secondary" : "ghost"} 
                                    className="w-full justify-start h-10 px-3 gap-3" 
                                    onClick={handleSelectUser}
                                >
                                    <Avatar className="h-7 w-7">
                                        {currentUser.avatar_url ? (
                                            <AvatarImage src={currentUser.avatar_url} alt={currentUser.name || 'Personal Profile'} />
                                        ) : (
                                            <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                                                {getInitials(currentUser.name || 'Personal Profile')}
                                            </AvatarFallback>
                                        )}
                                    </Avatar>
                                    <span className="text-sm font-medium">{currentUser.name || 'Personal Profile'}</span>
                                    {viewingIdentity?.type === 'user' && (
                                        <Check className="h-4 w-4 ml-auto text-primary" />
                                    )}
                                </Button>
                            )}

                            {/* Separator if companies exist */}
                            {currentUser && userCompanies.length > 0 && <Separator className="my-1" />}

                            {/* Company Options */}
                            {userCompanies.map((company) => (
                                <Button 
                                    key={company.id}
                                    variant={viewingIdentity?.type === 'company' && viewingIdentity.id === company.id ? "secondary" : "ghost"}
                                    className="w-full justify-start h-10 px-3 gap-3"
                                    onClick={() => handleSelectCompany(company)}
                                >
                                    <Avatar className="h-7 w-7">
                                        {company.logo_url ? (
                                            <AvatarImage src={company.logo_url} alt={company.name || 'Company'} />
                                        ) : (
                                            <AvatarFallback className="text-xs bg-gray-200 dark:bg-zinc-700">
                                                {getInitials(company.name)}
                                            </AvatarFallback>
                                        )}
                                    </Avatar>
                                    <span className="text-sm font-medium truncate">{company.name}</span>
                                    {viewingIdentity?.type === 'company' && viewingIdentity.id === company.id && (
                                        <Check className="h-4 w-4 ml-auto text-primary" />
                                    )}
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )} 


            {/* Mobile Bottom Sheet */}
            {/* <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="bottom" className="h-[min(85vh,500px)] p-0">
                    <SheetHeader className="px-4 py-3 border-b">
                        <SheetTitle className="text-left text-base font-medium">Send Message As</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-full px-4 py-2">
                        <IdentityOptions />
                    </ScrollArea>
                </SheetContent>
            </Sheet> */}
        </>
    );
} 