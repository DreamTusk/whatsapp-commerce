export default function HomeLoading() {
  return (
    <main className="min-h-screen pb-24 animate-pulse">
      {/* Banner */}
      <div className="page-x pt-4">
        <div className="w-full aspect-[3/1] sm:aspect-[4/1] rounded-2xl bg-gray-200" />
      </div>

      {/* Categories */}
      <section className="mt-4 sm:mt-6 lg:mt-8">
        <div className="page-x mb-3 flex items-center justify-between">
          <div className="h-6 w-28 bg-gray-200 rounded-lg" />
          <div className="h-4 w-12 bg-gray-100 rounded" />
        </div>
        <div className="page-x">
          <div className="flex flex-nowrap gap-5 overflow-hidden pb-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2.5 flex-shrink-0 w-[80px] sm:w-[110px] lg:w-[150px]">
                <div className="w-[80px] h-[80px] sm:w-[110px] sm:h-[110px] lg:w-[150px] lg:h-[150px] rounded-full bg-gray-200 shadow-md" />
                <div className="h-3 w-14 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product row */}
      <section className="mt-6 sm:mt-8">
        <div className="page-x mb-3 flex items-center justify-between">
          <div className="h-6 w-36 bg-gray-200 rounded-lg" />
          <div className="h-4 w-12 bg-gray-100 rounded" />
        </div>
        <div className="page-x">
          <div className="flex gap-4 overflow-hidden pb-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[160px]">
                <div className="w-full aspect-[4/5] bg-gray-200 rounded-2xl" />
                <div className="mt-2 h-4 w-3/4 bg-gray-200 rounded" />
                <div className="mt-1 h-3 w-1/2 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Second product row */}
      <section className="mt-6 sm:mt-8">
        <div className="page-x mb-3 flex items-center justify-between">
          <div className="h-6 w-44 bg-gray-200 rounded-lg" />
          <div className="h-4 w-12 bg-gray-100 rounded" />
        </div>
        <div className="page-x">
          <div className="flex gap-4 overflow-hidden pb-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[160px]">
                <div className="w-full aspect-[4/5] bg-gray-200 rounded-2xl" />
                <div className="mt-2 h-4 w-3/4 bg-gray-200 rounded" />
                <div className="mt-1 h-3 w-1/2 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
