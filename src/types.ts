/**
 * Import/Export domain types.
 *
 * Self-contained: no imports from any host application. These mirror the
 * payload/response shapes of the `umutcangungormus/laravel-import-export`
 * backend's `v1/imports` API. Ported from competo-fe `src/lib/sdk/types.ts`.
 */

// --- Generic API envelope ---

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface APIResponse<T = unknown> {
  status: number
  message: string
  data: T
  errors?: unknown
  meta?: PaginationMeta
}

// --- Status enums ---

/**
 * Lifecycle status of an import session. The backend returns a free-form
 * string; these are the known values. Kept as a union of string literals so
 * unknown future values still type-check via the fallback.
 */
export type ImportStatus =
  | 'pending'
  | 'mapping'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | (string & {})

/** How a column→field mapping was derived by the backend. */
export type MappingMatchMethod =
  | 'exact'
  | 'fuzzy'
  | 'alias'
  | 'manual'
  | 'none'
  | (string & {})

// --- Core resources ---

export interface APIImportMapping {
  id: number
  source_column: string
  target_field: string
  confidence_score: number
  match_method: MappingMatchMethod
  is_required: boolean
  is_confirmed: boolean
}

/**
 * One row of the column-mapping table: a target field the user can point at a
 * file column. Built either from the host's field catalogue or, when none is
 * supplied, from the session's own mappings.
 */
export interface MappingRowModel {
  target_field: string
  label: string
  required: boolean
  /** Auto-match confidence for the currently selected column, 0 when unmapped. */
  confidence_score: number
}

/**
 * One assignable target field, as described by the host rather than by a
 * session.
 *
 * The mapping modal can only list target fields it knows about. Deriving that
 * list from the session's mappings alone hides every field auto-matching failed
 * to hit, leaving it unassignable by hand. When the host supplies a catalogue
 * (see `loadModelFields` in the plugin options) the modal lists these instead.
 *
 * The `group*` members describe repeating sections — several jobs, schools or
 * languages per row — which the backend flattens into `<group>.<slot>.<leaf>`
 * target fields. The modal folds them back into collapsible sections.
 */
export interface ImportFieldCatalogueEntry {
  field: string
  label: string
  required: boolean
  type?: string
  aliases?: string[]
  /** Group key, e.g. `experience_information`. Null/absent for flat fields. */
  group?: string | null
  /** Human label for the group, e.g. "İş Deneyimi". */
  group_label?: string | null
  /** Zero-based slot index within the group. */
  group_index?: number | null
  /** Leaf name within the slot, e.g. `company`. */
  group_field?: string | null
}

/**
 * An import session. Also referred to as `ImportSession`
 * (exported as an alias below) to match the backend nomenclature.
 */
export interface APIImport {
  id: number
  importable_type: string
  file_name: string
  status: ImportStatus
  total_rows: number
  processed_rows: number
  successful_rows: number
  failed_rows: number
  progress_percentage: number
  detected_headers: string[]
  started_at: string | null
  completed_at: string | null
  created_at: string
  mappings: APIImportMapping[]
}

/** Alias matching backend nomenclature. */
export type ImportSession = APIImport

export interface APIImportProgress {
  status: ImportStatus
  total_rows: string
  processed_rows: string
  successful_rows: string
  failed_rows: string
  progress_percentage: string
}

export interface APIImportTemplate {
  id: number
  importable_type: string
  template_name: string
  description: string
  is_default: boolean
  is_company_wide: boolean
  template_data: {
    mappings?: { source_column: string; target_field: string }[]
  } | null
  usage_count: number
  last_used_at: string | null
  created_at: string
}

export interface APIFailureSummary {
  total_failures: number
  error_types: string
}

export interface AllowedModel {
  model: string
  name: string
}

export interface MappingSuggestion {
  field: string
  label: string
  confidence: number
}

// --- Request params / payloads ---

export interface ImportListParams {
  page?: number
  per_page?: number
  model?: string
  status?: string
  search?: string
}

export interface InitializeImportPayload {
  model: string
  file: File
  options?: Record<string, unknown>
}

export interface UpdateMappingPayload {
  source_column: string
  target_field: string
  confirmed: boolean
}

export interface BatchUpdateMappingsPayload {
  columns: {
    source_column: string
    target_field: string
    confirmed: boolean
  }[]
}

export interface CreateImportTemplatePayload {
  model: string
  template_name: string
  description?: string
  is_default?: boolean
  is_company_wide?: boolean
  template_data: {
    mappings: { source_column: string; target_field: string }[]
  }
}

export interface UpdateImportTemplatePayload {
  template_name?: string
  description?: string
  is_default?: boolean
  is_company_wide?: boolean
}

export interface SaveTemplateFromSessionPayload {
  template_name: string
  description?: string
  is_default?: boolean
}

// --- Toast / notification contract (consumed by adapters) ---

export type NotifyType = 'success' | 'error' | 'info' | 'warning'

export interface NotifyPayload {
  type: NotifyType
  message: string
}
