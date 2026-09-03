'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Search, Plus, MoreVertical } from '@deemlol/next-icons'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppSelect } from '@/components/ui/app-select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { StoreUser, StoreInvite } from '@/types'

const INVITE_ROLES = [{ value: 'STAFF', label: 'Staff' }]

function roleLabel(role: string) {
  if (role === 'OWNER') return 'Owner'
  return 'Staff - Store'
}

export default function UsersPanel() {
  const [members, setMembers]   = useState<StoreUser[]>([])
  const [invites, setInvites]   = useState<StoreInvite[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  const [inviteOpen, setInviteOpen]   = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState('STAFF')
  const [inviting, setInviting]       = useState(false)

  const [removeTarget,     setRemoveTarget]     = useState<StoreUser | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<StoreUser | null>(null)
  const [cancelTarget,     setCancelTarget]     = useState<StoreInvite | null>(null)
  const [actionLoading,    setActionLoading]    = useState(false)

  async function fetchAll() {
    setLoading(true)
    try {
      const [membersRes, invitesRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/invite'),
      ])
      setMembers(membersRes.data.members)
      setInvites(invitesRes.data.invites)
    } catch {
      toast.error('Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const q = search.toLowerCase()
  const filteredMembers = useMemo(
    () => members.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)),
    [members, q],
  )
  const filteredInvites = useMemo(
    () => invites.filter(i => i.email.toLowerCase().includes(q)),
    [invites, q],
  )

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      await api.post('/api/invite', { email: inviteEmail.trim(), role: inviteRole })
      toast.success('Invite sent')
      setInviteEmail('')
      setInviteRole('STAFF')
      setInviteOpen(false)
      fetchAll()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  async function toggleStatus(member: StoreUser) {
    if (member.is_active) { setDeactivateTarget(member); return }
    try {
      await api.put(`/api/users/${member.id}`, { is_active: true })
      toast.success(`${member.name} activated`)
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: true } : m))
    } catch { toast.error('Failed to activate') }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return
    setActionLoading(true)
    try {
      await api.put(`/api/users/${deactivateTarget.id}`, { is_active: false })
      toast.success(`${deactivateTarget.name} deactivated`)
      setMembers(prev => prev.map(m => m.id === deactivateTarget.id ? { ...m, is_active: false } : m))
      setDeactivateTarget(null)
    } catch { toast.error('Failed to deactivate') } finally { setActionLoading(false) }
  }

  async function removeMember() {
    if (!removeTarget) return
    setActionLoading(true)
    try {
      await api.delete(`/api/users/${removeTarget.id}`)
      toast.success(`${removeTarget.name} removed`)
      setMembers(prev => prev.filter(m => m.id !== removeTarget.id))
      setRemoveTarget(null)
    } catch { toast.error('Failed to remove') } finally { setActionLoading(false) }
  }

  async function cancelInvite() {
    if (!cancelTarget) return
    setActionLoading(true)
    try {
      await api.delete(`/api/invite/${cancelTarget.id}`)
      toast.success('Invite cancelled')
      setInvites(prev => prev.filter(i => i.id !== cancelTarget.id))
      setCancelTarget(null)
    } catch { toast.error('Failed to cancel invite') } finally { setActionLoading(false) }
  }

  const owner = members.find(m => m.role === 'OWNER')

  return (
    <div className="bg-white border rounded-sm border-gray-100 shadow-sm p-6 space-y-5">

      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900">Staff accounts</h2>
        <p className="text-sm text-gray-400 mt-0.5">Control and assign roles for your team members here.</p>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9 h-10 text-sm w-full"
            placeholder="Search staff account"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          className="bg-[#6366f1] hover:bg-[#4f46e5] text-white h-10 px-4 text-sm gap-1.5 flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add staff
        </Button>
      </div>

      {/* Table */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_2fr_40px] bg-gray-50 px-4 py-2.5 border-b border-gray-100">
          <span className="text-xs font-semibold text-gray-500">Name</span>
          <span className="text-xs font-semibold text-gray-500">Role</span>
          <span className="text-xs font-semibold text-gray-500">Contact details</span>
          <span />
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {[1, 2].map(i => (
              <div key={i} className="h-14 px-4 flex items-center">
                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Owner row — always first, no actions */}
            {owner && (
              <div className="grid grid-cols-[2fr_1fr_2fr_40px] px-4 py-3.5 items-center">
                <span className="text-sm font-medium text-gray-900">
                  {owner.name} <span className="text-xs text-gray-400 font-normal">(You)</span>
                </span>
                <span className="text-sm text-gray-600">{roleLabel(owner.role)}</span>
                <span className="text-sm text-gray-500">{owner.email}</span>
                <span />
              </div>
            )}

            {/* Active/inactive staff members */}
            {filteredMembers.filter(m => m.role !== 'OWNER').map(member => (
              <div key={member.id} className="grid grid-cols-[2fr_1fr_2fr_40px] px-4 py-3.5 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{member.name}</span>
                  {!member.is_active && (
                    <span className="text-[11px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      INACTIVE
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-600">{roleLabel(member.role)}</span>
                <span className="text-sm text-gray-500">{member.email}</span>
                <Popover>
                  <PopoverTrigger render={<button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" />}>
                    <MoreVertical className="w-4 h-4" />
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-36 p-1">
                    <button
                      onClick={() => toggleStatus(member)}
                      className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors"
                    >
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => setRemoveTarget(member)}
                      className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            ))}

            {/* Pending invites */}
            {filteredInvites.map(invite => (
              <div key={invite.id} className="grid grid-cols-[2fr_1fr_2fr_40px] px-4 py-3.5 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{invite.email.split('@')[0]}</span>
                  <span className="text-[11px] font-medium bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">
                    PENDING
                  </span>
                </div>
                <span className="text-sm text-gray-600">{roleLabel(invite.role)}</span>
                <span className="text-sm text-gray-500">{invite.email}</span>
                <Popover>
                  <PopoverTrigger render={<button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" />}>
                    <MoreVertical className="w-4 h-4" />
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-36 p-1">
                    <button
                      onClick={() => setCancelTarget(invite)}
                      className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 text-red-500 transition-colors"
                    >
                      Cancel invite
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            ))}

            {/* Empty state */}
            {!loading && filteredMembers.filter(m => m.role !== 'OWNER').length === 0 && filteredInvites.length === 0 && !owner && (
              <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
                <p className="text-sm font-medium">No staff found</p>
                {search && <p className="text-xs">Try a different search term</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite modal */}
      <Dialog
        open={inviteOpen}
        onOpenChange={open => { setInviteOpen(open); if (!open) { setInviteEmail(''); setInviteRole('STAFF') } }}
        disablePointerDismissal
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add staff member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Email address</Label>
              <Input
                type="email"
                placeholder="staff@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendInvite()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <AppSelect
                value={inviteRole}
                onValueChange={setInviteRole}
                options={INVITE_ROLES}
              />
            </div>
            <p className="text-xs text-gray-400">The invite link will appear in the server console.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#6366f1] hover:bg-[#4f46e5] text-white"
              onClick={sendInvite}
              disabled={inviting || !inviteEmail.trim()}
            >
              {inviting ? 'Sending…' : 'Send invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirm */}
      <AlertDialog open={!!removeTarget} onOpenChange={open => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to your store immediately. You can invite them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={removeMember} disabled={actionLoading}>
              {actionLoading ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel invite confirm */}
      <AlertDialog open={!!cancelTarget} onOpenChange={open => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invite?</AlertDialogTitle>
            <AlertDialogDescription>
              The invite sent to <span className="font-semibold">{cancelTarget?.email}</span> will be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={cancelInvite} disabled={actionLoading}>
              {actionLoading ? 'Cancelling…' : 'Cancel invite'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate confirm */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={open => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will no longer be able to log in. You can reactivate them at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={confirmDeactivate} disabled={actionLoading}>
              {actionLoading ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
