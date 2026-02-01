import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Attendance Management System
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Streamline your academic attendance tracking with our modern, 
          easy-to-use system.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition"
          >
            Signup
          </Link>
        </div>
      </div>
    </div>
  );
}