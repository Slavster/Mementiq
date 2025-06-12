import { Linkedin, Twitter, Instagram, Youtube, Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <h3 className="text-2xl font-bold mb-4">VideoForge</h3>
            <p className="text-gray-300 mb-6">
              Professional video production services that drive engagement, boost conversions, and tell your story with cinematic quality.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-accent transition-colors duration-200">
                <Linkedin className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-300 hover:text-accent transition-colors duration-200">
                <Twitter className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-300 hover:text-accent transition-colors duration-200">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-300 hover:text-accent transition-colors duration-200">
                <Youtube className="h-6 w-6" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#" className="hover:text-accent transition-colors duration-200">Corporate Videos</a></li>
              <li><a href="#" className="hover:text-accent transition-colors duration-200">Marketing Content</a></li>
              <li><a href="#" className="hover:text-accent transition-colors duration-200">Educational Videos</a></li>
              <li><a href="#" className="hover:text-accent transition-colors duration-200">Animation Services</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                <span>(555) 123-4567</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                <span>hello@videoforge.com</span>
              </li>
              <li className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span>San Francisco, CA</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-600 mt-8 pt-8 text-center text-gray-300">
          <p>
            &copy; {currentYear} VideoForge. All rights reserved. |{" "}
            <a href="#" className="hover:text-accent transition-colors duration-200">Privacy Policy</a> |{" "}
            <a href="#" className="hover:text-accent transition-colors duration-200">Terms of Service</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
