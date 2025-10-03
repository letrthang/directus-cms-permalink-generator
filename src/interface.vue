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
import {ref, computed, inject, Ref} from 'vue';
import {useStores} from '@directus/extensions-sdk';

// 1. Define Props with TypeScript Interface/Type
interface Props {
  value: string | null;
  disabled: boolean;
  placeholder: string;
  collection: string;
  field: string;
  primaryKey: string | number;
}

const props = withDefaults(defineProps<Props>(), {
  value: null,
  disabled: false,
  placeholder: 'Click Generate URL to create permalink',
  primaryKey: '+',
});

// 2. Define Emitted Events with TypeScript
const emit = defineEmits<{
  (e: 'input', value: string): void;
}>();

// 3. Inject Dependencies with explicit types
// NOTE: Actual types for 'api' and 'values' would depend on the Directus SDK types.
// We are using 'any' as a placeholder for unknown types.
const api = inject('api') as any;
const values = inject('values') as Ref<any>; // 'values' is typically a reactive object
const {useNotificationsStore} = useStores();
const notificationsStore = useNotificationsStore();

// 4. Reactive State with explicit type
const loading = ref(false);

// 5. Computed Properties with inferred types (or explicit return type)
const currentPageId = computed((): string | number => values.value?.id || props.primaryKey);
const currentTitle = computed((): string => values.value?.title || '');

// 6. Utility function with explicit types for arguments and return value.
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

// 7. Async function with explicit types for arguments and return value
async function buildPath(pageId: string | number): Promise<string[]> {
  if (!pageId || pageId === '+') {
    return [];
  }

  try {
    // Await API call response, typing it for safety (using any for simplicity)
    const response: any = await api.get(`/items/pages/${pageId}`, {
      params: {
        fields: ['id', 'title', 'parent'],
      },
    });

    const page = response.data.data;
    const slug = slugify(page.title || '');

    if (page.parent) {
      // Recursively builds the URL path by following parent relationships
      const parentPath: string[] = await buildPath(page.parent);
      return [...parentPath, slug];
    }

    return [slug];
  } catch (error) {
    console.error('Error fetching page:', error);
    return [];
  }
}

// 8. Main function is kept as an async function
async function generatePermalink() {
  console.group('🔗 Generate Permalink');
  console.log('Props:', props);
  console.log('Primary Key:', props.primaryKey);
  console.log('Current Title:', currentTitle.value);
  console.log('Parent ID:', values.value?.parent);

  loading.value = true;

  try {
    if (props.primaryKey === '+') {
      console.log('📝 Creating NEW page');

      if (!currentTitle.value) {
        console.warn('❌ Title is empty!');
        notificationsStore.add({
          title: 'Title Required',
          text: 'Please enter a page title before generating the permalink. The permalink is created from the page title.',
          type: 'error',
          dialog: true, // Show as dialog instead of toast
        });
        loading.value = false; // Stop loading immediately
        console.groupEnd();
        return;
      }

      const slug: string = slugify(currentTitle.value);
      const parentId: string | number | undefined = values.value?.parent;

      let path: string[] = [];

      if (parentId) {
        console.log('📁 Building path with parent:', parentId);
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
/* Styles remain the same */
.permalink-generator {
  display: flex;
  gap: 8px;
  align-items: center;
}

.generate-button {
  flex-shrink: 0;
}
</style>