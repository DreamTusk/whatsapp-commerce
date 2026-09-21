'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from '@deemlol/next-icons'
import type { Category, SubCategory } from '@/types'

interface Props {
  parentCategory: Category
  activeSubCategory?: SubCategory
}

export default function SubcategoryList({ parentCategory, activeSubCategory }: Props) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm mb-4 max-w-xs overflow-hidden">
      <div className="w-full flex items-center justify-between px-4 py-3">
        <Link
          href={`/products?category=${parentCategory.id}`}
          className={`font-bold text-sm transition-colors ${
            !activeSubCategory ? 'c-primary' : 'text-gray-900 hover:text-gray-700'
          }`}
        >
          {parentCategory.name}
        </Link>
        <button onClick={() => setOpen(o => !o)} className="p-1 -m-1 cursor-pointer">
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4">
          <div className="flex flex-col gap-1 pl-3 border-l border-gray-100">
            {parentCategory.children?.map(sub => (
              <Link
                key={sub.id}
                href={`/products?category=${sub.id}`}
                className={`text-sm py-0.5 transition-colors ${
                  activeSubCategory?.id === sub.id ? 'c-primary font-semibold' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
