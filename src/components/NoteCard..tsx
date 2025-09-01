'use client'

import { useState } from 'react'
import { Edit, Trash2, Calendar } from 'lucide-react'
import { Note } from '@/types'

interface NoteCardProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
}

export default function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) return
    
    setIsDeleting(true)
    await onDelete(note.id)
    setIsDeleting(false)
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateContent = (content: string, maxLength: number = 120) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900 truncate flex-1 mr-2 text-lg">
          {note.title}
        </h3>
        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(note)}
            className="text-gray-400 hover:text-indigo-600 p-1 rounded transition-colors"
            title="Edit note"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors disabled:opacity-50"
            title="Delete note"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <p className="text-gray-600 text-sm leading-relaxed mb-4 min-h-[60px]">
        {truncateContent(note.content)}
      </p>
      
      <div className="flex items-center text-xs text-gray-400">
        <Calendar className="h-3 w-3 mr-1" />
        <span>Updated {formatDate(note.updatedAt)}</span>
      </div>
    </div>
  )
}