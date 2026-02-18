'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TeacherDashboard() {
  const [user, setUser] = useState(null)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
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

      if (profile?.role !== 'teacher') {
        router.push('/login')
        return
      }

      setUser(profile)
      await loadCourses(session.user.id)
      setLoading(false)
    }

    getUser()
  }, [router])

  const loadCourses = async (teacherId) => {
    const { data } = await supabase
      .from('course_teachers')
      .select(`
        courses (
          id,
          title,
          description,
          enrollments(count),
          course_teachers(count)
        )
      `)
      .eq('teacher_id', teacherId)

    const courseList = data?.map(item => item.courses).filter(Boolean) || []
    setCourses(courseList)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold mb-6">My Courses</h2>

        {courses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No courses assigned yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
              >
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {course.description || 'No description'}
                  </p>
                  <div className="flex justify-between text-sm text-gray-500 mt-4">
                    <span>Teachers: {course.course_teachers?.[0]?.count ?? 0}</span>
                    <span>Students: {course.enrollments?.[0]?.count ?? 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}