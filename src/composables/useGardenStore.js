import { computed, reactive, watch } from 'vue'
import { DEFAULT_GOALS } from '../constants/garden'
import { isISODate, todayISO } from '../utils/date'
import { loadGardenState, saveGardenState } from '../services/storage'
import {
  buildLeaderboards,
  buildTimeline,
  calculateAchievements,
  createId,
  getDashboard,
  getDueWateringPlants,
  getWateringStatus,
  updateWateringGoal,
} from '../services/gardenRules'

const demoState = {
  plants: [
    {
      id: 'plant-demo-1',
      name: '琴叶榕',
      variety: 'Ficus lyrata',
      category: '观叶',
      location: '客厅',
      lightNeed: '半阴',
      wateringFrequency: 4,
      fertilizerFrequency: 30,
      purchaseDate: '2026-08-18',
      lastWateredDate: '2026-09-12',
      potSize: '28cm 陶盆',
      soilType: '泥炭土混合珍珠岩',
      photo: '',
      alive: true,
    },
    {
      id: 'plant-demo-2',
      name: '蓝雪花',
      variety: 'Plumbago auriculata',
      category: '观花',
      location: '阳台',
      lightNeed: '全阳',
      wateringFrequency: 2,
      fertilizerFrequency: 14,
      purchaseDate: '2026-07-02',
      lastWateredDate: '2026-09-13',
      potSize: '20cm 加仑盆',
      soilType: '通用营养土',
      photo: '',
      alive: true,
    },
  ],
  careRecords: [
    {
      id: 'care-demo-1',
      plantId: 'plant-demo-2',
      date: '2026-09-14',
      type: '施肥',
      amount: '缓释肥 5g',
      note: '花量增加，叶色正常',
      photo: '',
    },
    {
      id: 'care-demo-2',
      plantId: 'plant-demo-1',
      date: '2026-09-12',
      type: '浇水',
      amount: '约 600ml',
      note: '盆底少量出水',
      photo: '',
    },
  ],
  growthRecords: [
    {
      id: 'growth-demo-1',
      plantId: 'plant-demo-1',
      date: '2026-08-20',
      height: 82,
      leafCount: 14,
      bloomState: '未开花',
    },
    {
      id: 'growth-demo-2',
      plantId: 'plant-demo-1',
      date: '2026-09-10',
      height: 88,
      leafCount: 17,
      bloomState: '未开花',
    },
    {
      id: 'growth-demo-3',
      plantId: 'plant-demo-2',
      date: '2026-09-08',
      height: 45,
      leafCount: 56,
      bloomState: '盛开',
    },
  ],
  pestRecords: [],
  goals: DEFAULT_GOALS,
}

function getLatestWateringDate(plant, careRecords) {
  return careRecords.reduce((latestDate, record) => {
    if (record.type === '浇水' && record.plantId === plant.id && record.date > latestDate) {
      return record.date
    }
    return latestDate
  }, plant.lastWateredDate || '')
}

export function useGardenStore() {
  const storedState = loadGardenState()
  const state = reactive(storedState || demoState)

  const plantsWithStatus = computed(() =>
    state.plants.map((plant) => ({ ...plant, wateringStatus: getWateringStatus(plant) })),
  )
  const dueWateringPlants = computed(() => getDueWateringPlants(state.plants))
  const dashboard = computed(() => getDashboard(state.plants, state.careRecords, state.growthRecords))
  const goals = computed(() => updateWateringGoal(state.goals, state.careRecords))
  const achievements = computed(() =>
    calculateAchievements(state.plants, state.careRecords, state.growthRecords, state.pestRecords, goals.value),
  )
  const leaderboards = computed(() => buildLeaderboards(state.plants, state.careRecords, state.growthRecords))

  watch(
    state,
    () => {
      saveGardenState({ ...state, goals: goals.value })
    },
    { deep: true },
  )

  function addPlant(payload) {
    state.plants.unshift({
      ...payload,
      id: createId('plant'),
      lastWateredDate: payload.lastWateredDate || payload.purchaseDate || todayISO(),
      alive: true,
    })
  }

  function addCareRecord(payload) {
    const record = { ...payload, id: createId('care') }
    state.careRecords.unshift(record)

    if (record.type === '浇水') {
      const plant = state.plants.find((item) => item.id === record.plantId)
      const latestDate = plant ? getLatestWateringDate(plant, state.careRecords) : ''
      if (plant && (!latestDate || record.date >= latestDate)) {
        plant.lastWateredDate = record.date
      }
    }
  }

  function batchWaterPlants({ plantIds = [], date = todayISO(), amount = '', note = '' } = {}) {
    const result = { date, watered: [], skipped: [], failed: [] }
    const uniquePlantIds = [...new Set(plantIds)]

    if (!isISODate(date)) {
      result.failed = uniquePlantIds.map((plantId) => ({ plantId, reason: '浇水日期无效' }))
      return result
    }
    if (date > todayISO()) {
      result.failed = uniquePlantIds.map((plantId) => ({ plantId, reason: '不能为未来日期补录浇水' }))
      return result
    }

    uniquePlantIds.forEach((plantId) => {
      try {
        const plant = state.plants.find((item) => item.id === plantId)
        if (!plant) {
          result.failed.push({ plantId, reason: '植物不存在或已被删除' })
          return
        }
        if (plant.alive === false) {
          result.failed.push({ plantId, plantName: plant.name, reason: '已移除的植物不能记录浇水' })
          return
        }
        if (plant.purchaseDate && date < plant.purchaseDate) {
          result.failed.push({ plantId, plantName: plant.name, reason: '浇水日期不能早于购买日期' })
          return
        }

        const alreadyWatered =
          plant.lastWateredDate === date ||
          state.careRecords.some(
            (record) => record.type === '浇水' && record.plantId === plantId && record.date === date,
          )
        if (alreadyWatered) {
          result.skipped.push({ plantId, plantName: plant.name, reason: '当天已有浇水记录' })
          return
        }

        const record = {
          id: createId('care'),
          plantId,
          date,
          type: '浇水',
          amount,
          note,
          photo: '',
        }
        state.careRecords.unshift(record)
        plant.lastWateredDate = getLatestWateringDate(plant, state.careRecords) || date
        result.watered.push({ plantId, plantName: plant.name })
      } catch (error) {
        const plant = state.plants.find((item) => item.id === plantId)
        result.failed.push({
          plantId,
          plantName: plant?.name,
          reason: error?.message || '保存浇水记录失败',
        })
      }
    })

    return result
  }

  function addGrowthRecord(payload) {
    state.growthRecords.unshift({ ...payload, id: createId('growth') })
  }

  function addPestRecord(payload) {
    state.pestRecords.unshift({ ...payload, id: createId('pest') })
  }

  function getPlantTimeline(plantId) {
    return buildTimeline(plantId, state.careRecords, state.growthRecords, state.pestRecords)
  }

  function getPlantGrowth(plantId) {
    return state.growthRecords
      .filter((record) => record.plantId === plantId)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  return {
    state,
    plantsWithStatus,
    dueWateringPlants,
    dashboard,
    goals,
    achievements,
    leaderboards,
    addPlant,
    addCareRecord,
    batchWaterPlants,
    addGrowthRecord,
    addPestRecord,
    getPlantTimeline,
    getPlantGrowth,
  }
}
