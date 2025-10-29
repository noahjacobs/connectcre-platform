"use client"

import PostDate from "./date";

export default function PostHero({
  author,
  created_at,
  updated_at,
  publishedAt
}: Partial<{
  author: string;
  created_at: string;
  updated_at: string;
  publishedAt: string;
}>) {

  return (
    <>
      <div className="flex items-center justify-between gap-2 text-sm md:text-base">
        <div className="flex flex-col justify-between md:flex-row md:items-center gap-2 w-full">
          <div className="flex items-center gap-2">
            {/* {author?.image && author.image.asset && (
              <Avatar className="w-6 h-6 md:w-10 md:h-10">
                <AvatarImage
                  src={urlFor(author.image).url()}
                  alt={author.image.alt || `${author.name}'s profile picture`}
                />
                <AvatarFallback>{author.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
            {author?.name && <div>{author.name}</div>}
            <div className="hidden md:block">•</div> */}
            <PostDate date={publishedAt as string} />
          </div>
          {updated_at && publishedAt &&
           new Date(updated_at).toISOString() > new Date(publishedAt).toISOString() &&
           new Date(publishedAt) > new Date('2025-05-10') && (
            <div className="flex flex-row justify-end italic text-xs">
              Updated&nbsp;<PostDate date={updated_at} />
            </div>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex items-center gap-2">

          </div>
        </div>
      </div>
      <hr className="my-4 border-primary/30" />
    </>
  );
}
