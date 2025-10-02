import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
    id: 'permalink-generator',
    name: 'Permalink Generator',
    icon: 'link',
    description: 'Auto-generate permalink based on page hierarchy',
    component: InterfaceComponent,
    options: null,
    types: ['string'],
});
