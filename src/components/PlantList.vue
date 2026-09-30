<script setup>
import { computed, reactive, ref } from 'vue'
import { formatDate, todayISO } from '../utils/date'

const props = defineProps({
  plants: {
    type: Array,
    required: true,
  },
  batchResult: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['batch-water', 'clear-result'])

const selectedIds = reactive(new Set())
const batchDate = ref(todayISO())

const selectedCount = computed(() => selectedIds.size)
const allSelected = computed(() => props.plants.length > 0 && selectedIds.size === props.plants.length)
const someSelected = computed(() => selectedIds.size > 0)

function toggleSelect(plantId) {
  if (selectedIds.has(plantId)) {
    selectedIds.delete(plantId)
  } else {
    selectedIds.add(plantId)
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.clear()
  } else {
    props.plants.forEach((plant) => selectedIds.add(plant.id))
  }
}

function clearSelection() {
  selectedIds.clear()
}

function submitBatchWater() {
  if (!selectedIds.size) return
  emit('batch-water', { plantIds: [...selectedIds], date: batchDate.value })
  selectedIds.clear()
}

function dismissResult() {
  emit('clear-result')
}
</script>

<template>
  <section class="panel plant-list-panel">
    <div class="panel-heading">
      <h2>我的植物</h2>
      <div class="panel-heading-actions">
        <span>{{ plants.length }} 个档案</span>
        <button v-if="plants.length" class="link-action" type="button" @click="toggleSelectAll">
          {{ allSelected ? '清除选择' : '全选' }}
        </button>
      </div>
    </div>

    <Transition name="batch-bar">
      <div v-if="someSelected" class="batch-toolbar">
        <span class="selected-count">已选 {{ selectedCount }} 株</span>
        <label class="batch-date">
          补录日期
          <input v-model="batchDate" type="date" />
        </label>
        <button class="primary-action" type="button" @click="submitBatchWater">批量浇水</button>
        <button class="link-action" type="button" @click="clearSelection">清除</button>
      </div>
    </Transition>

    <Transition name="batch-result">
      <div v-if="batchResult" class="batch-result">
        <div class="batch-result-header">
          <strong>批量浇水完成</strong>
          <button class="link-action" type="button" @click="dismissResult">×</button>
        </div>
        <p class="batch-result-summary">
          成功 <strong class="ok-text">{{ batchResult.succeeded.length }}</strong> 株
          <template v-if="batchResult.skipped.length">
            ，<span class="skipped-text">跳过 {{ batchResult.skipped.length }} 株</span>
          </template>
          <template v-if="batchResult.failed.length">
            ，<span class="failed-text">失败 {{ batchResult.failed.length }} 株</span>
          </template>
        </p>
        <ul v-if="batchResult.skipped.length" class="result-detail">
          <li v-for="item in batchResult.skipped" :key="'skip-' + item.plantId" class="skipped-text">
            {{ item.name || item.plantId }}：{{ item.reason }}
          </li>
        </ul>
        <ul v-if="batchResult.failed.length" class="result-detail">
          <li v-for="item in batchResult.failed" :key="'fail-' + item.plantId" class="failed-text">
            {{ item.name || item.plantId }}：{{ item.reason }}
          </li>
        </ul>
      </div>
    </Transition>

    <div v-if="!plants.length" class="empty-state">还没有植物档案，去右侧添加第一株吧。</div>
    <div v-else class="plant-grid">
      <article
        v-for="plant in plants"
        :key="plant.id"
        :class="['plant-card', { selected: selectedIds.has(plant.id) }]"
      >
        <input
          class="plant-card-select"
          type="checkbox"
          :checked="selectedIds.has(plant.id)"
          :aria-label="'选择 ' + plant.name"
          @change="toggleSelect(plant.id)"
        />
        <img v-if="plant.photo" :src="plant.photo" :alt="plant.name" />
        <div v-else class="plant-placeholder">{{ plant.name.slice(0, 1) }}</div>
        <div class="plant-card-body">
          <div class="plant-title">
            <h3>{{ plant.name }}</h3>
            <span :class="['status-pill', plant.wateringStatus === '已过期' ? 'danger' : plant.wateringStatus === '待浇水' ? 'warning' : 'ok']">
              {{ plant.wateringStatus }}
            </span>
          </div>
          <p>{{ plant.variety || '未填写品种' }}</p>
          <div class="plant-tags">
            <span>{{ plant.category }}</span>
            <span>{{ plant.location }}</span>
            <span>{{ plant.lightNeed }}</span>
          </div>
          <dl>
            <div>
              <dt>购买</dt>
              <dd>{{ formatDate(plant.purchaseDate) }}</dd>
            </div>
            <div>
              <dt>花盆</dt>
              <dd>{{ plant.potSize || '未填写' }}</dd>
            </div>
            <div>
              <dt>土壤</dt>
              <dd>{{ plant.soilType || '未填写' }}</dd>
            </div>
          </dl>
        </div>
      </article>
    </div>
  </section>
</template>
