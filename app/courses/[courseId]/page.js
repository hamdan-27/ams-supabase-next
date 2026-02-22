'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Pencil, X } from 'lucide-react'
import Link from 'next/link'

export default function CoursePage() {
  const [user, setUser] = useState(null)
  const [course, setCourse] = useState(null)
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '' })
  const [availableStudents, setAvailableStudents] = useState([])
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, total: 0, percentage: 0 })
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

      if (!profile) {
        router.push('/login')
        return
      }

      setUser(profile)
      await loadCourseData(profile)
      setLoading(false)
    }

    initialize()
  }, [router, courseId])

  const loadCourseData = async (profile) => {
    // Load course details
    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    setCourse(courseData)
    setEditForm({ title: courseData?.title || '', description: courseData?.description || '' })

    // Load enrolled students
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        student_id,
        profiles!enrollments_student_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('course_id', courseId)

    const studentList = enrollments?.map(e => e.profiles).filter(Boolean) || []
    setStudents(studentList)

    // Load teachers for this course (for students to see)
    const { data: courseWithTeachers } = await supabase
      .from('course_with_teachers')
      .select('*')
      .eq('course_id', courseId)
      .single();

    if (courseWithTeachers?.teachers) {
      setTeachers(courseWithTeachers.teachers)
    }

    // Load available students to enroll (for teachers)
    if (profile?.role === 'teacher') {
      const { data: allStudents } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')

      const enrolledIds = studentList.map(s => s.id)
      const available = allStudents?.filter(s => !enrolledIds.includes(s.id)) || []
      setAvailableStudents(available)

      // Load all attendance records for this course (for teachers)
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('course_id', courseId)
        .order('date', { ascending: false })

      setAttendanceRecords(attendance || [])

      // Calculate overall stats
      const present = attendance?.filter(a => a.status === 'present').length || 0
      const absent = attendance?.filter(a => a.status === 'absent').length || 0
      const total = attendance?.length || 0
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0

      setAttendanceStats({ present, absent, total, percentage })
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800'
      case 'absent':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleUpdateCourse = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase
        .from('courses')
        .update({
          title: editForm.title,
          description: editForm.description
        })
        .eq('id', courseId)

      if (error) throw error

      setCourse(prev => ({ ...prev, ...editForm }))
      setIsEditing(false)
      setMessage({ type: 'success', text: 'Course updated successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update course: ' + error.message })
    }
  }

  const handleRemoveStudent = async (studentId) => {
    if (!confirm('Are you sure you want to remove this student from the course?')) return

    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('course_id', courseId)
        .eq('student_id', studentId)

      if (error) throw error

      setStudents(prev => prev.filter(s => s.id !== studentId))
      setMessage({ type: 'success', text: 'Student removed successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to remove student: ' + error.message })
    }
  }

  const handleEnrollStudent = async (studentId) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({ course_id: courseId, student_id: studentId })

      if (error) throw error

      const studentToAdd = availableStudents.find(s => s.id === studentId)
      if (studentToAdd) {
        setStudents(prev => [...prev, studentToAdd])
      }

      setAvailableStudents(prev => prev.filter(s => s.id !== studentId))
      setShowEnrollModal(false)
      setMessage({ type: 'success', text: 'Student enrolled successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to enroll student: ' + error.message })
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const isTeacher = user?.role === 'teacher'
  const isStudent = user?.role === 'student'

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={isTeacher ? '/dashboard/teacher' : '/dashboard/student'}
            className="text-blue-600 hover:text-blue-700 mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <div className="relative group flex items-center">
            <h1 className="text-3xl font-bold text-gray-900">{course?.title}</h1>
            {/* display pencil inline with title when hovering over it */}
            {isTeacher && (
              isEditing ? (
                <X
                  onClick={() => setIsEditing(false)}
                  className="w-6 h-6 ml-2 cursor-pointer hover:text-red-700 transition"
                />
              ) : (
                <Pencil
                  onClick={() => setIsEditing(true)}
                  className="w-5 h-5 ml-2 hover:text-green-700 cursor-pointer transition"
                />
              )
            )}
          </div>
          <p className="text-gray-600 mt-1">{course?.description || 'No description'}</p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-400' : 'bg-red-100 text-red-800 border border-red-400'
            }`}>
            {message.text}
          </div>
        )}

        {/* Student Actions - View My Attendance */}
        {isStudent && (
          <div className="mb-6 flex gap-3">
            <Link
              href={`/courses/${courseId}/my-attendance`}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
            >
              📊 View My Attendance
            </Link>
            <Link
              href={`/courses/${courseId}/attendance`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              📄 Mark My Attendance
            </Link>
          </div>
        )}

        {/* Edit Course Form (Teacher Only) */}
        {isTeacher && isEditing && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Edit Course</h2>
            <form onSubmit={handleUpdateCourse}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Title
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setEditForm({ title: course.title, description: course.description })
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Teachers Section (for Students) */}
        {isStudent && teachers.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Teachers</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="p-6">
                  <h3 className="text-base font-semibold text-gray-900">{teacher.full_name}</h3>
                  <p className="text-sm text-gray-600">{teacher.email}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Students and Teachers Sections (Teacher Only) */}
        {isTeacher && (
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {/* Enrolled Students */}
            <div className="bg-white rounded-lg shadow flex-2">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-semibold">Enrolled Students</h2>
                <div className="flex gap-3">
                  <Link
                    href={`/courses/${courseId}/attendance`}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                  >
                    📋 Mark Attendance
                  </Link>
                  <button
                    onClick={() => setShowEnrollModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer"
                  >
                    Enroll Student
                  </button>
                </div>
              </div>

              {students.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-600">No students enrolled in this course yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {students.map((student) => (
                    <div key={student.id} className="p-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{student.full_name}</h3>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teachers */}
            {teachers.length > 0 && (
              <div className="bg-white rounded-lg shadow flex-1">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold">Teachers</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {teachers.map((teacher) => (
                    <div key={teacher.id} className="p-6">
                      <h3 className="text-base font-semibold text-gray-900">
                        {teacher.full_name}{teacher.id === user.id && ' (You)'}
                      </h3>
                      <p className="text-sm text-gray-600">{teacher.email}</p>
                    </div>
                  ))}
                </div>
              </div>

            )}
          </div>
        )}

        {/* Attendance History Section (Teacher Only) */}
        {isTeacher && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 mt-6">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Overall Attendance Rate</p>
                <p className="text-3xl font-bold text-gray-900">{attendanceStats.percentage}%</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Total Records</p>
                <p className="text-3xl font-bold text-gray-900">{attendanceStats.total}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Present</p>
                <p className="text-3xl font-bold text-green-600">{attendanceStats.present}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Absent</p>
                <p className="text-3xl font-bold text-red-600">{attendanceStats.absent}</p>
              </div>
            </div>

            {/* Attendance History Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">Attendance History</h2>
              </div>

              {attendanceRecords.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-600">No attendance records found for this course.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceRecords.map((record) => {
                        const student = students.find(s => s.id === record.student_id)
                        return (
                          <tr key={record.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(record.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {student?.full_name || 'Unknown Student'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(record.status)}`}>
                                {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {record.notes || '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Enroll Student Modal */}
        {showEnrollModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-semibold">Enroll Student</h2>
                <button
                  onClick={() => setShowEnrollModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                {availableStudents.length === 0 ? (
                  <p className="text-gray-600 text-center">No available students to enroll.</p>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {availableStudents.map((student) => (
                      <div key={student.id} className="py-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{student.full_name}</h3>
                          <p className="text-xs text-gray-600">{student.email}</p>
                        </div>
                        <button
                          onClick={() => handleEnrollStudent(student.id)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm"
                        >
                          Enroll
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}