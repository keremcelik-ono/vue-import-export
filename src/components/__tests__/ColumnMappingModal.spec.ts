import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ColumnMappingModal from '../ColumnMappingModal.vue'
import type { APIImportMapping, ImportFieldCatalogueEntry } from '../../types.js'

function mapping(overrides: Partial<APIImportMapping> = {}): APIImportMapping {
  return {
    id: 1,
    source_column: 'E-posta',
    target_field: 'email',
    confidence_score: 1,
    match_method: 'template',
    is_required: true,
    is_confirmed: true,
    ...overrides,
  }
}

/** A model with one flat field and a two-slot repeating group. */
function catalogue(): ImportFieldCatalogueEntry[] {
  return [
    { field: 'email', label: 'E-posta', required: true },
    { field: 'name', label: 'Ad Soyad', required: false },
    {
      field: 'experience_information.0.company',
      label: 'İş Deneyimi 1 · Firma',
      required: false,
      group: 'experience_information',
      group_label: 'İş Deneyimi',
      group_index: 0,
      group_field: 'company',
    },
    {
      field: 'experience_information.1.company',
      label: 'İş Deneyimi 2 · Firma',
      required: false,
      group: 'experience_information',
      group_label: 'İş Deneyimi',
      group_index: 1,
      group_field: 'company',
    },
  ]
}

function mountModal(props: Record<string, unknown> = {}) {
  return mount(ColumnMappingModal, {
    props: {
      show: true,
      importId: 1,
      mappings: [mapping()],
      detectedHeaders: ['E-posta', 'Ad Soyad', 'FİRMA ADI 1', 'FİRMA ADI 2'],
      ...props,
    },
    attachTo: document.body,
  })
}

describe('ColumnMappingModal', () => {
  it('lists catalogue fields the session never matched, so they can be mapped by hand', () => {
    const wrapper = mountModal({ fieldCatalogue: catalogue() })

    // `name` has no mapping row at all; deriving the list from mappings alone
    // would leave it invisible and therefore unassignable.
    expect(wrapper.text()).toContain('Ad Soyad')
    expect(wrapper.text()).toContain('name')
  })

  it('renders repeating groups as their own section rather than flat dotted rows', () => {
    const wrapper = mountModal({ fieldCatalogue: catalogue() })

    expect(wrapper.text()).toContain('İş Deneyimi')
    // The group's leaves are not part of the flat table.
    const flatTable = wrapper.find('table')
    expect(flatTable.text()).not.toContain('experience_information.0.company')
  })

  it('opens a group section that already has a mapping', async () => {
    const wrapper = mountModal({
      fieldCatalogue: catalogue(),
      mappings: [
        mapping(),
        mapping({
          id: 2,
          source_column: 'FİRMA ADI 1',
          target_field: 'experience_information.0.company',
          is_required: false,
        }),
      ],
    })

    await wrapper.vm.$nextTick()

    // A preset-driven session should show what it filled in, not hide it.
    expect(wrapper.text()).toContain('experience_information.0.company')
  })

  it('keeps unmapped group slots collapsed until the section is opened', async () => {
    const wrapper = mountModal({ fieldCatalogue: catalogue() })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('experience_information.0.company')

    await wrapper.findAll('button').find((b) => b.text().includes('İş Deneyimi'))?.trigger('click')

    expect(wrapper.text()).toContain('experience_information.0.company')
  })

  it('falls back to the session mappings when no catalogue is supplied', () => {
    const wrapper = mountModal()

    expect(wrapper.text()).toContain('email')
    // Nothing else is offered, which is the documented pre-catalogue behaviour.
    expect(wrapper.text()).not.toContain('experience_information')
  })

  it('blocks starting the import until every required field is mapped', async () => {
    const wrapper = mountModal({
      fieldCatalogue: catalogue(),
      // email is required, and nothing maps to it
      mappings: [],
    })

    await wrapper.vm.$nextTick()

    const startButton = wrapper
      .findAll('button')
      .find((b) => b.text().toLowerCase().includes('start'))

    expect(startButton?.attributes('disabled')).toBeDefined()
  })

  it('emits the chosen target→column pairs on start', async () => {
    const wrapper = mountModal({ fieldCatalogue: catalogue() })
    await wrapper.vm.$nextTick()

    const startButton = wrapper
      .findAll('button')
      .find((b) => b.text().toLowerCase().includes('start'))
    await startButton?.trigger('click')

    expect(wrapper.emitted('start')?.[0]?.[0]).toEqual({ email: 'E-posta' })
  })
})
