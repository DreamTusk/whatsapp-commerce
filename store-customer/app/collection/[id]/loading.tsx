export default function CollectionLoading() {
  return (
    <main className="min-h-screen pb-24 animate-pulse">
      <div className="page-x pt-5 pb-2">
        <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-3 w-24 bg-gray-100 rounded mt-1.5" />
      </div>

      <div className="page-x pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i}>
              <div className="w-full aspect-[4/5] bg-gray-200 rounded-2xl" />
              <div className="mt-2 h-4 w-3/4 bg-gray-200 rounded" />
              <div className="mt-1 h-3 w-1/2 bg-gray-100 rounded" />
              <div className="mt-2 h-4 w-1/3 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
