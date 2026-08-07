<template>
  <!-- Backdrop -->
  <Transition name="vie-modal-overlay" appear>
    <div
      v-if="show"
      class="fixed inset-0 z-50"
      style="background: rgba(30, 41, 59, 0.1)"
      @mousedown="onBackdropMousedown"
      @click="onBackdropClick"
    ></div>
  </Transition>

  <!-- Content -->
  <Transition name="vie-modal-content" appear>
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      :aria-label="t('columnMapping', { default: 'Column mapping' })"
      @mousedown="onBackdropMousedown"
      @click="onBackdropClick"
    >
      <div class="w-full max-w-4xl" @click.stop>
        <div
          ref="modalContentRef"
          class="bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-[90vh]"
        >
          <!-- Header -->
          <div class="flex-shrink-0">
            <div class="relative px-4 pt-4 pb-2">
              <button
                type="button"
                class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                :aria-label="t('close', { default: 'Close' })"
                @click="emit('close')"
              >
                <span class="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div class="px-4 text-start flex flex-col gap-2">
              <p class="text-[#111927] text-sm font-semibold leading-5">
                {{ t('columnMapping', { default: 'Column mapping' }) }}
              </p>
              <p class="text-[#4B5565] text-sm leading-5">
                {{ t('columnMappingDesc', { default: 'Match the columns in your file to the system fields.' }) }}
              </p>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 flex flex-col overflow-y-auto min-h-0">
            <div class="px-6 py-4 overflow-y-auto max-h-[60vh]">
              <!-- Mapping summary -->
              <div class="flex items-center gap-4 mb-4 px-1">
                <div class="flex items-center gap-1.5 text-xs text-[#4B5565]">
                  <span class="w-2 h-2 rounded-full bg-green-500"></span>
                  {{ mappedCount }}/{{ allRows.length }} {{ t('mapped', { default: 'mapped' }) }}
                </div>
                <div
                  v-if="requiredUnmappedCount > 0"
                  class="flex items-center gap-1.5 text-xs text-red-500"
                >
                  <span class="w-2 h-2 rounded-full bg-red-400"></span>
                  {{ requiredUnmappedCount }} {{ t('requiredUnmapped', { default: 'required unmapped' }) }}
                </div>
              </div>

              <table v-if="flatRows.length" class="w-full">
                <thead>
                  <tr class="border-b border-gray-200">
                    <th class="text-left text-xs font-semibold text-[#4B5565] pb-3 pr-4 w-[200px]">
                      {{ t('systemField', { default: 'System field' }) }}
                    </th>
                    <th class="text-left text-xs font-semibold text-[#4B5565] pb-3 pr-4">
                      {{ t('fileHeader', { default: 'File header' }) }}
                    </th>
                    <th class="text-left text-xs font-semibold text-[#4B5565] pb-3 pr-4 w-[160px]">
                      {{ t('matchScore', { default: 'Match score' }) }}
                    </th>
                    <th class="text-center text-xs font-semibold text-[#4B5565] pb-3 w-[60px]">
                      {{ t('status', { default: 'Status' }) }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <MappingRow
                    v-for="row in flatRows"
                    :key="row.target_field"
                    :row="row"
                    :modelValue="localMappings[row.target_field] || null"
                    :headerOptions="headerOptions"
                    @update:modelValue="handleMappingChange(row.target_field, $event)"
                  />
                </tbody>
              </table>

              <!--
                Repeating groups: one collapsible section per group, one block
                per slot. A file may carry several jobs / schools / languages
                per row, so each slot is its own set of target fields.
              -->
              <div
                v-for="section in groupSections"
                :key="section.key"
                class="mt-4 border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  class="w-full flex items-center justify-between px-4 py-3 bg-gray-50/70 hover:bg-gray-100 transition"
                  :aria-expanded="isExpanded(section.key)"
                  @click="toggleSection(section.key)"
                >
                  <span class="flex items-center gap-2 text-sm font-semibold text-[#364152]">
                    <ChevronRightIcon
                      class="w-4 h-4 text-gray-400 transition-transform"
                      :class="{ 'rotate-90': isExpanded(section.key) }"
                    />
                    {{ section.label }}
                  </span>
                  <span class="text-xs text-[#4B5565]">
                    {{ section.mappedCount }}/{{ section.maxSlots }}
                    {{ t('groupSlotsMapped', { default: 'slot(s) mapped' }) }}
                  </span>
                </button>

                <div v-if="isExpanded(section.key)" class="px-4 pb-4">
                  <div
                    v-for="slot in visibleSlots(section)"
                    :key="slot.index"
                    class="mt-3"
                  >
                    <p class="text-xs font-semibold text-[#4B5565] mb-1">
                      {{ section.label }} {{ slot.index + 1 }}
                    </p>
                    <table class="w-full">
                      <tbody>
                        <MappingRow
                          v-for="row in slot.rows"
                          :key="row.target_field"
                          :row="row"
                          :modelValue="localMappings[row.target_field] || null"
                          :headerOptions="headerOptions"
                          @update:modelValue="handleMappingChange(row.target_field, $event)"
                        />
                      </tbody>
                    </table>
                  </div>

                  <button
                    v-if="canAddSlot(section)"
                    type="button"
                    class="mt-3 text-xs font-semibold text-[#364152] hover:underline"
                    @click="addSlot(section)"
                  >
                    + {{ t('addGroupSlot', { default: 'Add slot' }) }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50">
              <p v-if="!allRequiredMapped" class="text-xs text-red-500 flex items-center gap-1">
                <ExclamationCircleIcon class="w-4 h-4 flex-shrink-0" />
                {{ t('allRequiredFieldsMustBeMapped', { default: 'All required fields must be mapped.' }) }}
              </p>
              <p v-else class="text-xs text-green-600 flex items-center gap-1">
                <CheckCircleIcon class="w-4 h-4 flex-shrink-0" />
                {{ t('allRequiredFieldsMapped', { default: 'All required fields are mapped.' }) }}
              </p>
              <div class="flex gap-3">
                <button
                  type="button"
                  class="vie-btn vie-btn--outline vie-btn--md"
                  @click="emit('close')"
                >
                  {{ t('cancelImport', { default: 'Cancel' }) }}
                </button>
                <button
                  type="button"
                  class="vie-btn vie-btn--primary vie-btn--md"
                  :class="{ 'vie-btn--disabled': !allRequiredMapped || loading, 'vie-btn--loading': loading }"
                  :disabled="!allRequiredMapped || loading"
                  @click="handleStartImport"
                >
                  <span v-if="loading" class="vie-btn-spinner" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-dasharray="31.416"
                        stroke-dashoffset="31.416"
                      >
                        <animate
                          attributeName="stroke-dasharray"
                          dur="2s"
                          values="0 31.416;15.708 15.708;0 31.416"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="stroke-dashoffset"
                          dur="2s"
                          values="0;-15.708;-31.416"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </svg>
                  </span>
                  <span>{{ t('startImport', { default: 'Start import' }) }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import {
  CheckCircleIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
} from '@heroicons/vue/24/solid'
import MappingRow from './MappingRow.vue'
import { useTranslate } from '../adapters'
import type {
  APIImportMapping,
  ImportFieldCatalogueEntry,
  MappingRowModel,
} from '../types'

defineOptions({
  inheritAttrs: false,
})

interface Props {
  show: boolean
  importId: number | null
  mappings: APIImportMapping[]
  detectedHeaders: string[]
  loading?: boolean
  /**
   * Every assignable target field for the model. When supplied the table lists
   * these, so a field auto-matching missed can still be mapped by hand and
   * repeating-group slots become reachable. Falling back to the session's own
   * mappings (the previous behaviour) only ever shows already-matched targets.
   */
  fieldCatalogue?: ImportFieldCatalogueEntry[]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  close: []
  start: [mappings: Record<string, string>]
}>()

const t = useTranslate()

const localMappings = ref<Record<string, string | null>>({})

const headerOptions = computed(() => {
  return props.detectedHeaders.map((header) => ({
    value: header,
    label: header,
  }))
})

/**
 * Best mapping per target field: confirmed wins, then highest confidence. Near
 * duplicate headers would otherwise let the wrong column claim a target.
 */
const mappingByTarget = computed(() => {
  const byTarget = new Map<string, APIImportMapping>()
  for (const m of props.mappings) {
    if (!m.target_field) continue
    const existing = byTarget.get(m.target_field)
    if (!existing) {
      byTarget.set(m.target_field, m)
    } else if (m.is_confirmed && !existing.is_confirmed) {
      byTarget.set(m.target_field, m)
    } else if (
      m.is_confirmed === existing.is_confirmed &&
      m.confidence_score > existing.confidence_score
    ) {
      byTarget.set(m.target_field, m)
    }
  }
  return byTarget
})

const fieldLabels: Record<string, string> = {
  name: 'Ad Soyad',
  email: 'E-posta',
  sicil_no: 'Sicil Numarası',
  manager_sicil: 'Yönetici Sicil No',
  department_name: 'Departman',
  division_name: 'Bölüm',
  title: 'Başlık',
  position_name: 'Pozisyon',
  _company_id: 'Şirket',
  start_date: 'Başlangıç Tarihi',
  end_date: 'Bitiş Tarihi',
  user_name: 'Ad Soyad',
  personnel_number: 'Sicil Numarası',
  manager_personnel_number: 'Yönetici Sicil Numarası',
  company_name: 'Şirket Adı',
  position_id: 'Pozisyon ID',
  competency_id: 'Yetkinlik ID',
  competency_title: 'Yetkinlik Adı',
  required_level_id: 'Gerekli Seviye ID',
  level_name: 'Gerekli Seviye Adı',
}

function getFieldLabel(field: string, fallback?: string): string {
  // Allow host i18n to override per-field labels via `field.<target_field>`,
  // falling back to the catalogue label, the bundled Turkish defaults, then the
  // raw field key.
  return t(`field.${field}`, {
    default: fallback || fieldLabels[field] || field,
  })
}

/** Turn one catalogue entry (or bare mapping) into a table row. */
function toRow(
  targetField: string,
  required: boolean,
  label?: string,
): MappingRowModel {
  const mapping = mappingByTarget.value.get(targetField)

  return {
    target_field: targetField,
    label: getFieldLabel(targetField, label),
    required,
    confidence_score: mapping?.confidence_score ?? 0,
  }
}

/** Catalogue entries that belong to a repeating group. */
const groupEntries = computed(() =>
  (props.fieldCatalogue ?? []).filter((entry) => !!entry.group),
)

/** Non-group rows: the catalogue's flat fields, or the session's mapped targets. */
const flatRows = computed<MappingRowModel[]>(() => {
  if (props.fieldCatalogue?.length) {
    return props.fieldCatalogue
      .filter((entry) => !entry.group)
      .map((entry) => toRow(entry.field, entry.required, entry.label))
  }

  return Array.from(mappingByTarget.value.values()).map((m) =>
    toRow(m.target_field, m.is_required),
  )
})

interface GroupSection {
  key: string
  label: string
  maxSlots: number
  /** Slots that carry at least one mapped column. */
  mappedCount: number
  slots: Array<{ index: number; rows: MappingRowModel[] }>
}

/** One section per repeating group, its slots in order. */
const groupSections = computed<GroupSection[]>(() => {
  const sections = new Map<string, GroupSection>()

  for (const entry of groupEntries.value) {
    const key = entry.group as string
    const slotIndex = entry.group_index ?? 0

    if (!sections.has(key)) {
      sections.set(key, {
        key,
        label: t(`group.${key}`, { default: entry.group_label || key }),
        maxSlots: 0,
        mappedCount: 0,
        slots: [],
      })
    }

    const section = sections.get(key) as GroupSection
    let slot = section.slots.find((s) => s.index === slotIndex)
    if (!slot) {
      slot = { index: slotIndex, rows: [] }
      section.slots.push(slot)
    }

    // Label lookup is slot-independent: `field.<group>.<leaf>` needs one key
    // per leaf, whereas `field.<group>.<slot>.<leaf>` would need one per slot.
    slot.rows.push(
      toRow(
        entry.field,
        entry.required,
        t(`field.${key}.${entry.group_field}`, {
          default: entry.group_field || entry.label,
        }),
      ),
    )
  }

  for (const section of sections.values()) {
    section.slots.sort((a, b) => a.index - b.index)
    section.maxSlots = section.slots.length
    section.mappedCount = section.slots.filter((slot) =>
      slot.rows.some((row) => !!localMappings.value[row.target_field]),
    ).length
  }

  return Array.from(sections.values())
})

/** Every row in the table, used for the "n/m mapped" summary. */
const allRows = computed<MappingRowModel[]>(() => [
  ...flatRows.value,
  ...groupSections.value.flatMap((section) =>
    section.slots.flatMap((slot) => slot.rows),
  ),
])

const allRequiredMapped = computed(() =>
  allRows.value
    .filter((row) => row.required)
    .every((row) => !!localMappings.value[row.target_field]),
)

const mappedCount = computed(
  () => allRows.value.filter((row) => !!localMappings.value[row.target_field]).length,
)

const requiredUnmappedCount = computed(
  () =>
    allRows.value.filter(
      (row) => row.required && !localMappings.value[row.target_field],
    ).length,
)

// ── Group section disclosure ────────────────────────────────────────────────
// A group can declare a dozen slots; showing them all at once buries the fields
// that matter. Sections open only when something in them is mapped, and slots
// are revealed one past the last mapped one.

const expandedSections = ref<Record<string, boolean>>({})
const revealedSlots = ref<Record<string, number>>({})

function isExpanded(key: string): boolean {
  return expandedSections.value[key] ?? false
}

function toggleSection(key: string): void {
  expandedSections.value[key] = !isExpanded(key)
}

/** Slots to render: through the last mapped one, plus one empty invitation. */
function visibleSlots(section: GroupSection) {
  const lastMapped = section.slots.reduce(
    (last, slot) =>
      slot.rows.some((row) => !!localMappings.value[row.target_field])
        ? slot.index
        : last,
    -1,
  )
  const revealed = revealedSlots.value[section.key] ?? 0
  const count = Math.max(lastMapped + 2, revealed, 1)

  return section.slots.filter((slot) => slot.index < count)
}

function canAddSlot(section: GroupSection): boolean {
  return visibleSlots(section).length < section.maxSlots
}

function addSlot(section: GroupSection): void {
  revealedSlots.value[section.key] = visibleSlots(section).length + 1
}

function handleMappingChange(targetField: string, value: string | null | undefined) {
  localMappings.value[targetField] = value || null
}

function handleStartImport() {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(localMappings.value)) {
    if (value) result[key] = value
  }
  emit('start', result)
}

/**
 * Seed the selections from the backend's proposals: a confirmed mapping, or an
 * auto-match confident enough to trust. Anything weaker starts blank so the user
 * chooses deliberately.
 *
 * Group sections that received a mapping are opened, so a preset-driven session
 * shows what it filled in instead of hiding it behind a collapsed header.
 */
function buildLocalMappings() {
  const mapped: Record<string, string | null> = {}

  for (const [targetField, m] of mappingByTarget.value) {
    mapped[targetField] = m.is_confirmed || m.confidence_score >= 0.8
      ? m.source_column || null
      : null
  }

  localMappings.value = mapped

  for (const section of groupSections.value) {
    if (section.slots.some((slot) => slot.rows.some((row) => !!mapped[row.target_field]))) {
      expandedSections.value[section.key] ??= true
    }
  }
}

// Populate localMappings from props when modal opens
watch(
  () => props.show,
  (newVal) => {
    if (newVal && props.mappings.length > 0) {
      buildLocalMappings()
    }
  },
  { immediate: true },
)

watch(
  () => props.mappings,
  (newMappings) => {
    if (props.show && newMappings.length > 0) {
      buildLocalMappings()
    }
  },
)

// The catalogue is fetched separately and may land after the mappings, which is
// what decides whether group sections start open.
watch(
  () => props.fieldCatalogue,
  () => {
    if (props.show && props.mappings.length > 0) {
      buildLocalMappings()
    }
  },
)

// ── Accessibility: focus trap + scroll lock ──────────────────────────────────
// Self-contained port of the host BaseModal behavior so the library does not
// depend on app-specific modal/button components.

const modalContentRef = ref<HTMLElement | null>(null)
const pressStartedOnBackdrop = ref(false)
let previousActiveElement: HTMLElement | null = null

const onBackdropMousedown = (event: MouseEvent) => {
  pressStartedOnBackdrop.value = event.target === event.currentTarget
}

const onBackdropClick = (event: MouseEvent) => {
  if (pressStartedOnBackdrop.value && event.target === event.currentTarget) {
    emit('close')
  }
  pressStartedOnBackdrop.value = false
}

const isMobile = () =>
  typeof window !== 'undefined' && window.innerWidth <= 768

const getFocusableElements = (): HTMLElement[] => {
  if (!modalContentRef.value) return []
  const focusableSelectors =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  return Array.from(
    modalContentRef.value.querySelectorAll(focusableSelectors),
  ) as HTMLElement[]
}

const handleFocusTrap = (e: KeyboardEvent) => {
  if (e.key !== 'Tab' || !props.show) return

  const focusableElements = getFocusableElements()
  if (focusableElements.length === 0) return

  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  if (e.shiftKey) {
    if (document.activeElement === firstElement) {
      e.preventDefault()
      lastElement.focus()
    }
  } else {
    if (document.activeElement === lastElement) {
      e.preventDefault()
      firstElement.focus()
    }
  }
}

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.show) {
    emit('close')
  }
}

