export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      {/* Navigation */}
      <nav className="border-b border-blue-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                YourBrand
              </h1>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-gray-700 hover:text-blue-600 transition-colors duration-200 cursor-pointer">Home</a>
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors duration-200 cursor-pointer">Features</a>
              <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors duration-200 cursor-pointer">About</a>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors duration-200 cursor-pointer">Contact</a>
            </div>
            
            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              <a href="/login" className="text-gray-700 hover:text-blue-600 transition-colors duration-200 cursor-pointer">
                Login
              </a>
              <a href="/signup" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg transition-all duration-200 cursor-pointer">
                Sign Up
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl lg:text-7xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
              Innovate
            </span>
            <br />
            <span className="text-gray-800">Beyond Limits</span>
          </h1>
          <p className="text-xl lg:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
            Transform your ideas into reality with our cutting-edge solutions. 
            Experience the perfect blend of innovation and reliability.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <a href="#features" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer">
              Get Started
            </a>
            <a href="#about" className="border-2 border-blue-200 hover:border-blue-300 text-gray-700 hover:text-blue-600 px-8 py-4 rounded-xl font-semibold transition-all duration-200 cursor-pointer">
              Learn More
            </a>
          </div>
          
          {/* Hero Visual Element */}
          <div className="mt-16 relative">
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-3xl p-8 shadow-lg border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg mb-4"></div>
                  <h3 className="font-semibold text-gray-800 mb-2">Innovation</h3>
                  <p className="text-gray-600 text-sm">Cutting-edge technology solutions</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-lg mb-4"></div>
                  <h3 className="font-semibold text-gray-800 mb-2">Reliability</h3>
                  <p className="text-gray-600 text-sm">Trusted by thousands worldwide</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg mb-4"></div>
                  <h3 className="font-semibold text-gray-800 mb-2">Support</h3>
                  <p className="text-gray-600 text-sm">24/7 dedicated customer care</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover the tools and capabilities that set us apart from the competition
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Advanced Analytics",
                description: "Get deep insights into your data with our powerful analytics engine",
                icon: "📊"
              },
              {
                title: "Secure Infrastructure", 
                description: "Enterprise-grade security to protect your valuable information",
                icon: "🔒"
              },
              {
                title: "Real-time Collaboration",
                description: "Work together seamlessly with your team in real-time",
                icon: "👥"
              },
              {
                title: "API Integration",
                description: "Connect with your favorite tools through our robust API",
                icon: "🔗"
              },
              {
                title: "Mobile Optimized",
                description: "Access everything from anywhere with our mobile-first design",
                icon: "📱"
              },
              {
                title: "24/7 Support",
                description: "Get help when you need it with our round-the-clock support",
                icon: "🎧"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 hover:shadow-lg transition-all duration-300 cursor-pointer">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 lg:py-28 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-8">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Why Choose Us?
                </span>
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                We've been at the forefront of innovation for over a decade, 
                helping businesses transform their ideas into successful digital solutions.
              </p>
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">500K+</div>
                  <div className="text-gray-600">Happy Users</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">99.9%</div>
                  <div className="text-gray-600">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">150+</div>
                  <div className="text-gray-600">Countries</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">10+</div>
                  <div className="text-gray-600">Years</div>
                </div>
              </div>
              <a href="#contact" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer inline-block">
                Start Your Journey
              </a>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl p-8 shadow-lg border border-blue-200">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Consultation</h4>
                      <p className="text-gray-600 text-sm">We understand your needs</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Development</h4>
                      <p className="text-gray-600 text-sm">We build your solution</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Launch</h4>
                      <p className="text-gray-600 text-sm">We deploy and support</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Get In Touch
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ready to start your project? We'd love to hear from you.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 shadow-sm border border-blue-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
                    placeholder="Your email address"
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Message
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200 resize-none"
                  placeholder="Tell us how we can help..."
                ></textarea>
              </div>
              <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer">
                Send Message
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 border-t border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                YourBrand
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Transforming ideas into reality with cutting-edge technology and innovative solutions.
              </p>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer">
                  Twitter
                </a>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer">
                  LinkedIn
                </a>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer">
                  GitHub
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-4">Product</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors cursor-pointer">Features</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors cursor-pointer">Pricing</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors cursor-pointer">API Docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-4">Company</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors cursor-pointer">About</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors cursor-pointer">Blog</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors cursor-pointer">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-blue-300 mt-12 pt-8 text-center text-gray-600">
            <p>&copy; 2025 YourBrand. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
