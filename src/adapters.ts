/**
 * Decoupling layer: injection contracts + composables.
 *
 * The library never reaches into the host app for i18n, toasts, or an HTTP
 * client. Instead it declares injection keys here; the host provides them via
 * the plugin ({@link ./plugin}). Each composable reads its dependency through
 * `inject` and falls back to a safe default so components remain usable even
 * when the plugin is not installed (e.g. in isolated unit tests / Storybook).
 */
import { inject, type InjectionKey } from 'vue'
import type { ImportApiClient } from './api/ImportApiClient.js'
import type { ImportFieldCatalogueEntry, NotifyPayload } from './types.js'

// --- Contract types ---

/**
 * Translation function. `key` is a message id; `params` are interpolation
 * values. Implementations (e.g. vue-i18n's `t`) should return the resolved
 * string. The default passthrough returns `params.default` if present,
 * otherwise the key itself.
 */
export type TranslateFn = (
  key: string,
  params?: Record<string, unknown> & { default?: string },
) => string

/** Toast/notification callback. */
export type NotifyFn = (payload: NotifyPayload) => void

/**
 * Loads the assignable target fields for a model.
 *
 * Kept as a host-provided function rather than a method on
 * {@link ImportApiClient}: the endpoint serving this list is an application
 * concern, not part of the backend package's contract. Hosts that do not provide
 * it keep the previous behaviour, where the mapping modal lists only the target
 * fields the session already has a mapping row for.
 */
export type LoadModelFieldsFn = (
  model: string,
) => Promise<ImportFieldCatalogueEntry[]>

// --- Injection keys ---

export const IMPORT_API_KEY: InjectionKey<ImportApiClient> = Symbol(
  'vue-import-export:apiClient',
)
export const TRANSLATE_KEY: InjectionKey<TranslateFn> = Symbol(
  'vue-import-export:translate',
)
export const NOTIFY_KEY: InjectionKey<NotifyFn> = Symbol(
  'vue-import-export:notify',
)
export const LOAD_MODEL_FIELDS_KEY: InjectionKey<LoadModelFieldsFn | null> =
  Symbol('vue-import-export:loadModelFields')

// --- Safe defaults ---

/** Passthrough translator: returns `params.default` or the raw key. */
export const defaultTranslate: TranslateFn = (key, params) =>
  (params?.default as string | undefined) ?? key

/** No-op notifier. */
export const defaultNotify: NotifyFn = () => {}

// --- Composables ---

/**
 * Resolve the {@link ImportApiClient}. Throws if no client was provided, since
 * there is no meaningful default for network access — the plugin must supply
 * one (the {@link createImportExport} plugin enforces this).
 */
export function useImportApi(): ImportApiClient {
  const client = inject(IMPORT_API_KEY, null)
  if (!client) {
    throw new Error(
      '[vue-import-export] No ImportApiClient provided. Install the plugin via ' +
        'app.use(createImportExport({ apiClient })) or provide IMPORT_API_KEY.',
    )
  }
  return client
}

/** Resolve the translate function, defaulting to a passthrough. */
export function useTranslate(): TranslateFn {
  return inject(TRANSLATE_KEY, defaultTranslate)
}

/** Resolve the notify function, defaulting to a no-op. */
export function useNotify(): NotifyFn {
  return inject(NOTIFY_KEY, defaultNotify)
}

/**
 * Resolve the target-field catalogue loader, or `null` when the host did not
 * provide one. Callers must treat `null` as "list only the session's mapped
 * targets".
 */
export function useLoadModelFields(): LoadModelFieldsFn | null {
  return inject(LOAD_MODEL_FIELDS_KEY, null)
}
