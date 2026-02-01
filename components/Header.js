import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          AMS
        </Link>
        <nav>
          <ul className="flex space-x-6">
            <li>
              <Link href="/login" className="text-gray-700 hover:text-blue-600 transition">
                Login
              </Link>
            </li>
            <li>
              <Link href="/signup" className="text-gray-700 hover:text-blue-600 transition">
                Signup
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}