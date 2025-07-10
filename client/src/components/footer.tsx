import {
  Linkedin,
  Twitter,
  Instagram,
  Youtube,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary text-white py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <h3 className="text-2xl font-bold mb-4 text-primary">Mementiq</h3>
            <p className="text-gray-300 mb-6">
              Professional video editing services. Everyone deserves to have
              their story told.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-300 hover:text-accent transition-colors duration-200"
              >
                <Linkedin className="h-6 w-6" />
              </a>
              <a
                href="#"
                className="text-gray-300 hover:text-accent transition-colors duration-200"
              >
                <Twitter className="h-6 w-6" />
              </a>
              <a
                href="#"
                className="text-gray-300 hover:text-accent transition-colors duration-200"
              >
                <Instagram className="h-6 w-6" />
              </a>
              <a
                href="#"
                className="text-gray-300 hover:text-accent transition-colors duration-200"
              >
                <Youtube className="h-6 w-6" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4 text-light">Services</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a
                  href="#"
                  className="hover:text-accent transition-colors duration-200"
                >
                  Social Media Content
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-accent transition-colors duration-200"
                >
                  Personal Projects
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-accent transition-colors duration-200"
                >
                  Creative Storytelling
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-accent transition-colors duration-200"
                >
                  Music Videos
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4 text-light">Contact</h4>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                <span>(555) 987-6543</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                <span>hello@Mementiq.com</span>
              </li>
              <li className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span>Los Angeles, CA</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
          <p>
            &copy; {currentYear} Mementiq. All rights reserved. |{" "}
            <a
              href="#"
              className="hover:text-accent transition-colors duration-200"
            >
              Privacy Policy
            </a>{" "}
            |{" "}
            <a
              href="#"
              className="hover:text-accent transition-colors duration-200"
            >
              Terms of Service
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