watch(
  () => props.show,
  async (newValue) => {
    if (newValue) {
      previousActiveElement = document.activeElement as HTMLElement

      document.addEventListener('keydown', handleFocusTrap)
      document.addEventListener('keydown', handleEscape)

      await nextTick()
      const focusableElements = getFocusableElements()
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }

      if (isMobile()) {
        document.body.style.overflow = 'hidden'
      }
    } else {
      document.removeEventListener('keydown', handleFocusTrap)
      document.removeEventListener('keydown', handleEscape)

      if (previousActiveElement) {
        previousActiveElement.focus()
        previousActiveElement = null
      }

      if (isMobile()) {
        document.body.style.overflow = ''
      }
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  document.removeEventListener('keydown', handleFocusTrap)
  document.removeEventListener('keydown', handleEscape)
  if (isMobile()) {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
/* Overlay transition */
.vie-modal-overlay-enter-active,
.vie-modal-overlay-leave-active {
  transition: all 0.3s ease;
}
.vie-modal-overlay-enter-from,
.vie-modal-overlay-leave-to {
  opacity: 0;
}

/* Content transition */
.vie-modal-content-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.vie-modal-content-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.vie-modal-content-enter-from,
.vie-modal-content-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Self-contained button (ported from host BaseButton: primary + outline, md) */
.vie-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: inherit;
  font-weight: 700;
  text-align: center;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  outline: none;
  position: relative;
  overflow: hidden;
  padding: 0.6rem 1rem;
  font-size: 1rem;
  border-radius: 0.5rem;
}

.vie-btn:focus {
  outline: 2px solid rgba(65, 105, 225, 0.4);
  outline-offset: 2px;
}

.vie-btn--primary {
  background-color: #3344ee;
  color: white;
  border-color: #3344ee;
}
.vie-btn--primary:hover:not(:disabled) {
  background-color: #4433ee;
  border-color: #4433ee;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(65, 105, 225, 0.3);
}
.vie-btn--primary:active:not(:disabled) {
  background-color: #2244bb;
  border-color: #2244bb;
  transform: translateY(0);
}

.vie-btn--outline {
  background-color: transparent;
  color: #3344ee;
  border-color: #3344ee;
}
.vie-btn--outline:hover:not(:disabled) {
  background-color: #3344ee;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(65, 105, 225, 0.2);
}

.vie-btn--disabled,
.vie-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.vie-btn--loading {
  cursor: wait;
}

.vie-btn-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}
.vie-btn-spinner svg {
  animation: vie-spin 1s linear infinite;
}

@keyframes vie-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
