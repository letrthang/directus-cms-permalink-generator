<template>
  <div class="permalink-generator">
    <v-input
        :model-value="value"
        :placeholder="placeholder"
        :disabled="disabled"
        @update:model-value="$emit('input', $event)"
    />
    <v-button
        class="generate-button"
        @click="generatePermalink"
        :loading="loading"
        :disabled="disabled || !currentPageId"
        small
    >
      Generate URL
    </v-button>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, inject, Ref, onMounted} from 'vue';
import {useStores} from '@directus/extensions-sdk';

// 1. Define Props with TypeScript Interface/Type
interface Props {
  value: string | null;
  disabled: boolean;
  placeholder: string;
  collection: string;
  field: string;
  primaryKey: string | number;
  titleField?: string;
  parentRelationField?: string;
}

const props = withDefaults(defineProps<Props>(), {
  value: null,
  disabled: false,
  placeholder: 'Click Generate URL to create permalink',
  primaryKey: '+',
  titleField: 'title',
  parentRelationField: '',  // Changed from parentField to avoid naming conflict
});

// 2. Define Emitted Events with TypeScript
const emit = defineEmits<{
  (e: 'input', value: string): void;
}>();

// 3. Inject Dependencies with explicit types
const api = inject('api') as any;
const values = inject('values') as Ref<any>;
const {useNotificationsStore} = useStores();
const notificationsStore = useNotificationsStore();

// 4. Reactive State with explicit type
const loading = ref(false);
const collectionFields = ref<string[]>([]);

// 5. Helper function to check if parent field is configured
function isParentFieldConfigured(): boolean {
  return !!(props.parentRelationField && props.parentRelationField.trim() !== '');
}

// Get the actual parent field name
const parentFieldName = computed(() => props.parentRelationField || '');

// 6. Computed Properties
const currentPageId = computed((): string | number => values.value?.id || props.primaryKey);
const currentTitle = computed((): string => values.value?.[props.titleField] || '');
const currentParent = computed((): string | number | undefined => {
  // Only get parent if parentField is configured
  if (isParentFieldConfigured()) {
    // Access the parent field value safely
    const valuesObj = values.value || {};
    const parentValue = valuesObj[parentFieldName.value];

    // Debug logging
    console.log('🔍 Checking parent field:', parentFieldName.value);
    console.log('📦 Values object:', valuesObj);
    console.log('👉 Parent value:', parentValue);

    return parentValue;
  }
  return undefined;
});

// 7. Fetch collection fields on mount
onMounted(async () => {
  try {
    const response = await api.get(`/fields/${props.collection}`);
    collectionFields.value = response.data.data.map((field: any) => field.field);
    console.log('Available fields in collection:', collectionFields.value);
  } catch (error) {
    console.error('Error fetching collection fields:', error);
  }
});

// 8. Validate field existence
function validateFields(): boolean {
  const missingFields: string[] = [];

  // Always validate Title field (mandatory)
  if (!collectionFields.value.includes(props.titleField)) {
    missingFields.push(props.titleField);
  }

  // Only validate parent field if it's configured (not empty)
  if (isParentFieldConfigured() && !collectionFields.value.includes(parentFieldName.value)) {
    missingFields.push(parentFieldName.value);
  }

  if (missingFields.length > 0) {
    notificationsStore.add({
      title: 'Configuration Error',
      text: `The following configured fields do not exist in the "${props.collection}" collection: ${missingFields.join(', ')}. Please check the interface configuration.`,
      type: 'error',
      dialog: true,
    });
    return false;
  }

  return true;
}

// 9. Utility function with explicit types for arguments and return value.
// Converts text to URL-safe format.
function slugify(text: string): string {
  return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
}

