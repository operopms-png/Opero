import type { RecordTabConfig } from '@/components/pm/RecordTab'

// Hotels list tabs (NOVOURQ own company only). They reuse RecordTab; reservations use the room as the parent.
const money = (sym: string, n: any) => (n == null || n === '' ? '—' : `${sym}${Number(n).toLocaleString()}`)
const NOPARENT = { table: '', cols: '', label: 'room' }
const clean = (s: string) => s === 'Clean' || s === 'Inspected'

export const HOTEL_ROOMS: RecordTabConfig = {
  table: 'hotel_rooms', noun: 'room', empty: 'No rooms yet', orderBy: 'room_number', ascending: true, parent: NOPARENT,
  defaults: { status: 'Available', housekeeping: 'Clean' },
  fields: [
    { key: 'room_number', label: 'Room number', required: true, half: true },
    { key: 'room_type', label: 'Room type', type: 'select', options: ['Single', 'Double', 'Twin', 'Triple', 'Family', 'Suite', 'Accessible', 'Other'], required: true, half: true },
    { key: 'floor', label: 'Floor', half: true },
    { key: 'beds', label: 'Beds', half: true },
    { key: 'max_guests', label: 'Maximum guests', type: 'number', half: true },
    { key: 'rate_per_night', label: 'Rate per night', type: 'number', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Out of order'], required: true, half: true },
    { key: 'housekeeping', label: 'Housekeeping', type: 'select', options: ['Clean', 'Dirty', 'Cleaning', 'Inspected'], required: true, half: true },
    { key: 'features', label: 'Features (view, balcony, connecting door…)' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Room', width: '90px', render: r => <b>{r.room_number}</b> },
    { label: 'Type', width: '1fr', render: r => r.room_type ?? '—' },
    { label: 'Floor', width: '70px', render: r => r.floor ?? '—' },
    { label: 'Guests', width: '70px', render: r => r.max_guests ?? '—' },
    { label: 'Rate / night', width: '110px', render: (r, c) => money(c.sym(r), r.rate_per_night) },
    { label: 'Status', width: '110px', render: r => <span style={{ color: r.status === 'Out of order' ? '#B42318' : '#344054', fontWeight: r.status === 'Out of order' ? 600 : 400 }}>{r.status}</span> },
    { label: 'Housekeeping', width: '120px', render: r => <span style={{ color: clean(r.housekeeping) ? '#027A48' : '#B54708', fontWeight: 600 }}>{r.housekeeping}</span> },
  ],
  actions: [{ label: 'Mark clean', show: r => !clean(r.housekeeping), patch: () => ({ housekeeping: 'Clean' }) }],
  summary: rows => [
    { label: 'Rooms', value: String(rows.length) },
    { label: 'Out of order', value: String(rows.filter(r => r.status === 'Out of order').length), tone: rows.some(r => r.status === 'Out of order') ? 'warn' : undefined },
    { label: 'Need cleaning', value: String(rows.filter(r => !clean(r.housekeeping)).length), tone: rows.some(r => !clean(r.housekeeping)) ? 'warn' : 'ok' },
  ],
}

export const HOTEL_RESERVATIONS: RecordTabConfig = {
  table: 'hotel_reservations', noun: 'reservation', empty: 'No reservations yet', orderBy: 'check_in', ascending: false,
  parent: { table: 'hotel_rooms', cols: 'name', label: 'room', all: 'No room yet' },
  defaults: { status: 'Confirmed' },
  fields: [
    { key: 'guest_name', label: 'Guest name', required: true, half: true },
    { key: 'room_id', label: 'Room', type: 'property', half: true },
    { key: 'check_in', label: 'Check-in', type: 'date', required: true, half: true },
    { key: 'check_out', label: 'Check-out', type: 'date', required: true, half: true },
    { key: 'adults', label: 'Guests', type: 'number', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Confirmed', 'Pending', 'Checked in', 'Checked out', 'Cancelled', 'No-show'], required: true, half: true },
    { key: 'guest_phone', label: 'Phone', half: true },
    { key: 'guest_email', label: 'Email', half: true },
    { key: 'source', label: 'Booked through', type: 'select', options: ['Direct', 'Phone', 'Walk-in', 'Website', 'Booking.com', 'Expedia', 'Agoda', 'Travel agent', 'Corporate', 'Other'], half: true },
    { key: 'rate_per_night', label: 'Rate per night', type: 'number', half: true },
    { key: 'total', label: 'Total', type: 'number', half: true },
    { key: 'paid', label: 'Paid so far', type: 'number', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Guest', width: '1.2fr', render: r => <b>{r.guest_name}</b> },
    { label: 'Room', width: '100px', render: r => r.hotel_rooms?.name?.replace('Room ', '') ?? '—' },
    { label: 'Stay', width: '190px', render: r => `${r.check_in} to ${r.check_out}` },
    { label: 'Status', width: '110px', render: r => r.status },
    { label: 'Balance', width: '110px', render: (r, c) => { const b = Number(r.total || 0) - Number(r.paid || 0); return r.total == null ? '—' : <span style={{ color: b > 0 && r.status !== 'Cancelled' ? '#B54708' : '#344054', fontWeight: b > 0 ? 600 : 400 }}>{money(c.sym(r), b)}</span> } },
  ],
  actions: [
    { label: 'Check in', show: r => r.status === 'Confirmed', patch: () => ({ status: 'Checked in' }) },
    { label: 'Check out', show: r => r.status === 'Checked in', patch: () => ({ status: 'Checked out' }) },
  ],
  summary: (rows, today) => [
    { label: 'Arriving today', value: String(rows.filter(r => r.check_in === today && ['Confirmed', 'Pending'].includes(r.status)).length) },
    { label: 'In house', value: String(rows.filter(r => r.status === 'Checked in').length), tone: 'ok' },
    { label: 'Leaving today', value: String(rows.filter(r => r.check_out === today && r.status === 'Checked in').length) },
  ],
}

export const HOTEL_GUESTS: RecordTabConfig = {
  table: 'hotel_guests', noun: 'guest', empty: 'No guests yet', orderBy: 'created_at', ascending: false, parent: NOPARENT,
  defaults: { guest_type: 'Standard' },
  fields: [
    { key: 'name', label: 'Name', required: true, half: true },
    { key: 'guest_type', label: 'Guest type', type: 'select', options: ['Standard', 'VIP', 'Repeat', 'Corporate', 'Blacklisted'], required: true, half: true },
    { key: 'email', label: 'Email', half: true },
    { key: 'phone', label: 'Phone', half: true },
    { key: 'country', label: 'Country', half: true },
    { key: 'preferences', label: 'Preferences (pillows, floor, diet…)', type: 'textarea' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Guest', width: '1.2fr', render: r => <b>{r.name}</b> },
    { label: 'Type', width: '110px', render: r => <span style={{ fontWeight: r.guest_type === 'VIP' ? 700 : 400, color: r.guest_type === 'VIP' ? '#6B46C1' : '#344054' }}>{r.guest_type}</span> },
    { label: 'Phone', width: '140px', render: r => r.phone ?? '—' },
    { label: 'Email', width: '1fr', render: r => r.email ?? '—' },
    { label: 'Country', width: '110px', render: r => r.country ?? '—' },
  ],
  summary: rows => [
    { label: 'Guests', value: String(rows.length) },
    { label: 'VIP', value: String(rows.filter(r => r.guest_type === 'VIP').length) },
  ],
}
