import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
    id: 'permalink-generator',
    name: 'Permalink Generator',
    description: 'Auto-generate permalink based on page hierarchy',
    icon: 'link',
    component: InterfaceComponent,
    options: ({ field }) => [
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
            },
            schema: {
                default_value: 'title',
            },
        },
        {
            field: 'parentRelationField',
            name: 'Parent Page Relation Field',
            type: 'string',
            meta: {
                interface: 'input',
                width: 'full',
                options: {
                    placeholder: 'parent',
                },
            },
            schema: {
                default_value: '',
            },
        },
        {
            field: 'slashAtStart',
            name: 'Slash at Start URL',
            type: 'boolean',
            meta: {
                interface: 'boolean',
                width: 'half',
            },
            schema: {
                default_value: true,
            },
        },
        {
            field: 'placeholder',
            name: 'Placeholder',
            type: 'string',
            meta: {
                interface: 'input',
                width: 'full',
                options: {
                    placeholder: 'Click Generate URL to create permalink',
                },
            },
            schema: {
                default_value: 'Click Generate URL to create permalink',
            },
        },
    ],
    types: ['string'],
});