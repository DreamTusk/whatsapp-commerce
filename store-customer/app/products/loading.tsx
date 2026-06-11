export default function ProductsLoading() {
  return (
    <main className="h-screen flex flex-col overflow-hidden animate-pulse">
      <div className="page-x flex flex-1 min-h-0 bg-gray-50">
        {/* Category sidebar */}
        <aside className="w-[80px] sm:w-[100px] lg:w-[250px] flex-shrink-0 bg-white border-r border-gray-100 flex flex-col gap-1 py-2">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="flex flex-col lg:flex-row items-center gap-2 px-1 lg:px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="h-3 w-14 bg-gray-200 rounded hidden lg:block" />
            </div>
          ))}
        </aside>

        {/* Products grid */}
        <div className="flex-1 min-w-0 px-3 lg:px-6 pt-4 pb-8">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {[...Array(10)].map((_, i) => (
              <div key={i}>
                <div className="w-full aspect-[4/5] bg-gray-200 rounded-2xl" />
                <div className="mt-2 h-4 w-3/4 bg-gray-200 rounded" />
                <div className="mt-1 h-3 w-1/2 bg-gray-100 rounded" />
                <div className="mt-2 h-4 w-1/3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
