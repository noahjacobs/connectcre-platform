// Clean exports for the projects feature

// Types
export * from './types';

// Actions - Queries
export {
  fetchProjectByAddress,
  fetchProjectBySlug,
  fetchProjectById,
  checkProjectExistsByAddress,
  checkProjectSlugExists,
  fetchProjectImages,
  fetchProjectSlugsStaticParams,
  fetchProjectPageMetadata
} from './actions/project-queries';

// Actions - Layout & Data Fetching
export {
  fetchLayoutDataByProjectId
} from './actions/project-layout';

// Actions - Mutations
export {
  createSupabaseProjectFromPost,
  updateSupabaseProject,
  updateSupabaseProjectStatus
} from './actions/project-mutations';

// Actions - Company Associations
export {
  fetchProjectCompaniesServerSide,
  fetchCompanyProjectAssociations,
  removeCompanyProject,
  searchCompaniesBasic,
  addCompanyToProject,
  removeCompanyFromProject,
  createCompanyAndAddToProject,
  revalidateProjectCompanies,
  // Export the types that components need
  type BasicCompanyInfo,
  type CompanyProjectResponse
} from './actions/project-associations';

// Actions
export * from './actions/project-associations';
export * from './actions/project-layout';
export * from './actions/project-mutations';
export * from './actions/project-queries';
export * from './actions/project-tracking';

// Components (when we create them)
// export * from './components';

// Hooks (when we create them)
// export * from './hooks'; 