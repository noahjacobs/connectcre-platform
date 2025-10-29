import { getArticles } from '@/lib/actions/articles';
import HomePage from './home-page';
import { Suspense } from 'react';
import { getCitiesAsObjects } from '@/lib/utils';

function HomePageFallback() {
  return (
    <main className="relative flex flex-col min-h-screen md:min-h-0 md:h-[calc(100vh-49px)]">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    </main>
  );
}

export default async function IndexPage() {
  const articles = await getArticles({ limit: 12 });
  const cities = getCitiesAsObjects();

  return (
    <Suspense fallback={<HomePageFallback />}>
      <HomePage initialArticles={articles} cities={cities} />
    </Suspense>
  );
}
