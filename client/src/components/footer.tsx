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
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-4 text-primary">Mementiq</h3>
            <p className="text-gray-300 mb-6 max-w-md">
              Professional video editing services made simple; <br />
              becasue everyone deserves to have their story told.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-300 hover:text-accent transition-colors duration-200"
              ></a>
              <a
                href="#"
                className="text-gray-300 hover:text-accent transition-colors duration-200"
              ></a>
              <a
                href="#"
                className="text-gray-300 hover:text-accent transition-colors duration-200"
              ></a>
              <a
                href="#"
                className="text-gray-300 hover:text-accent transition-colors duration-200"
              ></a>
            </div>
          </div>

          <div className="text-right">
            <h4 className="text-lg font-semibold mb-4 text-light">Contact</h4>
            <div className="flex items-center justify-end space-x-2">
              <Mail className="h-6 w-6 text-gray-300 hover:text-accent transition-colors duration-200" />
              <span className="text-gray-300">mementiq@seraphventures.net</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
          <p>
            &copy; {currentYear} Seraph Ventures LLC. All rights reserved. |{" "}
            <a
              href="/privacy-policy"
              className="hover:text-accent transition-colors duration-200"
            >
              Privacy Policy
            </a>{" "}
            |{" "}
            <a
              href="/terms-of-service"
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
