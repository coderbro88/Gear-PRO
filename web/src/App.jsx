import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'gearpro2.web.state.v2'
const STATUS_OPTIONS = ['reserved', 'checked_out', 'returned', 'needs_repair', 'consumed', 'lost']
const CHECKED_IN_STATUSES = ['returned', 'needs_repair', 'consumed', 'lost']
const NOT_CHECKED_IN_STATUSES = ['reserved', 'checked_out']
const BAG_COLOR_PALETTE = ['#1565c0', '#2e7d42', '#c98a1a', '#c62828', '#5b8a60', '#7a9e7e', '#c9925a']
const STARTER_CATEGORIES = ['Shelter', 'Sleep', 'Cooking', 'Water', 'Clothing', 'Safety', 'Navigation', 'Food', 'Tools', 'Hunting', 'Other']
const DEFAULT_PACK_TEMPLATES = [
  { id: crypto.randomUUID(), label: 'My Pack', maxWeight: 45, color: '#2e7d42' },
  { id: crypto.randomUUID(), label: 'Partner Pack', maxWeight: 30, color: '#1565c0' },
]
const STATUS_LABELS = {
  reserved: 'Planned - Not Packed',
  checked_out: 'Packed',
  returned: 'Unpacked - Returned',
  needs_repair: 'Needs Repair',
  consumed: 'Consumed',
  lost: 'Lost',
  expired: 'Expired',
}
const STATUS_CLASS = {
  reserved: 'status-reserved',
  checked_out: 'status-checked_out',
  returned: 'status-returned',
  needs_repair: 'status-needs_repair',
  consumed: 'status-consumed',
  lost: 'status-lost',
  expired: 'status-expired',
}
const TAB_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'gear', label: 'Gear', icon: 'gear' },
  { id: 'trips', label: 'Trips', icon: 'trips' },
  { id: 'manage', label: 'Manage', icon: 'manage' },
  { id: 'backup', label: 'Backup', icon: 'backup' },
]
const uiClasses = {
  panelPrimary: 'card surface-primary',
  panelMuted: 'card callout surface-muted',
  sectionHeader: 'type-title section-header',
  formPanel: 'card form surface-primary control-group',
  listPanel: 'card list surface-primary',
}

const defaultTrip = () => ({
  id: crypto.randomUUID(),
  name: 'Family Camp Weekend',
  location: 'Big Bend National Park',
  startDate: '2026-04-20',
  endDate: '2026-04-22',
  status: 'planning',
  bags: DEFAULT_PACK_TEMPLATES.map((pack) => ({ ...pack, id: crypto.randomUUID() })),
  assignments: [],
})

const defaultState = {
  schemaVersion: 2,
  lastUpdatedAt: new Date().toISOString(),
  gear: [
    { id: crypto.randomUUID(), brand: 'MSR', name: 'PocketRocket 2', category: 'Cooking', weight: 0.16, quantity: 1, notes: '', expirationDate: '' },
    { id: crypto.randomUUID(), brand: 'Sawyer', name: 'Squeeze Filter', category: 'Water', weight: 0.22, quantity: 2, notes: '', expirationDate: '' },
    { id: crypto.randomUUID(), brand: 'Adventure Medical', name: 'First Aid Kit', category: 'Safety', weight: 0.5, quantity: 1, notes: 'Keep meds current', expirationDate: '' },
  ],
  categories: STARTER_CATEGORIES,
  packTemplates: DEFAULT_PACK_TEMPLATES,
  trips: [defaultTrip()],
}

function normalizeTrip(trip) {
  return {
    id: trip.id || crypto.randomUUID(),
    name: trip.name || 'Unnamed Trip',
    location: trip.location || '',
    startDate: trip.startDate || '',
    endDate: trip.endDate || '',
    status: trip.status || 'planning',
    bags: Array.isArray(trip.bags) && trip.bags.length
      ? trip.bags.map((bag) => ({
        id: bag.id || crypto.randomUUID(),
        label: bag.label || 'Bag',
        maxWeight: Number(bag.maxWeight) || 30,
        color: bag.color || bagColorForLabel(bag.label || 'Bag'),
      }))
      : [{ id: crypto.randomUUID(), label: 'Main Pack', maxWeight: 35, color: bagColorForLabel('Main Pack') }],
    assignments: Array.isArray(trip.assignments)
      ? trip.assignments.map((assignment) => ({
        id: assignment.id || crypto.randomUUID(),
        gearId: assignment.gearId || '',
        bagId: assignment.bagId || '',
        quantity: Number(assignment.quantity) || 1,
        status: assignment.status === 'packed'
          ? 'checked_out'
          : (STATUS_OPTIONS.includes(assignment.status) ? assignment.status : 'reserved'),
        essential: Boolean(assignment.essential),
        note: assignment.note || '',
      }))
      : [],
  }
}

function normalizeState(raw) {
  if (!raw || !Array.isArray(raw.gear) || !Array.isArray(raw.trips)) return defaultState
  const normalizedGear = raw.gear.map((item) => ({
    id: item.id || crypto.randomUUID(),
    brand: item.brand || '',
    name: item.name || '',
    category: item.category || 'Other',
    weight: Number(item.weight) || 0,
    quantity: Number(item.quantity) || 1,
    expirationDate: normalizeExpirationDate(item.expirationDate),
    notes: item.notes || '',
  }))
  const fallbackCategories = Array.from(new Set([
    ...STARTER_CATEGORIES,
    ...(Array.isArray(raw.customCategories) ? raw.customCategories : []),
    ...normalizedGear.map((item) => item.category || 'Other'),
  ])).filter((item) => typeof item === 'string' && item.trim())
  return {
    schemaVersion: 2,
    lastUpdatedAt: raw.lastUpdatedAt || new Date().toISOString(),
    gear: normalizedGear,
    categories: Array.isArray(raw.categories) && raw.categories.length
      ? raw.categories.filter((item) => typeof item === 'string' && item.trim())
      : fallbackCategories,
    packTemplates: Array.isArray(raw.packTemplates) && raw.packTemplates.length
      ? raw.packTemplates.map((pack) => ({
        id: pack.id || crypto.randomUUID(),
        label: pack.label || 'Pack',
        maxWeight: Number(pack.maxWeight) || 35,
        color: pack.color || bagColorForLabel(pack.label || 'Pack'),
      }))
      : DEFAULT_PACK_TEMPLATES,
    trips: raw.trips.map(normalizeTrip),
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return defaultState
    return normalizeState(JSON.parse(saved))
  } catch {
    return defaultState
  }
}

function saveState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
}

function confirmDelete(message) {
  return window.confirm(message)
}

function NavIcon({ name }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }
  if (name === 'dashboard') return <svg {...common}><path d="M3 13h8V3H3z" /><path d="M13 21h8V11h-8z" /><path d="M13 3h8v6h-8z" /><path d="M3 21h8v-6H3z" /></svg>
  if (name === 'gear') return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.09 1.65V22a2 2 0 0 1-4 0v-.09a1.8 1.8 0 0 0-1.09-1.65 1.8 1.8 0 0 0-1.98.36l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.09H2.86a2 2 0 0 1 0-4h.09A1.8 1.8 0 0 0 4.6 8.82a1.8 1.8 0 0 0-.36-1.98l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.8 1.8 0 0 0 1.98.36h.01A1.8 1.8 0 0 0 10.15 2.7V2.6a2 2 0 1 1 4 0v.09a1.8 1.8 0 0 0 1.09 1.65h.01a1.8 1.8 0 0 0 1.98-.36l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.8 1.8 0 0 0-.36 1.98v.01a1.8 1.8 0 0 0 1.65 1.09h.09a2 2 0 1 1 0 4h-.09A1.8 1.8 0 0 0 19.4 15z" /></svg>
  if (name === 'trips') return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
  if (name === 'manage') return <svg {...common}><path d="M4 21h16" /><path d="M7 21V7l5-4 5 4v14" /><path d="M9 11h6" /></svg>
  return <svg {...common}><path d="M4 14.5A2.5 2.5 0 0 0 6.5 17H18" /><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6.5A2.5 2.5 0 0 0 4 22z" /></svg>
}

function bagColorForLabel(label) {
  const normalized = String(label || '').trim().toLowerCase()
  const hash = Array.from(normalized).reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return BAG_COLOR_PALETTE[hash % BAG_COLOR_PALETTE.length]
}

function isMyPackLabel(label) {
  return String(label || '').trim().toLowerCase() === 'my pack'
}

