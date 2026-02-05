'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function AttendancePage() {
  const [user, setUser] = useState(null)
  const [course, setCourse] = useState(null)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [notes, setNotes] = useState({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId

  useEffect(() => {
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'teacher') {
        router.push('/login')
        return
      }

      setUser(profile)
      await loadCourseData()
      setLoading(false)
    }

    initialize()
  }, [router, courseId])

  useEffect(() => {
    if (!loading && students.length > 0) {
      loadExistingAttendance()
    }
  }, [selectedDate, students, loading])

  const loadCourseData = async () => {
    // Load course details
    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    setCourse(courseData)

    // Load enrolled students
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        student_id,
        profiles!enrollments_student_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('course_id', courseId);
    console.log(enrollments);
    const studentList = enrollments?.map(e => e.profiles).filter(Boolean) || []
    setStudents(studentList)
  }

  const loadExistingAttendance = async () => {
    const { data: existingRecords } = await supabase
      .from('attendance')
      .select('*')
      .eq('course_id', courseId)
      .eq('date', selectedDate)

    const attendanceMap = {}
    const notesMap = {}

    existingRecords?.forEach(record => {
      attendanceMap[record.student_id] = record.status
      notesMap[record.student_id] = record.notes || ''
    })

    setAttendance(attendanceMap)
    setNotes(notesMap)
  }

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status
    }))
  }

  const handleNoteChange = (studentId, note) => {
    setNotes(prev => ({
      ...prev,
      [studentId]: note
    }))
  }

  const handleSaveAttendance = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      // Delete existing attendance records for this date and course
      await supabase
        .from('attendance')
        .delete()
        .eq('course_id', courseId)
        .eq('date', selectedDate)

      // Prepare new attendance records
      const records = Object.entries(attendance)
        .filter(([_, status]) => status !== null)
        .map(([studentId, status]) => ({
          course_id: courseId,
          student_id: studentId,
          date: selectedDate,
          status: status,
          notes: notes[studentId] || null
        }))

      if (records.length > 0) {
        const { error } = await supabase
          .from('attendance')
          .insert(records)

        if (error) throw error
      }

      setMessage({ type: 'success', text: 'Attendance saved successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save attendance: ' + error.message })
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-600 opacity-60 hover:bg-green-600 hover:opacity-100'
      case 'absent': return 'bg-red-600 opacity-60 hover:bg-red-600 hover:opacity-100'
      // case 'late': return 'bg-yellow-600 hover:bg-yellow-700'
      // case 'excused': return 'bg-gray-600 hover:bg-gray-700'
      default: return 'bg-gray-300 hover:bg-gray-400'
    }
  }

  const getActiveStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-700 ring-2 ring-green-500'
      case 'absent': return 'bg-red-700 ring-2 ring-red-500'
      // case 'late': return 'bg-yellow-700 ring-2 ring-yellow-500'
      // case 'excused': return 'bg-gray-700 ring-2 ring-gray-500'
      default: return 'bg-gray-300 hover:bg-gray-400'
    }
  }

  const getMarkedCount = () => {
    return Object.values(attendance).filter(status => status !== null).length
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/teacher"
            className="text-blue-600 hover:text-blue-700 mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{course?.title}</h1>
          <p className="text-gray-600 mt-1">{course?.description || 'No description'}</p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-400' : 'bg-red-100 text-red-800 border border-red-400'
            }`}>
            {message.text}
          </div>
        )}

        {/* Date Selector and Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex-1 text-right">
              <div className="text-sm text-gray-600">
                <p className="mb-1">Total Students: <span className="font-semibold text-gray-900">{students.length}</span></p>
                <p>Marked: <span className="font-semibold text-gray-900">{getMarkedCount()}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance List */}
        {students.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No students enrolled in this course yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Mark Attendance</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {students.map((student) => (
                <div key={student.id} className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900">{student.full_name}</h3>
                      <p className="text-sm text-gray-600">{student.email}</p>
                    </div>

                    {/* Status Buttons */}
                    <div className="flex gap-2">
                      {['present', 'absent'].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(student.id, status)}
                          className={`px-4 py-2 text-white text-sm rounded-lg transition capitalize cursor-pointer ${attendance[student.id] === status
                              ? getActiveStatusColor(status)
                              : getStatusColor(status)
                            }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>

                    {/* Notes Input */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        placeholder="Add notes (optional)"
                        value={notes[student.id] || ''}
                        onChange={(e) => handleNoteChange(student.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        {students.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveAttendance}
              disabled={saving || getMarkedCount() === 0}
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
