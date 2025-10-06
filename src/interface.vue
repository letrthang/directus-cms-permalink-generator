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
  parentField?: string;
}

const props = withDefaults(defineProps<Props>(), {
  value: null,
  disabled: false,
  placeholder: 'Click Generate URL to create permalink',
  primaryKey: '+',
  titleField: 'title',
  parentField: 'parent',
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

// 5. Computed Properties with inferred types (or explicit return type)
const currentPageId = computed((): string | number => values.value?.id || props.primaryKey);
const currentTitle = computed((): string => values.value?.[props.titleField] || '');
const currentParent = computed((): string | number | undefined => values.value?.[props.parentField]);

// 6. Fetch collection fields on mount
onMounted(async () => {
  try {
    const response = await api.get(`/fields/${props.collection}`);
    collectionFields.value = response.data.data.map((field: any) => field.field);
    console.log('Available fields in collection:', collectionFields.value);
  } catch (error) {
    console.error('Error fetching collection fields:', error);
  }
});

// 7. Validate field existence
function validateFields(): boolean {
  const missingFields: string[] = [];

  if (!collectionFields.value.includes(props.titleField)) {
    missingFields.push(props.titleField);
  }

  if (!collectionFields.value.includes(props.parentField)) {
    missingFields.push(props.parentField);
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

// 8. Utility function with explicit types for arguments and return value.
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

// 9. Async function with explicit types for arguments and return value
async function buildPath(pageId: string | number): Promise<string[]> {
  if (!pageId || pageId === '+') {
    return [];
  }

  try {
    // Await API call response, typing it for safety (using any for simplicity)
    const response: any = await api.get(`/items/${props.collection}/${pageId}`, {
      params: {
        fields: ['id', props.titleField, props.parentField],
      },
    });

    const page = response.data.data;
    const slug = slugify(page[props.titleField] || '');

    if (page[props.parentField]) {
      // Recursively builds the URL path by following parent relationships
      const parentPath: string[] = await buildPath(page[props.parentField]);
      return [...parentPath, slug];
    }

    return [slug];
  } catch (error) {
    console.error('Error fetching page:', error);
    return [];
  }
}

// 10. Main function is kept as an async function
async function generatePermalink() {
  console.group('🔗 Generate Permalink');
  console.log('Props:', props);
  console.log('Primary Key:', props.primaryKey);
  console.log('Title Field:', props.titleField);
  console.log('Parent Field:', props.parentField);
  console.log('Current Title:', currentTitle.value);
  console.log('Parent ID:', currentParent.value);

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
      const parentId: string | number | undefined = currentParent.value;

      let path: string[] = [];

      if (parentId) {
        console.log('📂 Building path with parent:', parentId);
        path = await buildPath(parentId);
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