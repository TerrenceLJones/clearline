/** A department's URL slug — lowercased name, matching the server (every seeded department is one word). */
export function departmentSlug(department: string): string {
  return department.toLowerCase();
}
