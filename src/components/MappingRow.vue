<template>
  <tr
    class="border-b border-gray-100 transition-colors"
    :class="{ 'bg-red-50/30': row.required && !modelValue }"
  >
    <!-- System field -->
    <td class="py-3.5 pr-4">
      <div>
        <span class="text-sm font-medium text-[#364152]">{{ row.label }}</span>
        <span class="block text-xs text-[#9AA4B2] mt-0.5">{{ row.target_field }}</span>
        <span
          v-if="row.required"
          class="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded"
        >{{ t('required', { default: 'Required' }) }}</span>
      </div>
    </td>

    <!-- File header dropdown -->
    <td class="py-3.5 pr-4">
      <SelectInput
        :modelValue="modelValue || null"
        :options="headerOptions"
        :placeholder="t('selectColumnFromFile', { default: 'Select a column from file' })"
        :searchable="true"
        @update:modelValue="emit('update:modelValue', ($event as string) || null)"
      />
    </td>

    <!-- Match score -->
    <td class="py-3.5 pr-4">
      <div v-if="modelValue" class="flex items-center gap-2">
        <div class="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500 ease-out"
            :class="scoreColor"
            :style="{ width: Math.max(scorePercent, 5) + '%' }"
          ></div>
        </div>
        <span class="text-xs font-semibold w-[40px] text-right" :class="scoreTextColor">
          %{{ scorePercent }}
        </span>
      </div>
      <div v-else class="h-2.5"></div>
    </td>

    <!-- Status -->
    <td class="py-3.5 text-center">
      <div class="flex items-center justify-center">
        <CheckCircleIcon
          v-if="modelValue && row.confidence_score >= 0.4"
          class="w-5 h-5 text-green-500"
        />
        <ExclamationTriangleIcon
          v-else-if="modelValue && row.confidence_score < 0.4"
          class="w-5 h-5 text-orange-400"
        />
        <ExclamationCircleIcon
          v-else-if="row.required && !modelValue"
          class="w-5 h-5 text-red-400"
        />
        <MinusCircleIcon v-else class="w-5 h-5 text-gray-300" />
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
/**
 * One target-field row of the column-mapping table.
 *
 * Extracted so the flat fields and the repeating-group slots render through the
 * same markup instead of duplicating it per section.
 */
import { computed } from 'vue'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  MinusCircleIcon,
} from '@heroicons/vue/24/solid'
import SelectInput from './inputs/SelectInput.vue'
import { useTranslate } from '../adapters'
import type { MappingRowModel } from '../types'

interface Props {
  row: MappingRowModel
  /** The chosen file column, or null when unmapped. */
  modelValue: string | null
  headerOptions: Array<{ value: string; label: string }>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const t = useTranslate()

const scorePercent = computed(() => Math.round(props.row.confidence_score * 100))

const scoreColor = computed(() => {
  if (props.row.confidence_score >= 0.8) return 'bg-green-500'
  if (props.row.confidence_score >= 0.4) return 'bg-orange-400'
  return 'bg-red-400'
})

const scoreTextColor = computed(() => {
  if (props.row.confidence_score >= 0.8) return 'text-green-600'
  if (props.row.confidence_score >= 0.4) return 'text-orange-500'
  return 'text-red-500'
})
</script>
