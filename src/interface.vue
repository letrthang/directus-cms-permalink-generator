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

<script setup>
import { ref, computed, inject } from 'vue';
import { useStores } from '@directus/extensions-sdk';

const props = defineProps({
  value: {
    type: String,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: 'Click Generate URL to create permalink',
  },
  collection: {
    type: String,
    required: true,
  },
  field: {
    type: String,
    required: true,
  },
  primaryKey: {
    type: [String, Number],
    default: '+',
  },
});

const emit = defineEmits(['input']);

const api = inject('api');
const values = inject('values');
const { useNotificationsStore } = useStores();
const notificationsStore = useNotificationsStore();

const loading = ref(false);

const currentPageId = computed(() => values.value?.id || props.primaryKey);
const currentTitle = computed(() => values.value?.title || '');

function slugify(text) {
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

async function buildPath(pageId) {
  if (!pageId || pageId === '+') {
    return [];
  }

  try {
    const response = await api.get(`/items/pages/${pageId}`, {
      params: {
        fields: ['id', 'title', 'parent'],
      },
    });

    const page = response.data.data;
    const slug = slugify(page.title || '');

    if (page.parent) {
      const parentPath = await buildPath(page.parent);
      return [...parentPath, slug];
    }

    return [slug];
  } catch (error) {
    console.error('Error fetching page:', error);
    return [];
  }
}

async function generatePermalink() {
  loading.value = true;

  try {
    if (props.primaryKey === '+') {
      if (!currentTitle.value) {
        notificationsStore.add({
          title: 'Error',
          text: 'Please enter a page title first',
          type: 'error',
        });
        return;
      }

      const slug = slugify(currentTitle.value);
      const parentId = values.value?.parent;

      let path = [];

      if (parentId) {
        path = await buildPath(parentId);
      }

      path.push(slug);
      const permalink = '/' + path.join('/');

      emit('input', permalink);

      notificationsStore.add({
        title: 'Success',
        text: 'Permalink generated successfully',
        type: 'success',
      });
    } else {
      const path = await buildPath(currentPageId.value);
      const permalink = '/' + path.join('/');

      emit('input', permalink);

      notificationsStore.add({
        title: 'Success',
        text: 'Permalink generated successfully',
        type: 'success',
      });
    }
  } catch (error) {
    console.error('Error generating permalink:', error);
    notificationsStore.add({
      title: 'Error',
      text: 'Failed to generate permalink',
      type: 'error',
    });
  } finally {
    loading.value = false;
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