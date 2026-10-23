"use client";
import { useState } from "react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const whatsappNumber = "+91 7801924560"; 

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-20 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block bg-blue-100 text-blue-700 text-sm px-4 py-1 rounded-full mb-4">
            💬 We reply within 24 hours
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Contact Us</h1>
          <p className="text-gray-500">Any questions about admission or courses? We are here to help.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

          {/* Left — contact info */}
          <div className="space-y-8">
            <h3 className="font-semibold text-gray-900 text-lg">Get in Touch</h3>

            <a href="mailto:contact@skillorbit.in" className="flex gap-4 items-center p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group">
              <span className="text-2xl">📧</span>
              <div>
                <div className="font-medium text-gray-900 text-sm group-hover:text-blue-600 transition-colors">Email</div>
                <div className="text-gray-500 text-sm">contact@skillorbit.in</div>
              </div>
            </a>

            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-4 items-center p-4 rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-sm transition-all group"
            >
              <span className="text-2xl">💬</span>
              <div>
                <div className="font-medium text-gray-900 text-sm group-hover:text-green-600 transition-colors">WhatsApp</div>
                <div className="text-gray-500 text-sm">Click to chat directly</div>
              </div>
            </a>

            <div className="flex gap-4 items-center p-4 rounded-xl border border-gray-200">
              <span className="text-2xl">📍</span>
              <div>
                <div className="font-medium text-gray-900 text-sm">Location</div>
                <div className="text-gray-500 text-sm">Daman,India</div>
              </div>
            </div>

            {/* Quick FAQ */}
            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <p className="text-blue-700 font-medium text-sm">Common questions:</p>
              {[
                "Is the beta program really free?",
                "When does the next batch start?",
                "Can I switch domains after joining?",
              ].map((q) => (
                <div key={q} className="flex gap-2 text-sm text-gray-600">
                  <span className="text-blue-400">→</span>
                  <span>{q}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          {sent ? (
            <div className="flex items-center justify-center border border-green-200 bg-green-50 rounded-2xl p-10 text-center">
              <div>
                <div className="text-5xl mb-4">✅</div>
                <h3 className="font-bold text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-gray-500 text-sm">We will reply on your email within 24 hours.</p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-6 text-blue-600 text-sm hover:underline"
                >
                  Send another message
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-5">
              <h3 className="font-semibold text-gray-900">Send a Message</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Your Name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Your EmailID" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What is your question about?</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                  <option>Admission process</option>
                  <option>Course content</option>
                  <option>Pricing plans</option>
                  <option>Technical issue</option>
                  <option>Something else</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Type your question here..." />
              </div>
              <button
                onClick={() => setSent(true)}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Send Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}