/** Root key for the org's company profile query. */
export const COMPANY_QUERY_KEY = ['company'] as const;

/** One key factory so the query and its invalidations can't disagree. */
export const companyKeys = {
  profile: COMPANY_QUERY_KEY,
};
