"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Team", href: "/team" },
  { label: "Contact", href: "/contact" },
  { label: "Smart Career Path", href: "/smart-career-path" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="font-bold text-xl flex items-center gap-1">
          <span className="text-blue-600 font-black text-2xl tracking-tight">Skill</span>
          <span className="text-indigo-600 font-black text-2xl tracking-tight">Orbit</span>
        </Link>
        <div className="hidden md:flex gap-6 items-center">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-gray-600 hover:text-blue-600 text-sm transition-colors">{link.label}</Link>
          ))}
          <Link href="/admission" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">Apply Now</Link>
        </div>
        <button className="md:hidden text-gray-600" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {isOpen && (
        <div className="md:hidden border-t border-gray-100 px-4 py-4 flex flex-col gap-4 bg-white">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-gray-600 hover:text-blue-600" onClick={() => setIsOpen(false)}>{link.label}</Link>
          ))}
          <Link href="/admission" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-center" onClick={() => setIsOpen(false)}>Apply Now</Link>
        </div>
      )}
    </nav>
  );
}
