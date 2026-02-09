'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { DiveInsert } from '@/types/domain'

interface DiveMetadataFormProps {
  userId: string
  onSubmit: (dive: DiveInsert) => Promise<void>
  loading?: boolean
}

export function DiveMetadataForm({ userId, onSubmit, loading }: DiveMetadataFormProps) {
  const [title, setTitle] = useState('')
  const [diveDate, setDiveDate] = useState(new Date().toISOString().split('T')[0])
  const [locationName, setLocationName] = useState('')
  const [maxDepth, setMaxDepth] = useState('')
  const [duration, setDuration] = useState('')
  const [waterTemp, setWaterTemp] = useState('')
  const [visibility, setVisibility] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      user_id: userId,
      title: title || `Dive on ${diveDate}`,
      dive_date: diveDate,
      location_name: locationName || null,
      max_depth: maxDepth ? parseFloat(maxDepth) : null,
      duration: duration ? parseInt(duration) * 60 : null,
      water_temp: waterTemp ? parseFloat(waterTemp) : null,
      visibility: visibility ? parseFloat(visibility) : null,
      notes: notes || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Dive title</Label>
          <Input
            id="title"
            placeholder="Morning reef dive"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={diveDate}
            onChange={(e) => setDiveDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          placeholder="Blue Corner, Palau"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="depth">Max depth (m)</Label>
          <Input
            id="depth"
            type="number"
            step="0.1"
            placeholder="28"
            value={maxDepth}
            onChange={(e) => setMaxDepth(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (min)</Label>
          <Input
            id="duration"
            type="number"
            placeholder="45"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="temp">Water temp (&deg;C)</Label>
          <Input
            id="temp"
            type="number"
            step="0.1"
            placeholder="27"
            value={waterTemp}
            onChange={(e) => setWaterTemp(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="visibility">Visibility (m)</Label>
          <Input
            id="visibility"
            type="number"
            step="0.1"
            placeholder="30"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Strong current at the beginning, great vis near the wall..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Creating dive...' : 'Create dive & upload videos'}
      </Button>
    </form>
  )
}
