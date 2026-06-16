export default function ProductDetailLoading() {
  return (
    <main className="animate-pulse">
      {/* Mobile */}
      <div className="lg:hidden">
        <div className="w-full aspect-square bg-gray-200" />
        <div className="p-4 space-y-3">
          <div className="h-6 w-3/4 bg-gray-200 rounded" />
          <div className="h-4 w-1/4 bg-gray-100 rounded" />
          <div className="h-8 w-1/3 bg-gray-200 rounded" />
          <div className="mt-2 h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-4/5 bg-gray-100 rounded" />
          <div className="mt-4 h-12 w-full bg-gray-200 rounded-xl" />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex page-x gap-10 pt-8">
        <div className="w-96 flex-shrink-0 aspect-square bg-gray-200 rounded-2xl" />
        <div className="flex-1 space-y-4 pt-2">
          <div className="h-4 w-48 bg-gray-100 rounded" />
          <div className="h-8 w-3/4 bg-gray-200 rounded mt-4" />
          <div className="h-4 w-1/4 bg-gray-100 rounded" />
          <div className="h-10 w-1/3 bg-gray-200 rounded mt-2" />
          <div className="h-4 w-full bg-gray-100 rounded mt-6" />
          <div className="h-4 w-4/5 bg-gray-100 rounded" />
          <div className="h-4 w-3/5 bg-gray-100 rounded" />
          <div className="h-12 w-56 bg-gray-200 rounded-xl mt-6" />
        </div>
      </div>
    </main>
  )
}
