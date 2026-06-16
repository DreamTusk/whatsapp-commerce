export default function OrderDetailLoading() {
  return (
    <main className="min-h-screen animate-pulse" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="page-x pt-6 space-y-4">
        {/* Header */}
        <div className="h-6 w-40 bg-gray-200 rounded" />

        {/* Order summary card */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-28 bg-gray-100 rounded" />
          <div className="h-4 w-36 bg-gray-100 rounded" />
        </div>

        {/* Items card */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-16 h-16 rounded-xl bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 rounded" />
                <div className="h-3 w-1/4 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Address + payment card */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-4/5 bg-gray-100 rounded" />
        </div>
      </div>
    </main>
  )
}
