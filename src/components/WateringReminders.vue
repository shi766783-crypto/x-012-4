<script setup>
import { computed, reactive, ref, watch } from 'vue'
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
const emit = defineEmits(['batch-water'])

const selectedPlantIds = ref([])
const batchForm = reactive({ date: todayISO(), amount: '', note: '' })

const selectAllCheckbox = ref(null)
const allSelected = computed(() => props.plants.length > 0 && selectedPlantIds.value.length === props.plants.length)
const someSelected = computed(() => selectedPlantIds.value.length > 0 && !allSelected.value)
const selectedCount = computed(() => selectedPlantIds.value.length)

watch(
  () => props.plants.map((plant) => plant.id),
  (plantIds) => {
    const visibleIds = new Set(plantIds)
    selectedPlantIds.value = selectedPlantIds.value.filter((id) => visibleIds.has(id))
  },
)

watch(someSelected, (isIndeterminate) => {
  if (selectAllCheckbox.value) selectAllCheckbox.value.indeterminate = isIndeterminate
})

watch(
  () => props.batchResult,
  (result) => {
    if (!result) return
    const wateredIds = new Set(result.watered.map((item) => item.plantId))
    selectedPlantIds.value = selectedPlantIds.value.filter((id) => !wateredIds.has(id))
  },
)

function toggleAll(event) {
  selectedPlantIds.value = event.target.checked ? props.plants.map((plant) => plant.id) : []
}

function submitBatchWatering() {
  if (!selectedPlantIds.value.length || !batchForm.date) return
  emit('batch-water', {
    plantIds: [...selectedPlantIds.value],
    date: batchForm.date,
    amount: batchForm.amount.trim(),
    note: batchForm.note.trim(),
  })
}
</script>

<template>
  <section class="panel">
    <div class="panel-heading">
      <h2>今日待浇水</h2>
      <span>{{ plants.length }} 株</span>
    </div>

    <div v-if="plants.length" class="batch-watering-bar">
      <label class="select-all-control">
        <input
          ref="selectAllCheckbox"
          :checked="allSelected"
          type="checkbox"
          @change="toggleAll"
        />
        全选
      </label>
      <label>
        <span>补录日期</span>
        <input v-model="batchForm.date" :max="todayISO()" type="date" />
      </label>
      <input v-model="batchForm.amount" placeholder="统一水量，如 500ml（可选）" />
      <button class="primary-action" :disabled="!selectedCount" type="button" @click="submitBatchWatering">
        批量浇水{{ selectedCount ? `（${selectedCount} 株）` : '' }}
      </button>
    </div>

    <div v-if="batchResult" :class="['batch-result', batchResult.failed.length ? 'has-failure' : 'complete']">
      <p>
        {{ formatDate(batchResult.date) }} 浇水完成：成功 {{ batchResult.watered.length }} 株，
        跳过 {{ batchResult.skipped.length }} 株，失败 {{ batchResult.failed.length }} 株。
      </p>
      <ul v-if="batchResult.skipped.length || batchResult.failed.length">
        <li v-for="item in [...batchResult.skipped, ...batchResult.failed]" :key="`${item.plantId}-${item.plantName || ''}-${item.reason}`">
          {{ item.plantName || '未知植物' }}：{{ item.reason }}
        </li>
      </ul>
    </div>

    <div v-if="!plants.length" class="empty-state">今天没有待浇水植物，节奏不错。</div>
    <div v-else class="reminder-list">
      <article v-for="plant in plants" :key="plant.id" class="reminder-item">
        <label class="reminder-select">
          <input v-model="selectedPlantIds" :value="plant.id" type="checkbox" />
          <div>
            <strong>{{ plant.name }}</strong>
            <p>{{ plant.location }} · 每 {{ plant.wateringFrequency }} 天浇水 · 上次 {{ formatDate(plant.lastWateredDate) }}</p>
          </div>
        </label>
        <span :class="['status-pill', plant.wateringStatus === '已过期' ? 'danger' : 'warning']">
          {{ plant.wateringStatus }}
        </span>
      </article>
    </div>
  </section>
</template>
