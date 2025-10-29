// Clean exports for the posts feature

// Types
export type { Post, Article, Comment } from './types';
export type { ClientLayoutData, CompanyProjectResponse } from './actions/post-layout';

// Actions - Queries
export {
  fetchArticles,
  searchArticles,
  fetchArticleBySlug,
  fetchArticlesByAddress,
  fetchArticlesByNeighborhood,
  fetchPrimarySupabasePostByProjectId,
  fetchComments
} from './actions/post-queries';

// Actions - Layout & Data Fetching
export {
  fetchRecentDevelopments,
  fetchConstructionUpdates,
  fetchClientLayoutData,
  fetchBySlug,
  fetchMetadataBySlug,
  fetchClientLayoutDataStatic
} from './actions/post-layout';

// Actions - Mutations
export {
  linkArticleToProject,
  unlinkArticleFromProject,
  invalidatePostAndProjectCache
} from './actions/post-mutations';

// Actions - Analytics & Comments
export {
  trackArticleView,
  getArticleViewCount
} from './actions/post-analytics';

// Components
export * from './components';

// Hooks (when we create them)
// export * from './hooks'; 