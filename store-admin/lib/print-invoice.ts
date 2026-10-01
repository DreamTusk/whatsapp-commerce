import { toast } from 'sonner'
import api from '@/lib/api'

export function isInvoiceAvailable(order: {
  status: string
  payment: { method: string; status: string } | null
}) {
  return (
    order.status !== 'NEW' &&
    order.status !== 'CANCELLED' &&
    !(order.payment?.method === 'ONLINE' && order.payment?.status !== 'PAID')
  )
}

async function fetchInvoiceBlob(orderId: string): Promise<Blob | null> {
  try {
    const res = await api.get(`/api/orders/${orderId}/invoice`, { responseType: 'blob' })
    return res.data
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: Blob } }
    if (axiosErr.response?.data instanceof Blob) {
      try {
        const parsed = JSON.parse(await axiosErr.response.data.text())
        toast.error(parsed.message ?? 'Failed to load invoice')
        return null
      } catch {
        // fall through
      }
    }
    toast.error('Failed to load invoice')
    return null
  }
}

export async function printInvoice(orderId: string) {
  const blob = await fetchInvoiceBlob(orderId)
  if (!blob) return

  const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = url
  document.body.appendChild(iframe)
  iframe.onload = () => {
    iframe.contentWindow?.print()
    iframe.contentWindow?.addEventListener('afterprint', () => {
      iframe.remove()
      URL.revokeObjectURL(url)
    })
  }
}

export async function downloadInvoice(orderId: string, orderNumber: string) {
  const blob = await fetchInvoiceBlob(orderId)
  if (!blob) return

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `invoice-${orderNumber}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
