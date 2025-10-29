"use client";

import { Project } from '@/components/projects/types';
import { Terminal, LinkIcon, FileText, Search, RefreshCw } from "lucide-react";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function RefreshLink() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <span
      onClick={handleRefresh}
      className="font-medium text-primary hover:underline cursor-pointer inline-flex items-center align-baseline"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleRefresh();
        }
      }}
    >
      <RefreshCw className="h-3 w-3 mr-1" /> refresh this page
    </span>
  );
}

interface ProjectEditorFallbackProps {
  project: Project;
}

export default function ProjectEditorFallback({ project }: ProjectEditorFallbackProps) {
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Project Missing Article</CardTitle>
          <CardDescription className="mt-1">
            The project "<strong>{project.title || 'Untitled Project'}</strong>" (Slug: <code className="text-xs">{project.slug}</code>) exists,
            <br />but no corresponding Sanity article page is linked.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-4 space-y-4">
          <div className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-200 flex items-center">
              <LinkIcon className="h-4 w-4 mr-0.5" /> Link Existing Post
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Find the correct post using the site search (article title or address: <code className="text-xs bg-blue-100 dark:bg-blue-800 px-1 rounded">{project.address || project.title || '[Missing Info]'}</code>). Open the editor controls on that post and use the "Link Project" or "Edit Project" feature to connect it to the project.
            </p>
          </div>

          <div className="text-center text-xs text-muted-foreground">OR</div>

          <div className="p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 rounded-lg">
             <h4 className="font-semibold mb-2 text-green-800 dark:text-green-200 flex items-center">
              <FileText className="h-4 w-4 mr-0.5" /> Create New Post in Sanity
            </h4>
             <p className="text-sm text-green-700 dark:text-green-300">
              If no post exists yet, create a new one in Sanity Studio. Ensure it has the correct address:
             </p>
             <code className="block text-xs bg-green-100 dark:bg-green-800 px-2 py-1 rounded mt-2 mb-2 font-mono">{project.address || "[Address missing, add to project first!]"}</code>
              <p className="text-sm text-green-700 dark:text-green-300">
                Then, link the post to the project after searching for the article title in the app.
              </p>
             {process.env.NEXT_PUBLIC_SANITY_STUDIO_URL && (
                <div className="mt-3">
                  <Button variant="outline" size="sm" asChild className="border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-800/50">
                    <Link href={process.env.NEXT_PUBLIC_SANITY_STUDIO_URL} target="_blank" rel="noopener noreferrer">
                      Open Sanity Studio
                    </Link>
                  </Button>
                </div>
             )}
          </div>

        </CardContent>
        <CardFooter className="text-center block pt-4 pb-6 border-t">
          <p className="text-sm text-muted-foreground">
            Once the post is created and linked, <RefreshLink /> to view the content.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}