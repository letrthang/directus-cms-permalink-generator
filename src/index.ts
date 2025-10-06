import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
    id: 'permalink-generator',
    name: 'Permalink Generator',
    icon: 'link',
    description: 'Auto-generate permalink based on page hierarchy',
    component: InterfaceComponent,
    options: [
        {
            field: 'titleField',
            name: 'Title Field Name',
            type: 'string',
            meta: {
                interface: 'input',
                width: 'full',
                options: {
                    placeholder: 'title',
                },
                note: 'The field used to generate the current segment (e.g., "title").',
            },
            schema: {
                default_value: 'title',
            },
        },
        {
            field: 'parentField',
            name: 'Parent Page Relation Field',
            type: 'string',
            meta: {
                interface: 'input',
                width: 'full',
                options: {
                    placeholder: 'parent',
                },
                note: 'The M2O field name for the parent page (e.g., "parent_page").',
            },
            schema: {
                default_value: 'parent',
            },
        },
    ],
    types: ['string'],
});