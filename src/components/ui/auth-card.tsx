'use client';

import { SignIn, SignUp } from '@clerk/nextjs';

interface AuthCardProps {
    onClose?: () => void;
    returnTo?: string;
    plan?: string;
    billing?: 'monthly' | 'yearly';
}

export default function AuthCard({ 
    onClose,
    returnTo,
    plan,
    billing
}: AuthCardProps) {

    const clerkAppearance = {
        elements: {
            formButtonPrimary: 
              'bg-black hover:bg-gray-800 text-white transition-colors',
            card: 'shadow-none border-none bg-transparent',
            headerTitle: 'text-2xl font-bold text-zinc-800 dark:text-white',
            headerSubtitle: 'text-base text-zinc-500 dark:text-zinc-400',
            socialButtonsBlockButton: 
              'h-12 bg-white dark:bg-white hover:bg-gray-50 dark:hover:bg-gray-50 border border-gray-200 hover:border-gray-300 shadow-sm transition duration-200 text-gray-700 font-medium',
            formFieldInput: 
              'bg-background border border-gray-200 dark:border-gray-800 rounded-lg',
            footerActionText: 'text-zinc-500 dark:text-zinc-400',
            footerActionLink: 'text-zinc-800 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-200 font-medium',
            dividerLine: 'border-zinc-200 dark:border-zinc-800',
            dividerText: 'text-zinc-400 dark:text-zinc-500 font-medium uppercase text-xs',
        },
        layout: {
          socialButtonsPlacement: 'top' as const,
          showOptionalFields: false,
        },
    };

    return (
        <SignIn
            appearance={clerkAppearance}
            routing="hash"
            withSignUp={true}
        />
    );
}
