export default function Signup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      {/* Navigation */}
      <nav className="border-b border-blue-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-start items-center py-4">
            {/* Logo */}
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              YourBrand
            </h1>
          </div>
        </div>
      </nav>

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <a href="/" className="hover:text-blue-600 transition-colors cursor-pointer">
            Home
          </a>
          <span>/</span>
          <span className="text-blue-600 font-medium">Sign Up</span>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 pb-20">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Create Account
            </h1>
            <p className="text-gray-600">Join us and start your journey today</p>
          </div>

          {/* Signup Form */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-blue-100">
            <form className="space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Full Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200 text-gray-900"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200 text-gray-900"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200 text-gray-900"
                  placeholder="Create a password"
                  required
                />
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Confirm Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200 text-gray-900"
                  placeholder="Confirm your password"
                  required
                />
              </div>

              {/* Signup Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer"
              >
                Create Account
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <a href="/login" className="text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer">
                  Sign in here
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