// 10. Async function with explicit types for arguments and return value
// Note: Need to avoid If The page is set as its own parent! This creates an infinite recursion loop.
// So, need Circular reference check - if we encounter a page we've already visited, stop and show error
async function buildPath(pageId: string | number, visitedPages: Set<string | number> = new Set()): Promise<string[]> {
  if (!pageId || pageId === '+') {
    return [];
  }

  // Check for circular reference - prevent infinite recursion
  if (visitedPages.has(pageId)) {
    console.error('⚠️ Circular reference detected! Page', pageId, 'is already in the path.');
    notificationsStore.add({
      title: 'Circular Reference Error',
      text: 'Circular reference. A page cannot be its own ancestor. Please check the parent relationships.',
      type: 'error',
      dialog: true,
    });
    return [];
  }

  // Add current page to visited set
  visitedPages.add(pageId);

  // If no parent field is configured, just return the current page slug
  if (!isParentFieldConfigured()) {
    try {
      const response: any = await api.get(`/items/${props.collection}/${pageId}`, {
        params: {
          fields: ['id', props.titleField],
        },
      });
      const page = response.data.data;
      const slug = slugify(page[props.titleField] || '');
      return [slug];
    } catch (error) {
      console.error('Error fetching page:', error);
      return [];
    }
  }

  try {
    // Build fields array dynamically
    const fieldsToFetch = ['id', props.titleField];
    if (parentFieldName.value) {
      fieldsToFetch.push(parentFieldName.value);
    }

    const response: any = await api.get(`/items/${props.collection}/${pageId}`, {
      params: {
        fields: fieldsToFetch,
      },
    });

    const page = response.data.data;
    const slug = slugify(page[props.titleField] || '');

    // Check if page has a parent and it's not itself
    if (parentFieldName.value && page[parentFieldName.value] && page[parentFieldName.value] !== pageId) {
      // Recursively builds the URL path by following parent relationships
      const parentPath: string[] = await buildPath(page[parentFieldName.value], visitedPages);
      return [...parentPath, slug];
    }

    return [slug];
  } catch (error) {
    console.error('Error fetching page:', error);
    return [];
  }
}

// 11. Main function is kept as an async function
async function generatePermalink() {
  console.group('🔗 Generate Permalink');
  console.log('Props:', props);
  console.log('Primary Key:', props.primaryKey);
  console.log('Title Field:', props.titleField);
  console.log('Parent Field:', parentFieldName.value);
  console.log('Has Parent Field:', isParentFieldConfigured());
  console.log('Current Title:', currentTitle.value);
  console.log('Parent ID:', currentParent.value);
  console.log('📦 Full Values Object:', values.value);
  console.log('🔍 Direct Parent Access:', values.value?.[parentFieldName.value]);

  // Validate fields before proceeding
  if (!validateFields()) {
    console.groupEnd();
    return;
  }

  loading.value = true;

  try {
    if (props.primaryKey === '+') {
      console.log('🆕 Creating NEW page');

      if (!currentTitle.value) {
        console.warn('⚠️ Title is empty!');
        notificationsStore.add({
          title: 'Title Required',
          text: `Please enter a value in the "${props.titleField}" field before generating the permalink.`,
          type: 'error',
          dialog: true,
        });
        loading.value = false;
        console.groupEnd();
        return;
      }

      const slug: string = slugify(currentTitle.value);
      let path: string[] = [];

      // Get parent value directly from values object
      const parentValue = isParentFieldConfigured()
          ? (values.value?.[parentFieldName.value] || currentParent.value)
          : undefined;

      console.log('🔍 Parent value for path building:', parentValue);

      // Only build parent path if parent field is configured and has a value
      if (isParentFieldConfigured() && parentValue) {
        console.log('📂 Building path with parent:', parentValue);
        path = await buildPath(parentValue);
      } else {
        console.log('📄 No parent field configured or no parent selected - creating top-level permalink');
      }

      path.push(slug);
      const permalink: string = '/' + path.join('/');

      console.log('✅ Generated permalink:', permalink);

      emit('input', permalink);

      notificationsStore.add({
        title: 'Success',
        text: `Permalink generated: ${permalink}`,
        type: 'success',
      });
    } else {
      console.log('✏️ Editing EXISTING page');
      console.log('Building path for page:', currentPageId.value);

      // Check if the page is set as its own parent causing infinite recursion
      const parentValue = isParentFieldConfigured()
          ? (values.value?.[parentFieldName.value] || currentParent.value)
          : undefined;

      if (isParentFieldConfigured() && parentValue && parentValue === currentPageId.value) {
        console.error('❌ Self-reference detected! Page cannot be its own parent.');
        notificationsStore.add({
          title: 'Invalid Parent',
          text: 'A page cannot be set as its own parent. Please select a different parent page or leave it empty.',
          type: 'error',
          dialog: true,
        });
        loading.value = false;
        console.groupEnd();
        return;
      }

      const path: string[] = await buildPath(currentPageId.value);
      console.log('Built path:', path);

      const permalink: string = '/' + path.join('/');
      console.log('✅ Generated permalink:', permalink);

      emit('input', permalink);

      notificationsStore.add({
        title: 'Success',
        text: `Permalink updated: ${permalink}`,
        type: 'success',
      });
    }
  } catch (error) {
    console.error('❌ Error generating permalink:', error);
    notificationsStore.add({
      title: 'Generation Failed',
      text: `Failed to generate permalink: ${error instanceof Error ? error.message : 'Unknown error'}`,
      type: 'error',
      dialog: true,
    });
  } finally {
    loading.value = false;
    console.groupEnd();
  }
}
</script>

<style scoped>
.permalink-generator {
  display: flex;
  gap: 8px;
  align-items: center;
}

.generate-button {
  flex-shrink: 0;
}
</style>