function csvEscape(value) {
  const text = String(value ?? '')
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

function parseCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    const next = line[i + 1]
    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

function toLocalDateStamp(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeExpirationDate(value) {
  const text = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

function isExpiredDate(expirationDate, todayStamp = toLocalDateStamp()) {
  const normalized = normalizeExpirationDate(expirationDate)
  if (!normalized) return false
  return normalized < todayStamp
}

function App() {
  const [appState, setAppState] = useState(loadState)
  const [tab, setTab] = useState('dashboard')
  const [selectedTripId, setSelectedTripId] = useState(appState.trips[0]?.id || null)
  const [gearForm, setGearForm] = useState({ brand: '', name: '', category: 'Shelter', weight: '', quantity: '1', expirationDate: '', notes: '' })
  const [tripForm, setTripForm] = useState({ name: '', location: '', startDate: '', endDate: '' })
  const [tripTemplateSelections, setTripTemplateSelections] = useState([])
  const [showTripBagEditor, setShowTripBagEditor] = useState(false)
  const [assignmentGearSearch, setAssignmentGearSearch] = useState('')
  const [assignmentGearCategory, setAssignmentGearCategory] = useState('all')
  const [selectedAssignBagId, setSelectedAssignBagId] = useState('')
  const [batchSelectedGearIds, setBatchSelectedGearIds] = useState([])
  const [batchItemSettings, setBatchItemSettings] = useState({})
  const [packPercentMode, setPackPercentMode] = useState('capacity')
  const [packingListBagFilter, setPackingListBagFilter] = useState('all')
  const [gearSearch, setGearSearch] = useState('')
  const [gearFilterCategory, setGearFilterCategory] = useState('all')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [bulkFromCategory, setBulkFromCategory] = useState('all')
  const [bulkToCategory, setBulkToCategory] = useState('Other')
  const [templateForm, setTemplateForm] = useState({ label: '', maxWeight: '35', color: '#2e7d42' })
  const [editingTemplateId, setEditingTemplateId] = useState(null)
  const [editTemplateForm, setEditTemplateForm] = useState({ label: '', maxWeight: '35', color: '#2e7d42' })

  const selectedTrip = useMemo(
    () => appState.trips.find((trip) => trip.id === selectedTripId) || null,
    [appState.trips, selectedTripId],
  )

  useEffect(() => {
    if (!selectedTrip) {
      setSelectedAssignBagId('')
      setBatchSelectedGearIds([])
      setBatchItemSettings({})
      return
    }
    const stillExists = selectedTrip.bags.some((bag) => bag.id === selectedAssignBagId)
    if (!stillExists) {
      setSelectedAssignBagId(selectedTrip.bags[0]?.id || '')
      setBatchSelectedGearIds([])
      setBatchItemSettings({})
    }
  }, [selectedTrip, selectedAssignBagId])

  useEffect(() => {
    const templateIds = appState.packTemplates.map((template) => template.id)
    const myPackTemplate = appState.packTemplates.find((template) => isMyPackLabel(template.label))
    const fallbackTemplateId = appState.packTemplates[0]?.id
    const requiredId = myPackTemplate?.id || fallbackTemplateId
    setTripTemplateSelections((prev) => {
      let next = prev.filter((id) => templateIds.includes(id))
      if (requiredId && !next.includes(requiredId)) next = [requiredId, ...next]
      if (next.length === 0 && requiredId) next = [requiredId]
      if (next.join('|') === prev.filter((id) => templateIds.includes(id)).join('|')) return prev
      return next
    })
  }, [appState.packTemplates])

  const gearById = useMemo(
    () => Object.fromEntries(appState.gear.map((item) => [item.id, item])),
    [appState.gear],
  )

  const allCategories = useMemo(() => (
    Array.from(new Set([
      ...(Array.isArray(appState.categories) ? appState.categories : []),
      ...appState.gear.map((item) => item.category || 'Other'),
    ])).sort()
  ), [appState.categories, appState.gear])

  const checkedOutByGear = useMemo(() => {
    const result = {}
    appState.trips.forEach((trip) => {
      trip.assignments.forEach((assignment) => {
        if (assignment.status === 'checked_out') {
          result[assignment.gearId] = (result[assignment.gearId] || 0) + assignment.quantity
        }
      })
    })
    return result
  }, [appState.trips])

  const totalGearWeight = useMemo(
    () => appState.gear.reduce((sum, item) => sum + item.weight * item.quantity, 0),
    [appState.gear],
  )

  const filteredGear = useMemo(() => (
    appState.gear.filter((item) => {
      const matchesCategory = gearFilterCategory === 'all' || item.category === gearFilterCategory
      const query = gearSearch.trim().toLowerCase()
      const matchesSearch = !query
        || `${item.brand} ${item.name} ${item.category}`.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  ), [appState.gear, gearFilterCategory, gearSearch])

  const expiredGearById = useMemo(() => {
    const todayStamp = toLocalDateStamp()
    return Object.fromEntries(
      appState.gear
        .filter((item) => isExpiredDate(item.expirationDate, todayStamp))
        .map((item) => [item.id, item]),
    )
  }, [appState.gear])

  const actionList = useMemo(() => {
    const statusActions = appState.trips.flatMap((trip) => (
      trip.assignments
        .filter((assignment) => ['needs_repair', 'lost', 'consumed'].includes(assignment.status))
        .map((assignment) => {
          const gear = gearById[assignment.gearId]
          const bag = trip.bags.find((item) => item.id === assignment.bagId)
          let action = 'Review'
          if (assignment.status === 'needs_repair') action = 'Repair'
          if (assignment.status === 'lost') action = 'Replace'
          if (assignment.status === 'consumed') action = 'Restock'
          return {
            id: assignment.id,
            tripId: trip.id,
            tripName: trip.name,
            bagName: bag?.label || 'Unknown Bag',
            gearLabel: gear ? `${gear.brand} ${gear.name}` : 'Unknown Gear',
            category: gear?.category || 'Other',
            quantity: assignment.quantity,
            action,
            status: assignment.status,
            note: assignment.note,
            isResolvable: true,
          }
        })
    ))
    const expiredInventoryActions = Object.values(expiredGearById).map((gear) => ({
      id: `expired-${gear.id}`,
      tripId: null,
      tripName: 'Inventory',
      bagName: 'N/A',
      gearLabel: `${gear.brand} ${gear.name}`,
      category: gear.category || 'Other',
      quantity: gear.quantity || 1,
      action: 'Replace (Expired)',
      status: 'expired',
      note: `Expired on ${gear.expirationDate}`,
      isResolvable: false,
    }))
    return [...statusActions, ...expiredInventoryActions]
  }, [appState.trips, gearById, expiredGearById])

  const groupedActionList = useMemo(() => {
    const grouped = actionList.reduce((acc, item) => {
      const category = item.category || 'Other'
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    }, {})
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  }, [actionList])

  const tripActionGroups = useMemo(() => {
    if (!selectedTrip) return []
    const tripFollowUpItems = selectedTrip.assignments
      .filter((assignment) => ['needs_repair', 'consumed', 'lost'].includes(assignment.status))
      .map((assignment) => {
        const gear = gearById[assignment.gearId]
        return {
          id: assignment.id,
          assignmentId: assignment.id,
          status: assignment.status,
          category: gear?.category || 'Other',
          gearLabel: gear ? `${gear.brand} ${gear.name}` : 'Unknown Gear',
          quantity: assignment.quantity,
          action: assignment.status === 'needs_repair' ? 'Repair' : assignment.status === 'lost' ? 'Replace' : 'Restock',
          note: assignment.note || '',
          isResolvable: true,
        }
      })

    const expiredTripItems = selectedTrip.assignments
      .filter((assignment) => Boolean(expiredGearById[assignment.gearId]))
      .map((assignment) => {
        const gear = expiredGearById[assignment.gearId]
        return {
          id: `${assignment.id}-expired`,
          assignmentId: assignment.id,
          status: 'expired',
          category: gear?.category || 'Other',
          gearLabel: gear ? `${gear.brand} ${gear.name}` : 'Unknown Gear',
          quantity: assignment.quantity,
          action: 'Replace (Expired)',
          note: `Expired on ${gear?.expirationDate || 'unknown date'}`,
          isResolvable: false,
        }
      })

    const grouped = [...tripFollowUpItems, ...expiredTripItems]
      .reduce((acc, item) => {
        const category = item.category || 'Other'
        if (!acc[category]) acc[category] = []
        acc[category].push(item)
        return acc
      }, {})
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  }, [selectedTrip, gearById, expiredGearById])

  const assignmentGearGroups = useMemo(() => {
    if (!selectedTrip) return []
    const query = assignmentGearSearch.trim().toLowerCase()
    const options = appState.gear
      .map((item) => {
        const checkedOutElsewhere = appState.trips
          .filter((trip) => trip.id !== selectedTrip.id)
          .flatMap((trip) => trip.assignments)
          .filter((assignment) => assignment.gearId === item.id && assignment.status === 'checked_out')
          .reduce((sum, assignment) => sum + assignment.quantity, 0)
        const totalAvailableForTrip = Math.max((item.quantity || 0) - checkedOutElsewhere, 0)
        const assignedInTrip = selectedTrip.assignments
          .filter((assignment) => assignment.gearId === item.id)
          .reduce((sum, assignment) => sum + assignment.quantity, 0)
        const inSelectedBag = selectedTrip.assignments
          .filter((assignment) => assignment.gearId === item.id && assignment.bagId === selectedAssignBagId)
          .reduce((sum, assignment) => sum + assignment.quantity, 0)
        return {
          ...item,
          remainingToAssign: Math.max(totalAvailableForTrip - assignedInTrip, 0),
          inSelectedBag,
        }
      })
      .filter((item) => {
        const matchesCategory = assignmentGearCategory === 'all' || item.category === assignmentGearCategory
        const matchesSearch = !query || `${item.brand} ${item.name} ${item.category}`.toLowerCase().includes(query)
        return matchesCategory && matchesSearch
      })
      .sort((a, b) => {
        if (b.remainingToAssign !== a.remainingToAssign) return b.remainingToAssign - a.remainingToAssign
        return `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`)
      })
    const grouped = options.reduce((acc, item) => {
      const category = item.category || 'Other'
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    }, {})
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  }, [selectedTrip, appState.gear, assignmentGearSearch, assignmentGearCategory, selectedAssignBagId, appState.trips])

  const assignmentGroups = useMemo(() => {
    if (!selectedTrip) return []
    const assignmentsForList = packingListBagFilter === 'all'
      ? selectedTrip.assignments
      : selectedTrip.assignments.filter((assignment) => assignment.bagId === packingListBagFilter)
    const grouped = assignmentsForList.reduce((acc, assignment) => {
      const category = gearById[assignment.gearId]?.category || 'Other'
      if (!acc[category]) acc[category] = []
      acc[category].push(assignment)
      return acc
    }, {})
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, assignments]) => [
        category,
        assignments.sort((a, b) => {
          const aLabel = `${gearById[a.gearId]?.brand || ''} ${gearById[a.gearId]?.name || ''}`.trim()
          const bLabel = `${gearById[b.gearId]?.brand || ''} ${gearById[b.gearId]?.name || ''}`.trim()
          return aLabel.localeCompare(bLabel)
        }),
      ])
  }, [selectedTrip, gearById, packingListBagFilter])

  const gearStatusById = useMemo(() => {
    const statusMap = {}
    appState.trips.forEach((trip) => {
      trip.assignments.forEach((assignment) => {
        if (!statusMap[assignment.gearId]) statusMap[assignment.gearId] = new Set()
        if (assignment.status !== 'reserved') statusMap[assignment.gearId].add(assignment.status)
      })
    })
    return Object.fromEntries(
      Object.entries(statusMap).map(([gearId, statuses]) => [gearId, Array.from(statuses)]),
    )
  }, [appState.trips])

  const selectedBagAssignmentsByGear = useMemo(() => {
    if (!selectedTrip || !selectedAssignBagId) return {}
    return Object.fromEntries(
      selectedTrip.assignments
        .filter((assignment) => assignment.bagId === selectedAssignBagId)
        .map((assignment) => [assignment.gearId, assignment]),
    )
  }, [selectedTrip, selectedAssignBagId])

  const conflictCount = useMemo(() => {
    let count = 0
    appState.trips.forEach((trip) => {
      trip.assignments.forEach((assignment) => {
        const totalAvailable = gearById[assignment.gearId]?.quantity || 0
        const checkedOutElsewhere = (checkedOutByGear[assignment.gearId] || 0) - (assignment.status === 'checked_out' ? assignment.quantity : 0)
        if (assignment.quantity > Math.max(totalAvailable - checkedOutElsewhere, 0)) count += 1
      })
    })
    return count
  }, [appState.trips, checkedOutByGear, gearById])

  const updateState = (updater) => {
    setAppState((prev) => {
      const next = {
        ...updater(prev),
        schemaVersion: 2,
        lastUpdatedAt: new Date().toISOString(),
      }
      saveState(next)
      return next
    })
  }

  const addGear = (event) => {
    event.preventDefault()
    const weight = Number(gearForm.weight)
    const quantity = Number(gearForm.quantity)
    if (!gearForm.brand || !gearForm.name || Number.isNaN(weight) || weight <= 0 || Number.isNaN(quantity) || quantity <= 0) return

    const newGear = {
      id: crypto.randomUUID(),
      brand: gearForm.brand.trim(),
      name: gearForm.name.trim(),
      category: gearForm.category.trim() || 'General',
      weight,
      quantity,
      expirationDate: normalizeExpirationDate(gearForm.expirationDate),
      notes: gearForm.notes.trim(),
    }
    updateState((prev) => ({ ...prev, gear: [...prev.gear, newGear] }))
    setGearForm({ brand: '', name: '', category: 'Shelter', weight: '', quantity: '1', expirationDate: '', notes: '' })
  }

  const removeGear = (gearId) => {
    const inUse = appState.trips.some((trip) => trip.assignments.some((assignment) => assignment.gearId === gearId))
    if (inUse) {
      window.alert('This gear is assigned to a trip. Remove assignments first.')
      return
    }
    if (!confirmDelete('Delete this gear item? This cannot be undone.')) return
    updateState((prev) => ({ ...prev, gear: prev.gear.filter((item) => item.id !== gearId) }))
  }

  const addTrip = (event) => {
    event.preventDefault()
    if (!tripForm.name || !tripForm.startDate || !tripForm.endDate) return
    const selectedTemplates = appState.packTemplates.filter((template) => tripTemplateSelections.includes(template.id))
    const myPackTemplate = appState.packTemplates.find((pack) => isMyPackLabel(pack.label))
    const fallbackTemplate = myPackTemplate || appState.packTemplates[0]
    const starterTemplates = selectedTemplates.length ? selectedTemplates : (fallbackTemplate ? [fallbackTemplate] : [])
    const newTrip = {
      id: crypto.randomUUID(),
      name: tripForm.name.trim(),
      location: tripForm.location.trim(),
      startDate: tripForm.startDate,
      endDate: tripForm.endDate,
      status: 'planning',
      bags: starterTemplates.length
        ? starterTemplates.map((template) => ({ ...template, id: crypto.randomUUID() }))
        : [{ id: crypto.randomUUID(), label: 'My Pack', maxWeight: 35, color: bagColorForLabel('My Pack') }],
      assignments: [],
    }
    updateState((prev) => ({ ...prev, trips: [...prev.trips, newTrip] }))
    setSelectedTripId(newTrip.id)
    setTripForm({ name: '', location: '', startDate: '', endDate: '' })
    setShowTripBagEditor(false)
  }

  const removeTrip = (tripId) => {
    if (!confirmDelete('Delete this trip and all its assignments?')) return
    updateState((prev) => ({ ...prev, trips: prev.trips.filter((trip) => trip.id !== tripId) }))
    if (selectedTripId === tripId) {
      const nextTrip = appState.trips.find((trip) => trip.id !== tripId)
      setSelectedTripId(nextTrip?.id || null)
    }
  }

  const addCategory = (event) => {
    event.preventDefault()
    const clean = newCategoryName.trim()
    if (!clean) return
    if (allCategories.includes(clean)) {
      window.alert('Category already exists.')
      return
    }
    updateState((prev) => ({
      ...prev,
      categories: [...(prev.categories || []), clean],
    }))
    setGearForm((prev) => ({ ...prev, category: clean }))
    setBulkToCategory(clean)
    setNewCategoryName('')
  }

  const renameCategory = (categoryName) => {
    const renamed = window.prompt(`Rename category "${categoryName}" to:`, categoryName)
    if (!renamed) return
    const clean = renamed.trim()
    if (!clean || clean === categoryName) return
    if (allCategories.includes(clean)) {
      window.alert('A category with that name already exists.')
      return
    }
    updateState((prev) => ({
      ...prev,
      categories: (prev.categories || []).map((item) => (item === categoryName ? clean : item)),
      gear: prev.gear.map((item) => (
        item.category === categoryName ? { ...item, category: clean } : item
      )),
    }))
  }

  const deleteCategory = (categoryName) => {
    if (!confirmDelete(`Delete category "${categoryName}"? Items will be reassigned.`)) return
    const fallbackCategory = allCategories.find((item) => item !== categoryName) || 'Uncategorized'
    updateState((prev) => ({
      ...prev,
      categories: Array.from(new Set(
        (prev.categories || [])
          .filter((item) => item !== categoryName)
          .concat(fallbackCategory),
      )),
      gear: prev.gear.map((item) => (
        item.category === categoryName ? { ...item, category: fallbackCategory } : item
      )),
    }))
    setBulkFromCategory('all')
    setBulkToCategory(fallbackCategory)
    if (gearForm.category === categoryName) {
      setGearForm((prev) => ({ ...prev, category: fallbackCategory }))
    }
  }

  const bulkReplaceCategory = (event) => {
    event.preventDefault()
    if (bulkFromCategory === 'all' || !bulkFromCategory || !bulkToCategory) return
    if (bulkFromCategory === bulkToCategory) return
    updateState((prev) => ({
      ...prev,
      gear: prev.gear.map((item) => (
        item.category === bulkFromCategory ? { ...item, category: bulkToCategory } : item
      )),
    }))
  }

  const bulkClearCategory = (event) => {
    event.preventDefault()
    if (bulkFromCategory === 'all' || !bulkFromCategory) return
    updateState((prev) => ({
      ...prev,
      gear: prev.gear.map((item) => (
        item.category === bulkFromCategory ? { ...item, category: 'Other' } : item
      )),
    }))
  }

  const addPackTemplate = (event) => {
    event.preventDefault()
    if (!templateForm.label.trim() || Number(templateForm.maxWeight) <= 0) return
    const template = {
      id: crypto.randomUUID(),
      label: templateForm.label.trim(),
      maxWeight: Number(templateForm.maxWeight),
      color: templateForm.color || bagColorForLabel(templateForm.label),
    }
    updateState((prev) => ({
      ...prev,
      packTemplates: [...prev.packTemplates, template],
    }))
    setTemplateForm({ label: '', maxWeight: '35', color: '#2e7d42' })
  }

  const startEditPackTemplate = (pack) => {
    setEditingTemplateId(pack.id)
    setEditTemplateForm({
      label: pack.label,
      maxWeight: String(pack.maxWeight),
      color: pack.color || bagColorForLabel(pack.label),
    })
  }

  const cancelEditPackTemplate = () => {
    setEditingTemplateId(null)
    setEditTemplateForm({ label: '', maxWeight: '35', color: '#2e7d42' })
  }

  const saveEditPackTemplate = (event) => {
    event.preventDefault()
    if (!editingTemplateId) return
    if (!editTemplateForm.label.trim() || Number(editTemplateForm.maxWeight) <= 0) return
    updateState((prev) => {
      const previousTemplate = prev.packTemplates.find((pack) => pack.id === editingTemplateId)
      const oldLabel = previousTemplate?.label || ''
      const nextLabel = editTemplateForm.label.trim()
      const nextMaxWeight = Number(editTemplateForm.maxWeight)
      const nextColor = editTemplateForm.color || bagColorForLabel(nextLabel)
      return {
        ...prev,
        packTemplates: prev.packTemplates.map((pack) => (
          pack.id === editingTemplateId
            ? { ...pack, label: nextLabel, maxWeight: nextMaxWeight, color: nextColor }
            : pack
        )),
        trips: prev.trips.map((trip) => ({
          ...trip,
          bags: trip.bags.map((bag) => (
            bag.label === oldLabel
              ? { ...bag, label: nextLabel, maxWeight: nextMaxWeight, color: nextColor }
              : bag
          )),
        })),
      }
    })
    cancelEditPackTemplate()
  }

  const removePackTemplate = (templateId) => {
    if (!confirmDelete('Delete this default pack template?')) return
    updateState((prev) => ({
      ...prev,
      packTemplates: prev.packTemplates.filter((pack) => pack.id !== templateId),
    }))
  }

  const setTripBagInclusion = (template, include) => {
    if (!selectedTrip) return
    const templateLabel = template.label.trim()
    const existingBag = selectedTrip.bags.find((bag) => bag.label.trim().toLowerCase() === templateLabel.toLowerCase())
    if (include && existingBag) return
    if (!include && isMyPackLabel(templateLabel)) return
    if (!include && existingBag) {
      const hasAssignments = selectedTrip.assignments.some((assignment) => assignment.bagId === existingBag.id)
      if (hasAssignments) {
        window.alert('This bag has assigned gear. Move or remove those assignments first.')
        return
      }
    }
    updateState((prev) => ({
      ...prev,
      trips: prev.trips.map((trip) => {
        if (trip.id !== selectedTrip.id) return trip
        const tripExistingBag = trip.bags.find((bag) => bag.label.trim().toLowerCase() === templateLabel.toLowerCase())
        if (include && !tripExistingBag) {
          return {
            ...trip,
            bags: [...trip.bags, {
              id: crypto.randomUUID(),
              label: template.label,
              maxWeight: Number(template.maxWeight) || 35,
              color: template.color || bagColorForLabel(template.label),
            }],
          }
        }
        if (!include && tripExistingBag) {
          return { ...trip, bags: trip.bags.filter((bag) => bag.id !== tripExistingBag.id) }
        }
        return trip
      }),
    }))
  }

  const toggleBatchGear = (gearId) => {
    setBatchSelectedGearIds((prev) => (
      prev.includes(gearId)
        ? prev.filter((id) => id !== gearId)
        : [...prev, gearId]
    ))
    setBatchItemSettings((prev) => {
      if (prev[gearId]) {
        const next = { ...prev }
        delete next[gearId]
        return next
      }
      return { ...prev, [gearId]: { quantity: '1', essential: false } }
    })
  }

  const updateBatchItemQuantity = (gearId, quantity) => {
    setBatchItemSettings((prev) => ({
      ...prev,
      [gearId]: {
        quantity,
        essential: prev[gearId]?.essential || false,
      },
    }))
  }

  const updateBatchItemEssential = (gearId, essential) => {
    setBatchItemSettings((prev) => ({
      ...prev,
      [gearId]: {
        quantity: prev[gearId]?.quantity || '1',
        essential,
      },
    }))
  }

  const assignSelectedGearToBag = (event) => {
    event.preventDefault()
    if (!selectedTrip || !selectedAssignBagId) return
    if (batchSelectedGearIds.length === 0) {
      window.alert('Select at least one gear item first.')
      return
    }
    let addedCount = 0
    let addedUnits = 0
    let skippedCount = 0
    updateState((prev) => ({
      ...prev,
      trips: prev.trips.map((trip) => (
        trip.id === selectedTrip.id
          ? {
            ...trip,
            assignments: batchSelectedGearIds.reduce((assignments, gearId) => {
              const requestedQty = Math.max(1, Number(batchItemSettings[gearId]?.quantity || 1) || 1)
              const markEssential = Boolean(batchItemSettings[gearId]?.essential)
              const totalGearQty = prev.gear.find((gear) => gear.id === gearId)?.quantity || 0
              const checkedOutElsewhere = prev.trips
                .filter((otherTrip) => otherTrip.id !== trip.id)
                .flatMap((otherTrip) => otherTrip.assignments)
                .filter((assignment) => assignment.gearId === gearId && assignment.status === 'checked_out')
                .reduce((sum, assignment) => sum + assignment.quantity, 0)
              const totalAvailableForTrip = Math.max(totalGearQty - checkedOutElsewhere, 0)
              const assignedInTrip = assignments
                .filter((assignment) => assignment.gearId === gearId)
                .reduce((sum, assignment) => sum + assignment.quantity, 0)
              const remainingAvailable = Math.max(totalAvailableForTrip - assignedInTrip, 0)
              const qtyToAdd = Math.min(requestedQty, remainingAvailable)
              if (qtyToAdd <= 0) {
                skippedCount += 1
                return assignments
              }
              const existingInBagIndex = assignments.findIndex((assignment) => assignment.gearId === gearId && assignment.bagId === selectedAssignBagId)
              if (existingInBagIndex >= 0) {
                const next = [...assignments]
                next[existingInBagIndex] = {
                  ...next[existingInBagIndex],
                  quantity: next[existingInBagIndex].quantity + qtyToAdd,
                  essential: markEssential || next[existingInBagIndex].essential,
                }
                addedCount += 1
                addedUnits += qtyToAdd
                return next
              }
              addedCount += 1
              addedUnits += qtyToAdd
              return [...assignments, {
                id: crypto.randomUUID(),
                gearId,
                bagId: selectedAssignBagId,
                quantity: qtyToAdd,
                status: 'reserved',
                essential: markEssential,
                note: '',
              }]
            }, trip.assignments),
          }
          : trip
      )),
    }))
    setBatchSelectedGearIds([])
    setBatchItemSettings({})
    if (skippedCount > 0) {
      window.alert(`${addedCount} item(s) assigned (${addedUnits} total qty). ${skippedCount} skipped because there is no remaining available quantity.`)
    }
  }

  const updateAssignment = (assignmentId, updates) => {
    if (!selectedTrip) return
    updateState((prev) => ({
      ...prev,
      trips: prev.trips.map((trip) => (
        trip.id === selectedTrip.id
          ? {
            ...trip,
            assignments: trip.assignments.map((assignment) => (
              assignment.id === assignmentId ? { ...assignment, ...updates } : assignment
            )),
          }
          : trip
      )),
    }))
  }

  const isCheckedBackIn = (assignment) => CHECKED_IN_STATUSES.includes(assignment.status)

  const statusOptionsForAssignment = (assignment) => (
    isCheckedBackIn(assignment) ? CHECKED_IN_STATUSES : NOT_CHECKED_IN_STATUSES
  )

  const setCheckedBackIn = (assignment, checked) => {
    const nextStatus = checked
      ? 'returned'
      : (CHECKED_IN_STATUSES.includes(assignment.status) ? 'checked_out' : assignment.status)
    updateAssignment(assignment.id, { status: nextStatus })
  }

  const deleteAssignment = (assignmentId) => {
    if (!selectedTrip) return
    if (!confirmDelete('Remove this assigned item from the trip?')) return
    updateState((prev) => ({
      ...prev,
      trips: prev.trips.map((trip) => (
        trip.id === selectedTrip.id
          ? { ...trip, assignments: trip.assignments.filter((assignment) => assignment.id !== assignmentId) }
          : trip
      )),
    }))
  }

  const markAssignmentResolved = (tripId, assignmentId) => {
    const resolvedStamp = `Resolved ${new Date().toLocaleString()}`
    updateState((prev) => ({
      ...prev,
      trips: prev.trips.map((trip) => (
        trip.id !== tripId
          ? trip
          : {
            ...trip,
            assignments: trip.assignments.map((assignment) => {
              if (assignment.id !== assignmentId) return assignment
              const existingNote = assignment.note?.trim()
              return {
                ...assignment,
                status: 'returned',
                note: existingNote ? `${existingNote} | ${resolvedStamp}` : resolvedStamp,
              }
            }),
          }
      )),
    }))
  }

  const exportBackup = () => {
    const payload = {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      app: 'Gear Pro Web',
      data: appState,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `gear-pro-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const content = await file.text()
    try {
      const parsed = JSON.parse(content)
      const normalized = normalizeState(parsed?.data)
      saveState(normalized)
      setAppState(normalized)
      setSelectedTripId(normalized.trips[0]?.id || null)
      window.alert('Backup imported successfully.')
    } catch {
      window.alert('Could not read backup file. Please use a valid JSON backup.')
    } finally {
      event.target.value = ''
    }
  }

  const exportGearCsv = () => {
    const header = ['brand', 'name', 'category', 'weight', 'quantity', 'expiration_date', 'notes']
    const rows = appState.gear.map((item) => ([
      csvEscape(item.brand),
      csvEscape(item.name),
      csvEscape(item.category),
      csvEscape(item.weight),
      csvEscape(item.quantity),
      csvEscape(item.expirationDate || ''),
      csvEscape(item.notes || ''),
    ].join(',')))
    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `gear-pro-gear-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const downloadGearCsvTemplate = () => {
    const header = ['brand', 'name', 'category', 'weight', 'quantity', 'expiration_date', 'notes']
    const sample = ['Example Brand', 'Example Item', 'Clothing', '1.25', '1', '2026-12-31', 'Optional note']
    const csv = [header.join(','), sample.map((v) => csvEscape(v)).join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'gear-pro-gear-import-template.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importGearCsv = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const content = await file.text()
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
      if (lines.length < 2) {
        window.alert('CSV appears empty. Please use the template format.')
        return
      }

      const headerCells = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase())
      const idx = {
        brand: headerCells.indexOf('brand'),
        name: headerCells.indexOf('name'),
        category: headerCells.indexOf('category'),
        weight: headerCells.indexOf('weight'),
        quantity: headerCells.indexOf('quantity'),
        expirationDate: headerCells.indexOf('expiration_date'),
        expirationLegacy: headerCells.indexOf('expiration'),
        notes: headerCells.indexOf('notes'),
      }
      if (idx.brand < 0 || idx.name < 0 || idx.category < 0 || idx.weight < 0 || idx.quantity < 0) {
        window.alert('CSV is missing required columns. Use the template and keep header names.')
        return
      }

      const existingKeys = new Set(
        appState.gear.map((item) => `${item.brand}|${item.name}|${item.category}`.trim().toLowerCase()),
      )
      const rows = lines.slice(1)
      const toAdd = []
      let skippedDuplicates = 0
      let skippedInvalid = 0

      rows.forEach((line) => {
        const cells = parseCsvLine(line)
        const brand = (cells[idx.brand] || '').trim()
        const name = (cells[idx.name] || '').trim()
        const category = (cells[idx.category] || 'Other').trim() || 'Other'
        const weight = Number(cells[idx.weight] || 0)
        const quantity = Number(cells[idx.quantity] || 0)
        const expirationRaw = idx.expirationDate >= 0
          ? (cells[idx.expirationDate] || '').trim()
          : (idx.expirationLegacy >= 0 ? (cells[idx.expirationLegacy] || '').trim() : '')
        const expirationDate = normalizeExpirationDate(expirationRaw)
        const notes = idx.notes >= 0 ? (cells[idx.notes] || '').trim() : ''

        if (!brand || !name || weight <= 0 || quantity <= 0) {
          skippedInvalid += 1
          return
        }
        const key = `${brand}|${name}|${category}`.trim().toLowerCase()
        if (existingKeys.has(key)) {
          skippedDuplicates += 1
          return
        }
        existingKeys.add(key)
        toAdd.push({
          id: crypto.randomUUID(),
          brand,
          name,
          category,
          weight,
          quantity,
          expirationDate,
          notes,
        })
      })

      if (toAdd.length > 0) {
        updateState((prev) => ({ ...prev, gear: [...prev.gear, ...toAdd] }))
      }

      window.alert(`CSV import complete. Added: ${toAdd.length}, duplicates skipped: ${skippedDuplicates}, invalid rows skipped: ${skippedInvalid}.`)
    } catch {
      window.alert('Could not import CSV. Please verify the file format.')
    } finally {
      event.target.value = ''
    }
  }

  const needsFollowUpCount = actionList.length

  const tripEssentialsReady = (trip) => {
    const essentialItems = trip.assignments.filter((assignment) => assignment.essential)
    if (essentialItems.length === 0) return true
    return essentialItems.every((assignment) => ['checked_out', 'returned'].includes(assignment.status))
  }

  const bagWeight = (trip, bagId) => trip.assignments
    .filter((assignment) => assignment.bagId === bagId)
    .reduce((sum, assignment) => sum + ((gearById[assignment.gearId]?.weight || 0) * assignment.quantity), 0)

  const bagAssignments = (trip, bagId) => trip.assignments.filter((assignment) => assignment.bagId === bagId)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="hero-brand">
          <img src={`${import.meta.env.BASE_URL}gear-pro-logo.svg`} alt="Gear Pro logo" className="hero-logo-wide" />
          <div>
            <p className="type-body">Plan and track hunting, backpacking, and hiking gear from check-out to check-in.</p>
          </div>
        </div>
        <small className="type-caption">Last saved: {new Date(appState.lastUpdatedAt).toLocaleString()}</small>
      </header>

      <nav className="tabs">
        {TAB_ITEMS.map((item) => (
          <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && (
        <section className="stack tab-section">
          <div className={uiClasses.panelMuted}>
            <h2 className={uiClasses.sectionHeader}>How this app works</h2>
            <p><strong>1) Plan:</strong> add gear, create trip, assign gear to bags.</p>
            <p><strong>2) Depart:</strong> move items from Planned - Not Packed to Packed.</p>
            <p><strong>3) Return:</strong> mark Unpacked - Returned, Needs Repair, Consumed, or Lost and clear action list.</p>
          </div>

          <div className="card-grid">
            <article className="card stat">
              <h2>Gear Items</h2>
              <strong>{appState.gear.length}</strong>
            </article>
            <article className="card stat">
              <h2>Total Gear Weight</h2>
              <strong>{totalGearWeight.toFixed(2)} lbs</strong>
            </article>
            <article className="card stat">
              <h2>Trips</h2>
              <strong>{appState.trips.length}</strong>
            </article>
            <article className="card stat warning">
              <h2>Packed</h2>
              <strong>{Object.values(checkedOutByGear).reduce((sum, qty) => sum + qty, 0)}</strong>
            </article>
            <article className="card stat warning">
              <h2>Needs Follow-up</h2>
              <strong>{needsFollowUpCount}</strong>
            </article>
            <article className="card stat warning">
              <h2>Conflicts</h2>
              <strong>{conflictCount}</strong>
            </article>
          </div>

          <div className={uiClasses.listPanel}>
            <h2 className={uiClasses.sectionHeader}>Action List (Shopping / Fix)</h2>
            {groupedActionList.length === 0 ? <p>No follow-up items right now.</p> : groupedActionList.map(([category, items]) => (
              <div key={category} className="action-category-group">
                <h3>{category} <span className="pill">{items.length}</span></h3>
                {items.map((item) => (
                  <div key={item.id} className="list-item">
                    <div>
                      <strong>{item.action}: {item.gearLabel}</strong>
                      <p>{item.tripName} • {item.bagName} • Qty {item.quantity}</p>
                      <p>Status: <span className={`status-badge ${STATUS_CLASS[item.status]}`}>{STATUS_LABELS[item.status]}</span></p>
                      {item.note ? <p>Note: {item.note}</p> : null}
                    </div>
                    {item.isResolvable ? (
                      <button type="button" className="btn btn-secondary" onClick={() => markAssignmentResolved(item.tripId, item.id)}>Mark Resolved</button>
                    ) : (
                      <span className={`status-badge ${STATUS_CLASS.expired}`}>Expired</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'gear' && (
        <section className="stack gear-layout tab-section">
          <form id="add-gear-form" className="card form add-gear-panel control-group" onSubmit={addGear}>
            <h2 className="type-title section-header">Quick Add Gear</h2>
            <p className="muted">This is where you add a new gear item. Required fields are marked with *</p>

            <div className="field-grid two-col">
              <div className="field-block">
                <label>Brand *</label>
                <input value={gearForm.brand} onChange={(e) => setGearForm((p) => ({ ...p, brand: e.target.value }))} placeholder="KUIU, MSR, Sitka..." required />
              </div>
              <div className="field-block">
                <label>Item Name *</label>
                <input value={gearForm.name} onChange={(e) => setGearForm((p) => ({ ...p, name: e.target.value }))} placeholder="Super Down Ultra Jacket..." required />
              </div>
            </div>

            <div className="field-grid two-col">
              <div className="field-block">
                <label>Category</label>
                <select value={gearForm.category} onChange={(e) => setGearForm((p) => ({ ...p, category: e.target.value }))}>
                  {allCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="field-block">
                <label>Weight (lbs) *</label>
                <input type="number" min="0.01" step="0.01" value={gearForm.weight} onChange={(e) => setGearForm((p) => ({ ...p, weight: e.target.value }))} placeholder="0.00" required />
              </div>
              <div className="field-block">
                <label>Owned Quantity *</label>
                <input type="number" min="1" step="1" value={gearForm.quantity} onChange={(e) => setGearForm((p) => ({ ...p, quantity: e.target.value }))} placeholder="1" required />
              </div>
              <div className="field-block">
                <label>Expiration Date (optional)</label>
                <input type="date" value={gearForm.expirationDate} onChange={(e) => setGearForm((p) => ({ ...p, expirationDate: e.target.value }))} />
              </div>
            </div>

            <div className="field-block">
              <label>Notes</label>
              <textarea value={gearForm.notes} onChange={(e) => setGearForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Maintenance, fit, replacement notes (optional)" rows="3" />
            </div>

            <div className="form-toolbar">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setGearForm({ brand: '', name: '', category: allCategories[0] || 'Other', weight: '', quantity: '1', expirationDate: '', notes: '' })}
              >
                Clear
              </button>
              <button type="submit" className="btn btn-primary btn-large">Add Item To Library</button>
            </div>
          </form>

          <div className={uiClasses.listPanel}>
            <h2 className={uiClasses.sectionHeader}>Gear Library</h2>
            <div className="gear-data-tools">
              <button type="button" className="btn btn-secondary" onClick={downloadGearCsvTemplate}>Download CSV Template</button>
              <button type="button" className="btn btn-primary" onClick={exportGearCsv}>Export Gear CSV</button>
              <label className="upload">Import Gear CSV<input type="file" accept=".csv,text/csv" onChange={importGearCsv} /></label>
            </div>
            <div className="row">
              <input value={gearSearch} onChange={(e) => setGearSearch(e.target.value)} placeholder="Search gear..." />
              <select value={gearFilterCategory} onChange={(e) => setGearFilterCategory(e.target.value)}>
                <option value="all">All Categories</option>
                {allCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            {filteredGear.length === 0 ? <p>No gear matches your filter.</p> : filteredGear.map((item) => (
              <div className="list-item" key={item.id}>
                <div>
                  <strong>{item.brand} {item.name}</strong>
                  <p>
                    <span className="pill">{item.category}</span>
                    {' '}
                    {item.weight}
                    {' '}
                    lbs • Owned
                    {' '}
                    {item.quantity}
                    {' '}
                    • Checked out
                    {' '}
                    {checkedOutByGear[item.id] || 0}
                    {item.expirationDate ? ` • Expires ${item.expirationDate}` : ''}
                  </p>
                  {isExpiredDate(item.expirationDate) ? (
                    <p><span className={`status-badge ${STATUS_CLASS.expired}`}>{STATUS_LABELS.expired}</span></p>
                  ) : null}
                  {(gearStatusById[item.id] || []).length > 0 ? (
                    <p>
                      {(gearStatusById[item.id] || []).map((status) => (
                        <span key={status} className={`status-badge ${STATUS_CLASS[status]}`}>{STATUS_LABELS[status]}</span>
                      ))}
                    </p>
                  ) : null}
                  {item.notes ? <p>{item.notes}</p> : null}
                </div>
                <button type="button" className="btn btn-danger" onClick={() => removeGear(item.id)}>Delete</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'trips' && (
        <section className="stack tab-section">
          <div className="split">
            <form className={uiClasses.formPanel} onSubmit={addTrip}>
              <h2 className={uiClasses.sectionHeader}>Add Trip</h2>
              <input value={tripForm.name} onChange={(e) => setTripForm((p) => ({ ...p, name: e.target.value }))} placeholder="Trip name" required />
              <input value={tripForm.location} onChange={(e) => setTripForm((p) => ({ ...p, location: e.target.value }))} placeholder="Location" />
              <div className="row">
                <label>
                  Start
                  <input type="date" value={tripForm.startDate} onChange={(e) => setTripForm((p) => ({ ...p, startDate: e.target.value }))} required />
                </label>
                <label>
                  End
                  <input type="date" value={tripForm.endDate} onChange={(e) => setTripForm((p) => ({ ...p, endDate: e.target.value }))} required />
                </label>
              </div>
              <div className="trip-template-picker">
                <strong>Bags for this trip</strong>
                <div className="trip-template-list">
                  {appState.packTemplates.map((template) => (
                    <label key={template.id} className="trip-template-item">
                      <input
                        type="checkbox"
                        checked={tripTemplateSelections.includes(template.id)}
                        disabled={isMyPackLabel(template.label)}
                        onChange={(e) => {
                          setTripTemplateSelections((prev) => (
                            e.target.checked
                              ? Array.from(new Set([...prev, template.id]))
                              : prev.filter((id) => id !== template.id)
                          ))
                        }}
                      />
                      <span className="bag-name-with-color">
                        <span className="bag-color-dot" style={{ backgroundColor: template.color || bagColorForLabel(template.label) }} />
                        {template.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Save Trip</button>
            </form>

            <div className={uiClasses.listPanel}>
              <h2 className={uiClasses.sectionHeader}>Trip List</h2>
              {appState.trips.length === 0 ? <p>No trips yet.</p> : appState.trips.map((trip) => (
                <div className={`list-item ${selectedTripId === trip.id ? 'selected' : ''}`} key={trip.id}>
                  <div>
                    <strong>{trip.name}</strong>
                    <p>{trip.location || 'No location'} • {trip.startDate} to {trip.endDate}</p>
                    <p>Essentials: {tripEssentialsReady(trip) ? 'Ready' : 'Missing check-in'}</p>
                  </div>
                  <div className="button-group">
                    <button type="button" className="btn btn-secondary" onClick={() => setSelectedTripId(trip.id)}>Open</button>
                    <button type="button" className="btn btn-danger" onClick={() => removeTrip(trip.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedTrip && (
            <div className={`${uiClasses.panelPrimary} form`}>
              <h2 className={uiClasses.sectionHeader}>{selectedTrip.name} - Bags, Packing, and Check-in/out</h2>
              <p className="muted">Follow this order: see what is packed {'->'} assign gear {'->'} update statuses.</p>

              <div className="pack-view-head">
                <h3>What&apos;s In The Packs (Top View)</h3>
                <div className="pack-view-controls">
                  <button type="button" className={`btn ${packPercentMode === 'capacity' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPackPercentMode('capacity')}>% of bag max</button>
                  <button type="button" className={`btn ${packPercentMode === 'load' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPackPercentMode('load')}>% of current load</button>
                </div>
              </div>
              <div className="pack-summary-grid">
                {selectedTrip.bags.map((bag) => {
                  const assigned = bagAssignments(selectedTrip, bag.id)
                  const bagTotalWeight = bagWeight(selectedTrip, bag.id)
                  const categoryTotals = assigned.reduce((acc, assignment) => {
                    const gear = gearById[assignment.gearId]
                    const category = gear?.category || 'Other'
                    const weight = (gear?.weight || 0) * assignment.quantity
                    acc[category] = (acc[category] || 0) + weight
                    return acc
                  }, {})
                  const sortedCategoryTotals = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])
                  return (
                    <article key={bag.id} className="pack-summary-card">
                      <div className="pack-summary-head">
                        <strong>{bag.label}</strong>
                        <span>{bagWeight(selectedTrip, bag.id).toFixed(2)} / {bag.maxWeight} lbs</span>
                      </div>
                      {sortedCategoryTotals.length === 0 ? <p className="muted">No categories in this pack yet.</p> : (
                        <div className="pack-category-list">
                          {sortedCategoryTotals.map(([category, totalWeight]) => {
                            const denominator = packPercentMode === 'capacity'
                              ? Math.max(bag.maxWeight || 0, 1)
                              : Math.max(bagTotalWeight || 0, 1)
                            const pctOfBag = (totalWeight / denominator) * 100
                            return (
                              <p key={category}>
                                <strong>{category}</strong>
                                <span>{totalWeight.toFixed(2)} lbs • {pctOfBag.toFixed(0)}%</span>
                              </p>
                            )
                          })}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>

              <div>
                <h3>Step 2: Pick Bag, Then Add Gear Fast</h3>
                <div className="bag-select-row">
                  <select
                    value={selectedAssignBagId}
                    onChange={(e) => {
                      setSelectedAssignBagId(e.target.value)
                      setBatchSelectedGearIds([])
                      setBatchItemSettings({})
                    }}
                  >
                    {selectedTrip.bags.map((bag) => (
                      <option key={bag.id} value={bag.id}>{bag.label} ({bagWeight(selectedTrip, bag.id).toFixed(1)} / {bag.maxWeight} lbs)</option>
                    ))}
                  </select>
                  <div className="button-group">
                    <button type="button" className="btn btn-ghost" onClick={() => setShowTripBagEditor((prev) => !prev)}>
                      {showTripBagEditor ? 'Done' : 'Edit Trip Bags'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setTab('manage')}>Manage Bags</button>
                  </div>
                </div>
                {showTripBagEditor && (
                  <div className="trip-bag-toggle-list">
                    {appState.packTemplates.map((template) => {
                      const included = selectedTrip.bags.some((bag) => bag.label.trim().toLowerCase() === template.label.trim().toLowerCase())
                      return (
                        <label key={template.id} className="trip-bag-toggle-item">
                          <input
                            type="checkbox"
                            checked={included}
                            disabled={isMyPackLabel(template.label)}
                            onChange={(e) => setTripBagInclusion(template, e.target.checked)}
                          />
                          <span className="bag-name-with-color">
                            <span className="bag-color-dot" style={{ backgroundColor: template.color || bagColorForLabel(template.label) }} />
                            {template.label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
                <p className="muted assignment-filter-hint">{showTripBagEditor ? 'Add/remove bags for this trip here (My Pack is always included).' : 'Tip: click Edit Trip Bags if this trip needs different bags.'}</p>
                <form className="control-group" onSubmit={assignSelectedGearToBag}>
                  <div className="assignment-filter-row">
                    <input
                      value={assignmentGearSearch}
                      onChange={(e) => setAssignmentGearSearch(e.target.value)}
                      placeholder="Search gear by brand or name"
                    />
                    <select value={assignmentGearCategory} onChange={(e) => setAssignmentGearCategory(e.target.value)}>
                      <option value="all">All Categories</option>
                      {allCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <p className="muted assignment-filter-hint">
                    {selectedAssignBagId
                      ? `Selected bag: ${selectedTrip.bags.find((bag) => bag.id === selectedAssignBagId)?.label || 'None'} • ${batchSelectedGearIds.length} selected`
                      : 'Pick a bag first'}
                  </p>
                  <div className="gear-picker-list">
                    {assignmentGearGroups.length === 0 ? <p className="muted">No gear matches this filter.</p> : assignmentGearGroups.map(([category, items]) => (
                      <div key={category} className="gear-picker-group">
                        <h4>{category} <span className="pill">{items.length}</span></h4>
                        {items.map((item) => (
                          <label key={item.id} className={`gear-picker-item ${item.remainingToAssign <= 0 ? 'disabled' : ''}`}>
                            <input
                              type="checkbox"
                              disabled={!selectedAssignBagId || item.remainingToAssign <= 0}
                              checked={batchSelectedGearIds.includes(item.id)}
                              onChange={() => toggleBatchGear(item.id)}
                            />
                            <span className="gear-picker-label">
                              <strong>{item.brand} {item.name}</strong>
                              <small>Remaining: {item.remainingToAssign} {item.inSelectedBag > 0 ? `• In bag: ${item.inSelectedBag}` : ''}</small>
                              {selectedBagAssignmentsByGear[item.id] ? (
                                <small>
                                  Status:
                                  {' '}
                                  <span className={`status-badge ${STATUS_CLASS[selectedBagAssignmentsByGear[item.id].status]}`}>
                                    {STATUS_LABELS[selectedBagAssignmentsByGear[item.id].status]}
                                  </span>
                                </small>
                              ) : null}
                              {isExpiredDate(item.expirationDate) ? (
                                <small>
                                  <span className={`status-badge ${STATUS_CLASS.expired}`}>{STATUS_LABELS.expired}</span>
                                </small>
                              ) : null}
                            </span>
                            {batchSelectedGearIds.includes(item.id) && (
                              <span className="gear-picker-controls">
                                <label>
                                  Qty
                                  <input
                                    type="number"
                                    min="1"
                                    max={Math.max(item.remainingToAssign, 1)}
                                    value={batchItemSettings[item.id]?.quantity || '1'}
                                    onChange={(e) => updateBatchItemQuantity(item.id, e.target.value)}
                                  />
                                </label>
                                <label className="inline-check">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(batchItemSettings[item.id]?.essential)}
                                    onChange={(e) => updateBatchItemEssential(item.id, e.target.checked)}
                                  />
                                  Essential
                                </label>
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="assignment-submit-row">
                    <button type="submit" className="btn btn-primary" disabled={!selectedAssignBagId || batchSelectedGearIds.length === 0}>
                      Add {batchSelectedGearIds.length} Selected Item{batchSelectedGearIds.length === 1 ? '' : 's'} To Bag
                    </button>
                  </div>
                </form>
              </div>

              <section className="page-break-block">
                <h3 className="section-header">Packing List</h3>
                <div className="packing-filter-row">
                  <label>
                    Bag view
                    <select value={packingListBagFilter} onChange={(e) => setPackingListBagFilter(e.target.value)}>
                      <option value="all">All Bags (Together)</option>
                      {selectedTrip.bags.map((bag) => (
                        <option key={bag.id} value={bag.id}>{bag.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="status-legend">
                  {STATUS_OPTIONS.map((status) => (
                    <span key={status} className={`status-badge ${STATUS_CLASS[status]}`}>{STATUS_LABELS[status]}</span>
                  ))}
                </div>

                {assignmentGroups.length === 0 ? <p>No assignments yet.</p> : assignmentGroups.map(([category, assignments]) => (
                  <section className="assignment-category-block" key={category}>
                    <h4>{category} <span className="pill">{assignments.length}</span></h4>
                    <div className="assignment-sheet">
                      <div className="sheet-head">Item</div>
                      <div className="sheet-head">Bag</div>
                      <div className="sheet-head">Qty</div>
                      <div className="sheet-head">Status</div>
                      <div className="sheet-head">Check In</div>
                      <div className="sheet-head">Essential</div>
                      <div className="sheet-head">Action</div>
                      {assignments.map((assignment) => (
                        <div className="sheet-row" key={assignment.id}>
                          <div className={`sheet-item status-accent-${assignment.status}`}>{gearById[assignment.gearId]?.brand} {gearById[assignment.gearId]?.name}</div>
                          <div>
                            <span className="bag-cell-pill">
                              <span className="bag-color-dot" style={{ backgroundColor: selectedTrip.bags.find((bag) => bag.id === assignment.bagId)?.color || bagColorForLabel(selectedTrip.bags.find((bag) => bag.id === assignment.bagId)?.label || 'Unknown Bag') }} />
                              {selectedTrip.bags.find((bag) => bag.id === assignment.bagId)?.label || 'Unknown Bag'}
                            </span>
                          </div>
                          <div>
                            <input
                              type="number"
                              min="1"
                              value={assignment.quantity}
                              onChange={(e) => updateAssignment(assignment.id, { quantity: Number(e.target.value) || 1 })}
                            />
                          </div>
                          <div>
                            <select value={assignment.status} onChange={(e) => updateAssignment(assignment.id, { status: e.target.value })}>
                              {statusOptionsForAssignment(assignment).map((status) => (
                                <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                              ))}
                            </select>
                            <span className={`status-badge ${STATUS_CLASS[assignment.status]}`}>{STATUS_LABELS[assignment.status]}</span>
                            {isExpiredDate(gearById[assignment.gearId]?.expirationDate) ? (
                              <span className={`status-badge ${STATUS_CLASS.expired}`}>{STATUS_LABELS.expired}</span>
                            ) : null}
                          </div>
                          <div>
                            <input
                              type="checkbox"
                              checked={isCheckedBackIn(assignment)}
                              onChange={(e) => setCheckedBackIn(assignment, e.target.checked)}
                            />
                          </div>
                          <div>
                            <input type="checkbox" checked={assignment.essential} onChange={(e) => updateAssignment(assignment.id, { essential: e.target.checked })} />
                          </div>
                          <div>
                            <button type="button" className="btn btn-danger" onClick={() => deleteAssignment(assignment.id)}>Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </section>

              <section className="page-break-block">
                <h3 className="section-header">Trip Shopping / Fix List</h3>
                <div className="plain-list">
                  {tripActionGroups.length === 0
                    ? <p>No post-trip action items for this trip yet.</p>
                    : tripActionGroups.map(([category, assignments]) => (
                      <div key={category} className="action-category-group">
                        <h4>{category} <span className="pill">{assignments.length}</span></h4>
                        {assignments.map((item) => {
                          return (
                            <div key={item.id} className="list-item">
                              <div>
                                <strong>{item.action}: {item.gearLabel}</strong>
                                <p>Qty {item.quantity}</p>
                                <p>Status: <span className={`status-badge ${STATUS_CLASS[item.status]}`}>{STATUS_LABELS[item.status]}</span></p>
                                {item.note ? <p>Note: {item.note}</p> : null}
                              </div>
                              {item.isResolvable ? (
                                <button type="button" className="btn btn-secondary" onClick={() => markAssignmentResolved(selectedTrip.id, item.assignmentId)}>Mark Resolved</button>
                              ) : (
                                <span className={`status-badge ${STATUS_CLASS.expired}`}>Expired</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                </div>
              </section>
            </div>
          )}
        </section>
      )}

      {tab === 'manage' && (
        <section className="stack tab-section">
          <div className={uiClasses.panelMuted}>
            <h2 className={uiClasses.sectionHeader}>Manage Categories and Packs</h2>
            <p>Keep your setup clean. Edit categories in bulk and configure default packs for future trips.</p>
          </div>

          <div className="split">
            <div className={`${uiClasses.panelPrimary} form`}>
              <h2 className={uiClasses.sectionHeader}>Category Manager</h2>
              <form className="control-group" onSubmit={addCategory}>
                <label>Add category</label>
                <div className="row">
                  <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Example: Optics" />
                  <button type="submit" className="btn btn-primary">Add</button>
                </div>
              </form>

              <form className="control-group" onSubmit={bulkReplaceCategory}>
                <label>Bulk replace category</label>
                <div className="row">
                  <select value={bulkFromCategory} onChange={(e) => setBulkFromCategory(e.target.value)}>
                    <option value="all">From category</option>
                    {allCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <select value={bulkToCategory} onChange={(e) => setBulkToCategory(e.target.value)}>
                    {allCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-secondary">Replace Category on All Items</button>
              </form>

              <form className="control-group" onSubmit={bulkClearCategory}>
                <label>Bulk remove category assignment</label>
                <div className="row">
                  <select value={bulkFromCategory} onChange={(e) => setBulkFromCategory(e.target.value)}>
                    <option value="all">Select category</option>
                    {allCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-danger">Move to Other</button>
                </div>
              </form>

              <div className="plain-list">
                <strong>Current categories</strong>
                {allCategories.map((category) => (
                  <div key={category} className="list-item">
                    <div>
                      <strong>{category}</strong>
                      <p>{appState.gear.filter((item) => item.category === category).length} items</p>
                    </div>
                    <div className="button-group">
                      <button type="button" className="btn btn-secondary" onClick={() => renameCategory(category)}>Edit</button>
                      <button type="button" className="btn btn-danger" onClick={() => deleteCategory(category)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${uiClasses.panelPrimary} form`}>
              <h2 className={uiClasses.sectionHeader}>Default Pack Templates</h2>
              <p className="muted">These packs are auto-created whenever you make a new trip.</p>
              <form className="control-group" onSubmit={addPackTemplate}>
                <div className="row">
                  <input value={templateForm.label} onChange={(e) => setTemplateForm((prev) => ({ ...prev, label: e.target.value }))} placeholder="Pack name (Kid Pack)" />
                  <input type="number" min="1" value={templateForm.maxWeight} onChange={(e) => setTemplateForm((prev) => ({ ...prev, maxWeight: e.target.value }))} placeholder="Max lbs" />
                </div>
                <div className="template-color-row">
                  <label>Color</label>
                  <input
                    className="template-color-input"
                    type="color"
                    value={templateForm.color}
                    onChange={(e) => setTemplateForm((prev) => ({ ...prev, color: e.target.value }))}
                  />
                </div>
                <button type="submit" className="btn btn-primary">Add Pack Template</button>
              </form>

              <div className="plain-list">
                {appState.packTemplates.length === 0
                  ? <p>No templates set. New trips will use Main Pack.</p>
                  : appState.packTemplates.map((pack) => (
                    <div key={pack.id} className="list-item">
                      {editingTemplateId === pack.id ? (
                        <form className="edit-template-row" onSubmit={saveEditPackTemplate}>
                          <input value={editTemplateForm.label} onChange={(e) => setEditTemplateForm((prev) => ({ ...prev, label: e.target.value }))} required />
                          <input type="number" min="1" value={editTemplateForm.maxWeight} onChange={(e) => setEditTemplateForm((prev) => ({ ...prev, maxWeight: e.target.value }))} required />
                          <input className="template-color-input" type="color" value={editTemplateForm.color} onChange={(e) => setEditTemplateForm((prev) => ({ ...prev, color: e.target.value }))} />
                          <button type="submit" className="btn btn-secondary">Save</button>
                          <button type="button" className="btn btn-ghost" onClick={cancelEditPackTemplate}>Cancel</button>
                        </form>
                      ) : (
                        <>
                          <div>
                            <strong className="bag-name-with-color">
                              <span className="bag-color-dot" style={{ backgroundColor: pack.color || bagColorForLabel(pack.label) }} />
                              {pack.label}
                            </strong>
                            <p>{pack.maxWeight} lbs max</p>
                          </div>
                          <div className="button-group">
                            <button type="button" className="btn btn-secondary" onClick={() => startEditPackTemplate(pack)}>Edit</button>
                            <button type="button" className="btn btn-danger" onClick={() => removePackTemplate(pack.id)}>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === 'backup' && (
        <section className={`${uiClasses.formPanel} tab-section`}>
          <h2 className={uiClasses.sectionHeader}>Backup and Restore</h2>
          <p className="muted">Data stays on this device. Use JSON export/import for backup and restore.</p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={exportBackup}>Export Backup JSON</button>
            <label className="upload">
              Import Backup JSON
              <input type="file" accept="application/json" onChange={importBackup} />
            </label>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
