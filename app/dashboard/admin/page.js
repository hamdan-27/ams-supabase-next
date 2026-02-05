'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CourseModal from '@/components/modals/CourseModal'

export default function AdminDashboard() {
  const [user, setUser] = useState(null)
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
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

      if (profile?.role !== 'admin') {
        router.push('/login')
        return
      }

      setUser(profile)
      await loadData()
      setLoading(false)
    }

    getUser()
  }, [router])

  const loadData = async () => {
    const { data: coursesData } = await supabase.from('courses').select('*')
    const { data: teachersData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'teacher')
    const { data: studentsData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')

    setCourses(coursesData || [])
    setTeachers(teachersData || [])
    setStudents(studentsData || [])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleAddCourse = () => {
    setShowCourseModal(true)
  }

  const handleCourseCreated = (newCourse) => {
    setCourses((prev) => [...prev, newCourse])
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user?.full_name}</span>
              <button
                onClick={handleLogout}
                className="text-white hover:text-white bg-red-600 rounded-md px-2 py-1 cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav> */}

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${showCourseModal ? 'blur' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Courses */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Courses</h2>
            <p className="text-3xl font-bold text-blue-600">{courses.length}</p>
            <div className="mt-4 space-y-2">
              {courses.slice(0, 3).map((course) => (
                <div key={course.id} className="text-sm text-gray-600 border-b pb-2">
                  {course.title}
                </div>
              ))}
            </div>
          </div>

          {/* Teachers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Teachers</h2>
            <p className="text-3xl font-bold text-green-600">{teachers.length}</p>
            <div className="mt-4 space-y-2">
              {teachers.slice(0, 3).map((teacher) => (
                <div key={teacher.id} className="text-sm text-gray-600 border-b pb-2">
                  {teacher.full_name}
                </div>
              ))}
            </div>
          </div>

          {/* Students */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Students</h2>
            <p className="text-3xl font-bold text-purple-600">{students.length}</p>
            <div className="mt-4 space-y-2">
              {students.slice(0, 3).map((student) => (
                <div key={student.id} className="text-sm text-gray-600 border-b pb-2">
                  {student.full_name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Course Management */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">All Courses</h2>
            <button 
              onClick={handleAddCourse}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add Course
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {course.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {course.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-600 hover:underline cursor-pointer">
                      Edit
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      {showCourseModal && <CourseModal onClose={() => setShowCourseModal(false)} onCourseCreated={handleCourseCreated} />}
    </div>
  )
}